"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES_ALERTES } from "@/lib/alertes";
import { useAuthStore } from "@/lib/auth-store";

export function AlertesSubnav({
  hrefParametres,
}: {
  hrefParametres?: string;
}) {
  const pathname = usePathname();
  const peutConfigurer = useAuthStore((s) => s.hasPermission("parametres.gerer"));

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
      <nav className="flex flex-wrap gap-2">
        {MODULES_ALERTES.map((item) => {
          const active =
            item.id === "stock"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {peutConfigurer && hrefParametres ? (
        <Link href={hrefParametres} className="btn btn-secondary">
          Configurer
        </Link>
      ) : null}
    </div>
  );
}
