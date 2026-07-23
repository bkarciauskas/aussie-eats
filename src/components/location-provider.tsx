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
import { SYDNEY_DEMO } from "@/lib/restaurants";

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
  setSydneyLocation: () => void;
  clearLocation: () => void;
  hydrated: boolean;
};

const STORAGE_KEY = "aussieeats_location_v1";
const LocationContext = createContext<LocationContextValue | null>(null);

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

  const setSydneyLocation = useCallback(() => {
    setLocation({ ...SYDNEY_DEMO });
  }, []);

  const clearLocation = useCallback(() => setLocation(null), []);

  const value = useMemo(
    () => ({ location, setSydneyLocation, clearLocation, hydrated }),
    [location, setSydneyLocation, clearLocation, hydrated],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
