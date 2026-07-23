import Link from "next/link";
import { CityPicker } from "@/components/city-picker";

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-label="AussieEats hero">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-brand">AussieEats</p>
          <h1 className="hero-headline">Australian flavours, delivered nearby.</h1>
          <p className="hero-support">
            Multi-vendor demo across Sydney, Melbourne, Brisbane, Perth, Adelaide, and Hobart —
            AUD pricing, local seed data, zero external food APIs.
          </p>
          <div className="hero-actions">
            <Link href="/restaurants" className="btn-primary">
              Browse restaurants
            </Link>
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="mb-10">
          <h2 className="font-display text-2xl text-[var(--ae-green)]">Choose a demo city</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--ae-ink-muted)]">
            Set a city pin for the session, then browse restaurants seeded for that market. If the
            list looks empty, pick a city below and filter on the restaurants page.
          </p>
          <CityPicker className="mt-4" showBrowseLink />
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h2 className="font-display text-2xl text-[var(--ae-green)]">Find food near you</h2>
            <p className="mt-2 text-sm text-[var(--ae-ink-muted)]">
              Six Australian cities with local suburbs and AUD menus — tap a city above, then browse.
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
