"use client";

import Link from "next/link";
import { useLocation } from "@/components/location-provider";
import { DEMO_CITIES } from "@/lib/cities";

export function CityPicker({
  className = "",
  showBrowseLink = false,
}: {
  className?: string;
  showBrowseLink?: boolean;
}) {
  const { location, setCityLocation, hydrated } = useLocation();

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {DEMO_CITIES.map((city) => {
          const active = location?.label === city.label;
          return (
            <button
              key={city.id}
              type="button"
              className={active ? "btn-primary !px-3 !py-1.5 text-sm" : "btn-secondary !px-3 !py-1.5 text-sm"}
              onClick={() => setCityLocation(city)}
              disabled={!hydrated}
              aria-pressed={active}
            >
              {city.label}
            </button>
          );
        })}
      </div>
      {showBrowseLink && location ? (
        <p className="mt-3 text-sm text-[var(--ae-ink-muted)]">
          Showing demo pin for <strong>{location.label}</strong> ·{" "}
          <Link
            href={`/restaurants?city=${encodeURIComponent(location.label)}`}
            className="underline"
          >
            Browse {location.label} restaurants
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Compact single-button control that cycles / sets Sydney (legacy home CTA). */
export function CityLocationButton({
  className = "btn-secondary",
  label = "Pick a demo city",
}: {
  className?: string;
  label?: string;
}) {
  const { location, setCityLocation, hydrated } = useLocation();

  return (
    <button
      type="button"
      className={className}
      onClick={() => setCityLocation(location ? location.label : "sydney")}
      disabled={!hydrated}
    >
      {location ? `Location: ${location.label}` : label}
    </button>
  );
}
