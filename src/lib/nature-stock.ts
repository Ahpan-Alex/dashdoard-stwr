import type { NatureStock, Produit } from "./types";

export const NATURE_STOCK_LABELS: Record<NatureStock, string> = {
  matiere_premiere: "Matière première / article acheté",
  semi_fini: "Produit semi-fini",
  fini: "Produit fini",
};

export function natureStockDuProduit(
  produit: Pick<Produit, "natureStock"> | undefined | null,
): NatureStock {
  return produit?.natureStock ?? "matiere_premiere";
}

export function produitEstFabrique(produit: Pick<Produit, "natureStock">) {
  const n = natureStockDuProduit(produit);
  return n === "semi_fini" || n === "fini";
}

export function produitEstAchetable(produit: Pick<Produit, "natureStock">) {
  return natureStockDuProduit(produit) === "matiere_premiere";
}

export function produitEstVendable(_produit: Pick<Produit, "natureStock">) {
  return true;
}

/** Matière première : achetée, le tarif de vente n'est pas exigé. */
export function prixAchatEstObligatoire(nature: NatureStock) {
  return nature === "matiere_premiere";
}

/** Semi-fini / fini : fabriqués, le tarif d'achat n'est pas exigé. */
export function prixVenteEstObligatoire(nature: NatureStock) {
  return nature === "semi_fini" || nature === "fini";
}

export function peutServirDeComposantBom(produit: Pick<Produit, "natureStock">) {
  const n = natureStockDuProduit(produit);
  return n === "matiere_premiere" || n === "semi_fini";
}
