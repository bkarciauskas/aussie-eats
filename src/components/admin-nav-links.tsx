"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", match: (path: string) => path === "/admin" },
  {
    href: "/admin/restaurants",
    label: "Restaurants",
    match: (path: string) => path.startsWith("/admin/restaurants"),
  },
  {
    href: "/admin/orders",
    label: "Orders",
    match: (path: string) => path.startsWith("/admin/orders"),
  },
  {
    href: "/admin/reviews",
    label: "Reviews",
    match: (path: string) => path.startsWith("/admin/reviews"),
  },
] as const;

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 text-sm" aria-label="Admin">
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "nav-link font-semibold text-[var(--ae-ink)] underline" : "nav-link"}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
