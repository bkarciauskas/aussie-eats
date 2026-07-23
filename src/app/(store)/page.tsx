import Link from "next/link";
import { SydneyLocationButton } from "@/components/sydney-location-button";

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-label="AussieEats hero">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-brand">AussieEats</p>
          <h1 className="hero-headline">Sydney flavours, delivered nearby.</h1>
          <p className="hero-support">
            Multi-vendor demo with AUD pricing, local seed data, and zero calls to external food APIs.
          </p>
          <div className="hero-actions">
            <Link href="/restaurants" className="btn-primary">
              Browse Sydney
            </Link>
            <SydneyLocationButton className="btn-secondary" label="Use Sydney demo location" />
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h2 className="font-display text-2xl text-[var(--ae-green)]">Find food near you</h2>
            <p className="mt-2 text-sm text-[var(--ae-ink-muted)]">
              If the restaurant list looks empty, your browser location may be far from Sydney—tap
              “Use Sydney demo location” above, then browse.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl text-[var(--ae-green)]">Order in minutes</h2>
            <p className="mt-2 text-sm text-[var(--ae-ink-muted)]">
              Build a cart, check out with Pay on delivery, and track status from pending through
              delivered.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl text-[var(--ae-green)]">Run the admin</h2>
            <p className="mt-2 text-sm text-[var(--ae-ink-muted)]">
              Open <Link href="/admin" className="underline">/admin</Link> to manage restaurants,
              menus, and order status for the same local SQLite data.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
