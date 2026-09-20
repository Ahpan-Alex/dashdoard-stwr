import type { Permission } from "@/lib/auth/rbac";

export type ParametreItem = {
  href: string;
  label: string;
  description?: string;
  permission?: Permission;
  anyOf?: Permission[];
  exact?: boolean;
  /** Masqué dans les menus, conservé pour le routage / la détection de section. */
  hidden?: boolean;
  children?: ParametreItem[];
};

export type ParametreSection = {
  id: string;
  href: string;
  label: string;
  description: string;
  permission?: Permission;
  anyOf?: Permission[];
  aliases?: string[];
  groupe: "reglages" | "referentiel";
  items: ParametreItem[];
};

/**
 * Quatre blocs de réglages (décisions rares). Pas de sous-arbre dans la sidebar.
 */
export const REGLAGES_SECTIONS: ParametreSection[] = [
  {
    id: "societe",
    href: "/parametres/entreprise",
    label: "Société",
    description:
      "Identité légale, régime fiscal, logo des documents et nom affiché dans le menu.",
    groupe: "reglages",
    aliases: ["/parametres/identite-menu", "/parametres/general", "/parametres/societe"],
    items: [
      {
        href: "/parametres/entreprise",
        label: "Entreprise / fiscalité",
        description: "Identité légale, régime fiscal, TVA, logo et signature.",
        exact: true,
      },
      {
        href: "/parametres/identite-menu",
        label: "Identité du menu",
        description: "Nom et logo de la colonne de navigation.",
        permission: "parametres.lire",
      },
    ],
  },
  {
    id: "pilotage",
    href: "/parametres/pilotage",
    label: "Pilotage",
    description: "Objectifs de CA et de marge, seuils de rentabilité, alertes in-app.",
    groupe: "reglages",
    aliases: [
      "/parametres/alertes",
      "/parametres/objectifs-revenu",
      "/parametres/objectifs-marge",
      "/parametres/rentabilite",
      "/reglages/alertes",
    ],
    items: [],
  },
  {
    id: "documents",
    href: "/parametres/documents-commerciaux",
    label: "Documents",
    description: "Modèles, colonnes des tableaux et numérotation des pièces.",
    groupe: "reglages",
    aliases: [
      "/parametres/modeles",
      "/parametres/affichage",
      "/parametres/configuration/numerotation",
      "/reglages/affichage",
    ],
    items: [
      {
        href: "/parametres/modeles",
        label: "Modèles",
        description: "Mise en page, pied de page, mention TVA, signature.",
      },
      {
        href: "/parametres/affichage",
        label: "Affichage",
        description: "Colonnes des tableaux et export A4.",
      },
      {
        href: "/parametres/documents-commerciaux",
        label: "Numérotation",
        description: "Préfixe, date et longueur — une ligne par type de pièce.",
        exact: true,
      },
    ],
  },
  {
    id: "comptabilite",
    href: "/parametres/comptabilite",
    label: "Compta",
    description: "Longueur des numéros de compte et exercices comptables.",
    permission: "comptabilite.lire",
    groupe: "reglages",
    aliases: ["/parametres/configuration"],
    items: [
      {
        href: "/parametres/comptabilite",
        label: "Comptes",
        description: "Longueur des numéros de compte.",
        exact: true,
        permission: "comptabilite.lire",
      },
      {
        href: "/parametres/configuration/exercices",
        label: "Exercices",
        description: "Année civile ou exercice à cheval.",
      },
    ],
  },
];

/**
 * Listes du quotidien — restent des écrans métier, plus des « paramètres éclatés ».
 */
