"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import type { Permission } from "@/lib/auth/rbac";

const MENUS: {
  href: string;
  label: string;
  permission: Permission;
}[] = [
  {
    href: "/administration/utilisateurs",
    label: "Utilisateurs",
    permission: "users.gerer",
  },
  {
    href: "/administration/roles",
    label: "Rôles & permissions",
    permission: "users.gerer",
  },
  {
    href: "/administration/sessions",
    label: "Sessions",
    permission: "securite.gerer",
  },
  {
    href: "/administration/audit",
    label: "Journal d'audit",
    permission: "audit.lire",
  },
];

export function AdminSubnav() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentSessionId = useAuthStore((s) => s.currentSessionId);
  void currentSessionId;
  const items = MENUS.filter((m) => hasPermission(m.permission));

  if (!items.length) return null;

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
