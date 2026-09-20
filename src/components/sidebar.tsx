"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  MapPin,
  BookOpen,
  Landmark,
  Users,
  FileText,
  ClipboardList,
  Package,
  PackageOpen,
  ScrollText,
  Wallet,
  ArrowLeftRight,
  Factory,
  Banknote,
  Briefcase,
  Archive,
  Settings,
  Waves,
  ChevronDown,
  Shield,
  ClipboardCheck,
  LogOut,
  UserRound,
  Bell,
  CreditCard,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { libelleRoles, rolesFromStored, type Permission } from "@/lib/auth/rbac";
import {
  ACOMPTE_STATUTS,
  BL_STATUTS,
  COMMANDE_STATUTS,
  DEVIS_STATUTS,
  FACTURE_STATUTS,
  compterDocumentsParStatut,
  couleurStatutDocument,
} from "@/lib/commercial";
import { useStore } from "@/lib/store";
import { nomAfficheMenu } from "@/lib/identite-navigation";
import { moduleComptabiliteActif } from "@/lib/comptabilite";
import { BP_STATUTS, moduleBonDePreparationActif } from "@/lib/bon-de-preparation";
import { SIDEBAR_PARAMETRES, type ParametreItem } from "@/lib/parametres-menus";
import { AlertesCloche } from "./alertes-cloche";
import { LogoNegoo, LogoNegooMark } from "./logo-negoo";
import { useAlertes } from "@/lib/use-alertes";

type NavChild = {
  href: string;
  label: string;
  exact?: boolean;
  permission?: Permission;
  anyOf?: Permission[];
  children?: NavChild[];
};

