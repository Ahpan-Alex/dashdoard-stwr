"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const FACTURES_MENUS = [
  { href: "/factures", label: "Nouvelle facture", exact: true },
  { href: "/factures/liste", label: "Liste des factures" },
  { href: "/factures/journal", label: "Journal d'audit" },
] as const;

/** Sous-menu commun Facturation. */
export function FacturesSubnav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {FACTURES_MENUS.map((item) => {
        const exact = "exact" in item && item.exact;
        const active = exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
