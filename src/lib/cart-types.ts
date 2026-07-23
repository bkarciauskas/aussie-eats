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
  deliveryFeeCents: number;
  minOrderCents: number;
  items: CartItem[];
};
