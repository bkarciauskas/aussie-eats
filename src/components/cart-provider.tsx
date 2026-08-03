"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cartSubtotalCents, type CartItem, type CartState } from "@/lib/cart-types";
import { MAX_LINE_QUANTITY } from "@/lib/orders";

const STORAGE_KEY = "aussieeats_cart_v1";

const emptyCart: CartState = {
  restaurantId: null,
  restaurantSlug: null,
  restaurantName: null,
  deliveryFeeCents: 0,
  minOrderCents: 0,
  items: [],
};

type CartContextValue = {
  cart: CartState;
  itemCount: number;
  subtotalCents: number;
  totalCents: number;
  addItem: (
    item: Omit<CartItem, "quantity"> & { quantity?: number },
    meta: {
      restaurantId: string;
      restaurantSlug: string;
      restaurantName: string;
      deliveryFeeCents: number;
      minOrderCents: number;
    },
  ) => { ok: true } | { ok: false; error: string };
  setQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(emptyCart);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setCart({ ...emptyCart, ...JSON.parse(raw) });
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const addItem: CartContextValue["addItem"] = useCallback((item, meta) => {
    let result: { ok: true } | { ok: false; error: string } = { ok: true };
    const addQty = Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.floor(item.quantity ?? 1)));
    setCart((prev) => {
      if (prev.restaurantId && prev.restaurantId !== meta.restaurantId && prev.items.length > 0) {
        result = {
          ok: false,
          error: `Your cart has items from ${prev.restaurantName}. Clear the cart to order from ${meta.restaurantName}.`,
        };
        return prev;
      }
      const existing = prev.items.find((i) => i.menuItemId === item.menuItemId);
      const items = existing
        ? prev.items.map((i) =>
            i.menuItemId === item.menuItemId
              ? { ...i, quantity: Math.min(MAX_LINE_QUANTITY, i.quantity + addQty) }
              : i,
          )
        : [
            ...prev.items,
            {
              ...item,
              quantity: addQty,
              restaurantId: meta.restaurantId,
              restaurantSlug: meta.restaurantSlug,
              restaurantName: meta.restaurantName,
            },
          ];
      return {
        restaurantId: meta.restaurantId,
        restaurantSlug: meta.restaurantSlug,
        restaurantName: meta.restaurantName,
        deliveryFeeCents: meta.deliveryFeeCents,
        minOrderCents: meta.minOrderCents,
        items,
      };
    });
    return result;
  }, []);

  const setQuantity = useCallback((menuItemId: string, quantity: number) => {
    setCart((prev) => {
      const nextQty = Math.min(MAX_LINE_QUANTITY, Math.floor(quantity));
      const items =
        nextQty <= 0
          ? prev.items.filter((i) => i.menuItemId !== menuItemId)
          : prev.items.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: nextQty } : i));
      if (items.length === 0) return emptyCart;
      return { ...prev, items };
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setQuantity(menuItemId, 0);
  }, [setQuantity]);

  const clearCart = useCallback(() => setCart(emptyCart), []);

  const subtotalCents = useMemo(() => cartSubtotalCents(cart.items), [cart.items]);
  const itemCount = useMemo(
    () => cart.items.reduce((sum, i) => sum + i.quantity, 0),
    [cart.items],
  );
  const totalCents = subtotalCents + (cart.items.length ? cart.deliveryFeeCents : 0);

  const value = useMemo(
    () => ({
      cart,
      itemCount,
      subtotalCents,
      totalCents,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      hydrated,
    }),
    [
      cart,
      itemCount,
      subtotalCents,
      totalCents,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      hydrated,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
