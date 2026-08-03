"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitReviewAction } from "@/app/actions/reviews";
import { MAX_REVIEW_COMMENT_LENGTH, MAX_REVIEW_RATING, MIN_REVIEW_RATING } from "@/lib/reviews";

type Props = {
  orderId: string;
};

export function ReviewForm({ orderId }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="panel mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await submitReviewAction({ orderId, rating, comment });
          if (result?.error) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div>
        <h2 className="font-display text-xl">Leave a review</h2>
        <p className="mt-1 text-sm text-[var(--ae-ink-muted)]">
          How was your order? Ratings help other AussieEats customers choose where to eat.
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Rating</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Star rating">
          {Array.from({ length: MAX_REVIEW_RATING - MIN_REVIEW_RATING + 1 }, (_, i) => {
            const value = MIN_REVIEW_RATING + i;
            const selected = rating === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                className={`min-w-11 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-[var(--ae-green)] bg-[var(--ae-green)] text-white"
                    : "border-[var(--ae-line)] bg-white text-[var(--ae-ink)] hover:border-[var(--ae-green)]"
                }`}
                onClick={() => setRating(value)}
              >
                {value} ★
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="field">
        <span>Comment (optional)</span>
        <textarea
          name="comment"
          rows={3}
          maxLength={MAX_REVIEW_COMMENT_LENGTH}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What stood out — food, speed, packaging…"
        />
      </label>

      {error ? <p className="text-sm text-[var(--ae-danger)]">{error}</p> : null}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
