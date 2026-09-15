import type {
  CategorieProduit,
  NatureStock,
  Produit,
  UsageCommercialProduit,
} from "./types";

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

export function estUsageCommercial(
  value: unknown,
): value is UsageCommercialProduit {
  return value === "achat" || value === "vente" || value === "achat_vente";
}

export function natureStockDuProduit(
  produit: Pick<Produit, "natureStock"> | undefined | null,
): NatureStock {
  return produit?.natureStock ?? "matiere_premiere";
}

type ProduitUsage = Pick<Produit, "natureStock" | "usageCommercial"> & {
  categorieId?: string;
};

export function usageCommercialDeLaFamille(
  categorieId: string | undefined,
  categories: CategorieProduit[] | undefined | null,
): UsageCommercialProduit {
  if (!categorieId || !categories?.length) return "achat_vente";
  const guard = new Set<string>();
  let current = categories.find((c) => c.id === categorieId);
  while (current && !guard.has(current.id)) {
    if (estUsageCommercial(current.usageCommercial)) return current.usageCommercial;
    guard.add(current.id);
    current = current.parentId
      ? categories.find((c) => c.id === current!.parentId)
      : undefined;
  }
  return "achat_vente";
}

export function contraindreUsageParFamille(
  usageProduit: UsageCommercialProduit,
  usageFamille: UsageCommercialProduit,
): UsageCommercialProduit {
  if (usageFamille === "achat_vente") return usageProduit;
  return usageFamille;
}

function usagePropreProduit(
  produit: Pick<Produit, "natureStock" | "usageCommercial"> | undefined | null,
): UsageCommercialProduit {
  const raw = produit?.usageCommercial;
  if (estUsageCommercial(raw)) return raw;
  return natureStockDuProduit(produit) === "matiere_premiere"
    ? "achat_vente"
    : "vente";
}

export function usageCommercialDuProduit(
  produit: ProduitUsage | undefined | null,
  categories?: CategorieProduit[] | null,
): UsageCommercialProduit {
  const propre = usagePropreProduit(produit);
  const categorieId = produit?.categorieId;
  if (!categories?.length || !categorieId) return propre;
  return contraindreUsageParFamille(
    propre,
    usageCommercialDeLaFamille(categorieId, categories),
  );
}

export function produitEstFabrique(produit: Pick<Produit, "natureStock">) {
  const n = natureStockDuProduit(produit);
  return n === "semi_fini" || n === "fini";
}

export function produitEstAchetable(
  produit: ProduitUsage,
  categories?: CategorieProduit[] | null,
) {
  const u = usageCommercialDuProduit(produit, categories);
  return u === "achat" || u === "achat_vente";
}

export function produitEstVendable(
  produit: ProduitUsage,
  categories?: CategorieProduit[] | null,
) {
  const u = usageCommercialDuProduit(produit, categories);
  return u === "vente" || u === "achat_vente";
}

export function familleEstAchetable(
  categorieId: string | undefined,
  categories: CategorieProduit[] | undefined | null,
) {
  const u = usageCommercialDeLaFamille(categorieId, categories);
  return u === "achat" || u === "achat_vente";
}

export function familleEstVendable(
  categorieId: string | undefined,
  categories: CategorieProduit[] | undefined | null,
) {
  const u = usageCommercialDeLaFamille(categorieId, categories);
  return u === "vente" || u === "achat_vente";
}

export function prixAchatEstObligatoire(
  produit: ProduitUsage,
  categories?: CategorieProduit[] | null,
) {
  return produitEstAchetable(produit, categories);
}

export function prixVenteEstObligatoire(
  produit: ProduitUsage,
  categories?: CategorieProduit[] | null,
) {
  return produitEstVendable(produit, categories);
}

export function peutServirDeComposantBom(produit: Pick<Produit, "natureStock">) {
  const n = natureStockDuProduit(produit);
  return n === "matiere_premiere" || n === "semi_fini";
}
