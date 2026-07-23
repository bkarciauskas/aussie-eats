import Link from "next/link";
import { LoginForm } from "@/components/login-form";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next = "/" } = await searchParams;

  return (
    <div className="page-shell">
      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl text-[var(--ae-green)]">Welcome back</h1>
        <p className="mt-2 text-[var(--ae-ink-muted)]">
          Customer login ·{" "}
          <Link href="/signup" className="underline">
            Create an account
          </Link>
        </p>
      </div>
      <LoginForm next={next.startsWith("/") ? next : "/"} />
    </div>
  );
}
