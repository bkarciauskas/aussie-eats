export function parseCuisineTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // fall through
  }
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export const SYDNEY_DEMO = {
  label: "Sydney CBD",
  suburb: "Sydney",
  state: "NSW",
  postcode: "2000",
  lat: -33.8688,
  lng: 151.2093,
} as const;

/** Haversine distance in km */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
