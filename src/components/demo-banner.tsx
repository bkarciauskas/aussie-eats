"use client";

import Link from "next/link";
import { useDemo } from "@/components/demo-provider";

export function DemoBanner() {
  const { hydrated, enabledScenarios } = useDemo();
  if (!hydrated || enabledScenarios.length === 0) return null;

  return (
    <aside
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-[var(--ae-accent)] bg-[var(--ae-panel)] p-4 shadow-lg"
      data-demo-banner
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ae-accent)]">
        Demo scenario on
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {enabledScenarios.map((scenario) => (
          <li key={scenario.id}>{scenario.title}</li>
        ))}
      </ul>
      <Link href="/demo-admin" className="mt-3 inline-flex text-sm text-[var(--ae-green)] underline">
        Manage in Demo lab
      </Link>
    </aside>
  );
}
