export type DemoCity = {
  id: string;
  label: string;
  suburb: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
};

/** Demo pin locations for major AU cities (CBD / inner suburb). */
export const DEMO_CITIES: DemoCity[] = [
  {
    id: "sydney",
    label: "Sydney",
    suburb: "Sydney",
    state: "NSW",
    postcode: "2000",
    lat: -33.8688,
    lng: 151.2093,
  },
  {
    id: "melbourne",
    label: "Melbourne",
    suburb: "Melbourne",
    state: "VIC",
    postcode: "3000",
    lat: -37.8136,
    lng: 144.9631,
  },
  {
    id: "brisbane",
    label: "Brisbane",
    suburb: "Brisbane",
    state: "QLD",
    postcode: "4000",
    lat: -27.4698,
    lng: 153.0251,
  },
  {
    id: "perth",
    label: "Perth",
    suburb: "Perth",
    state: "WA",
    postcode: "6000",
    lat: -31.9505,
    lng: 115.8605,
  },
  {
    id: "adelaide",
    label: "Adelaide",
    suburb: "Adelaide",
    state: "SA",
    postcode: "5000",
    lat: -34.9285,
    lng: 138.6007,
  },
  {
    id: "hobart",
    label: "Hobart",
    suburb: "Hobart",
    state: "TAS",
    postcode: "7000",
    lat: -42.8821,
    lng: 147.3272,
  },
];

export function findDemoCity(idOrLabel: string | null | undefined): DemoCity | undefined {
  if (!idOrLabel) return undefined;
  const key = idOrLabel.trim().toLowerCase();
  return DEMO_CITIES.find((c) => c.id === key || c.label.toLowerCase() === key);
}

export const CITY_NAMES = DEMO_CITIES.map((c) => c.label);

/** If the search box is just a city name, treat it as a city filter (not text search). */
export function resolveRestaurantQuery(input: {
  q?: string;
  city?: string;
  /** When true, use the city dropdown and do not promote q to city. */
  explicitCity?: boolean;
}): { q: string; city: string } {
  const rawQ = (input.q || "").trim();
  const fromCity = findDemoCity(input.city);

  if (input.explicitCity) {
    return { q: findDemoCity(rawQ) ? "" : rawQ, city: fromCity?.label || "" };
  }

  const fromQ = findDemoCity(rawQ);
  if (fromQ) {
    return { q: "", city: fromQ.label };
  }
  return { q: rawQ, city: fromCity?.label || "" };
}
