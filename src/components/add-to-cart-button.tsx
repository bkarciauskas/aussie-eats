"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatAUD } from "@/lib/money";

type Props = {
  menuItemId: string;
  name: string;
  unitPriceCents: number;
  image?: string | null;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  deliveryFeeCents: number;
  minOrderCents: number;
  disabled?: boolean;
};

export function AddToCartButton(props: Props) {
  const { addItem } = useCart();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={props.disabled}
        className="btn-primary !px-3 !py-1.5 text-sm disabled:opacity-40"
        onClick={() => {
          const result = addItem(
            {
              menuItemId: props.menuItemId,
              name: props.name,
              unitPriceCents: props.unitPriceCents,
              image: props.image,
              restaurantId: props.restaurantId,
              restaurantSlug: props.restaurantSlug,
              restaurantName: props.restaurantName,
            },
            {
              restaurantId: props.restaurantId,
              restaurantSlug: props.restaurantSlug,
              restaurantName: props.restaurantName,
              deliveryFeeCents: props.deliveryFeeCents,
              minOrderCents: props.minOrderCents,
            },
          );
          if (!result.ok) {
            setMessage(result.error);
          } else {
            setMessage(`Added · ${formatAUD(props.unitPriceCents)}`);
            window.setTimeout(() => setMessage(null), 1600);
          }
        }}
      >
        Add
      </button>
      {message ? <p className="max-w-[12rem] text-right text-xs text-[var(--ae-ink-muted)]">{message}</p> : null}
    </div>
  );
}
