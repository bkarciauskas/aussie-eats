import { prisma } from "@/lib/db";
import { ensureAdmin } from "@/lib/admin-guard";
import { formatReviewStars, parseReviewRating } from "@/lib/reviews";
import { AdminReviewActions } from "@/components/admin-review-actions";

type Props = {
  searchParams: Promise<{
    q?: string;
    restaurantId?: string;
    minStars?: string;
  }>;
};

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
  })
    .format(date)
    .toLowerCase();
  return { day, time };
}

export default async function AdminReviewsPage({ searchParams }: Props) {
  await ensureAdmin();

  const { q: rawQ = "", restaurantId = "", minStars: rawMinStars = "" } = await searchParams;
  const q = rawQ.trim();
  const minStars = parseReviewRating(rawMinStars);

  const [reviews, restaurants] = await Promise.all([
    prisma.review.findMany({
      include: { user: true, restaurant: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.restaurant.findMany({
      orderBy: [{ city: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const filtered = reviews.filter((review) => {
    const haystack = `${review.user.name} ${review.comment}`.toLowerCase();
    const matchesQ = !q || haystack.includes(q.toLowerCase());
    const matchesRestaurant = !restaurantId || review.restaurantId === restaurantId;
    const matchesStars = minStars === null || review.rating >= minStars;
    return matchesQ && matchesRestaurant && matchesStars;
  });

  const countLabel = `${filtered.length} review${filtered.length === 1 ? "" : "s"}`;

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--ae-green)]">Reviews</h1>
      <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">
        Moderate customer reviews. Removing a review recalculates the restaurant&apos;s public
        rating.
      </p>

      <form
        method="get"
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="field min-w-[12rem] flex-1 sm:max-w-[27rem]">
          <span>Search</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Customer or comment…"
            className="admin-input"
          />
        </label>
        <label className="field w-full sm:w-[18.75rem]">
          <span>Restaurant</span>
          <select name="restaurantId" defaultValue={restaurantId} className="admin-input">
            <option value="">All restaurants</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field w-full sm:w-[10.625rem]">
          <span>Min stars</span>
          <select name="minStars" defaultValue={rawMinStars} className="admin-input">
            <option value="">Any rating</option>
            <option value="5">5 stars</option>
            <option value="4">4+ stars</option>
            <option value="3">3+ stars</option>
            <option value="2">2+ stars</option>
            <option value="1">1+ stars</option>
          </select>
        </label>
        <button type="submit" className="btn-secondary h-[42px] px-5 py-0 text-sm">
          Filter
        </button>
      </form>

      <div className="panel mt-6 overflow-x-auto">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-[var(--ae-ink)]">{countLabel}</h2>
          <p className="text-[13px] text-[var(--ae-ink-soft)]">Newest first</p>
        </div>

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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-[var(--ae-ink-soft)]">
                  No reviews match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((review) => {
                const when = formatReviewWhen(review.createdAt);
                const comment = review.comment.trim();
                return (
                  <tr key={review.id}>
                    <td className="whitespace-nowrap text-xs text-[var(--ae-ink-soft)]">
                      <div>{when.day}</div>
                      <div>{when.time}</div>
                    </td>
                    <td className="text-[13px] font-semibold">{review.user.name}</td>
                    <td className="text-[13px]">{review.restaurant.name}</td>
                    <td className="whitespace-nowrap text-[13px] text-[var(--ae-green)]">
                      {formatReviewStars(review.rating)}
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
