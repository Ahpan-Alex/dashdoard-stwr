import type {
  CategorieProduit,
  NatureStock,
  Produit,
  UsageCommercialProduit,
} from "./types";

export const NATURES_STOCK: NatureStock[] = [
  "matiere_premiere",
  "marchandise",
  "semi_fini",
  "fini",
];

export const NATURE_STOCK_LABELS: Record<NatureStock, string> = {
  matiere_premiere: "Matière première",
  marchandise: "Marchandise standard",
  semi_fini: "Produit semi-fini",
  fini: "Produit fini",
};

export const USAGE_COMMERCIAL_LABELS: Record<UsageCommercialProduit, string> = {
  achat: "Peut être acheté",
  vente: "Peut être vendu",
  achat_vente: "Acheté et vendu",
};

export const USAGE_COMMERCIAL_FAMILLE_LABELS: Record<
  UsageCommercialProduit,
  string
> = {
  achat: "Achetés",
  vente: "Vendus",
  achat_vente: "Achetés et vendus",
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

type ProduitUsage = Pick<
  Produit,
  "natureStock" | "usageCommercial" | "achatSousTraitance"
> & {
  categorieId?: string;
};

export function usageCommercialDeLaFamille(
  categorieId: string | undefined,
  categories: CategorieProduit[] | undefined | null,
): UsageCommercialProduit {
  if (!categorieId || !Array.isArray(categories) || !categories.length) {
    return "achat_vente";
  }
  const guard = new Set<string>();
  let current = categories.find((c) => c?.id === categorieId);
  while (current?.id && !guard.has(current.id)) {
    if (estUsageCommercial(current.usageCommercial)) return current.usageCommercial;
    guard.add(current.id);
    current = current.parentId
      ? categories.find((c) => c?.id === current!.parentId)
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
  return natureStockEstAcheteeParDefaut(natureStockDuProduit(produit))
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

/** Matière première et marchandise : achetées par défaut (type d'achat toujours attendu). */
export function natureStockEstAcheteeParDefaut(nature: NatureStock) {
  return nature === "matiere_premiere" || nature === "marchandise";
}

/**
 * Semi-fini / fini acheté en sous-traitance.
 * Rétrocompat : circuit commercial « acheté » déjà posé sur la fiche (champ propre, pas la famille).
 */
export function achatSousTraitanceDuProduit(
  produit: Pick<
    Produit,
    "natureStock" | "achatSousTraitance" | "usageCommercial"
  >,
) {
  if (!produitEstFabrique(produit)) return false;
  if (typeof produit.achatSousTraitance === "boolean") {
    return produit.achatSousTraitance;
  }
  return (
    produit.usageCommercial === "achat" ||
    produit.usageCommercial === "achat_vente"
  );
}

/** Type d'achat (et compte classe 6) attendu sur la fiche. */
export function typeAchatEstAttendu(
  produit: Pick<
    Produit,
    "natureStock" | "achatSousTraitance" | "usageCommercial"
  >,
) {
  if (produitEstFabrique(produit)) return achatSousTraitanceDuProduit(produit);
  return true;
}

export function produitEstAchetable(
  produit: ProduitUsage | undefined | null,
  categories?: CategorieProduit[] | null,
) {
  if (!produit) return false;
  if (produitEstFabrique(produit)) {
    return achatSousTraitanceDuProduit(produit);
  }
  const u = usageCommercialDuProduit(produit, categories);
  return u === "achat" || u === "achat_vente";
}

export function motifProduitNonAchetable(
  produit: Pick<
    Produit,
    "code" | "libelleCourt" | "natureStock" | "achatSousTraitance" | "usageCommercial"
  >,
) {
  const nom = produit.libelleCourt || produit.code;
  if (produitEstFabrique(produit) && !achatSousTraitanceDuProduit(produit)) {
    const nature =
      natureStockDuProduit(produit) === "fini"
        ? "un produit fini"
        : "un semi-fini";
    return `« ${nom} » est ${nature} : il n'entre en stock que par OF, sauf si « Peut aussi être acheté (sous-traitance) » est coché sur la fiche.`;
  }
  return `« ${nom} » n'est pas achetable : il n'apparaît pas sur les commandes fournisseur ni les demandes de prix.`;
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
