"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";

export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
export const hasMapsKey = MAPS_API_KEY.trim().length > 0;

/**
 * Wraps children in the Google Maps context. When no API key is configured the
 * provider is skipped so consumers can render a graceful, key-free fallback.
 */
export function MapProvider({ children }: { children: ReactNode }) {
  if (!hasMapsKey) return <>{children}</>;
  return (
    <APIProvider apiKey={MAPS_API_KEY} libraries={["places", "marker"]}>
      {children}
    </APIProvider>
  );
}
