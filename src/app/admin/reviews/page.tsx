import { Suspense } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureAdmin } from "@/lib/admin-guard";
import { formatStarRating } from "@/lib/reviews";
import { AdminReviewActions } from "@/components/admin-review-actions";
import { AdminReviewFilters } from "@/components/admin-review-filters";

type SearchParams = Promise<{
  q?: string;
  restaurantId?: string;
  minStars?: string;
}>;

function parseMinStars(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const stars = Math.trunc(n);
  if (stars < 1 || stars > 5) return null;
  return stars;
}

function formatReviewWhen(date: Date) {
  const day = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return { day, time };
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await ensureAdmin();

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const restaurantId = (params.restaurantId ?? "").trim();
  const minStars = parseMinStars(params.minStars);

  const where: Prisma.ReviewWhereInput = {};
  if (restaurantId) where.restaurantId = restaurantId;
  if (minStars !== null) where.rating = { gte: minStars };
  if (q) {
    where.OR = [
      { comment: { contains: q } },
      { user: { name: { contains: q } } },
      { user: { email: { contains: q } } },
    ];
  }

  const [reviews, restaurants] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.restaurant.findMany({
      select: { id: true, name: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
  ]);

  const countLabel = `${reviews.length} review${reviews.length === 1 ? "" : "s"}`;

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--ae-green)]">Reviews</h1>
      <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">
        Moderate customer reviews. Removing a review recalculates the restaurant&apos;s public
        rating.
      </p>

      <div className="mt-6">
        <Suspense fallback={null}>
          <AdminReviewFilters
            restaurants={restaurants}
            initialQ={q}
            initialRestaurantId={restaurantId}
            initialMinStars={minStars !== null ? String(minStars) : ""}
          />
        </Suspense>
      </div>

      <div className="panel mt-6 overflow-x-auto">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-[var(--ae-ink)]">{countLabel}</h2>
          <p className="text-[13px] text-[var(--ae-ink-soft)]">Newest first</p>
        </div>

        {reviews.length === 0 ? (
          <p className="py-6 text-sm text-[var(--ae-ink-muted)]">No reviews match these filters.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Customer</th>
                <th>Restaurant</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => {
                const when = formatReviewWhen(review.createdAt);
                const comment = review.comment.trim();
                return (
                  <tr key={review.id}>
                    <td className="whitespace-nowrap text-xs text-[var(--ae-ink-soft)]">
                      <div>{when.day}</div>
                      <div>{when.time}</div>
                    </td>
                    <td className="text-[13px] font-semibold text-[var(--ae-ink)]">
                      {review.user.name}
                    </td>
                    <td className="text-[13px]">{review.restaurant.name}</td>
                    <td className="whitespace-nowrap text-[13px] text-[var(--ae-green)]">
                      {formatStarRating(review.rating)}
                    </td>
                    <td className="max-w-md text-[13px] text-[var(--ae-ink-muted)]">
                      {comment ? (
                        comment
                      ) : (
                        <span className="italic text-[var(--ae-ink-soft)]">No written review.</span>
                      )}
                    </td>
                    <td>
                      <AdminReviewActions reviewId={review.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
