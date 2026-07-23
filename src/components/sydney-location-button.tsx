"use client";

import { useLocation } from "@/components/location-provider";

/** @deprecated Prefer CityPicker / CityLocationButton */
export function SydneyLocationButton({
  className = "btn-primary",
  label = "Use Sydney demo location",
}: {
  className?: string;
  label?: string;
}) {
  const { location, setCityLocation, hydrated } = useLocation();

  return (
    <button
      type="button"
      className={className}
      onClick={() => setCityLocation("sydney")}
      disabled={!hydrated}
    >
      {location ? `Location: ${location.label}` : label}
    </button>
  );
}