export const REFERENTIEL_SECTIONS: ParametreSection[] = [
  {
    id: "catalogue",
    href: "/parametres/produits",
    label: "Catalogue",
    description: "Familles, fiches articles, import, circuit achat / vente.",
    permission: "produits.lire",
    groupe: "referentiel",
    items: [
      {
        href: "/parametres/produits",
        label: "Fiches articles",
        exact: true,
        permission: "produits.lire",
      },
      {
        href: "/parametres/produits/import",
        label: "Import catalogue",
        permission: "produits.gerer",
      },
      {
        href: "/parametres/unites",
        label: "Unités de mesure",
        permission: "produits.lire",
      },
    ],
  },
  {
    id: "tiers",
    href: "/parametres/tiers",
    label: "Tiers",
    description: "Clients, fournisseurs, types et balance âgée.",
    groupe: "referentiel",
    items: [
      {
        href: "/parametres/clients",
        label: "Clients",
        description: "Fiches clients, plafonds de crédit et compte 411.",
        permission: "clients.lire",
      },
      {
        href: "/parametres/fournisseurs",
        label: "Fournisseurs",
        description: "Fiches fournisseurs et compte 401.",
      },
      {
        href: "/parametres/types-clients",
        label: "Types de clients",
        permission: "clients.lire",
      },
      {
        href: "/parametres/balance-agee",
        label: "Balance âgée",
        permission: "parametres.gerer",
      },
    ],
  },
  {
    id: "sites",
    href: "/parametres/points-de-vente",
    label: "Sites",
    description: "Entrepôts, points de vente et ateliers.",
    groupe: "referentiel",
    items: [],
  },
  {
    id: "tresorerie",
    href: "/parametres/tresorerie",
    label: "Trésorerie",
    description: "Comptes de caisse, banque, mobile monnaie et modes de paiement.",
    permission: "parametres.gerer",
    groupe: "referentiel",
    items: [],
  },
  {
    id: "achats",
    href: "/parametres/achats",
    label: "Achats",
    description: "Types d'achat, natures de dépenses de mission, validité des DP.",
    anyOf: ["achats.lire", "achats.gerer", "parametres.lire"],
    groupe: "referentiel",
    items: [],
  },
  {
    id: "stock",
    href: "/parametres/stock",
    label: "Stock",
    description: "Stock initial et délai d'alerte des transferts.",
    groupe: "referentiel",
    items: [
      {
        href: "/parametres/stock-initial",
        label: "Stock initial",
        description: "Quantités et valeurs d'ouverture par site.",
      },
    ],
  },
  {
    id: "fabrication",
    href: "/parametres/fabrication",
    label: "Fabrication",
    description: "Taux MOD, capacité atelier, BAT et règles de clôture.",
    groupe: "referentiel",
    items: [
      {
        href: "/parametres/bat",
        label: "Bons à tirer",
        description: "Rôle habilité à valider un BAT.",
        hidden: true,
      },
    ],
  },
  {
    id: "recuperation",
    href: "/parametres/recuperation",
    label: "Récupération des données",
    description:
      "Liste des fichiers à emporter si vous quittez Négoo, et où les retrouver.",
    permission: "parametres.lire",
    groupe: "referentiel",
    items: [],
  },
  {
    id: "audit",
    href: "/parametres/audit",
    label: "Rétention journal métier",
    description: "Durée de conservation des actions sensibles.",
    permission: "audit.lire",
    groupe: "referentiel",
    items: [],
  },
];

export const PARAMETRES_SECTIONS: ParametreSection[] = [
  ...REGLAGES_SECTIONS,
  ...REFERENTIEL_SECTIONS,
];

/** Entrées courtes du menu latéral Paramètres. */
export const SIDEBAR_PARAMETRES: ParametreItem[] = [
  {
    href: "/parametres",
    label: "Réglages",
    description: "Société, pilotage, documents, compta.",
    exact: true,
    permission: "parametres.lire",
  },
  {
    href: "/parametres/recuperation",
    label: "Récupération des données",
    permission: "parametres.lire",
  },
  {
    href: "/parametres/produits",
    label: "Catalogue",
    permission: "produits.lire",
    children: [
      {
        href: "/parametres/produits",
        label: "Fiches articles",
        exact: true,
        permission: "produits.lire",
      },
      {
        href: "/parametres/produits/import",
        label: "Import catalogue",
        permission: "produits.gerer",
      },
    ],
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
    href: "/parametres/points-de-vente",
    label: "Sites",
  },
  {
    href: "/parametres/tresorerie",
    label: "Trésorerie",
    permission: "parametres.gerer",
  },
];

export function aplatirItems(items: ParametreItem[]): ParametreItem[] {
  const out: ParametreItem[] = [];
  for (const item of items) {
    out.push(item);
    if (item.children?.length) out.push(...aplatirItems(item.children));
  }
  return out;
}

export const PARAMETRES_MENUS: ParametreItem[] = PARAMETRES_SECTIONS.flatMap(
  (section) => [
    {
      href: section.href,
      label: section.label,
      description: section.description,
      permission: section.permission,
      anyOf: section.anyOf,
    },
    ...section.items.filter((item) => !item.hidden),
  ],
);

function cheminMatche(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function parametresSectionPourChemin(
  pathname: string,
): ParametreSection | undefined {
  let meilleur: { section: ParametreSection; score: number } | undefined;

  function retenir(section: ParametreSection, href: string, exact?: boolean) {
    if (!cheminMatche(pathname, href, exact)) return;
    const score = href.length;
    if (!meilleur || score > meilleur.score) meilleur = { section, score };
  }

  for (const section of PARAMETRES_SECTIONS) {
    retenir(section, section.href);
    for (const alias of section.aliases ?? []) {
      retenir(section, alias);
    }
    for (const item of aplatirItems(section.items)) {
      retenir(section, item.href, item.exact);
    }
  }

  if (pathname === "/parametres") return undefined;
  return meilleur?.section;
}

export function itemParametresActif(
  pathname: string,
  item: ParametreItem,
): boolean {
  if (cheminMatche(pathname, item.href, item.exact)) return true;
  return (item.children ?? []).some((c) => itemParametresActif(pathname, c));
}

export function hrefSeuilsAlertes(
  module: "stock" | "production" | "achat" | "vente" = "stock",
) {
  return `/parametres/pilotage?onglet=alertes&module=${module}`;
}

export function hrefObjectifsPilotage() {
  return "/parametres/pilotage?onglet=objectifs";
}
