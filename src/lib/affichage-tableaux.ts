/** Types d'affichage (colonnes) par utilisateur et par tableau. */

export const A4_PORTRAIT_UTILE_MM = 186;

export type TableAffichageId =
  | "achats"
  | "factures"
  | "devis"
  | "commandes"
  | "bons_de_livraison"
  | "acomptes"
  | "clients"
  | "fournisseurs"
  | "stocks"
  | "charges"
  | "inventaires"
  | "compte_courant"
  | "journal_factures"
  | "ca_produits"
  | "ca_objectifs"
  | "marge_objectifs"
  | "marge_produits";

export type ColonneAffichage = {
  id: string;
  label: string;
  /** Largeur estimée (mm) pour le calcul A4 portrait — export PDF uniquement. */
  largeurMm: number;
  obligatoire?: boolean;
};

export type TableAffichageDef = {
  id: TableAffichageId;
  label: string;
  colonnes: ColonneAffichage[];
};

export type TypeAffichage = {
  id: string;
  nom: string;
  colonnes: string[];
  /** Si vrai, l'édition des colonnes est plafonnée à la largeur A4 portrait. */
  contraintePdf: boolean;
};

export type PrefsTableAffichage = {
  types: TypeAffichage[];
  defautId: string | null;
  actifId: string | null;
};

/** userId → tableId → préférences. Isolé par utilisateur, dans le blob tenant. */
export type PreferencesAffichage = Record<
  string,
  Partial<Record<TableAffichageId, PrefsTableAffichage>>
>;

export type PrefsUserAffichage = Partial<
  Record<TableAffichageId, PrefsTableAffichage>
>;

function col(
  id: string,
  label: string,
  largeurMm: number,
  obligatoire = false,
): ColonneAffichage {
  return { id, label, largeurMm, obligatoire };
}

