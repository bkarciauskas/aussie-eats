import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSession } from "@/lib/session";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session.isLoggedIn && session.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl text-[var(--ae-green)]">Admin sign in</h1>
        <p className="mt-2 text-sm text-[var(--ae-ink-muted)]">
          Separate admin session · admin@aussieeats.local / admin1234
        </p>
      </div>
      <LoginForm
        mode="admin"
        demoEmail="admin@aussieeats.local"
        demoPassword="admin1234"
      />
    </div>
  );
}
