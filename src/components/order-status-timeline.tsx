import {
  ORDER_STATUS_LABELS,
  ORDER_TIMELINE_STEPS,
  parseStatusHistory,
  type StatusHistoryEntry,
} from "@/lib/orders";
import { OrderStatus, isOrderStatus } from "@/lib/roles";

function formatAt(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function OrderStatusTimeline({
  status,
  statusHistoryJson,
  createdAt,
}: {
  status: string;
  statusHistoryJson?: string | null;
  createdAt: Date;
}) {
  const history = parseStatusHistory(statusHistoryJson);
  const byStatus = new Map<string, StatusHistoryEntry>();
  for (const entry of history) {
    byStatus.set(entry.status, entry);
  }
  if (!byStatus.has(OrderStatus.pending)) {
    byStatus.set(OrderStatus.pending, {
      status: OrderStatus.pending,
      at: createdAt.toISOString(),
    });
  }

  if (status === OrderStatus.cancelled) {
    const cancelled = byStatus.get(OrderStatus.cancelled);
    return (
      <ol className="space-y-3">
        <li className="flex gap-3">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--ae-danger)]" />
          <div>
            <p className="font-medium text-[var(--ae-danger)]">Cancelled</p>
            {cancelled ? (
              <p className="text-xs text-[var(--ae-ink-soft)]">{formatAt(cancelled.at)}</p>
            ) : null}
          </div>
        </li>
      </ol>
    );
  }

  let currentIdx = 0;
  if (isOrderStatus(status)) {
    for (let i = 0; i < ORDER_TIMELINE_STEPS.length; i++) {
      if (ORDER_TIMELINE_STEPS[i] === status) {
        currentIdx = i;
        break;
      }
    }
  }

  return (
    <ol className="space-y-0">
      {ORDER_TIMELINE_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const entry = byStatus.get(step);
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  done ? "bg-[var(--ae-green)]" : "bg-[var(--ae-line)]"
                }`}
              />
              {idx < ORDER_TIMELINE_STEPS.length - 1 ? (
                <span
                  className={`my-1 w-px flex-1 min-h-[1.25rem] ${
                    idx < currentIdx ? "bg-[var(--ae-green)]" : "bg-[var(--ae-line)]"
                  }`}
                />
              ) : null}
            </div>
            <div className="pb-4">
              <p className={`text-sm font-medium ${done ? "text-[var(--ae-ink)]" : "text-[var(--ae-ink-soft)]"}`}>
                {ORDER_STATUS_LABELS[step]}
              </p>
              {entry && done ? (
                <p className="text-xs text-[var(--ae-ink-soft)]">{formatAt(entry.at)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
