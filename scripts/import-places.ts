/**
 * One-shot Google Places ingest → SQLite (legacy Places API).
 * Usage: npm run db:import-places [-- --per-city=100] [-- --city=sydney]
 */
import "dotenv/config";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { PrismaClient } from "@prisma/client";
import {
  cloneMenuCategories,
  resolveCuisineFromPlaces,
} from "../prisma/cuisine-menu-templates";
import { DEMO_CITIES, type DemoCity } from "../src/lib/cities";

const prisma = new PrismaClient();
const PLACES = "https://maps.googleapis.com/maps/api/place";
const PHOTO_DIR = path.join(process.cwd(), "public/images/imported");

const CUISINE_QUERIES = [
  "restaurant",
  "thai restaurant",
  "japanese restaurant",
  "italian restaurant",
  "indian restaurant",
  "chinese restaurant",
  "mexican restaurant",
  "burger restaurant",
  "pizza restaurant",
  "cafe",
  "seafood restaurant",
  "vietnamese restaurant",
  "korean restaurant",
  "bakery",
];

type LatLng = { lat: number; lng: number };

type LegacyPlace = {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
  photos?: { photo_reference: string }[];
  opening_hours?: { open_now?: boolean; weekday_text?: string[] };
};

type NearbyResponse = {
  status: string;
  error_message?: string;
  results?: LegacyPlace[];
  next_page_token?: string;
};

type DetailsResponse = {
  status: string;
  error_message?: string;
  result?: LegacyPlace & {
    formatted_phone_number?: string;
    editorial_summary?: { overview?: string };
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
      periods?: {
        open: { day: number; time: string };
        close?: { day: number; time: string };
      }[];
    };
  };
};

function parseArgs(argv: string[]) {
  let perCity = 100;
  let cityFilter: string | null = null;
  for (const arg of argv) {
    if (arg.startsWith("--per-city=")) {
      const n = Number(arg.slice("--per-city=".length));
      if (Number.isFinite(n) && n > 0) perCity = Math.floor(n);
    }
    if (arg.startsWith("--city=")) {
      cityFilter = arg.slice("--city=".length).trim().toLowerCase();
    }
  }
  return { perCity, cityFilter };
}

