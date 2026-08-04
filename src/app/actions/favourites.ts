"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

type ToggleFavouriteResult =
  | { ok: true; isFavourite: boolean }
  | { ok: false; error: string; needsAuth?: true };

export async function listFavouriteRestaurantIds(): Promise<string[]> {
  const session = await requireUser();
  if (!session?.userId) return [];

  const favourites = await prisma.favourite.findMany({
    where: { userId: session.userId },
    select: { restaurantId: true },
  });

  return favourites.map((favourite) => favourite.restaurantId);
}

export async function toggleFavouriteAction(
  restaurantId: string,
): Promise<ToggleFavouriteResult> {
  const session = await requireUser();
  if (!session?.userId) {
    return {
      ok: false,
      error: "Please log in to save restaurants.",
      needsAuth: true,
    };
  }

  const normalizedId = typeof restaurantId === "string" ? restaurantId.trim() : "";
  if (!normalizedId) {
    return { ok: false, error: "Restaurant not found." };
  }

  const restaurant = await prisma.restaurant.findFirst({
    where: { id: normalizedId, isActive: true },
    select: { id: true, slug: true },
  });
  if (!restaurant) {
    return { ok: false, error: "Restaurant not found." };
  }

  const key = {
    userId_restaurantId: {
      userId: session.userId,
      restaurantId: restaurant.id,
    },
  };
  const existing = await prisma.favourite.findUnique({
    where: key,
    select: { id: true },
  });

  if (existing) {
    await prisma.favourite.delete({ where: key });
  } else {
    await prisma.favourite.create({
      data: {
        userId: session.userId,
        restaurantId: restaurant.id,
      },
    });
  }

  revalidatePath("/favourites");
  revalidatePath("/restaurants");
  revalidatePath(`/restaurants/${restaurant.slug}`);

  return { ok: true, isFavourite: !existing };
}
