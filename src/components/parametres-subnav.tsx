"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import type { Permission } from "@/lib/auth/rbac";

export const PARAMETRES_MENUS: {
  href: string;
  label: string;
  permission?: Permission;
}[] = [
  {
    href: "/parametres/entreprise",
    label: "Entreprise & fiscalité",
  },
  {
    href: "/parametres/identite-menu",
    label: "Identité du menu",
  },
  {
    href: "/parametres/produits",
    label: "Catalogue articles & produits",
  },
  {
    href: "/parametres/unites",
    label: "Unités de mesure",
  },
  {
    href: "/parametres/types-clients",
    label: "Types de clients",
  },
  {
    href: "/parametres/points-de-vente",
    label: "Sites",
  },
  {
    href: "/parametres/clients",
    label: "Clients",
  },
  {
    href: "/parametres/fournisseurs",
    label: "Fournisseurs",
  },
  {
    href: "/parametres/balance-agee",
    label: "Balance âgée",
  },
  {
    href: "/parametres/modeles",
    label: "Modèles documents",
  },
  {
    href: "/parametres/configuration",
    label: "Configuration générale",
  },
  {
    href: "/parametres/objectifs-revenu",
    label: "Objectifs de revenu",
  },
  {
    href: "/parametres/objectifs-marge",
    label: "Objectifs de marge",
  },
  {
    href: "/parametres/rentabilite",
    label: "Seuils de rentabilité",
  },
  {
    href: "/parametres/stock-initial",
    label: "Stock initial",
  },
  {
    href: "/parametres/bilan-initial",
    label: "Bilan initial",
  },
  {
    href: "/parametres/utilisateurs",
    label: "Utilisateurs & historiques",
    permission: "users.gerer",
  },
];

/** Sous-menu commun à toutes les pages de paramétrage. */
export function ParametresSubnav() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {PARAMETRES_MENUS.filter(
        (item) => !item.permission || hasPermission(item.permission),
      ).map((item) => {
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
