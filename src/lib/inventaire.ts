import { calculerStocks, coutAchatMoyen } from "./calculations";
import type {
  CategorieEcartInventaire,
  EntreeStock,
  Inventaire,
  InventaireLigne,
  PointDeVente,
  Produit,
  Vente,
} from "./types";

export const CATEGORIES_ECART: Record<CategorieEcartInventaire, string> = {
  casse: "Casse",
  vol: "Vol",
  perte_fraicheur: "Perte de fraîcheur",
  erreur_saisie: "Erreur de saisie",
  surplus_reception: "Surplus réception",
  difference_comptage: "Différence de comptage",
  autre: "Autre",
};

/** Catégories pertinentes pour un manque (mali). */
export const CATEGORIES_MALI: CategorieEcartInventaire[] = [
  "casse",
  "vol",
  "perte_fraicheur",
  "erreur_saisie",
  "difference_comptage",
  "autre",
];

/** Catégories pertinentes pour un excédent (boni). */
export const CATEGORIES_BONI: CategorieEcartInventaire[] = [
  "surplus_reception",
  "erreur_saisie",
  "difference_comptage",
  "autre",
];

export type TypeEcart = "boni" | "mali" | "conforme";

/** Écart = stock physique − stock théorique (positif = boni, négatif = mali). */
export function ecartLigne(l: Pick<InventaireLigne, "stockPhysique" | "stockTheorique">) {
  return l.stockPhysique - l.stockTheorique;
}

export function typeEcart(
  l: Pick<InventaireLigne, "stockPhysique" | "stockTheorique">,
): TypeEcart {
  const e = ecartLigne(l);
  if (e > 1e-9) return "boni";
  if (e < -1e-9) return "mali";
  return "conforme";
}

/** Valeur de l'écart au coût CUMP (positive = boni, négative = mali). */
export function valeurEcartLigne(l: InventaireLigne) {
  return ecartLigne(l) * l.coutUnitaire;
}

/** Un écart est justifié dès lors qu'il est nul ou porte une catégorie/motif. */
export function ecartJustifie(l: InventaireLigne) {
  if (typeEcart(l) === "conforme") return true;
  return Boolean(l.categorieEcart || (l.motif && l.motif.trim()));
}

export type SyntheseInventaire = {
  nbLignes: number;
  nbEcarts: number;
  nbBonis: number;
  nbMalis: number;
  nbJustifies: number;
  nbNonJustifies: number;
  valeurBoni: number;
  valeurMali: number;
  valeurNette: number;
  toutJustifie: boolean;
};

export function syntheseInventaire(inv: Inventaire): SyntheseInventaire {
  let nbBonis = 0;
  let nbMalis = 0;
  let nbJustifies = 0;
  let valeurBoni = 0;
  let valeurMali = 0;

  for (const l of inv.lignes) {
    const t = typeEcart(l);
    if (t === "conforme") continue;
    const v = valeurEcartLigne(l);
    if (t === "boni") {
      nbBonis += 1;
      valeurBoni += v;
    } else {
      nbMalis += 1;
      valeurMali += v; // négatif
    }
    if (ecartJustifie(l)) nbJustifies += 1;
  }

  const nbEcarts = nbBonis + nbMalis;
  const nbNonJustifies = nbEcarts - nbJustifies;

  return {
    nbLignes: inv.lignes.length,
    nbEcarts,
    nbBonis,
    nbMalis,
    nbJustifies,
    nbNonJustifies,
    valeurBoni,
    valeurMali,
    valeurNette: valeurBoni + valeurMali,
    toutJustifie: nbNonJustifies === 0,
  };
}

/**
 * Prépare les lignes d'inventaire pour un point de vente : stock théorique
 * (CUMP : entrées − sorties) et coût unitaire moyen pondéré figés.
 * Le stock physique est initialisé au théorique (à corriger par le comptage).
 */
export function lignesInventaireInitiales(opts: {
  produits: Produit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  pointDeVenteId: string;
  pointsDeVente: PointDeVente[];
}): InventaireLigne[] {
  const { produits, entrees, ventes, pointDeVenteId, pointsDeVente } = opts;
  const lignes = calculerStocks(
    produits,
    entrees,
    ventes,
    pointDeVenteId,
    pointsDeVente,
  );
  return lignes.map((l) => {
    const coutUnitaire =
      l.quantiteRestante > 0
        ? l.valeurAchat / l.quantiteRestante
        : coutAchatMoyen(l.produit.id, pointDeVenteId, entrees, l.produit);
    return {
      produitId: l.produit.id,
      stockTheorique: l.quantiteRestante,
      stockPhysique: l.quantiteRestante,
      coutUnitaire,
    };
  });
}

/** Génère le prochain numéro d'inventaire (INV-AAAA-####). */
export function nextNumeroInventaire(inventaires: Inventaire[]) {
  const year = new Date().getFullYear();
  const re = new RegExp(`^INV-${year}-(\\d+)$`);
  let max = 0;
  for (const inv of inventaires) {
    const m = inv.numero.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `INV-${year}-${String(max + 1).padStart(4, "0")}`;
}
