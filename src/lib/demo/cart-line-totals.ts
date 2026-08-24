import type { CartItem } from "@/lib/cart-types";

export function cartSubtotalFromLines(
  items: Pick<CartItem, "unitPriceCents" | "quantity">[],
): number {
  return items.reduce((sum, line) => sum + line.unitPriceCents, 0);
}
