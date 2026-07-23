"use server";

import { redirect } from "next/navigation";
import { loginWithPassword, logout, signupCustomer } from "@/lib/auth";
import { safeInternalPath } from "@/lib/safe-redirect";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = safeInternalPath(formData.get("next"), "/");
  const result = await loginWithPassword(email, password);
  if ("error" in result && result.error) {
    return { error: result.error };
  }
  redirect(next);
}

export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const result = await loginWithPassword(email, password);
  if ("error" in result && result.error) {
    return { error: result.error };
  }
  if (result.user?.role !== "ADMIN") {
    await logout();
    return { error: "Admin access required." };
  }
  redirect("/admin");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const result = await signupCustomer(name, email, password);
  if ("error" in result && result.error) {
    return { error: result.error };
  }
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}

export async function adminLogoutAction() {
  await logout();
  redirect("/admin/login");
}
