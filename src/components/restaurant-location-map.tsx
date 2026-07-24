"use client";

import { Map, Marker } from "@vis.gl/react-google-maps";
import { MapProvider, hasMapsKey } from "@/components/maps/map-provider";

export function RestaurantLocationMap({
  lat,
  lng,
  name,
  suburb,
  city,
}: {
  lat: number;
  lng: number;
  name: string;
  suburb: string;
  city: string;
}) {
  return (
    <MapProvider>
      {hasMapsKey ? (
        <div className="h-[260px] w-full overflow-hidden rounded-2xl border border-[var(--ae-line)]">
          <Map
            defaultCenter={{ lat, lng }}
            defaultZoom={15}
            gestureHandling="cooperative"
            disableDefaultUI
            clickableIcons={false}
            style={{ width: "100%", height: "100%" }}
          >
            <Marker position={{ lat, lng }} title={name} />
          </Map>
        </div>
      ) : (
        <div className="panel flex h-[260px] flex-col items-center justify-center gap-1 border-dashed text-center">
          <p className="font-display text-base text-[var(--ae-green)]">
            {suburb}, {city}
          </p>
          <p className="max-w-sm text-sm text-[var(--ae-ink-muted)]">
            Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to show this location on a map.
          </p>
        </div>
      )}
    </MapProvider>
  );
}
