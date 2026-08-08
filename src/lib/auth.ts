import {
  ApiError,
  apiFetch,
  authResponseSchema,
  okResponseSchema,
} from "@/lib/api";
import { clearSession, establishSession, getAccessToken } from "@/lib/session";

function authFailureMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.detail || fallback;
  }
  return fallback;
}

export async function loginWithPassword(email: string, password: string) {
  try {
    const auth = await apiFetch("/auth/login", {
      method: "POST",
      body: { email, password },
      schema: authResponseSchema,
    });
    await establishSession(auth);
    return {
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role,
      },
    };
  } catch (err) {
    return { error: authFailureMessage(err, "Invalid email or password.") };
  }
}

export async function signupCustomer(name: string, email: string, password: string) {
  const trimmedName = name.trim();
  const normalizedEmail = email.toLowerCase().trim();
  if (!trimmedName) {
    return { error: "Name is required." as const };
  }
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { error: "Please enter a valid email address." as const };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." as const };
  }

  try {
    const auth = await apiFetch("/auth/signup", {
      method: "POST",
      body: { name: trimmedName, email: normalizedEmail, password },
      schema: authResponseSchema,
    });
    await establishSession(auth);
    return {
      user: {
        id: auth.user.id,
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role,
      },
    };
  } catch (err) {
    return {
      error: authFailureMessage(err, "Unable to create account. Please try again."),
    };
  }
}

export async function logout() {
  const token = await getAccessToken();
  if (token) {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        token,
        schema: okResponseSchema,
      });
    } catch {
      // JWT is client-held; always clear the local session even if the ACK fails.
    }
  }
  await clearSession();
}