export const TABLES_AFFICHAGE: TableAffichageDef[] = [
  {
    id: "achats",
    label: "Achats",
    colonnes: [
      col("numero", "Numéro", 24, true),
      col("date", "Date", 22),
      col("fournisseur", "Fournisseur", 36),
      col("pointDeVente", "Point de vente", 30),
      col("ht", "HT", 24, true),
      col("livraison", "Livraison", 24),
      col("paiement", "Paiement", 24),
      col("solde", "Solde", 24, true),
    ],
  },
  {
    id: "factures",
    label: "Factures",
    colonnes: [
      col("numero", "N°", 24, true),
      col("type", "Type", 22),
      col("date", "Date", 22),
      col("echeance", "Échéance", 22),
      col("client", "Client", 32),
      col("totalTTC", "Total TTC", 26, true),
      col("avoirs", "Avoirs", 22),
      col("paye", "Payé", 22),
      col("reste", "Reste à payer", 26),
      col("etat", "État", 24),
      col("statut", "Statut doc.", 24),
    ],
  },
  {
    id: "devis",
    label: "Devis",
    colonnes: [
      col("numero", "N°", 24, true),
      col("date", "Date", 22),
      col("client", "Client", 32),
      col("pdv", "PDV", 28),
      col("montant", "Montant", 26, true),
      col("acomptes", "Acomptes", 24),
      col("statut", "Statut", 24),
    ],
  },
  {
    id: "commandes",
    label: "Commandes",
    colonnes: [
      col("numero", "N°", 24, true),
      col("date", "Date", 22),
      col("client", "Client", 32),
      col("totalTTC", "Total TTC", 26, true),
      col("acomptes", "Acomptes", 24),
      col("avancement", "Avancement", 28),
      col("statut", "Statut", 24),
    ],
  },
  {
    id: "bons_de_livraison",
    label: "Bons de livraison",
    colonnes: [
      col("numero", "N°", 24, true),
      col("date", "Date", 22),
      col("client", "Client", 32),
      col("commande", "Commande", 24),
      col("totalTTC", "Total TTC", 26, true),
      col("avancement", "Avancement", 28),
      col("statut", "Statut", 24),
    ],
  },
  {
    id: "acomptes",
    label: "Acomptes",
    colonnes: [
      col("numero", "N°", 24, true),
      col("date", "Date", 22),
      col("client", "Client", 32),
      col("montantTTC", "Montant TTC", 26, true),
      col("mode", "Mode", 24),
      col("liens", "Liens", 36),
      col("statut", "Statut", 24),
    ],
  },
  {
    id: "clients",
    label: "Clients",
    colonnes: [
      col("code", "Code", 18),
      col("nom", "Client", 36, true),
      col("type", "Type", 22),
      col("contact", "Contact", 32),
      col("ca", "CA facturé", 26, true),
      col("acomptes", "Acomptes", 24),
      col("reste", "Reste dû", 24),
      col("statut", "Statut", 20),
    ],
  },
  {
    id: "fournisseurs",
    label: "Fournisseurs",
    colonnes: [
      col("nom", "Fournisseur", 36, true),
      col("specialite", "Spécialité", 28),
      col("contact", "Contact", 32),
      col("entrees", "Entrées", 20),
      col("achats", "Achats cumulés", 26, true),
      col("statut", "Statut", 20),
    ],
  },
  {
    id: "stocks",
    label: "Stocks",
    colonnes: [
      col("produit", "Produit", 40, true),
      col("categorie", "Catégorie", 24),
      col("pointDeVente", "Point de vente", 30),
      col("entrees", "Entrées", 20),
      col("vendues", "Vendues", 20),
      col("restant", "Restant", 22, true),
      col("valeurAchat", "Valeur achat", 26),
      col("valeurVente", "Valeur vente", 26),
    ],
  },
  {
    id: "charges",
    label: "Charges",
    colonnes: [
      col("date", "Date", 22),
      col("libelle", "Libellé", 40, true),
      col("categorie", "Catégorie", 26),
      col("nature", "Nature", 28),
      col("pointDeVente", "Point de vente", 30),
      col("type", "Type", 20),
      col("montant", "Montant", 26, true),
    ],
  },
  {
    id: "inventaires",
    label: "Inventaires",
    colonnes: [
      col("numero", "Numéro", 24, true),
      col("pointDeVente", "Point de vente", 30),
      col("date", "Date", 22),
      col("statut", "Statut", 22),
      col("ecarts", "Écarts", 20),
      col("valeurNette", "Valeur nette", 26, true),
    ],
  },
  {
    id: "compte_courant",
    label: "Compte courant d'associé",
    colonnes: [
      col("date", "Date", 22),
      col("type", "Type", 20),
      col("libelle", "Libellé", 40, true),
      col("montant", "Montant", 26, true),
      col("solde", "Solde après", 26),
      col("saisiPar", "Saisi par", 28),
    ],
  },
  {
    id: "journal_factures",
    label: "Journal d'audit facturation",
    colonnes: [
      col("date", "Date", 24),
      col("action", "Action", 36, true),
      col("numero", "N°", 24, true),
      col("detail", "Détail", 50),
    ],
  },
  {
    id: "ca_produits",
    label: "CA produits",
    colonnes: [
      col("produit", "Produit", 40, true),
      col("quantite", "Quantité vendue", 26),
      col("ca", "Chiffre d'affaires", 28, true),
      col("part", "Part", 20),
    ],
  },
  {
    id: "ca_objectifs",
    label: "CA objectif par point de vente",
    colonnes: [
      col("pdv", "Point de vente", 36, true),
      col("realise", "CA réalisé", 26, true),
      col("objectif", "Objectif", 24),
      col("ecart", "Écart", 24),
      col("atteinte", "Atteinte", 20),
    ],
  },
  {
    id: "marge_objectifs",
    label: "Marge objectif par point de vente",
    colonnes: [
      col("pdv", "Point de vente", 36, true),
      col("realise", "Marge réalisée", 28, true),
      col("objectif", "Objectif", 24),
      col("ecart", "Écart", 24),
      col("atteinte", "Atteinte", 20),
    ],
  },
  {
    id: "marge_produits",
    label: "Marge produits",
    colonnes: [
      col("produit", "Produit", 36, true),
      col("quantite", "Quantité", 22),
      col("ca", "CA", 24, true),
      col("cout", "Coût d'achat", 26),
      col("benefice", "Bénéfice", 26),
      col("part", "Part du bénéfice", 24),
    ],
  },
];

const PAR_ID = new Map(TABLES_AFFICHAGE.map((t) => [t.id, t]));

