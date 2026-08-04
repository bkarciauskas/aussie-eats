import { NextResponse } from "next/server";
import { DEMO_CITIES } from "@/lib/cities";
import { prisma } from "@/lib/db";
import { parseCuisineTags } from "@/lib/restaurants";
import { buildSearchSuggestions } from "@/lib/search-suggestions";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    select: {
      name: true,
      slug: true,
      suburb: true,
      city: true,
      cuisineTags: true,
    },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
  });
  const cuisines = Array.from(
    new Set(restaurants.flatMap(({ cuisineTags }) => parseCuisineTags(cuisineTags))),
  ).sort();
  const suburbs = Array.from(
    new Set(restaurants.map(({ suburb }) => suburb).filter(Boolean)),
  ).sort();

  const suggestions = buildSearchSuggestions({
    query,
    restaurants,
    cuisines,
    suburbs,
    cities: DEMO_CITIES,
    limit: 8,
  });

  return NextResponse.json({ suggestions });
}
