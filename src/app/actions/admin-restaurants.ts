"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function upsertRestaurantAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const suburb = String(formData.get("suburb") || "").trim();
  const cuisineTagsRaw = String(formData.get("cuisineTags") || "");
  const image = String(formData.get("image") || "/images/restaurants/burger.jpg");
  const deliveryFeeCents = Math.round(Number(formData.get("deliveryFee")) * 100);
  const minOrderCents = Math.round(Number(formData.get("minOrder")) * 100);
  const rating = Number(formData.get("rating") || 4.5);
  const phone = String(formData.get("phone") || "");
  const isOpen = formData.get("isOpen") === "on" || formData.get("isOpen") === "true";
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";

  if (!name || !description || !suburb) {
    return { error: "Name, description, and suburb are required." };
  }

  const cuisineTags = JSON.stringify(
    cuisineTagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  );

  const lat = Number(formData.get("lat") || -33.8688);
  const lng = Number(formData.get("lng") || 151.2093);

  if (id) {
    await prisma.restaurant.update({
      where: { id },
      data: {
        name,
        description,
        suburb,
        cuisineTags,
        image,
        deliveryFeeCents,
        minOrderCents,
        rating,
        phone: phone || null,
        isOpen,
        isActive,
        lat,
        lng,
      },
    });
  } else {
    let slug = slugify(name);
    const clash = await prisma.restaurant.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Date.now().toString(36)}`;

    await prisma.restaurant.create({
      data: {
        name,
        slug,
        description,
        suburb,
        cuisineTags,
        image,
        deliveryFeeCents,
        minOrderCents,
        rating,
        phone: phone || null,
        isOpen,
        isActive,
        lat,
        lng,
      },
    });
  }

  revalidatePath("/admin/restaurants");
  revalidatePath("/restaurants");
  redirect("/admin/restaurants");
}

export async function toggleRestaurantActiveAction(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  await prisma.restaurant.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/restaurants");
  revalidatePath("/restaurants");
  return { ok: true as const };
}

export async function upsertCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  const restaurantId = String(formData.get("restaurantId") || "");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!restaurantId || !name) return { error: "Category name is required." };

  if (id) {
    await prisma.category.update({ where: { id }, data: { name, sortOrder } });
  } else {
    await prisma.category.create({
      data: { restaurantId, name, sortOrder },
    });
  }

  revalidatePath(`/admin/restaurants/${restaurantId}/menu`);
  revalidatePath("/restaurants");
  return { ok: true as const };
}

export async function upsertMenuItemAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  const restaurantId = String(formData.get("restaurantId") || "");
  const categoryId = String(formData.get("categoryId") || "");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priceCents = Math.round(Number(formData.get("price")) * 100);
  const image = String(formData.get("image") || "") || null;
  const isAvailable =
    formData.get("isAvailable") === "on" || formData.get("isAvailable") === "true";

  if (!categoryId || !name || !Number.isFinite(priceCents)) {
    return { error: "Name, category, and price are required." };
  }

  if (id) {
    await prisma.menuItem.update({
      where: { id },
      data: { name, description, priceCents, image, isAvailable, categoryId },
    });
  } else {
    await prisma.menuItem.create({
      data: { categoryId, name, description, priceCents, image, isAvailable },
    });
  }

  revalidatePath(`/admin/restaurants/${restaurantId}/menu`);
  revalidatePath("/restaurants");
  return { ok: true as const };
}

export async function toggleMenuItemAvailabilityAction(
  restaurantId: string,
  itemId: string,
  isAvailable: boolean,
) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admin access required." };

  await prisma.menuItem.update({ where: { id: itemId }, data: { isAvailable } });
  revalidatePath(`/admin/restaurants/${restaurantId}/menu`);
  revalidatePath("/restaurants");
  return { ok: true as const };
}
