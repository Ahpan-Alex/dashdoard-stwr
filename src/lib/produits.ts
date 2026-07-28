import type {
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
  return p.libelleCourt || p.libelleLong;
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

/** Résolution prix HT : tarif client → gros → détail */
export function resolvePrixVenteHT(
  produit: Produit,
  opts: {
    clientId?: string;
    quantite?: number;
    tarifsClients?: TarifClient[];
  } = {},
) {
  const { clientId, quantite = 0, tarifsClients = [] } = opts;
  if (clientId) {
    const tarif = tarifsClients.find(
      (t) =>
        t.actif &&
        t.clientId === clientId &&
        t.produitId === produit.id,
    );
    if (tarif) {
      if (tarif.typeTarif === "remise_pct") {
        const base = produit.prixVenteHT;
        const pct = tarif.remisePercent ?? 0;
        return Math.round(base * (1 - pct / 100));
      }
      return tarif.prixHT;
    }
  }
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
  return false;
}

export function produitsActifs(produits: Produit[]) {
  return produits.filter((p) => p.actif);
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
