"use client";

import Link from "next/link";
import { DEMO_SCENARIOS } from "@/lib/demo/scenarios";
import { useDemo } from "@/components/demo-provider";

export function DemoLab() {
  const { hydrated, isEnabled, setScenarioEnabled, clearAll, enabledScenarios } = useDemo();
  const anyOn = enabledScenarios.length > 0;

  return (
    <div className="page-shell max-w-3xl">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-[var(--ae-ink-muted)]">
          <Link href="/" className="underline">
            Storefront
          </Link>
        </p>
        {hydrated && anyOn ? (
          <button type="button" className="nav-link" onClick={clearAll}>
            Turn all off
          </button>
        ) : null}
      </div>
      <h1 className="mt-6 font-display text-4xl text-[var(--ae-green)]">Demo lab</h1>
      <p className="mt-3 max-w-2xl text-[var(--ae-ink-muted)]">
        Turn storefront faults on for a Cursor capability demo. They live in this browser only.
        Turn them off to go back to a healthy cart. No git restore.
      </p>

      <ul className="mt-10 space-y-6">
        {DEMO_SCENARIOS.map((scenario) => {
          const on = hydrated && isEnabled(scenario.id);
          return (
            <li key={scenario.id} className="panel space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--ae-ink-soft)]">
                    {scenario.capability}
                  </p>
                  <h2 className="mt-1 font-display text-2xl">{scenario.title}</h2>
                  <p className="mt-2 text-sm text-[var(--ae-ink-muted)]">{scenario.summary}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={!hydrated}
                  data-demo-toggle={scenario.id}
                  onClick={() => setScenarioEnabled(scenario.id, !on)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                    on
                      ? "bg-[var(--ae-accent)] text-white"
                      : "border border-[var(--ae-line)] bg-transparent text-[var(--ae-ink-muted)]"
                  }`}
                >
                  {on ? "On" : "Off"}
                </button>
              </div>
              <div>
                <p className="text-sm font-medium">Reproduce</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[var(--ae-ink-muted)]">
                  {scenario.reproduce.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
