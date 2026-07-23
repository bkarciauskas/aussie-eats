"use client";

import { useState, useTransition } from "react";
import { adminLoginAction, loginAction } from "@/app/actions/auth";

type Props = {
  mode?: "customer" | "admin";
  next?: string;
  demoEmail?: string;
  demoPassword?: string;
};

export function LoginForm({
  mode = "customer",
  next = "/",
  demoEmail = "demo@aussieeats.local",
  demoPassword = "demo1234",
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const action = mode === "admin" ? adminLoginAction : loginAction;

  return (
    <form
      className="panel mx-auto w-full max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await action(fd);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" required defaultValue={demoEmail} autoComplete="username" />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          required
          defaultValue={demoPassword}
          autoComplete="current-password"
        />
      </label>
      <div className="rounded-lg bg-[var(--ae-cream)] px-3 py-2 text-xs text-[var(--ae-ink-soft)]">
        Demo mode — credentials pre-filled for presenter walkthroughs.
      </div>
      {error ? <p className="text-sm text-[var(--ae-danger)]">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
