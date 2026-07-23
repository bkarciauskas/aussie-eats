import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";

export async function ensureAdmin() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}
