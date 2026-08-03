export type CartItem = {
  menuItemId: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  image?: string | null;
};

export type CartState = {
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;
  restaurantLat: number | null;
  restaurantLng: number | null;
  deliveryFeeCents: number;
  minOrderCents: number;
  items: CartItem[];
};

/** Line subtotal in integer cents (unit × quantity). */
export function cartSubtotalCents(
  items: Pick<CartItem, "unitPriceCents" | "quantity">[],
): number {
  return items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
}