function apiKey(): string {
  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    "";
  if (!key) {
    throw new Error(
      "Set GOOGLE_PLACES_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) in .env",
    );
  }
  return key;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function offsetLatLng(origin: LatLng, eastM: number, northM: number): LatLng {
  const dLat = northM / 111_320;
  const dLng = eastM / (111_320 * Math.cos((origin.lat * Math.PI) / 180));
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
}

function searchCenters(city: DemoCity): LatLng[] {
  const origin = { lat: city.lat, lng: city.lng };
  const ring = 2500;
  return [
    origin,
    offsetLatLng(origin, ring, 0),
    offsetLatLng(origin, -ring, 0),
    offsetLatLng(origin, 0, ring),
    offsetLatLng(origin, 0, -ring),
    offsetLatLng(origin, ring, ring),
    offsetLatLng(origin, -ring, ring),
    offsetLatLng(origin, ring, -ring),
    offsetLatLng(origin, -ring, -ring),
  ];
}

function assertPlacesOk(status: string, errorMessage?: string) {
  if (status === "OK" || status === "ZERO_RESULTS") return;
  if (status === "REQUEST_DENIED" || status === "INVALID_REQUEST") {
    throw new Error(
      `Places API error (${status}): ${errorMessage || "check API key / Places API enablement"}`,
    );
  }
  if (status === "OVER_QUERY_LIMIT") {
    throw new Error(`Places API quota exceeded: ${errorMessage || status}`);
  }
}

function parseAuAddress(
  formatted: string,
  fallbackCity: DemoCity,
): { suburb: string; state: string; postcode: string } {
  const parts = formatted.split(",").map((p) => p.trim());
  let suburb = fallbackCity.suburb;
  let state = fallbackCity.state;
  let postcode = fallbackCity.postcode;

  const statePost = parts.find((p) =>
    /\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i.test(p),
  );
  if (statePost) {
    const m = statePost.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b\s*(\d{4})?/i);
    if (m) {
      state = m[1].toUpperCase();
      if (m[2]) postcode = m[2];
    }
    const suburbIdx = parts.indexOf(statePost) - 1;
    if (suburbIdx >= 0) suburb = parts[suburbIdx];
  } else if (parts.length >= 2) {
    suburb = parts[parts.length - 2] || suburb;
  }

  return { suburb, state, postcode };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for Places request`);
  return (await res.json()) as T;
}

async function nearbyPage(input: {
  key: string;
  center: LatLng;
  pageToken?: string;
}): Promise<NearbyResponse> {
  const params = new URLSearchParams({
    key: input.key,
    location: `${input.center.lat},${input.center.lng}`,
    radius: "3500",
    type: "restaurant",
  });
  if (input.pageToken) params.set("pagetoken", input.pageToken);
  return fetchJson<NearbyResponse>(`${PLACES}/nearbysearch/json?${params}`);
}

async function textSearchPage(input: {
  key: string;
  query: string;
  center: LatLng;
  pageToken?: string;
}): Promise<NearbyResponse> {
  const params = new URLSearchParams({
    key: input.key,
    query: input.query,
    location: `${input.center.lat},${input.center.lng}`,
    radius: "4500",
    type: "restaurant",
  });
  if (input.pageToken) params.set("pagetoken", input.pageToken);
  return fetchJson<NearbyResponse>(`${PLACES}/textsearch/json?${params}`);
}

async function placeDetails(input: {
  key: string;
  placeId: string;
}): Promise<DetailsResponse["result"] | null> {
  const params = new URLSearchParams({
    key: input.key,
    place_id: input.placeId,
    fields:
      "place_id,name,formatted_address,geometry,rating,user_ratings_total,formatted_phone_number,opening_hours,photos,types,business_status,editorial_summary",
  });
  const json = await fetchJson<DetailsResponse>(`${PLACES}/details/json?${params}`);
  assertPlacesOk(json.status, json.error_message);
  return json.result ?? null;
}

type LegacyOpeningHours = {
  open_now?: boolean;
  weekday_text?: string[];
  periods?: {
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }[];
};

function periodsToOpeningHoursJson(opening?: LegacyOpeningHours): string | null {
  if (!opening) return null;
  const periods =
    opening.periods?.map((p) => {
      const mapped: {
        open: { day: number; hour: number; minute: number };
        close?: { day: number; hour: number; minute: number };
      } = {
        open: {
          day: p.open.day,
          hour: Number(p.open.time.slice(0, 2)),
          minute: Number(p.open.time.slice(2)),
        },
      };
      if (p.close) {
        mapped.close = {
          day: p.close.day,
          hour: Number(p.close.time.slice(0, 2)),
          minute: Number(p.close.time.slice(2)),
        };
      }
      return mapped;
    }) ?? [];

  return JSON.stringify({
    openNow: opening.open_now,
    weekdayDescriptions: opening.weekday_text ?? [],
    periods,
  });
}

async function downloadPhoto(input: {
  key: string;
  photoReference: string;
  placeId: string;
}): Promise<{ path: string; cached: boolean }> {
  mkdirSync(PHOTO_DIR, { recursive: true });
  const safeId = input.placeId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const rel = `/images/imported/${safeId}.jpg`;
  const abs = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
  if (existsSync(abs)) return { path: rel, cached: true };

  const params = new URLSearchParams({
    maxheight: "800",
    photo_reference: input.photoReference,
    key: input.key,
  });
  const res = await fetch(`${PLACES}/photo?${params}`);
  if (!res.ok || !res.body) {
    return { path: "/images/restaurants/burger.jpg", cached: false };
  }
  const nodeStream = Readable.fromWeb(
    res.body as import("stream/web").ReadableStream,
  );
  await pipeline(nodeStream, createWriteStream(abs));
  return { path: rel, cached: false };
}

function fallbackImageForCuisine(tags: string[]): string {
  const t = tags.join(" ").toLowerCase();
  if (t.includes("burger")) return "/images/restaurants/burger.jpg";
  if (t.includes("thai")) return "/images/restaurants/thai.jpg";
  if (t.includes("pizza") || t.includes("italian")) return "/images/restaurants/pizza.jpg";
  if (t.includes("cafe") || t.includes("brunch")) return "/images/restaurants/cafe.jpg";
  if (t.includes("sushi") || t.includes("japanese") || t.includes("seafood")) {
    return "/images/restaurants/sushi.jpg";
  }
  if (t.includes("indian")) return "/images/restaurants/indian.jpg";
  if (t.includes("mexican")) return "/images/restaurants/mexican.jpg";
  if (t.includes("bakery")) return "/images/restaurants/bakery.jpg";
  return "/images/restaurants/burger.jpg";
}

function deliveryFees(rating: number): { deliveryFeeCents: number; minOrderCents: number } {
  const deliveryFeeCents =
    350 + Math.round((5 - Math.min(rating, 5)) * 80) + (Math.random() > 0.5 ? 50 : 0);
  const minOrderCents = 1200 + Math.round(Math.random() * 1000);
  return {
    deliveryFeeCents: Math.min(750, Math.max(299, deliveryFeeCents)),
    minOrderCents: Math.min(2500, Math.max(1000, minOrderCents)),
  };
}

async function collectPlaceIdsForCity(input: {
  key: string;
  city: DemoCity;
  perCity: number;
}): Promise<Set<string>> {
  const found = new Set<string>();
  const centers = searchCenters(input.city);

  async function ingestResults(results: LegacyPlace[] | undefined) {
    for (const place of results ?? []) {
      if (!place.place_id) continue;
      if (place.business_status && place.business_status !== "OPERATIONAL") continue;
      found.add(place.place_id);
      if (found.size >= input.perCity) return;
    }
  }

  for (const center of centers) {
    if (found.size >= input.perCity) break;
    let pageToken: string | undefined;
    for (let page = 0; page < 3; page++) {
      if (page > 0) await sleep(2000); // next_page_token needs a short delay
      const json = await nearbyPage({ key: input.key, center, pageToken });
      assertPlacesOk(json.status, json.error_message);
      await ingestResults(json.results);
      pageToken = json.next_page_token;
      if (!pageToken || found.size >= input.perCity) break;
    }
  }

  for (const cuisine of CUISINE_QUERIES) {
    if (found.size >= input.perCity) break;
    for (const center of centers.slice(0, 4)) {
      if (found.size >= input.perCity) break;
      const query = `${cuisine} in ${input.city.label}`;
      let pageToken: string | undefined;
      for (let page = 0; page < 2; page++) {
        if (page > 0) await sleep(2000);
        const json = await textSearchPage({
          key: input.key,
          query,
          center,
          pageToken,
        });
        assertPlacesOk(json.status, json.error_message);
        await ingestResults(json.results);
        pageToken = json.next_page_token;
        if (!pageToken || found.size >= input.perCity) break;
        await sleep(200);
      }
    }
  }

  return found;
}

async function upsertVenue(input: {
  key: string;
  city: DemoCity;
  placeId: string;
  stats: { created: number; updated: number; photosCached: number; photosDownloaded: number };
}) {
  const details = await placeDetails({ key: input.key, placeId: input.placeId });
  if (!details?.name || !details.geometry?.location) return;

  const name = details.name.trim();
  const lat = details.geometry.location.lat;
  const lng = details.geometry.location.lng;
  const address =
    details.formatted_address || details.vicinity || `${input.city.label}, Australia`;
  const { suburb } = parseAuAddress(address, input.city);
  const { templateKey, cuisineTags } = resolveCuisineFromPlaces({
    types: details.types ?? [],
    primaryType: details.types?.[0],
    displayName: name,
  });

  let image = fallbackImageForCuisine(cuisineTags);
  const photoRef = details.photos?.[0]?.photo_reference;
  if (photoRef) {
    try {
      const photo = await downloadPhoto({
        key: input.key,
        photoReference: photoRef,
        placeId: input.placeId,
      });
      image = photo.path;
      if (photo.cached) input.stats.photosCached += 1;
      else if (photo.path.startsWith("/images/imported/")) input.stats.photosDownloaded += 1;
      await sleep(50);
    } catch {
      // keep fallback
    }
  }

  const rating = details.rating ?? 4.4;
  const userRatingCount = details.user_ratings_total ?? 0;
  const isOpen = details.opening_hours?.open_now ?? true;
  const openingHoursJson = periodsToOpeningHoursJson(details.opening_hours);
  const description =
    details.editorial_summary?.overview?.trim() ||
    `${name} in ${suburb}, ${input.city.label}. Order delivery with AussieEats.`;
  const { deliveryFeeCents, minOrderCents } = deliveryFees(rating);
  const phone = details.formatted_phone_number ?? null;

  const existing = await prisma.restaurant.findUnique({
    where: { placeId: input.placeId },
  });

  if (existing) {
    await prisma.restaurant.update({
      where: { placeId: input.placeId },
      data: {
        name,
        description,
        image,
        cuisineTags: JSON.stringify(cuisineTags),
        city: input.city.label,
        suburb,
        lat,
        lng,
        rating,
        userRatingCount,
        openingHoursJson,
        phone,
        isOpen,
        isActive: true,
      },
    });
    input.stats.updated += 1;
    return;
  }

  let slug = slugify(name);
  const clash = await prisma.restaurant.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${input.placeId.slice(-6).toLowerCase()}`;

  const categories = cloneMenuCategories(templateKey);
  await prisma.restaurant.create({
    data: {
      placeId: input.placeId,
      name,
      slug,
      description,
      image,
      cuisineTags: JSON.stringify(cuisineTags),
      city: input.city.label,
      suburb,
      lat,
      lng,
      deliveryFeeCents,
      minOrderCents,
      rating,
      userRatingCount,
      openingHoursJson,
      phone,
      isOpen,
      isActive: true,
      categories: {
        create: categories.map((cat, idx) => ({
          name: cat.name,
          sortOrder: idx,
          items: {
            create: cat.items.map((item) => ({
              name: item.name,
              description: item.description,
              priceCents: item.priceCents,
              image: item.image ?? null,
              isAvailable: true,
            })),
          },
        })),
      },
    },
  });
  input.stats.created += 1;
}

