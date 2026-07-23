import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/roles";
import { getSession } from "@/lib/session";

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return { error: "Invalid email or password." as const };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: "Invalid email or password." as const };
  }

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.name = user.name;
  session.role = user.role as Role;
  session.isLoggedIn = true;
  await session.save();

  return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function signupCustomer(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (existing) {
    return { error: "An account with that email already exists." as const };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." as const };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.name = user.name;
  session.role = user.role as Role;
  session.isLoggedIn = true;
  await session.save();

  return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}