export function tableAffichage(id: TableAffichageId): TableAffichageDef {
  const t = PAR_ID.get(id);
  if (!t) throw new Error(`Tableau inconnu: ${id}`);
  return t;
}

export function idsColonnes(table: TableAffichageDef): string[] {
  return table.colonnes.map((c) => c.id);
}

export function idsObligatoires(table: TableAffichageDef): string[] {
  return table.colonnes.filter((c) => c.obligatoire).map((c) => c.id);
}

export function largeurColonnesMm(
  table: TableAffichageDef,
  ids: string[],
): number {
  const set = new Set(ids);
  return table.colonnes
    .filter((c) => set.has(c.id))
    .reduce((s, c) => s + c.largeurMm, 0);
}

export function tientDansA4(table: TableAffichageDef, ids: string[]): boolean {
  return largeurColonnesMm(table, ids) <= A4_PORTRAIT_UTILE_MM;
}

export function peutAjouterColonne(
  table: TableAffichageDef,
  idsActuels: string[],
  colonneId: string,
): boolean {
  if (idsActuels.includes(colonneId)) return true;
  return tientDansA4(table, [...idsActuels, colonneId]);
}

/** Retire des colonnes optionnelles (de la fin du catalogue) jusqu'à tenir en A4. */
export function recadrerPourPdf(
  table: TableAffichageDef,
  ids: string[],
): string[] {
  const oblig = idsObligatoires(table);
  const choisis = table.colonnes
    .map((c) => c.id)
    .filter((id) => ids.includes(id) || oblig.includes(id));
  const optionnelles = [...choisis]
    .reverse()
    .filter((id) => !oblig.includes(id));
  let courant = [...choisis];
  for (const id of optionnelles) {
    if (tientDansA4(table, courant)) break;
    courant = courant.filter((x) => x !== id);
  }
  return table.colonnes.map((c) => c.id).filter((id) => courant.includes(id));
}

export function normaliserColonnes(
  table: TableAffichageDef,
  ids: string[],
  contraintePdf: boolean,
): string[] {
  const connus = new Set(idsColonnes(table));
  const oblig = idsObligatoires(table);
  const base = [
    ...oblig,
    ...ids.filter((id) => connus.has(id) && !oblig.includes(id)),
  ];
  const uniques = [...new Set(base)];
  const ordonnes = table.colonnes
    .map((c) => c.id)
    .filter((id) => uniques.includes(id));
  return contraintePdf ? recadrerPourPdf(table, ordonnes) : ordonnes;
}

export function typeStandard(table: TableAffichageDef): TypeAffichage {
  return {
    id: "standard",
    nom: "Standard",
    colonnes: idsColonnes(table),
    contraintePdf: false,
  };
}

export function prefsTableEffectives(
  table: TableAffichageDef,
  prefs: PrefsTableAffichage | undefined,
): PrefsTableAffichage {
  const standard = typeStandard(table);
  if (!prefs?.types?.length) {
    return {
      types: [standard],
      defautId: standard.id,
      actifId: standard.id,
    };
  }
  const types = prefs.types.map((t) => ({
    ...t,
    nom: t.nom.trim() || "Sans nom",
    contraintePdf: Boolean(t.contraintePdf),
    colonnes: normaliserColonnes(table, t.colonnes ?? [], Boolean(t.contraintePdf)),
  }));
  const ids = new Set(types.map((t) => t.id));
  const defautId =
    prefs.defautId && ids.has(prefs.defautId) ? prefs.defautId : types[0].id;
  const actifId =
    prefs.actifId && ids.has(prefs.actifId) ? prefs.actifId : defautId;
  return { types, defautId, actifId };
}

export function typeActif(
  prefs: PrefsTableAffichage,
): TypeAffichage {
  return (
    prefs.types.find((t) => t.id === prefs.actifId) ??
    prefs.types.find((t) => t.id === prefs.defautId) ??
    prefs.types[0]
  );
}

export function colonnesDuType(
  table: TableAffichageDef,
  type: TypeAffichage,
  pourPdf = false,
): ColonneAffichage[] {
  const ids = pourPdf
    ? recadrerPourPdf(table, type.colonnes)
    : normaliserColonnes(table, type.colonnes, false);
  const set = new Set(ids);
  return table.colonnes.filter((c) => set.has(c.id));
}
