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

export function peutServirDeComposantBom(produit: Pick<Produit, "natureStock">) {
  const n = natureStockDuProduit(produit);
  return n === "matiere_premiere" || n === "semi_fini";
}
