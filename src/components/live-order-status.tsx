"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pollMyOrderStatusAction } from "@/app/actions/orders";
import { useLocation } from "@/components/location-provider";
import { OrderStatusTimeline } from "@/components/order-status-timeline";
import {
  estimateCourierEta,
  resolveOrderEtaOrigin,
  type CourierEtaResult,
} from "@/lib/eta";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_POLL_MS,
  isTerminalOrderStatus,
  type DeliveryAddress,
} from "@/lib/orders";
import { isOrderStatus } from "@/lib/roles";

type RestaurantPin = {
  lat: number;
  lng: number;
  city?: string | null;
};

function CourierEtaBanner({ eta }: { eta: CourierEtaResult }) {
  if (eta.kind === "unavailable" || eta.kind === "cancelled") return null;

  if (eta.kind === "delivered") {
    return (
      <div
        className="mb-4 rounded-xl bg-[var(--ae-cream)] px-4 py-3"
        data-courier-eta="delivered"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-[var(--ae-green)]">Delivered</p>
        <p className="text-xs text-[var(--ae-ink-muted)]">Thanks for ordering with AussieEats.</p>
      </div>
    );
  }

  return (
    <div
      className="mb-4 rounded-xl bg-[var(--ae-cream)] px-4 py-3"
      data-courier-eta={eta.label}
      aria-live="polite"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--ae-ink-muted)]">
        {eta.headline}
      </p>
      <p className="mt-0.5 font-display text-2xl text-[var(--ae-green)]">{eta.label}</p>
      <p className="mt-1 text-xs text-[var(--ae-ink-soft)]">
        Based on restaurant distance and current status.
      </p>
    </div>
  );
}

export function LiveOrderStatus({
  orderId,
  initialStatus,
  initialStatusHistoryJson,
  createdAt,
  restaurant,
  deliveryAddress,
}: {
  orderId: string;
  initialStatus: string;
  initialStatusHistoryJson?: string | null;
  createdAt: Date | string;
  restaurant: RestaurantPin | null;
  deliveryAddress: Pick<DeliveryAddress, "suburb" | "state">;
}) {
  const router = useRouter();
  const { location, hydrated } = useLocation();
  const [status, setStatus] = useState(initialStatus);
  const [statusHistoryJson, setStatusHistoryJson] = useState(initialStatusHistoryJson ?? null);
  const statusRef = useRef(initialStatus);
  const historyRef = useRef(initialStatusHistoryJson ?? null);
  const createdAtDate = typeof createdAt === "string" ? new Date(createdAt) : createdAt;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    historyRef.current = statusHistoryJson;
  }, [statusHistoryJson]);

  useEffect(() => {
    setStatus(initialStatus);
    setStatusHistoryJson(initialStatusHistoryJson ?? null);
  }, [initialStatus, initialStatusHistoryJson]);

  useEffect(() => {
    if (isTerminalOrderStatus(initialStatus)) return;

    let cancelled = false;
    const tick = async () => {
      const result = await pollMyOrderStatusAction(orderId);
      if (cancelled || !("ok" in result) || !result.ok) return;

      const prevStatus = statusRef.current;
      const prevHistory = historyRef.current;
      if (result.status !== prevStatus || result.statusHistoryJson !== prevHistory) {
        setStatus(result.status);
        setStatusHistoryJson(result.statusHistoryJson);
      }
      if (result.status !== prevStatus) {
        router.refresh();
      }
      if (isTerminalOrderStatus(result.status)) {
        cancelled = true;
      }
    };

    const id = setInterval(() => {
      if (cancelled || isTerminalOrderStatus(statusRef.current)) {
        clearInterval(id);
        return;
      }
      void tick();
    }, ORDER_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId, initialStatus, router]);

  const statusLabel = isOrderStatus(status)
    ? ORDER_STATUS_LABELS[status]
    : status;

  let courierEta: CourierEtaResult = { kind: "unavailable" };
  if (hydrated && restaurant) {
    const origin = resolveOrderEtaOrigin({
      location: location ? { lat: location.lat, lng: location.lng } : null,
      address: deliveryAddress,
      restaurantCity: restaurant.city,
    });
    if (origin) {
      courierEta = estimateCourierEta({
        status,
        originLat: origin.lat,
        originLng: origin.lng,
        restaurantLat: restaurant.lat,
        restaurantLng: restaurant.lng,
      });
    }
  }

  return (
    <div data-live-order-status={status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl">Status</h2>
        <span className="status-pill" data-status={status}>
          {statusLabel}
        </span>
      </div>
      {!isTerminalOrderStatus(status) ? (
        <p className="mt-1 text-xs text-[var(--ae-ink-soft)]" data-live-polling="true">
          Live updates every few seconds
        </p>
      ) : null}
      <div className="mt-4">
        <CourierEtaBanner eta={courierEta} />
        <OrderStatusTimeline
          status={status}
          statusHistoryJson={statusHistoryJson}
          createdAt={createdAtDate}
        />
      </div>
    </div>
  );
}
