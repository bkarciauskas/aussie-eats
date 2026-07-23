"use client";

import { useState, useTransition } from "react";
import { updateOrderStatusAction } from "@/app/actions/orders";
import { ALLOWED_TRANSITIONS, ORDER_STATUS_LABELS } from "@/lib/orders";
import { OrderStatus } from "@/lib/roles";

export function AdminOrderStatus({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const next = ALLOWED_TRANSITIONS[status];

  if (!next.length) {
    return (
      <span className="status-pill" data-status={status}>
        {ORDER_STATUS_LABELS[status]}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span className="status-pill" data-status={status}>
        {ORDER_STATUS_LABELS[status]}
      </span>
      <div className="flex flex-wrap gap-1">
        {next.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            className="rounded border border-[var(--ae-line)] bg-white px-2 py-0.5 text-xs hover:border-[var(--ae-green)]"
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await updateOrderStatusAction(orderId, s);
                if (result?.error) setError(result.error);
              });
            }}
          >
            → {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {error ? <p className="text-xs text-[var(--ae-danger)]">{error}</p> : null}
    </div>
  );
}
