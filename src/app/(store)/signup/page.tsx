import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <div className="page-shell">
      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl text-[var(--ae-green)]">Create account</h1>
        <p className="mt-2 text-[var(--ae-ink-muted)]">
          Already have one?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
