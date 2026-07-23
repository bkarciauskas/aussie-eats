"use client";

import { useLocation } from "@/components/location-provider";

export function SydneyLocationButton({
  className = "btn-primary",
  label = "Use Sydney demo location",
}: {
  className?: string;
  label?: string;
}) {
  const { location, setSydneyLocation, hydrated } = useLocation();

  return (
    <button
      type="button"
      className={className}
      onClick={setSydneyLocation}
      disabled={!hydrated}
    >
      {location ? `Location: ${location.label}` : label}
    </button>
  );
}
