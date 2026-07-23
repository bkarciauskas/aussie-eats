"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { hasMapsKey } from "@/components/maps/map-provider";

type Coords = { lat: number; lng: number; label?: string };

function useUpdateLocation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setLocation = useCallback(
    (coords: Coords | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (coords) {
        params.set("lat", coords.lat.toFixed(6));
        params.set("lng", coords.lng.toFixed(6));
        if (coords.label) params.set("place", coords.label);
        else params.delete("place");
      } else {
        params.delete("lat");
        params.delete("lng");
        params.delete("place");
      }
      startTransition(() => {
        router.push(`/restaurants?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return { setLocation, pending };
}

function PlacesAutocomplete({
  onPick,
  disabled,
}: {
  onPick: (coords: Coords) => void;
  disabled?: boolean;
}) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["geometry", "name", "formatted_address"],
      componentRestrictions: { country: "au" },
    });
    setReady(true);
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      onPick({
        lat: loc.lat(),
        lng: loc.lng(),
        label: place.name || place.formatted_address || "Selected location",
      });
    });
    return () => listener.remove();
  }, [places, onPick]);

  return (
    <input
      ref={inputRef}
      type="text"
      className="w-full"
      placeholder={ready ? "Search an address or suburb…" : "Loading address search…"}
      disabled={disabled || !ready}
      autoComplete="off"
      aria-label="Search by address"
    />
  );
}

export function LocationSearch({ locationLabel }: { locationLabel?: string }) {
  const { setLocation, pending } = useUpdateLocation();
  const [geoState, setGeoState] = useState<"idle" | "locating" | "error">("idle");
  const hasLocation = Boolean(locationLabel);

  const useMyLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("error");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("idle");
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "My location",
        });
      },
      () => setGeoState("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [setLocation]);

  return (
    <div className="panel mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="field flex-1">
        <span>Find restaurants near</span>
        {hasMapsKey ? (
          <PlacesAutocomplete
            onPick={setLocation}
            disabled={pending}
          />
        ) : (
          <input
            type="text"
            className="w-full"
            placeholder="Address search needs a Google Maps key — use the button →"
            disabled
            aria-label="Search by address (disabled without Maps key)"
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-primary whitespace-nowrap"
          onClick={useMyLocation}
          disabled={pending || geoState === "locating"}
        >
          {geoState === "locating" ? "Locating…" : "Use my location"}
        </button>
        {hasLocation ? (
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => setLocation(null)}
            disabled={pending}
          >
            Clear
          </button>
        ) : null}
      </div>
      {geoState === "error" ? (
        <p className="text-xs text-[var(--ae-danger)] sm:w-full">
          Could not get your location. Allow location access or search by address.
        </p>
      ) : null}
    </div>
  );
}
