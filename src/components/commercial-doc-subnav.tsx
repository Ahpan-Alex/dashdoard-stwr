"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = { href: string; label: string; exact?: boolean };

export const DEVIS_MENUS: MenuItem[] = [
  { href: "/devis", label: "Nouveau devis", exact: true },
  { href: "/devis/liste", label: "Liste des devis" },
];

export const COMMANDES_MENUS: MenuItem[] = [
  { href: "/commandes", label: "Nouvelle commande", exact: true },
  { href: "/commandes/liste", label: "Liste des commandes" },
];

export const BL_MENUS: MenuItem[] = [
  { href: "/bons-de-livraison", label: "Nouveau BL", exact: true },
  { href: "/bons-de-livraison/liste", label: "Liste des BL" },
];

function CommercialDocSubnav({ menus }: { menus: MenuItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {menus.map((item) => {
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
  );
}

export function DevisSubnav() {
  return <CommercialDocSubnav menus={DEVIS_MENUS} />;
}

export function CommandesSubnav() {
  return <CommercialDocSubnav menus={COMMANDES_MENUS} />;
}

export function BonsDeLivraisonSubnav() {
  return <CommercialDocSubnav menus={BL_MENUS} />;
}
