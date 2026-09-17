import type {
  Achat,
  BonDeLivraison,
  CategorieProduit,
  Commande,
  Devis,
  EntreeStock,
  Facture,
  HistoriquePrix,
  Produit,
  TarifClient,
  Vente,
} from "./types";
import { produitEstAchetable, produitEstVendable } from "./nature-stock";

const CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{1,30}[A-Z0-9]$|^[A-Z0-9]{2,32}$/;

export function normalizeCodeProduit(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}

export function isCodeProduitValide(code: string) {
  const c = normalizeCodeProduit(code);
  return c.length >= 2 && c.length <= 32 && CODE_REGEX.test(c);
}

export function libelleProduit(p: Pick<Produit, "libelleCourt" | "libelleLong">) {
  return p?.libelleCourt || p?.libelleLong || "";
}

export function designationFacture(p: Produit) {
  return `${p.code} — ${p.libelleLong || p.libelleCourt}`;
}

export function prixAchatCatalogue(p: Produit) {
  return p.prixAchat;
}

export function prixVenteCatalogue(p: Produit) {
  return p.prixVenteHT;
}

export function categorieLabel(
  categorieId: string,
  categories: CategorieProduit[],
) {
  return categories.find((c) => c.id === categorieId)?.libelle ?? categorieId;
}

export function cheminCategorie(
  categorieId: string,
  categories: CategorieProduit[],
): string {
  const parts: string[] = [];
  let current = categories.find((c) => c.id === categorieId);
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    parts.unshift(current.libelle);
    current = current.parentId
      ? categories.find((c) => c.id === current!.parentId)
      : undefined;
  }
  return parts.join(" › ");
}

export function categoriesFeuilles(categories: CategorieProduit[]) {
  const parents = new Set(
    categories.map((c) => c.parentId).filter(Boolean) as string[],
  );
  return categories.filter((c) => c.actif && !parents.has(c.id));
}

/** Famille racine (profondeur 0) d'une catégorie. */
export function categorieRacine(
  categorieId: string | undefined,
  categories: CategorieProduit[],
): CategorieProduit | undefined {
  if (!categorieId) return undefined;
  let current = categories.find((c) => c.id === categorieId);
  const guard = new Set<string>();
  while (current?.parentId && !guard.has(current.id)) {
    guard.add(current.id);
    const parent = categories.find((c) => c.id === current!.parentId);
    if (!parent) break;
    current = parent;
  }
  return current;
}

/** 0 = famille, 1 = sous-famille, 2 = sous-sous-famille */
export function profondeurCategorie(
  categorieId: string,
  categories: CategorieProduit[],
): number {
  let depth = 0;
  let current = categories.find((c) => c.id === categorieId);
  const guard = new Set<string>();
  while (current?.parentId && !guard.has(current.id)) {
    guard.add(current.id);
    depth += 1;
    current = categories.find((c) => c.id === current!.parentId);
  }
  return depth;
}

export const MAX_PROFONDEUR_CATEGORIE = 2; // 3 niveaux : 0, 1, 2

export function libelleNiveauCategorie(depth: number) {
  if (depth <= 0) return "Famille";
  if (depth === 1) return "Sous-famille";
  return "Sous-sous-famille";
}

export function enfantsCategorie(
  parentId: string | undefined,
  categories: CategorieProduit[],
) {
  return categories
    .filter((c) => (c.parentId ?? "") === (parentId ?? ""))
    .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle));
}

/** Arbre plat trié pour affichage (pré-ordre). */
export function categoriesEnArbre(categories: CategorieProduit[]) {
  const out: { cat: CategorieProduit; depth: number }[] = [];
  function walk(parentId: string | undefined, depth: number) {
    for (const cat of enfantsCategorie(parentId, categories)) {
      out.push({ cat, depth });
      walk(cat.id, depth + 1);
    }
  }
  walk(undefined, 0);
  const seen = new Set(out.map((o) => o.cat.id));
  for (const cat of categories) {
    if (!seen.has(cat.id)) {
      out.push({
        cat,
        depth: profondeurCategorie(cat.id, categories),
      });
    }
  }
  return out;
}

/** True si l'article appartient à la famille ou à l'une de ses sous-familles. */
export function produitAppartientFamille(
  produit: Pick<Produit, "categorieId">,
  familleId: string | undefined,
  categories: CategorieProduit[],
) {
  if (!familleId) return true;
  let current = categories.find((c) => c.id === produit.categorieId);
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    if (current.id === familleId) return true;
    guard.add(current.id);
    current = current.parentId
      ? categories.find((c) => c.id === current!.parentId)
      : undefined;
  }
  return false;
}

export function idsCategorieEtDescendants(
  categorieId: string,
  categories: CategorieProduit[],
  guard = new Set<string>(),
): string[] {
  if (guard.has(categorieId)) return [];
  guard.add(categorieId);
  const out = [categorieId];
  for (const c of categories) {
    if (c.parentId === categorieId) {
      out.push(...idsCategorieEtDescendants(c.id, categories, guard));
    }
  }
  return out;
}