function parametreItemVersNav(item: ParametreItem): NavChild {
  return {
    href: item.href,
    label: item.label,
    permission: item.permission,
    anyOf: item.anyOf,
    exact: item.exact,
    children: item.children
      ?.filter((c) => !c.hidden)
      .map(parametreItemVersNav),
  };
}
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
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        matchPrefixes: ["/dashboard", "/tableau-de-bord"],
        children: [
          {
            href: "/dashboard",
            label: "Vue d'ensemble",
            exact: true,
          },
          {
            href: "/dashboard/production",
            label: "Production",
            permission: "produits.lire",
          },
          {
            href: "/dashboard/stock",
            label: "Stock",
            permission: "produits.lire",
          },
          {
            href: "/dashboard/achats",
            label: "Achats",
            anyOf: ["achats.lire", "missions.lire"],
          },
          {
            href: "/dashboard/ventes",
            label: "Ventes & Rentabilité",
            permission: "rentabilite.lire",
          },
        ],
      },
      { href: "/alertes", label: "Alertes", icon: Bell, matchPrefixes: ["/alertes"],
        children: [
          { href: "/alertes", label: "Stock", exact: true },
          { href: "/alertes/production", label: "Production", permission: "produits.lire" },
          { href: "/alertes/achats", label: "Achats" },
          { href: "/alertes/ventes", label: "Ventes", permission: "factures.lire" },
        ],
      },
    ],
  },
  {
    title: "Exploitation",
    links: [
      { href: "/achats", label: "Achats", icon: ShoppingCart, matchPrefixes: ["/achats", "/demandes-prix", "/besoins-achat"],
        anyOf: ["achats.lire", "achats.gerer"],
        children: [
          { href: "/achats", label: "Commandes fournisseurs", exact: true },
          { href: "/demandes-prix", label: "Demandes de prix" },
          { href: "/besoins-achat", label: "Besoins d'achat" },
          { href: "/achats/delais-livraison", label: "Délais de livraison" },
          { href: "/achats/lots", label: "Paiements groupés" },
          { href: "/documents", label: "Historique documents", exact: true },
        ],
      },
      { href: "/stocks", label: "Stocks", icon: Boxes },
      {
        href: "/transferts",
        label: "Transferts de stock",
        icon: ArrowLeftRight,
        matchPrefixes: ["/transferts"],
        children: [
          { href: "/transferts", label: "Transferts", exact: true },
          { href: "/transferts/historique", label: "Historique par article" },
        ],
      },
      {
        href: "/fabrication",
        label: "Fabrication",
        icon: Factory,
        matchPrefixes: ["/fabrication"],
        children: [
          { href: "/fabrication", label: "Ordres de fabrication", exact: true },
          {
            href: "/fabrication/transferts-matiere",
            label: "Transferts matière OF",
          },
          {
            href: "/fabrication/sorties-atelier",
            label: "Sorties atelier",
          },
        ],
      },
      {
        href: "/missions",
        label: "Missions d'achat",
        icon: Banknote,
        anyOf: ["missions.lire", "missions.gerer"],
        matchPrefixes: ["/missions"],
        children: [
          { href: "/missions", label: "Missions", exact: true },
          { href: "/missions/suivi", label: "Suivi des avances" },
        ],
      },
      {
        href: "/inventaires",
        label: "Inventaires",
        icon: ClipboardCheck,
        permission: "produits.lire",
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
        href: "/documents/ventes",
        label: "Historique documents",
        icon: Archive,
      },
      {
        href: "/tiers",
        label: "Tiers",
        icon: Users,
        permission: "clients.lire",
        children: [
          { href: "/tiers", label: "Tous les tiers", exact: true },
          { href: "/tiers/import", label: "Import initial", permission: "clients.gerer" },
          { href: "/clients", label: "Clients" },
          { href: "/fournisseurs", label: "Fournisseurs" },
        ],
      },
      {
        href: "/devis",
        label: "Devis",
        icon: FileText,
        permission: "commercial.lire",
        children: [
          { href: "/devis", label: "Nouveau devis", exact: true },
          { href: "/devis/liste", label: "Liste des devis" },
        ],
      },
      {
        href: "/commandes",
        label: "Commandes",
        icon: ClipboardList,
        permission: "commercial.lire",
        children: [
          { href: "/commandes", label: "Nouvelle commande", exact: true },
          { href: "/commandes/liste", label: "Liste des commandes" },
          { href: "/commandes/bat", label: "Bons à tirer" },
        ],
      },
      {
        href: "/bons-de-preparation",
        label: "Bons de préparation",
        icon: PackageOpen,
        permission: "commercial.lire",
        children: [
          { href: "/bons-de-preparation", label: "Nouveau BP", exact: true },
          { href: "/bons-de-preparation/liste", label: "Liste des BP" },
        ],
      },
      {
        href: "/bons-de-livraison",
        label: "Bons de livraison",
        icon: Package,
        permission: "commercial.lire",
        children: [
          { href: "/bons-de-livraison", label: "Nouveau BL", exact: true },
          { href: "/bons-de-livraison/liste", label: "Liste des BL" },
        ],
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
          {
            href: "/relances",
            label: "Relances impayés",
            icon: Bell,
            permission: "factures.lire",
          },
    ],
  },
  {
    title: "Trésorerie",
    links: [
      {
        href: "/tresorerie",
        label: "Trésorerie",
        icon: CreditCard,
        matchPrefixes: ["/tresorerie"],
        anyOf: ["factures.encaisser", "achats.lire", "comptabilite.lire"],
        children: [
          { href: "/tresorerie", label: "Soldes", exact: true },
          { href: "/tresorerie/echeancier", label: "Échéancier" },
          { href: "/tresorerie/cheques-proches", label: "Chèques à échéance proche" },
          { href: "/tresorerie/mouvements", label: "Mouvements" },
          { href: "/tresorerie/rapprochement", label: "Rapprochement" },
        ],
      },
    ],
  },
  {
    title: "Comptabilité",
    links: [
      {
        href: "/comptabilite",
        label: "Comptabilité",
        icon: BookOpen,
        permission: "comptabilite.lire",
        matchPrefixes: ["/comptabilite"],
        children: [
          {
            href: "/comptabilite/plan",
            label: "Plan comptable",
            exact: true,
          },
          {
            href: "/comptabilite/journaux",
            label: "Journaux",
          },
          {
            href: "/comptabilite/transfert",
            label: "Transfert",
          },
          {
            href: "/comptabilite/produits-sans-compte",
            label: "Produits sans compte",
          },
        ],
      },
    ],
  },
  {
    title: "Patrimoine",
    links: [
      { href: "/elements-bilan", label: "Éléments du bilan", icon: Landmark },
      {
        href: "/compte-courant",
        label: "Compte courant d'associé",
        icon: ArrowLeftRight,
      },
      { href: "/points-de-vente", label: "Sites", icon: MapPin },
      {
        href: "/parametres",
        label: "Paramètres",
        icon: Settings,
        permission: "parametres.lire",
        matchPrefixes: ["/parametres", "/reglages"],
        children: SIDEBAR_PARAMETRES.map(parametreItemVersNav),
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
            href: "/administration/journal-audit",
            label: "Journal métier",
            permission: "audit.lire",
          },
          {
            href: "/administration/audit",
            label: "Journal connexion",
            permission: "audit.lire",
          },
        ],
      },
    ],
  },
];

export const NAV_SECTIONS = sections;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function childIsActive(pathname: string, child: NavChild): boolean {
  const self = child.exact
    ? pathname === child.href
    : isActive(pathname, child.href);
  return (
    self || (child.children ?? []).some((c) => childIsActive(pathname, c))
  );
}

