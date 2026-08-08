"use server";

import { revalidatePath } from "next/cache";
import { ApiError, placeOrder, updateOrderStatus } from "@/lib/backend";
import {
  CardBrand,
  PaymentMethodId,
  formatCardPaymentLabel,
  isCardBrand,
  parsePaymentMethod,
} from "@/lib/payment";
import { OrderStatus, isOrderStatus } from "@/lib/roles";
import { requireAdmin, requireUser } from "@/lib/session";

type PlaceOrderPayment =
  | { method: "card"; cardLast4: string; cardBrand: CardBrand }
  | { method: Exclude<PaymentMethodId, "card"> };

export type PlaceOrderInput = {
  restaurantId: string;
  items: { menuItemId: string; quantity: number }[];
  address: {
    label: string;
    line1: string;
    suburb: string;
    state: string;
    postcode: string;
    phone?: string;
  };
  payment: PlaceOrderPayment;
};

function actionError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.detail || fallback;
  }
  return fallback;
}

export async function placeOrderAction(input: PlaceOrderInput) {
  const session = await requireUser();
  if (!session?.userId) {
    return { error: "Please log in to place an order.", needsAuth: true as const };
  }

  if (!input.items?.length) {
    return { error: "Your cart is empty." };
  }

  const paymentMethodId = parsePaymentMethod(input.payment?.method);
  if (!paymentMethodId) {
    return { error: "Please choose a valid payment method." };
  }

  let payment: Record<string, string> = { method: paymentMethodId };
  if (paymentMethodId === "card") {
    if (input.payment.method !== "card") {
      return { error: "Please complete the card details." };
    }
    const cardLast4 = input.payment.cardLast4;
    if (!/^\d{4}$/.test(cardLast4) || !isCardBrand(input.payment.cardBrand)) {
      return { error: "Please complete the card details." };
    }
    const cardLabel = formatCardPaymentLabel({
      brand: input.payment.cardBrand,
      last4: cardLast4,
    });
    if (!cardLabel) {
      return { error: "Please complete the card details." };
    }
    payment = {
      method: "card",
      cardLast4,
      cardBrand: input.payment.cardBrand,
    };
  }

  const { label, line1, suburb, state, postcode, phone } = input.address;
  if (!line1?.trim() || !suburb?.trim() || !postcode?.trim()) {
    return { error: "Please complete the delivery address." };
  }

  try {
    // Backend recomputes line prices from Mongo and enforces min-order.
    const order = await placeOrder({
      restaurantId: input.restaurantId,
      items: input.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
      address: {
        label: label || "Delivery",
        line1: line1.trim(),
        suburb: suburb.trim(),
        state: state || "NSW",
        postcode: postcode.trim(),
        phone: phone?.trim() || undefined,
      },
      payment,
    });

    revalidatePath("/orders");
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    return { orderId: order.orderId };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { error: "Please log in to place an order.", needsAuth: true as const };
    }
    return { error: actionError(err, "Unable to place order. Please try again.") };
  }
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "Admin access required." };
  }

  if (!isOrderStatus(status)) {
    return { error: "Invalid status." };
  }

  try {
    await updateOrderStatus(orderId, status);
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true as const };
  } catch (err) {
    return { error: actionError(err, "Unable to update order status.") };
  }
}
