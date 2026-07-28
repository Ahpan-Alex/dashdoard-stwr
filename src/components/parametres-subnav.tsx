"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const PARAMETRES_MENUS = [
  {
    href: "/parametres/entreprise",
    label: "Entreprise & fiscalité",
  },
  {
    href: "/parametres/produits",
    label: "Catalogue produits",
  },
  {
    href: "/parametres/points-de-vente",
    label: "Points de vente",
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
    href: "/parametres/modeles",
    label: "Modèles documents",
  },
  {
    href: "/parametres/objectifs-revenu",
    label: "Objectifs de revenu",
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
] as const;

/** Sous-menu commun à toutes les pages de paramétrage. */
export function ParametresSubnav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {PARAMETRES_MENUS.map((item) => {
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
