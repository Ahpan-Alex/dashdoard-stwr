import type { NatureStock, Produit, UsageCommercialProduit } from "./types";

export const NATURE_STOCK_LABELS: Record<NatureStock, string> = {
  matiere_premiere: "Matière première / article acheté",
  semi_fini: "Produit semi-fini",
  fini: "Produit fini",
};

export const USAGE_COMMERCIAL_LABELS: Record<UsageCommercialProduit, string> = {
  achat: "Peut être acheté",
  vente: "Peut être vendu",
  achat_vente: "Acheté et vendu",
};

export const USAGES_COMMERCIAUX: UsageCommercialProduit[] = [
  "achat",
  "vente",
  "achat_vente",
];

export function natureStockDuProduit(
  produit: Pick<Produit, "natureStock"> | undefined | null,
): NatureStock {
  return produit?.natureStock ?? "matiere_premiere";
}

export function usageCommercialDuProduit(
  produit:
    | Pick<Produit, "natureStock" | "usageCommercial">
    | undefined
    | null,
): UsageCommercialProduit {
  const raw = produit?.usageCommercial;
  if (raw === "achat" || raw === "vente" || raw === "achat_vente") return raw;
  return natureStockDuProduit(produit) === "matiere_premiere"
    ? "achat_vente"
    : "vente";
}

export function produitEstFabrique(produit: Pick<Produit, "natureStock">) {
  const n = natureStockDuProduit(produit);
  return n === "semi_fini" || n === "fini";
}

export function produitEstAchetable(
  produit: Pick<Produit, "natureStock" | "usageCommercial">,
) {
  const u = usageCommercialDuProduit(produit);
  return u === "achat" || u === "achat_vente";
}

export function produitEstVendable(
  produit: Pick<Produit, "natureStock" | "usageCommercial">,
) {
  const u = usageCommercialDuProduit(produit);
  return u === "vente" || u === "achat_vente";
}

export function prixAchatEstObligatoire(
  produit: Pick<Produit, "natureStock" | "usageCommercial">,
) {
  return produitEstAchetable(produit);
}

export function prixVenteEstObligatoire(
  produit: Pick<Produit, "natureStock" | "usageCommercial">,
) {
  return produitEstVendable(produit);
}

export function peutServirDeComposantBom(produit: Pick<Produit, "natureStock">) {
  const n = natureStockDuProduit(produit);
  return n === "matiere_premiere" || n === "semi_fini";
}
