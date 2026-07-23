"use client";

import { useState, useTransition } from "react";
import { signupAction } from "@/app/actions/auth";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="panel mx-auto w-full max-w-md space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await signupAction(fd);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <label className="field">
        <span>Name</span>
        <input name="name" required placeholder="Your name" />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" required minLength={6} autoComplete="new-password" />
      </label>
      {error ? <p className="text-sm text-[var(--ae-danger)]">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
