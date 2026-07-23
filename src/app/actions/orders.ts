"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { canTransition } from "@/lib/orders";
import { OrderStatus, isOrderStatus } from "@/lib/roles";
import { requireAdmin, requireUser } from "@/lib/session";

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
};

export async function placeOrderAction(input: PlaceOrderInput) {
  const session = await requireUser();
  if (!session?.userId) {
    return { error: "Please log in to place an order.", needsAuth: true as const };
  }

  if (!input.items?.length) {
    return { error: "Your cart is empty." };
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

  if (menuItems.length !== menuItemIds.length) {
    return { error: "Some items are unavailable. Please refresh the menu." };
  }

  const byId = new Map(menuItems.map((m) => [m.id, m]));
  let subtotalCents = 0;
  const orderItems = input.items.map((line) => {
    const item = byId.get(line.menuItemId)!;
    const quantity = Math.max(1, Math.floor(line.quantity));
    subtotalCents += item.priceCents * quantity;
    return {
      menuItemId: item.id,
      name: item.name,
      unitPriceCents: item.priceCents,
      quantity,
    };
  });

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

  const order = await prisma.order.create({
    data: {
      userId: session.userId,
      restaurantId: restaurant.id,
      status: OrderStatus.pending as string,
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
      paymentMethod: "Pay on delivery",
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

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { error: "Order not found." };
  }

  if (!isOrderStatus(order.status) || !canTransition(order.status, status)) {
    return { error: `Cannot change status from ${order.status} to ${status}.` };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true as const };
}
