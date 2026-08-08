export type OriginMarkerIcon = {
  path: google.maps.SymbolPath;
  scale: number;
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWeight: number;
};

/**
 * Build the origin (user location) marker icon only when the Maps JS API
 * has exposed SymbolPath. Callers must also wait for useApiIsLoaded() so
 * React re-renders once the script finishes loading.
 */
export function getOriginMarkerIcon(): OriginMarkerIcon | null {
  if (typeof google === "undefined" || google.maps?.SymbolPath == null) {
    return null;
  }
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: "#2563eb",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}
