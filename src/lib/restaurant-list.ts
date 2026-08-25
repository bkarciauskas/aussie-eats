export const RESTAURANT_LIST_PAGE_SIZE = 10;

/** Parse a 1-based page from a URL param; invalid/missing → 1. */
export function parsePage(raw: string | undefined | null): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function totalPages(total: number, pageSize: number = RESTAURANT_LIST_PAGE_SIZE): number {
  if (total <= 0) return 1;
  const size = Math.max(1, pageSize);
  return Math.ceil(total / size);
}

/** Build `/restaurants?...` href for a page, preserving other query params. */
export function restaurantListPageHref(
  current: URLSearchParams | string,
  page: number,
): string {
  const params =
    typeof current === "string"
      ? new URLSearchParams(current)
      : new URLSearchParams(current.toString());
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/restaurants?${qs}` : "/restaurants";
}
