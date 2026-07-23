"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEMO_CITIES, findDemoCity, type DemoCity } from "@/lib/cities";

export type DemoLocation = {
  label: string;
  suburb: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
};

type LocationContextValue = {
  location: DemoLocation | null;
  setCityLocation: (city: DemoCity | string) => void;
  /** @deprecated Use setCityLocation("sydney") */
  setSydneyLocation: () => void;
  clearLocation: () => void;
  hydrated: boolean;
};

const STORAGE_KEY = "aussieeats_location_v1";
const LocationContext = createContext<LocationContextValue | null>(null);

function toLocation(city: DemoCity): DemoLocation {
  return {
    label: city.label,
    suburb: city.suburb,
    state: city.state,
    postcode: city.postcode,
    lat: city.lat,
    lng: city.lng,
  };
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<DemoLocation | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLocation(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (location) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [location, hydrated]);

  const setCityLocation = useCallback((city: DemoCity | string) => {
    const resolved = typeof city === "string" ? findDemoCity(city) : city;
    if (resolved) setLocation(toLocation(resolved));
  }, []);

  const setSydneyLocation = useCallback(() => {
    setCityLocation(DEMO_CITIES[0]);
  }, [setCityLocation]);

  const clearLocation = useCallback(() => setLocation(null), []);

  const value = useMemo(
    () => ({ location, setCityLocation, setSydneyLocation, clearLocation, hydrated }),
    [location, setCityLocation, setSydneyLocation, clearLocation, hydrated],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
