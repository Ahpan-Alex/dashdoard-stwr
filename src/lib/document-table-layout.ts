import {
  COLONNES_VISIBLES_DEFAUT,
  type ColonneArticleId,
} from "@/lib/document-templates";

/** A4 portrait : 210 mm − 2 × 12 mm de marge interne. */
export const A4_PORTRAIT_MM = 210;
export const A4_PAYSAGE_MM = 297;
export const MARGE_DOCUMENT_MM = 12;
export const A4_PORTRAIT_UTILE_MM = A4_PORTRAIT_MM - MARGE_DOCUMENT_MM * 2;
export const HAUTEUR_A4_MM = 297;
export const HAUTEUR_UTILE_A4_MM = HAUTEUR_A4_MM - MARGE_DOCUMENT_MM * 2;

/**
 * Poids relatifs selon le contenu typique, pas une largeur fixe.
 * « Désignation » absorbe le reliquat ; Qté / Remise % restent étroites.
 */
export const POIDS_COLONNE_ARTICLE: Record<ColonneArticleId, number> = {
  code: 11,
  designation: 32,
  pu_ht: 13,
  pu_ttc: 13,
  remise_pct: 7,
  remise_ht: 12,
  pu_ht_remise: 12,
  pu_ttc_remise: 12,
  unite: 10,
  quantite: 6,
  total_ht: 13,
  total_ht_remise: 14,
  tva_pct: 8,
  tva_montant: 12,
  total_ttc: 13,
  mesure: 10,
};

export const COLONNES_NUMERIQUES_ARTICLE: ColonneArticleId[] = [
  "pu_ht",
  "pu_ttc",
  "remise_pct",
  "remise_ht",
  "pu_ht_remise",
  "pu_ttc_remise",
  "quantite",
  "total_ht",
  "total_ht_remise",
  "tva_pct",
  "tva_montant",
  "total_ttc",
];

export function estColonneNumeriqueArticle(id: ColonneArticleId): boolean {
  return COLONNES_NUMERIQUES_ARTICLE.includes(id);
}

/** Répartit 100 % de la largeur utile ; la dernière colonne absorbe l'arrondi. */
export function largeursColonnesPourcent(
  ids: ColonneArticleId[],
): Record<string, number> {
  if (ids.length === 0) return {};
  const poids = ids.map((id) => POIDS_COLONNE_ARTICLE[id] ?? 10);
  const total = poids.reduce((s, p) => s + p, 0) || 1;
  const result: Record<string, number> = {};
  let acc = 0;
  ids.forEach((id, i) => {
    if (i === ids.length - 1) {
      result[id] = Math.round((100 - acc) * 100) / 100;
      return;
    }
    const pct = Math.round((poids[i] / total) * 10000) / 100;
    result[id] = pct;
    acc += pct;
  });
  return result;
}

export function largeursColonnesMm(
  ids: ColonneArticleId[],
  utileMm = A4_PORTRAIT_UTILE_MM,
): Record<string, number> {
  const pct = largeursColonnesPourcent(ids);
  const result: Record<string, number> = {};
  for (const id of ids) {
    result[id] = Math.round(((pct[id] ?? 0) / 100) * utileMm * 100) / 100;
  }
  return result;
}

/** 7+ colonnes : police de tableau un peu plus petite, document inchangé. */
export function classeDensiteTableau(nbColonnes: number): string {
  if (nbColonnes >= 8) return "doc-table-dense";
  if (nbColonnes >= 6) return "doc-table-compact";
  return "";
}

/**
 * Estimation conservative de la hauteur (en-tête + lignes + pied).
 * Sert à vérifier qu'une 2e page n'apparaît que si le contenu déborde vraiment.
 */
export function estimationHauteurDocumentMm(nbLignesArticles: number): number {
  const entete = 92;
  const headerTableau = 9;
  const ligne = 7;
  const totaux = 28;
  const pied = 72;
  return entete + headerTableau + Math.max(nbLignesArticles, 1) * ligne + totaux + pied;
}

export function documentNecessiteSecondePage(nbLignesArticles: number): boolean {
  return estimationHauteurDocumentMm(nbLignesArticles) > HAUTEUR_UTILE_A4_MM;
}

export function colonnesArticleDefaut(): ColonneArticleId[] {
  return [...COLONNES_VISIBLES_DEFAUT];
}
