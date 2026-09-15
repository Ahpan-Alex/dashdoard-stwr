"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PIECES_NUMEROTEES } from "@/lib/numerotation-pieces";

export const CONFIGURATION_MENUS = [
  {
    href: "/parametres/configuration/exercices",
    label: "Exercices comptables",
  },
  {
    href: "/parametres/configuration/numerotation",
    label: "Gestion n° des pièces",
  },
] as const;

export const NUMEROTATION_MENUS = [
  {
    href: "/parametres/configuration/numerotation/initiale",
    label: "Numérotation initiale",
  },
  ...PIECES_NUMEROTEES.map((p) => ({
    href: `/parametres/configuration/numerotation/${p.slug}`,
    label: p.label,
  })),
  {
    href: "/parametres/configuration/numerotation/facture-fournisseur",
    label: "Facture fournisseur",
  },
] as const;

function Pills({
  items,
}: {
  items: readonly { href: string; label: string }[];
}) {
  const pathname = usePathname();
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

export function ConfigurationSubnav() {
  return <Pills items={CONFIGURATION_MENUS} />;
}

export function NumerotationSubnav() {
  return <Pills items={NUMEROTATION_MENUS} />;
}