function isGroupActive(pathname: string, link: NavLink) {
  if (isActive(pathname, link.href)) return true;
  if ((link.matchPrefixes ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )) {
    return true;
  }
  return (link.children ?? []).some((child) => childIsActive(pathname, child));
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

function StatusPastilles({
  docs,
  labels,
  listeHref,
}: {
  docs: { statut: string }[];
  labels: Record<string, string>;
  /** Liste cible, ex. /devis/liste */
  listeHref: string;
}) {
  const router = useRouter();
  const counts = compterDocumentsParStatut(docs);

  // Boutons (pas <Link>) : évite les <a> imbriqués dans la nav et l’erreur d’hydratation.
  if (!counts.length) {
    return (
      <button
        type="button"
        className="badge badge-muted ml-auto shrink-0 cursor-pointer hover:opacity-90"
        title="Voir la liste"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          router.push(listeHref);
        }}
      >
        0
      </button>
    );
  }
  return (
    <span className="ml-auto flex max-w-[7.5rem] flex-wrap justify-end gap-0.5">
      {counts.map(({ statut, count }) => (
        <button
          type="button"
          key={statut}
          className={`badge badge-${couleurStatutDocument(statut)} cursor-pointer transition-opacity hover:opacity-90`}
          title={`${labels[statut] ?? statut} : ${count} — ouvrir la liste`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(
              `${listeHref}?statut=${encodeURIComponent(statut)}`,
            );
          }}
        >
          {count}
        </button>
      ))}
    </span>
  );
}

