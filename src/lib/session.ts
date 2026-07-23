import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@/lib/roles";

export type SessionData = {
  userId?: string;
  email?: string;
  name?: string;
  role?: Role;
  isLoggedIn: boolean;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long_demo",
  cookieName: "aussieeats_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    return null;
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (!session || session.role !== Role.ADMIN) {
    return null;
  }
  return session;
}
