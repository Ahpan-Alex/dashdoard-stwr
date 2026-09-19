import type { Permission } from "@/lib/auth/rbac";
import { PIECES_NUMEROTEES } from "@/lib/numerotation-pieces";

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
  items: ParametreItem[];
};

const NUMEROTATION_CHILDREN: ParametreItem[] = [
  {
    href: "/parametres/configuration/numerotation/initiale",
    label: "Numérotation initiale",
  },
  ...PIECES_NUMEROTEES.map((p) => ({
    href: `/parametres/configuration/numerotation/${p.slug}`,
    label: p.label,
  })),
];

/**
 * Sections du menu Paramètres, dans l'ordre des menus principaux
 * (Général en tête, puis Pilotage → Exploitation → Commercial → Comptabilité).
 */
export const PARAMETRES_SECTIONS: ParametreSection[] = [
  {
    id: "general",
    href: "/parametres/general",
    label: "Général",
    description:
      "Identité de l'entreprise, catalogue, configuration transverse et objectifs.",
    items: [
      {
        href: "/parametres/entreprise",
        label: "Infos Entreprise / Fiscalité",
        description: "Identité légale, régime fiscal, TVA, logo et signature.",
      },
      {
        href: "/parametres/identite-menu",
        label: "Identité du menu",
        description: "Nom et logo affichés dans la colonne de navigation.",
        permission: "parametres.lire",
      },
      {
        href: "/parametres/produits",
        label: "Catalogue de produits et articles",
        description: "Familles, fiches articles, circuit achat / vente.",
        permission: "produits.lire",
      },
      {
        href: "/parametres/unites",
        label: "Unités de mesure",
        description: "Unités utilisées sur le catalogue et les documents.",
        permission: "produits.lire",
      },
      {
        href: "/parametres/configuration",
        label: "Configuration générale",
        description: "Exercices comptables et numérotation des pièces.",
        children: [
          {
            href: "/parametres/configuration/exercices",
            label: "Exercices comptables",
            exact: true,
          },
          {
            href: "/parametres/configuration/numerotation",
            label: "Gestion n° des pièces",
            children: NUMEROTATION_CHILDREN,
          },
        ],
      },
      {
        href: "/administration/utilisateurs",
        label: "Utilisateurs",
        description: "Comptes, rôles et mots de passe — réservé à l'administrateur.",
        permission: "users.gerer",
      },
      {
        href: "/parametres/utilisateurs",
        label: "Historique",
        description: "Connexions, actions d'accès et journal métier.",
        permission: "users.gerer",
      },
      {
        href: "/parametres/points-de-vente",
        label: "Points de vente",
        description: "Sites, entrepôts, points de vente et ateliers.",
      },
      {
        href: "/parametres/objectifs-revenu",
        label: "Objectif de revenu",
        description: "Objectifs de chiffre d'affaires par site.",
      },
      {
        href: "/parametres/objectifs-marge",
        label: "Objectif de marge",
        description: "Objectifs de marge par site.",
        permission: "rentabilite.lire",
      },
      {
        href: "/parametres/rentabilite",
        label: "Seuils de rentabilité",
        description: "Paliers d'alerte affichés au Dashboard.",
        permission: "rentabilite.lire",
      },
    ],
  },
  {
    id: "alertes",
    href: "/parametres/alertes",
    label: "Alertes",
    description:
      "Seuils et délais des notifications in-app, par module (Stock, Production, Achats, Ventes).",
    permission: "parametres.gerer",
    aliases: ["/reglages/alertes"],
    items: [
      {
        href: "/parametres/alertes",
        label: "Stock",
        description: "Rupture, stock dormant et écart CUMP.",
        exact: true,
      },
      {
        href: "/parametres/alertes/production",
        label: "Production",
        description: "Retard OF, écart matière, surcharge atelier.",
      },
      {
        href: "/parametres/alertes/achats",
        label: "Achats",
        description: "Échéances fournisseur, missions, 471, demandes de prix.",
      },
      {
        href: "/parametres/alertes/ventes",
        label: "Ventes",
        description: "Balance âgée et anticipation du plafond de crédit.",
      },
    ],
  },
  {
    id: "achats",
    href: "/parametres/achats",
    label: "Achats",
    description:
      "Demandes de prix, types d'achat, natures de dépenses de mission, délai des missions ouvertes et numérotation des factures fournisseur.",
    anyOf: ["achats.lire", "achats.gerer", "parametres.lire"],
    items: [
      {
        href: "/parametres/configuration/numerotation/facture-fournisseur",
        label: "Numérotation facture fournisseur",
        description: "Le n° repris est celui de la facture fournisseur saisie.",
      },
    ],
  },
  {
    id: "stock",
    href: "/parametres/stock",
    label: "Stock",
    description: "Ouverture des stocks et délai d'alerte des transferts inter-sites.",
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
    description: "Nomenclatures, ateliers, BAT, délai des OF non clôturés et règles de clôture.",
    items: [
      {
        href: "/parametres/bat",
        label: "Bons à tirer",
        description: "Délai de relance et rôle habilité à valider.",
      },
    ],
  },
  {
    id: "tiers",
    href: "/parametres/tiers",
    label: "Tiers",
    description:
      "Fiches clients et fournisseurs, types, balance âgée et comptes 401 / 411.",
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
        description: "Catégories commerciales rattachées aux fiches clients.",
        permission: "clients.lire",
      },
      {
        href: "/parametres/balance-agee",
        label: "Balance âgée",
        description: "Tranches d'ancienneté des créances et dettes.",
        permission: "parametres.gerer",
      },
    ],
  },
  {
    id: "documents",
    href: "/parametres/documents-commerciaux",
    label: "Documents commerciaux",
    description:
      "Modèles, mise en page, pied de page, colonnes des tableaux et export A4.",
    aliases: ["/reglages/affichage"],
    items: [
      {
        href: "/parametres/modeles",
        label: "Modèles de documents",
        description:
          "Mise en page, pied de page, mention TVA optionnelle, signature.",
      },
      {
        href: "/parametres/bat",
        label: "Bons à tirer",
        description: "Délai de relance et rôle habilité à valider un BAT.",
      },
      {
        href: "/parametres/affichage",
        label: "Types d'affichage",
        description: "Colonnes des tableaux, types d'affichage et export A4.",
      },
    ],
  },
  {
    id: "tresorerie",
    href: "/parametres/tresorerie",
    label: "Trésorerie",
    description:
      "Comptes de caisse, banque et mobile monnaie, et modes de paiement paramétrables.",
    permission: "parametres.gerer",
    items: [
      {
        href: "/parametres/tresorerie",
        label: "Comptes et modes",
        description: "Comptes de trésorerie par site et catalogue des modes.",
        exact: true,
      },
    ],
  },
  {
    id: "comptabilite",
    href: "/parametres/comptabilite",
    label: "Comptabilité",
    description:
      "Longueur des numéros de compte, plan comptable, TVA et exercices.",
    permission: "comptabilite.lire",
    aliases: ["/parametres/bilan-initial"],
    items: [
      {
        href: "/comptabilite/plan",
        label: "Plan comptable",
        description: "Import PCG 2005 / CSV et comptes obligatoires TVA.",
        permission: "comptabilite.lire",
      },
      {
        href: "/parametres/configuration/exercices",
        label: "Exercices comptables",
        description: "Année civile ou exercice à cheval.",
      },
      {
        href: "/comptabilite/journaux",
        label: "Journaux",
        description: "Consultation des journaux d'écritures.",
        permission: "comptabilite.lire",
      },
      {
        href: "/comptabilite/transfert",
        label: "Transfert",
        description: "Transfert des pièces vers la comptabilité.",
        permission: "comptabilite.lire",
      },
      {
        href: "/comptabilite/produits-sans-compte",
        label: "Produits sans compte",
        description: "Articles sans compte de charge (classe 6) et/ou de vente (classe 7).",
        permission: "comptabilite.lire",
      },
    ],
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
  if (pathname.startsWith("/parametres/")) {
    return meilleur?.section ?? PARAMETRES_SECTIONS[0];
  }
  return meilleur?.section;
}

export function itemParametresActif(
  pathname: string,
  item: ParametreItem,
): boolean {
  if (cheminMatche(pathname, item.href, item.exact)) return true;
  return (item.children ?? []).some((c) => itemParametresActif(pathname, c));
}
