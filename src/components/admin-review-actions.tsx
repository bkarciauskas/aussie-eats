"use client";

import { useState, useTransition } from "react";
import { deleteReviewAction } from "@/app/actions/reviews";

export function AdminReviewActions({ reviewId }: { reviewId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="space-y-0.5 text-[11px] text-[var(--ae-danger)]">
        <p className="font-semibold leading-5">Remove review?</p>
        <p className="leading-5">
          <button
            type="button"
            disabled={pending}
            className="hover:underline disabled:opacity-60"
            onClick={() => {
              setError(null);
              setConfirming(false);
            }}
          >
            Cancel
          </button>
          <span aria-hidden="true"> · </span>
          <button
            type="button"
            disabled={pending}
            className="hover:underline disabled:opacity-60"
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await deleteReviewAction(reviewId);
                if (result?.error) {
                  setError(result.error);
                  return;
                }
                setConfirming(false);
              });
            }}
          >
            Confirm
          </button>
        </p>
        {error ? <p className="text-xs">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        className="text-[13px] text-[var(--ae-danger)] hover:underline disabled:opacity-60"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
      >
        Remove
      </button>
      {error ? <p className="text-xs text-[var(--ae-danger)]">{error}</p> : null}
    </div>
  );
}