async function main() {
  const { perCity, cityFilter } = parseArgs(process.argv.slice(2));
  const key = apiKey();
  mkdirSync(PHOTO_DIR, { recursive: true });

  const cities = DEMO_CITIES.filter(
    (c) =>
      !cityFilter || c.id === cityFilter || c.label.toLowerCase() === cityFilter,
  );
  if (cities.length === 0) {
    throw new Error(`No cities match filter: ${cityFilter}`);
  }

  console.log(
    `Importing up to ${perCity} restaurants/city for: ${cities.map((c) => c.label).join(", ")}`,
  );
  console.log("Using Google Places API (legacy Nearby/Text/Details/Photo).");

  const totals = { created: 0, updated: 0, photosCached: 0, photosDownloaded: 0 };

  for (const city of cities) {
    console.log(`\n=== ${city.label} ===`);
    const placeIds = await collectPlaceIdsForCity({ key, city, perCity });
    console.log(`  collected ${placeIds.size} unique places`);

    const stats = {
      created: 0,
      updated: 0,
      photosCached: 0,
      photosDownloaded: 0,
    };
    let i = 0;
    for (const placeId of placeIds) {
      i += 1;
      process.stdout.write(`  upsert ${i}/${placeIds.size}\r`);
      await upsertVenue({ key, city, placeId, stats });
      await sleep(80);
    }
    console.log(
      `  done: created=${stats.created} updated=${stats.updated} photos↓=${stats.photosDownloaded} cached=${stats.photosCached}`,
    );
    totals.created += stats.created;
    totals.updated += stats.updated;
    totals.photosCached += stats.photosCached;
    totals.photosDownloaded += stats.photosDownloaded;
  }

  const byCity = await prisma.restaurant.groupBy({
    by: ["city"],
    _count: { _all: true },
    orderBy: { city: "asc" },
  });

  console.log("\nImport complete:");
  console.log(`  created=${totals.created} updated=${totals.updated}`);
  console.log(
    `  photos downloaded=${totals.photosDownloaded} cached=${totals.photosCached}`,
  );
  console.log(
    "  DB by city:",
    byCity.map((r) => `${r.city} (${r._count._all})`).join(", "),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
