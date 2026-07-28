"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Fish,
  LayoutDashboard,
  PackagePlus,
  Boxes,
  Receipt,
  MapPin,
  FileSpreadsheet,
  Landmark,
  Users,
  Truck,
  FileText,
  ClipboardList,
  Package,
  ScrollText,
  Wallet,
  Briefcase,
  Settings,
  Waves,
  ChevronDown,
  Shield,
  LogOut,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { ROLE_LABELS, type Permission } from "@/lib/auth/rbac";

type NavChild = {
  href: string;
  label: string;
  exact?: boolean;
  permission?: Permission;
};
type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  children?: NavChild[];
  matchPrefixes?: string[];
  permission?: Permission;
  anyOf?: Permission[];
};

const sections: { title: string; links: NavLink[] }[] = [
  {
    title: "Pilotage",
    links: [
      {
        href: "/",
        label: "Tableau de bord",
        icon: LayoutDashboard,
        matchPrefixes: ["/tableau-de-bord"],
        children: [
          {
            href: "/tableau-de-bord/ca-mensuel",
            label: "Chiffre d'affaires mensuel",
          },
          {
            href: "/tableau-de-bord/ca-produits",
            label: "CA produits",
          },
          {
            href: "/tableau-de-bord/ca-objectifs",
            label: "CA objectif par point de vente",
          },
          {
            href: "/tableau-de-bord/rentabilite",
            label: "Rentabilité (2 paliers)",
            permission: "rentabilite.lire",
          },
          {
            href: "/tableau-de-bord/marge",
            label: "Marge produits (historique)",
            permission: "rentabilite.lire",
          },
        ],
      },
      { href: "/bilan", label: "Bilan & résultat", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Exploitation",
    links: [
      { href: "/entrees", label: "Entrées", icon: PackagePlus },
      { href: "/stocks", label: "Stocks", icon: Boxes },
      {
        href: "/charges",
        label: "Charges",
        icon: Receipt,
        permission: "charges.lire",
      },
    ],
  },
  {
    title: "Commercial",
    links: [
      {
        href: "/commercial",
        label: "Vue commerciale",
        icon: Briefcase,
        permission: "commercial.lire",
      },
      {
        href: "/clients",
        label: "Clients",
        icon: Users,
        permission: "clients.lire",
      },
      {
        href: "/fournisseurs",
        label: "Fournisseurs",
        icon: Truck,
        permission: "commercial.lire",
      },
      {
        href: "/devis",
        label: "Devis",
        icon: FileText,
        permission: "commercial.lire",
      },
      {
        href: "/commandes",
        label: "Commandes",
        icon: ClipboardList,
        permission: "commercial.lire",
      },
      {
        href: "/bons-de-livraison",
        label: "Bons de livraison",
        icon: Package,
        permission: "commercial.lire",
      },
      {
        href: "/acomptes",
        label: "Acomptes",
        icon: Wallet,
        permission: "factures.lire",
      },
      {
        href: "/factures",
        label: "Factures",
        icon: ScrollText,
        permission: "factures.lire",
        children: [
          { href: "/factures", label: "Nouvelle facture", exact: true },
          { href: "/factures/liste", label: "Liste des factures" },
          {
            href: "/factures/journal",
            label: "Journal d'audit",
            permission: "audit.lire",
          },
        ],
      },
    ],
  },
  {
    title: "Patrimoine",
    links: [
      { href: "/elements-bilan", label: "Éléments du bilan", icon: Landmark },
      { href: "/points-de-vente", label: "Points de vente", icon: MapPin },
      {
        href: "/parametres",
        label: "Paramétrage",
        icon: Settings,
        permission: "parametres.lire",
        children: [
          {
            href: "/parametres/entreprise",
            label: "Entreprise & fiscalité",
          },
          {
            href: "/parametres/produits",
            label: "Catalogue produits",
            permission: "produits.lire",
          },
          {
            href: "/parametres/points-de-vente",
            label: "Points de vente",
          },
          {
            href: "/parametres/clients",
            label: "Clients",
            permission: "clients.lire",
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
            permission: "rentabilite.lire",
          },
          {
            href: "/parametres/stock-initial",
            label: "Stock initial",
          },
          {
            href: "/parametres/bilan-initial",
            label: "Bilan initial",
          },
        ],
      },
    ],
  },
  {
    title: "Administration",
    links: [
      {
        href: "/administration/utilisateurs",
        label: "Utilisateurs & sécurité",
        icon: Shield,
        anyOf: ["users.gerer", "audit.lire", "securite.gerer"],
        matchPrefixes: ["/administration"],
        children: [
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
        ],
      },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, link: NavLink) {
  if (isActive(pathname, link.href)) return true;
  return (link.matchPrefixes ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function initialOpenState(pathname: string) {
  const open: Record<string, boolean> = {};
  for (const section of sections) {
    for (const link of section.links) {
      if (link.children) {
        open[link.href] = isGroupActive(pathname, link);
      }
    }
  }
  return open;
}

function canSee(
  hasPermission: (p: Permission) => boolean,
  item: { permission?: Permission; anyOf?: Permission[] },
) {
  if (item.anyOf?.length) return item.anyOf.some((p) => hasPermission(p));
  if (item.permission) return hasPermission(item.permission);
  return true;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState(() => initialOpenState(pathname));
  const currentSessionId = useAuthStore((s) => s.currentSessionId);
  const users = useAuthStore((s) => s.users);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const user = currentUser();
  const roleKey = user?.role ?? "anon";

  const visibleSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        links: section.links
          .filter((link) => canSee(hasPermission, link))
          .map((link) => ({
            ...link,
            children: link.children?.filter((c) => canSee(hasPermission, c)),
          })),
      }))
      .filter((s) => s.links.length > 0);
  }, [hasPermission, roleKey, currentSessionId, users]);

  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev };
      for (const section of sections) {
        for (const link of section.links) {
          if (link.children && isGroupActive(pathname, link)) {
            next[link.href] = true;
          }
        }
      }
      return next;
    });
  }, [pathname]);

  return (
    <aside className="no-print flex w-64 shrink-0 flex-col bg-sidebar text-sea-100">
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-600 text-white shadow-lg shadow-sea-900/40">
            <Fish className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-tight text-white">
              STWR
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-sea-300">
              Poissonnerie
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-sea-400">
              {section.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.links.map((link) => {
                const { href, label, icon: Icon, children } = link;

                if (children?.length) {
                  const groupActive = isGroupActive(pathname, link);
                  const isOpen = openMenus[href] ?? false;
                  const parentExact =
                    href === "/" ? pathname === "/" : pathname === href;

                  return (
                    <div key={href}>
                      <div className="flex items-center gap-0.5">
                        <Link
                          href={href}
                          className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            parentExact
                              ? "bg-sea-700 text-white"
                              : groupActive
                                ? "text-white"
                                : "text-sea-200 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-80" />
                          <span className="truncate">{label}</span>
                        </Link>
                        <button
                          type="button"
                          aria-label={
                            isOpen ? "Replier le menu" : "Déplier le menu"
                          }
                          className={`rounded-lg p-2 transition-colors ${
                            groupActive
                              ? "text-white hover:bg-white/10"
                              : "text-sea-300 hover:bg-white/5 hover:text-white"
                          }`}
                          onClick={() =>
                            setOpenMenus((prev) => ({
                              ...prev,
                              [href]: !prev[href],
                            }))
                          }
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isOpen ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                          {children.map((child) => {
                            const childActive = child.exact
                              ? pathname === child.href
                              : isActive(pathname, child.href);
                            return (
                              <Link
                                key={`${child.href}-${child.label}`}
                                href={child.href}
                                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium leading-snug transition-colors ${
                                  childActive
                                    ? "bg-sea-700 text-white"
                                    : "text-sea-300 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-sea-700 text-white"
                        : "text-sea-200 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-4">
        {user && (
          <div className="rounded-lg bg-white/5 p-3">
            <div className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-sea-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {user.nom}
                </p>
                <p className="truncate text-[11px] text-sea-300">
                  {ROLE_LABELS[user.role]}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Link
                    href="/mon-compte"
                    className="rounded px-2 py-1 text-[11px] text-sea-200 hover:bg-white/10 hover:text-white"
                  >
                    Mon compte
                  </Link>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-sea-200 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      logout();
                      router.replace("/login");
                    }}
                  >
                    <LogOut className="h-3 w-3" />
                    Quitter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2 rounded-lg bg-white/5 p-3">
          <Waves className="mt-0.5 h-4 w-4 text-sea-400" />
          <div>
            <p className="text-xs font-semibold text-white">Auth locale (démo)</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-sea-300">
              Session navigateur · RBAC phase 1.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
