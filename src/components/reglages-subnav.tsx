"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENUS = [
  { href: "/reglages/affichage", label: "Types d'affichage" },
  { href: "/reglages/alertes", label: "Alertes", admin: true },
];

export function ReglagesSubnav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {MENUS.filter((m) => !m.admin || admin).map((m) => {
        const actif = pathname === m.href || pathname.startsWith(`${m.href}/`);
        return (
          <Link
            key={m.href}
            href={m.href}
            className={actif ? "btn btn-primary" : "btn btn-secondary"}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
