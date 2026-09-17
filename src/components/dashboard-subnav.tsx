"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/auth-store";
import { useDashboardFiltres } from "@/lib/dashboard-filtres";

const SECTIONS = [
  { href: "/dashboard", label: "Vue d'ensemble", exact: true },
  {
    href: "/dashboard/production",
    label: "Production",
    permission: "produits.lire" as const,
  },
  {
    href: "/dashboard/stock",
    label: "Stock",
    permission: "produits.lire" as const,
  },
  {
    href: "/dashboard/achats",
    label: "Achats",
    anyOf: ["achats.lire", "missions.lire"] as const,
  },
  {
    href: "/dashboard/ventes",
    label: "Ventes & Rentabilité",
    permission: "rentabilite.lire" as const,
  },
];

export function DashboardSubnav() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const preset = useDashboardFiltres((s) => s.preset);
  const debut = useDashboardFiltres((s) => s.debut);
  const fin = useDashboardFiltres((s) => s.fin);
  const setPreset = useDashboardFiltres((s) => s.setPreset);
  const setDates = useDashboardFiltres((s) => s.setDates);

  const visibles = SECTIONS.filter((item) => {
    if ("anyOf" in item && item.anyOf) {
      return item.anyOf.some((p) => hasPermission(p));
    }
    if ("permission" in item && item.permission) {
      return hasPermission(item.permission);
    }
    return true;
  });

  return (
    <div className="mb-6 space-y-3">
      <nav className="flex flex-wrap gap-2">
        {visibles.map((item) => {
          const active = item.exact
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
      <div className="flex flex-wrap items-end gap-2">
        {(["mois", "annee"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={`btn ${preset === p ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setPreset(p)}
          >
            {p === "mois" ? "Mois" : "Année"}
          </button>
        ))}
        <label className="text-xs font-semibold text-muted">
          Du
          <input
            type="date"
            className="input mt-1"
            value={format(debut, "yyyy-MM-dd")}
            onChange={(e) => setDates(new Date(e.target.value), fin)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={format(fin, "yyyy-MM-dd")}
            onChange={(e) => setDates(debut, new Date(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