/** Familles qui ont au moins un article du catalogue (y compris via un descendant). */
export function categoriesPresentesDansCatalogue(
  categories: CategorieProduit[],
  produits: Produit[],
) {
  return categories.filter(
    (c) =>
      c.actif &&
      produits.some((p) => produitAppartientFamille(p, c.id, categories)),
  );
}

function texteProduit(value: unknown) {
  return String(value ?? "");
}

export function filtrerCatalogue(
  produits: Produit[] | undefined | null,
  opts: {
    familleId?: string;
    recherche?: string;
    categories?: CategorieProduit[] | null;
  },
) {
  const q = (opts.recherche ?? "").trim().toLowerCase();
  const categories = opts.categories ?? [];
  return (produits ?? [])
    .filter((p) => p && produitAppartientFamille(p, opts.familleId, categories))
    .filter((p) => {
      if (!q) return true;
      return (
        texteProduit(p.code).toLowerCase().includes(q) ||
        texteProduit(p.libelleCourt).toLowerCase().includes(q) ||
        texteProduit(p.libelleLong).toLowerCase().includes(q)
      );
    })
    .sort((a, b) =>
      texteProduit(a.code).localeCompare(texteProduit(b.code), "fr"),
    );
}

/** Résolution prix HT : tarif client → gros → détail (ou PU/m² si vendu à la surface). */
export function resolvePrixVenteHT(
  produit: Produit,
  opts: {
    clientId?: string;
    quantite?: number;
    tarifsClients?: TarifClient[];
  } = {},
) {
  const { clientId, quantite = 0, tarifsClients = [] } = opts;
  const baseCatalogue = produit.venduAuM2
    ? (Number(produit.prixVenteM2HT) >= 0 && produit.prixVenteM2HT != null
        ? produit.prixVenteM2HT
        : produit.prixVenteHT)
    : produit.prixVenteHT;
  if (clientId) {
    const tarif = tarifsClients.find(
      (t) =>
        t.actif &&
        t.clientId === clientId &&
        t.produitId === produit.id,
    );
    if (tarif) {
      if (tarif.typeTarif === "remise_pct") {
        const pct = tarif.remisePercent ?? 0;
        return Math.round(baseCatalogue * (1 - pct / 100));
      }
      return tarif.prixHT;
    }
  }
  if (produit.venduAuM2) return baseCatalogue;
  const seuil = produit.seuilGros ?? 0;
  if (
    produit.prixVenteGrosHT != null &&
    seuil > 0 &&
    quantite >= seuil
  ) {
    return produit.prixVenteGrosHT;
  }
  return produit.prixVenteHT;
}

export function codeDejaUtilise(
  code: string,
  produits: Produit[],
  exceptId?: string,
) {
  const n = normalizeCodeProduit(code);
  return produits.some(
    (p) => p.id !== exceptId && normalizeCodeProduit(p.code) === n,
  );
}

/** Similarité simple (tokens) pour alerte doublons */
export function scoreLibelleApprochant(a: string, b: string) {
  const ta = new Set(
    a
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );
  const tb = new Set(
    b
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / Math.max(ta.size, tb.size);
}

export function trouverDoublonsPotentiels(
  libelle: string,
  produits: Produit[],
  exceptId?: string,
  seuil = 0.5,
) {
  return produits
    .filter((p) => p.id !== exceptId)
    .map((p) => ({
      produit: p,
      score: Math.max(
        scoreLibelleApprochant(libelle, p.libelleCourt),
        scoreLibelleApprochant(libelle, p.libelleLong),
      ),
    }))
    .filter((x) => x.score >= seuil)
    .sort((a, b) => b.score - a.score);
}

export function produitEstReference(
  produitId: string,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    devis: Devis[];
    commandes: Commande[];
    bonsDeLivraison: BonDeLivraison[];
    factures: Facture[];
    achats?: Achat[];
    ordresFabrication?: {
      produitId: string;
      nomenclatureLignes?: { composantId: string }[];
      sorties?: { composantId: string }[];
    }[];
    missionsAchat?: {
      lignesPrevisionnelles?: { produitId: string }[];
      achatsRealises?: { produitId: string }[];
    }[];
    demandesPrix?: {
      lignes?: { produitId: string }[];
    }[];
    nomenclaturesProduits?: Produit[];
  },
) {
  if (ctx.entrees.some((e) => e.produitId === produitId)) return true;
  if (ctx.ventes.some((v) => v.produitId === produitId)) return true;
  const inLignes = (lignes: { produitId?: string }[]) =>
    lignes.some((l) => l.produitId === produitId);
  if (ctx.devis.some((d) => inLignes(d.lignes))) return true;
  if (ctx.commandes.some((c) => inLignes(c.lignes))) return true;
  if (ctx.bonsDeLivraison.some((b) => inLignes(b.lignes))) return true;
  if (ctx.factures.some((f) => inLignes(f.lignes))) return true;
  if ((ctx.achats ?? []).some((a) => inLignes(a.lignes))) return true;
  if (
    (ctx.ordresFabrication ?? []).some(
      (o) =>
        o.produitId === produitId ||
        (o.nomenclatureLignes ?? []).some((l) => l.composantId === produitId) ||
        (o.sorties ?? []).some((s) => s.composantId === produitId),
    )
  ) {
    return true;
  }
  if (
    (ctx.missionsAchat ?? []).some(
      (m) =>
        (m.lignesPrevisionnelles ?? []).some((l) => l.produitId === produitId) ||
        (m.achatsRealises ?? []).some((l) => l.produitId === produitId),
    )
  ) {
    return true;
  }
  if ((ctx.demandesPrix ?? []).some((d) => (d.lignes ?? []).some((l) => l.produitId === produitId))) {
    return true;
  }
  if (
    (ctx.nomenclaturesProduits ?? []).some(
      (p) =>
        p.id !== produitId &&
        (p.nomenclatures ?? []).some((n) =>
          n.lignes.some((l) => l.composantId === produitId),
        ),
    )
  ) {
    return true;
  }
  return false;
}

