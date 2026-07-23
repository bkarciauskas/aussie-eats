"use client";

import { useTransition } from "react";
import { toggleRestaurantActiveAction } from "@/app/actions/admin-restaurants";

export function ToggleRestaurantActive({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-[var(--ae-ink-soft)] underline"
      onClick={() => {
        startTransition(async () => {
          await toggleRestaurantActiveAction(id, !isActive);
        });
      }}
    >
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
