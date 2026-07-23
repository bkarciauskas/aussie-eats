/**
 * Returns a same-origin relative path only. Rejects protocol-relative URLs
 * (`//evil.com`), backslash tricks (`/\evil.com`), and scheme-bearing values.
 */
export function safeInternalPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next) return fallback;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("://")) return fallback;

  // Block control characters that some clients normalize into path separators.
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return fallback;

  try {
    const url = new URL(trimmed, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;

    const result = `${url.pathname}${url.search}${url.hash}` || fallback;
    if (result.startsWith("//") || result.startsWith("/\\")) return fallback;

    try {
      const decodedPath = decodeURIComponent(url.pathname);
      if (
        decodedPath.startsWith("//") ||
        decodedPath.startsWith("/\\") ||
        decodedPath.includes("\\")
      ) {
        return fallback;
      }
    } catch {
      return fallback;
    }

    return result;
  } catch {
    return fallback;
  }
}
