"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  canTransition,
  parseOrderLineQuantity,
  parseStatusHistory,
} from "@/lib/orders";
import {
  CardBrand,
  PaymentMethodId,
  formatCardPaymentLabel,
  isCardBrand,
  parsePaymentMethod,
  paymentMethodLabel,
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

  let paymentMethod = paymentMethodLabel(paymentMethodId);
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
    paymentMethod = cardLabel;
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { id: input.restaurantId, isActive: true },
  });
  if (!restaurant || !restaurant.isOpen) {
    return { error: "This restaurant is not available right now." };
  }

  const menuItemIds = input.items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: menuItemIds },
      isAvailable: true,
      category: { restaurantId: restaurant.id },
    },
  });

  if (menuItems.length !== new Set(menuItemIds).size) {
    return { error: "Some items are unavailable. Please refresh the menu." };
  }

  const byId = new Map(menuItems.map((m) => [m.id, m]));
  let subtotalCents = 0;
  const orderItems: {
    menuItemId: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
  }[] = [];

  for (const line of input.items) {
    const quantity = parseOrderLineQuantity(line.quantity);
    if (quantity == null) {
      return { error: "Invalid quantity in cart. Please refresh and try again." };
    }
    const item = byId.get(line.menuItemId);
    if (!item) {
      return { error: "Some items are unavailable. Please refresh the menu." };
    }
    subtotalCents += item.priceCents * quantity;
    orderItems.push({
      menuItemId: item.id,
      name: item.name,
      unitPriceCents: item.priceCents,
      quantity,
    });
  }

  if (subtotalCents < restaurant.minOrderCents) {
    return {
      error: `Minimum order is ${(restaurant.minOrderCents / 100).toFixed(2)} AUD before delivery.`,
    };
  }

  const { label, line1, suburb, state, postcode, phone } = input.address;
  if (!line1?.trim() || !suburb?.trim() || !postcode?.trim()) {
    return { error: "Please complete the delivery address." };
  }

  const deliveryFeeCents = restaurant.deliveryFeeCents;
  const totalCents = subtotalCents + deliveryFeeCents;

  const now = new Date();
  const order = await prisma.order.create({
    data: {
      userId: session.userId,
      restaurantId: restaurant.id,
      status: OrderStatus.pending,
      statusHistoryJson: JSON.stringify([
        { status: OrderStatus.pending, at: now.toISOString() },
      ]),
      subtotalCents,
      deliveryFeeCents,
      totalCents,
      deliveryAddress: JSON.stringify({
        label: label || "Delivery",
        line1: line1.trim(),
        suburb: suburb.trim(),
        state: state || "NSW",
        postcode: postcode.trim(),
        phone: phone?.trim() || undefined,
      }),
      paymentMethod,
      items: { create: orderItems },
    },
  });

  revalidatePath("/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  return { orderId: order.id };
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "Admin access required." };
  }

  if (!isOrderStatus(status)) {
    return { error: "Invalid status." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { error: "Order not found." };
  }

  if (!isOrderStatus(order.status) || !canTransition(order.status, status)) {
    return { error: `Cannot change status from ${order.status} to ${status}.` };
  }

  const history = [...parseStatusHistory(order.statusHistoryJson)];
  history.push({ status, at: new Date().toISOString() });

  await prisma.order.update({
    where: { id: orderId },
    data: { status, statusHistoryJson: JSON.stringify(history) },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true as const };
}
