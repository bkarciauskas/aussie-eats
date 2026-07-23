"use client";

import { CityLocationButton } from "@/components/city-picker";

/** @deprecated Prefer CityPicker / CityLocationButton */
export function SydneyLocationButton(props: {
  className?: string;
  label?: string;
}) {
  return (
    <CityLocationButton
      className={props.className}
      label={props.label ?? "Use Sydney demo location"}
    />
  );
}
