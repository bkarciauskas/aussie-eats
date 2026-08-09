import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@/lib/roles";

export type SessionData = {
  userId?: string;
  email?: string;
  name?: string;
  role?: Role;
  /** True when the session came from guest checkout (no password account). */
  isGuest?: boolean;
  /** Backend JWT from FastAPI /auth/login, /auth/signup, or /auth/guest. */
  accessToken?: string;
  isLoggedIn: boolean;
};

export type SessionAuthPayload = {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    isGuest?: boolean;
  };
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

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.accessToken) {
    return null;
  }
  return session.accessToken;
}

/** Persist FastAPI auth response into the iron-session cookie (user fields + JWT). */
export async function establishSession(auth: SessionAuthPayload) {
  const session = await getSession();
  session.userId = auth.user.id;
  session.email = auth.user.email;
  session.name = auth.user.name;
  session.role = auth.user.role;
  session.isGuest = Boolean(auth.user.isGuest);
  session.accessToken = auth.access_token;
  session.isLoggedIn = true;
  await session.save();
}

export async function clearSession() {
  const session = await getSession();
  session.destroy();
}

export async function requireUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.accessToken) {
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
