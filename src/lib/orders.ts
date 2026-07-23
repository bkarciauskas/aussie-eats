import { OrderStatus } from "@/lib/roles";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export type DeliveryAddress = {
  label: string;
  line1: string;
  suburb: string;
  state: string;
  postcode: string;
  phone?: string;
};

export function parseDeliveryAddress(raw: string): DeliveryAddress {
  try {
    return JSON.parse(raw) as DeliveryAddress;
  } catch {
    return {
      label: "Address",
      line1: raw,
      suburb: "",
      state: "NSW",
      postcode: "",
    };
  }
}