export function produitsActifs(produits: Produit[]) {
  return produits.filter((p) => p.actif);
}

export function produitsVendablesActifs(
  produits: Produit[],
  categories?: CategorieProduit[],
) {
  return produits.filter((p) => p.actif && produitEstVendable(p, categories));
}

export function produitsAchetablesActifs(
  produits: Produit[],
  categories?: CategorieProduit[],
) {
  return produits.filter((p) => p.actif && produitEstAchetable(p, categories));
}

/** Migration depuis l'ancien format { nom, categorie, prixAchatMoyen, prixVente } */
export function migrateProduitLegacy(
  raw: Record<string, unknown>,
  categorieParAncien: Record<string, string>,
  tauxTVADefaut: number,
): Produit {
  const id = String(raw.id ?? "");
  const nom = String(raw.nom ?? raw.libelleCourt ?? "");
  const ancienCat = String(raw.categorie ?? "autre");
  const code =
    typeof raw.code === "string" && raw.code
      ? normalizeCodeProduit(raw.code)
      : normalizeCodeProduit(nom.slice(0, 12) || id.replace("prod-", ""));

  return {
    id,
    code: code || normalizeCodeProduit(id),
    libelleCourt: String(raw.libelleCourt ?? nom).slice(0, 40),
    libelleLong: String(raw.libelleLong ?? nom),
    categorieId:
      String(raw.categorieId ?? "") ||
      categorieParAncien[ancienCat] ||
      categorieParAncien.autre,
    unite: String(raw.unite ?? "kg"),
    prixAchat: Number(raw.prixAchat ?? raw.prixAchatMoyen ?? 0),
    prixVenteHT: Number(raw.prixVenteHT ?? raw.prixVente ?? 0),
    prixVenteGrosHT:
      raw.prixVenteGrosHT != null ? Number(raw.prixVenteGrosHT) : undefined,
    seuilGros: raw.seuilGros != null ? Number(raw.seuilGros) : undefined,
    tauxTVA: Number(raw.tauxTVA ?? tauxTVADefaut),
    actif: raw.actif !== false,
    seuilReappro:
      raw.seuilReappro != null ? Number(raw.seuilReappro) : undefined,
    seuilRupture:
      raw.seuilRupture != null ? Number(raw.seuilRupture) : undefined,
    seuilSurstock:
      raw.seuilSurstock != null ? Number(raw.seuilSurstock) : undefined,
    gerePeremption: raw.gerePeremption === true,
  };
}

export function seedCategoriesProduits(): CategorieProduit[] {
  return [
    {
      id: "cat-mer",
      code: "MER",
      libelle: "Produits de la mer",
      ordre: 1,
      actif: true,
    },
    {
      id: "cat-poisson",
      code: "POISSON",
      libelle: "Poissons",
      parentId: "cat-mer",
      ordre: 1,
      actif: true,
    },
    {
      id: "cat-crustace",
      code: "CRUSTACE",
      libelle: "Crustacés",
      parentId: "cat-mer",
      ordre: 2,
      actif: true,
    },
    {
      id: "cat-coquillage",
      code: "COQUILLAGE",
      libelle: "Coquillages",
      parentId: "cat-mer",
      ordre: 3,
      actif: true,
    },
    {
      id: "cat-autre",
      code: "AUTRE",
      libelle: "Autre",
      ordre: 99,
      actif: true,
    },
  ];
}

export const LEGACY_CATEGORIE_MAP: Record<string, string> = {
  poisson: "cat-poisson",
  crustace: "cat-crustace",
  coquillage: "cat-coquillage",
  autre: "cat-autre",
};

export function creerEntreeHistorique(opts: {
  produitId: string;
  champ: HistoriquePrix["champ"];
  ancienMontant: number;
  nouveauMontant: number;
  clientId?: string;
  motif?: string;
}): Omit<HistoriquePrix, "id"> {
  return {
    produitId: opts.produitId,
    champ: opts.champ,
    ancienMontant: opts.ancienMontant,
    nouveauMontant: opts.nouveauMontant,
    clientId: opts.clientId,
    motif: opts.motif,
    date: new Date().toISOString(),
  };
}
