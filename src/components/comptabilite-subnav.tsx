"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENUS = [
  { href: "/comptabilite/plan", label: "Plan comptable" },
  { href: "/comptabilite/journaux", label: "Journaux" },
  { href: "/comptabilite/transfert", label: "Transfert" },
] as const;

export function ComptabiliteSubnav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {MENUS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/comptabilite/journaux" &&
            pathname === "/comptabilite/ecritures");
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
