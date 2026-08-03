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

/** Max units allowed per order line (cart UI and place-order agree on this). */
export const MAX_LINE_QUANTITY = 99;

export function parseOrderLineQuantity(rawQty: unknown): number | null {
  const n = Number(rawQty);
  const quantity = Math.floor(n);
  if (!Number.isFinite(n) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
    return null;
  }
  return quantity;
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
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("bad address");
    const obj = parsed as Record<string, unknown>;
    return {
      label: typeof obj.label === "string" ? obj.label : "Address",
      line1: typeof obj.line1 === "string" ? obj.line1 : raw,
      suburb: typeof obj.suburb === "string" ? obj.suburb : "",
      state: typeof obj.state === "string" ? obj.state : "NSW",
      postcode: typeof obj.postcode === "string" ? obj.postcode : "",
      phone: typeof obj.phone === "string" ? obj.phone : undefined,
    };
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

export type StatusHistoryEntry = {
  status: string;
  at: string;
};

export function parseStatusHistory(raw: string | null | undefined): StatusHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const obj = entry as Record<string, unknown>;
      if (typeof obj.status !== "string" || typeof obj.at !== "string") return [];
      return [{ status: obj.status, at: obj.at }];
    });
  } catch {
    return [];
  }
}

/** Canonical progress steps for the customer timeline (excludes cancelled). */
export const ORDER_TIMELINE_STEPS = [
  OrderStatus.pending,
  OrderStatus.preparing,
  OrderStatus.out_for_delivery,
  OrderStatus.delivered,
] as const;