function AlertesNavCount() {
  const { compteur } = useAlertes();
  if (compteur <= 0) return null;
  return (
    <span className="ml-auto shrink-0 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-4 text-white">
      {compteur > 99 ? "99+" : compteur}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState(() => initialOpenState(pathname));
  const currentSessionId = useAuthStore((s) => s.currentSessionId);
  const userState = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const user = currentUser();
  const roleKey = user
    ? rolesFromStored(user.role, user.roles).join("|")
    : "anon";

  const devis = useStore((s) => s.devis);
  const commandes = useStore((s) => s.commandes);
  const bonsDeLivraison = useStore((s) => s.bonsDeLivraison);
  const bonsDePreparation = useStore((s) => s.bonsDePreparation ?? []);
  const acomptes = useStore((s) => s.acomptes);
  const factures = useStore((s) => s.factures);
  const identiteNavigation = useStore((s) => s.identiteNavigation);
  const moduleCompta = useStore((s) =>
    moduleComptabiliteActif(s.parametres),
  );
  const moduleBp = useStore((s) =>
    moduleBonDePreparationActif(s.parametres),
  );

  const pastillesParHref = useMemo(() => {
    return {
      "/devis": (
        <StatusPastilles
          docs={devis}
          labels={DEVIS_STATUTS}
          listeHref="/devis/liste"
        />
      ),
      "/commandes": (
        <StatusPastilles
          docs={commandes}
          labels={COMMANDE_STATUTS}
          listeHref="/commandes/liste"
        />
      ),
      "/bons-de-livraison": (
        <StatusPastilles
          docs={bonsDeLivraison}
          labels={BL_STATUTS}
          listeHref="/bons-de-livraison/liste"
        />
      ),
      "/bons-de-preparation": (
        <StatusPastilles
          docs={bonsDePreparation}
          labels={BP_STATUTS}
          listeHref="/bons-de-preparation/liste"
        />
      ),
      "/acomptes": (
        <StatusPastilles
          docs={acomptes}
          labels={ACOMPTE_STATUTS}
          listeHref="/acomptes"
        />
      ),
      "/factures": (
        <StatusPastilles
          docs={factures}
          labels={FACTURE_STATUTS}
          listeHref="/factures/liste"
        />
      ),
      "/alertes": <AlertesNavCount />,
    } as Record<string, ReactNode>;
  }, [devis, commandes, bonsDeLivraison, bonsDePreparation, acomptes, factures]);

  const visibleSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        links: section.links
          .filter((link) => canSee(hasPermission, link))
          .filter((link) => moduleBp || link.href !== "/bons-de-preparation")
          .map((link) => ({
            ...link,
            children: link.children
              ?.filter((c) => canSee(hasPermission, c))
              .filter(
                (c) =>
                  moduleCompta || c.href !== "/parametres/comptabilite",
              )
              .map((c) => ({
                ...c,
                children: c.children
                  ?.filter((n) => canSee(hasPermission, n))
                  .map((n) => ({
                    ...n,
                    children: n.children?.filter((d) =>
                      canSee(hasPermission, d),
                    ),
                  })),
              })),
          })),
      }))
      .filter((s) => s.links.length > 0)
      .filter((s) => moduleCompta || s.title !== "Comptabilité");
  }, [hasPermission, roleKey, currentSessionId, userState, moduleCompta, moduleBp]);

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
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {identiteNavigation?.logoDataUrl ||
            identiteNavigation?.nom?.trim() ? (
              <div className="flex items-center gap-3">
                {identiteNavigation?.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={identiteNavigation.logoDataUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-lg shadow-sea-900/40"
                  />
                ) : (
                  <LogoNegooMark className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-sea-900/40" />
                )}
                <div className="min-w-0">
                  <p
                    className="truncate font-display text-lg font-semibold leading-tight text-white"
                    title={nomAfficheMenu(identiteNavigation)}
                  >
                    {nomAfficheMenu(identiteNavigation)}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-sea-300">
                    Navigation
                  </p>
                </div>
              </div>
            ) : (
              <LogoNegoo
                tone="onDark"
                showTagline={false}
                className="w-[158px] max-w-full"
              />
            )}
          </div>
          <AlertesCloche />
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

                  return (
                    <div key={href}>
                      <div className="flex items-center gap-0.5">
                        <Link
                          href={href}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                            groupActive
                              ? "bg-sea-700 text-white shadow-sm"
                              : "text-sea-200 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-80" />
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                        {pastillesParHref[href]}
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
                        <div className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-white/15 pl-2">
                          {children.map((child) => {
                            const childExact = child.exact
                              ? pathname === child.href
                              : isActive(pathname, child.href);
                            const childActive = childIsActive(pathname, child);
                            const nested = child.children ?? [];
                            return (
                              <div key={`${child.href}-${child.label}`}>
                                <Link
                                  href={child.href}
                                  className={`block px-2 py-1 text-[12px] leading-snug transition-colors ${
                                    childExact
                                      ? "font-semibold text-white underline decoration-sea-400 underline-offset-4"
                                      : childActive
                                        ? "font-medium text-white"
                                        : "text-sea-300 hover:text-white"
                                  }`}
                                >
                                  {child.label}
                                </Link>
                                {nested.length > 0 && childActive && (
                                  <div className="ml-3 mt-0.5 flex flex-col gap-px pl-2">
                                    {nested.map((n) => {
                                      const nestedExact = n.exact
                                        ? pathname === n.href
                                        : isActive(pathname, n.href);
                                      const nestedActive = childIsActive(
                                        pathname,
                                        n,
                                      );
                                      const deep = n.children ?? [];
                                      return (
                                        <div key={`${n.href}-${n.label}`}>
                                          <Link
                                            href={n.href}
                                            className={`block py-0.5 pl-1 text-[11px] leading-snug transition-colors ${
                                              nestedExact
                                                ? "font-medium text-sea-100"
                                                : nestedActive
                                                  ? "text-sea-100"
                                                  : "text-sea-400 hover:text-sea-100"
                                            }`}
                                          >
                                            {n.label}
                                          </Link>
                                          {deep.length > 0 && nestedActive && (
                                            <div className="ml-2 mt-0.5 flex flex-col gap-px pl-2">
                                              {deep.map((d) => {
                                                const deepActive = d.exact
                                                  ? pathname === d.href
                                                  : isActive(pathname, d.href);
                                                return (
                                                  <Link
                                                    key={`${d.href}-${d.label}`}
                                                    href={d.href}
                                                    className={`py-0.5 text-[11px] leading-snug transition-colors ${
                                                      deepActive
                                                        ? "text-sea-100"
                                                        : "text-sea-500 hover:text-sea-200"
                                                    }`}
                                                  >
                                                    {d.label}
                                                  </Link>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = isActive(pathname, href);
                const pastilles = pastillesParHref[href];
                if (pastilles) {
                  return (
                    <div key={href} className="flex items-center gap-0.5">
                      <Link
                        href={href}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? "bg-sea-700 text-white shadow-sm"
                            : "text-sea-200 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      </Link>
                      {pastilles}
                    </div>
                  );
                }
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-sea-700 text-white shadow-sm"
                        : "text-sea-200 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
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
              {user.photoData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoData}
                  alt=""
                  className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/20"
                />
              ) : (
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-sea-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {user.nom}
                </p>
                <p className="truncate text-[11px] text-sea-300">
                  {libelleRoles(rolesFromStored(user.role, user.roles))}
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
                      void logout().then(() => router.replace("/login"));
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
            <p className="text-xs font-semibold text-white">Auth serveur</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-sea-300">
              Session cookie · API Node · RBAC.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
