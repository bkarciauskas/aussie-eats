type Props = {
  rating: number;
  comment: string;
  createdAt: Date;
};

export function OrderReviewPanel({ rating, comment, createdAt }: Props) {
  return (
    <div className="panel mt-4">
      <h2 className="font-display text-xl">Thanks for your review</h2>
      <p className="mt-3 text-lg font-semibold text-[var(--ae-green)]">
        {rating} ★
      </p>
      {comment ? (
        <p className="mt-2 text-sm text-[var(--ae-ink)]">{comment}</p>
      ) : (
        <p className="mt-2 text-sm text-[var(--ae-ink-muted)]">No written comment.</p>
      )}
      <p className="mt-3 text-xs text-[var(--ae-ink-soft)]">
        Submitted{" "}
        {new Intl.DateTimeFormat("en-AU", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(createdAt)}
      </p>
    </div>
  );
}
