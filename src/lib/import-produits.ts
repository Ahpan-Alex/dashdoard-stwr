import { downloadCsv } from "./csv";
import { createId } from "./id";
import { normaliserTexteImport, parseCsvPointVirgule } from "./import-tiers";
import {
  NATURE_STOCK_LABELS,
  USAGE_COMMERCIAL_LABELS,
  USAGES_COMMERCIAUX,
  estUsageCommercial,
  natureStockDuProduit,
  produitEstFabrique,
} from "./nature-stock";
import { TYPE_CALCUL_NOMENCLATURE_LABELS } from "./nomenclature-formules";
import {
  isCodeProduitValide,
  normalizeCodeProduit,
} from "./produits";
import type {
  CategorieProduit,
  NatureStock,
  NomenclatureLigne,
  NomenclatureProduit,
  Produit,
  TypeAchat,
  TypeCalculNomenclature,
  TypeNomenclature,
  UniteMesure,
  UsageCommercialProduit,
} from "./types";
import { trouverUniteMesure, symboleUniteDefaut } from "./unites-mesure";
import { downloadXlsx } from "./xlsx";

export { parseCsvPointVirgule };

export const LIMITE_LIGNES_IMPORT_CATALOGUE = 2000;

const TYPES_ACHAT_PRODUIT: TypeAchat[] = [
  "marchandises",
  "matieres_premieres",
  "fournitures",
  "outillage",
  "service_produit",
];

const TYPE_ACHAT_LABELS: Record<TypeAchat, string> = {
  marchandises: "Marchandises",
  matieres_premieres: "Matières premières",
  fournitures: "Fournitures",
  outillage: "Outillage",
  service_produit: "Service produit",
  service_general: "Service général",
  immobilisation: "Immobilisation",
};

export const COLONNES_IMPORT_ARTICLES = [
  {
    key: "code",
    header: "Code",
    aliases: ["code", "code article", "sku", "ref"],
    comment: "Obligatoire. Unique. Lettres, chiffres et tirets (2 à 32).",
  },
  {
    key: "libelleCourt",
    header: "Libellé court",
    aliases: ["libelle court", "libelle", "nom", "designation"],
    comment: "Obligatoire. Nom affiché dans les listes.",
  },
  {
    key: "libelleLong",
    header: "Libellé long",
    aliases: ["libelle long", "description"],
    comment: "Optionnel. Sinon = libellé court.",
  },
  {
    key: "categorie",
    header: "Famille",
    aliases: ["famille", "categorie", "code famille"],
    comment: "Obligatoire. Code ou libellé d’une famille déjà créée.",
  },
  {
    key: "unite",
    header: "Unité",
    aliases: ["unite", "unite de mesure", "um"],
    comment: "Symbole d’une unité existante (pce, m²…). Vide = pce.",
  },
  {
    key: "natureStock",
    header: "Nature de stock",
    aliases: ["nature", "nature stock", "nature de stock"],
    comment:
      "matiere_premiere, marchandise, semi_fini, fini. Vide = matière première.",
  },
  {
    key: "usageCommercial",
    header: "Circuit",
    aliases: ["circuit", "usage", "usage commercial"],
    comment: "achat, vente, ou achat_vente. Vide = déduit de la nature.",
  },
  {
    key: "typeAchat",
    header: "Type d'achat",
    aliases: ["type achat", "type d achat"],
    comment: "marchandises, matieres_premieres, fournitures, outillage, service_produit.",
  },
  {
    key: "prixAchat",
    header: "Prix d'achat HT",
    aliases: ["prix achat", "pa", "prix d achat ht"],
    comment: "Ariary, sans devise. 0 si vide.",
  },
  {
    key: "prixVenteHT",
    header: "Prix de vente HT",
    aliases: ["prix vente", "pv", "prix de vente ht", "prix"],
    comment: "Ariary. 0 si vide.",
  },
  {
    key: "tauxTVA",
    header: "Taux TVA",
    aliases: ["tva", "taux tva"],
    comment: "Pourcentage. Vide = TVA entreprise.",
  },
  {
    key: "seuilReappro",
    header: "Seuil réappro",
    aliases: ["seuil reappro", "reappro"],
    comment: "Optionnel.",
  },
  {
    key: "seuilRupture",
    header: "Seuil rupture",
    aliases: ["seuil rupture", "rupture"],
    comment: "Optionnel.",
  },
  {
    key: "seuilSurstock",
    header: "Seuil surstock",
    aliases: ["seuil surstock", "surstock"],
    comment: "Optionnel.",
  },
  {
    key: "actif",
    header: "Actif",
    aliases: ["actif", "active"],
    comment: "oui / non. Vide = oui.",
  },
  {
    key: "venduAuM2",
    header: "Vendu au m²",
    aliases: ["vendu au m2", "surface", "m2"],
    comment: "oui / non. Vide = non.",
  },
  {
    key: "prixVenteM2HT",
    header: "Prix vente m² HT",
    aliases: ["prix m2", "prix vente m2"],
    comment: "Si vendu au m².",
  },
] as const;

export const COLONNES_IMPORT_NOMENCLATURES = [
  {
    key: "codeProduit",
    header: "Code produit",
    aliases: ["code produit", "produit", "code fini"],
    comment: "Code du semi-fini / fini déjà présent (ou importé juste avant).",
  },
  {
    key: "typeNomenclature",
    header: "Type nomenclature",
    aliases: ["type", "type nomenclature"],
    comment: "automatique ou alternative. Vide = automatique.",
  },
  {
    key: "nomNomenclature",
    header: "Nom nomenclature",
    aliases: ["nom", "nom nomenclature"],
    comment: "Pour l’alternative. Vide = Nomenclature alternative.",
  },
  {
    key: "codeComposant",
    header: "Code composant",
    aliases: ["code composant", "composant"],
    comment: "Matière première ou semi-fini.",
  },
  {
    key: "quantite",
    header: "Quantité",
    aliases: ["quantite", "qte", "qty"],
    comment: "Pour 1 unité du produit (type fixe).",
  },
  {
    key: "typeCalcul",
    header: "Type de calcul",
    aliases: ["calcul", "type calcul", "type de calcul"],
    comment: "fixe, surface, perimetre. Vide = fixe.",
  },
  {
    key: "taux",
    header: "Taux",
    aliases: ["taux"],
    comment: "Par m² (surface) ou par mètre (périmètre).",
  },
] as const;

export type CleColonneImportArticle =
  (typeof COLONNES_IMPORT_ARTICLES)[number]["key"];
export type CleColonneImportNomenc =
  (typeof COLONNES_IMPORT_NOMENCLATURES)[number]["key"];

export type ChampsImportArticle = Record<CleColonneImportArticle, string>;
export type ChampsImportNomenc = Record<CleColonneImportNomenc, string>;

export type StatutLigneImportCatalogue =
  | "ok"
  | "erreur"
  | "avertissement"
  | "doublon";

export type ChoixDoublonArticle = "ignorer" | "fusionner";

const CLES_ARTICLES: CleColonneImportArticle[] = COLONNES_IMPORT_ARTICLES.map(
  (c) => c.key,
);
const CLES_NOMENC: CleColonneImportNomenc[] = COLONNES_IMPORT_NOMENCLATURES.map(
  (c) => c.key,
);

export type LigneImportArticle = {
  id: string;
  numeroLigne: number;
  champs: ChampsImportArticle;
  erreurs: string[];
  avertissements: string[];
  statut: StatutLigneImportCatalogue;
  doublonProduitId?: string;
  doublonNom?: string;
  choixDoublon?: ChoixDoublonArticle;
};

export type LigneImportNomenc = {
  id: string;
  numeroLigne: number;
  champs: ChampsImportNomenc;
  erreurs: string[];
  avertissements: string[];
  statut: StatutLigneImportCatalogue;
};

export type PayloadImportArticle = Omit<Produit, "id">;

export type RapportLigneImportCatalogue = {
  numeroLigne: number;
  nom: string;
  resultat: "importe" | "fusionne" | "ignore" | "rejete";
  motif: string;
};

export function champsArticleVides(): ChampsImportArticle {
  return Object.fromEntries(CLES_ARTICLES.map((k) => [k, ""])) as ChampsImportArticle;
}

export function champsNomencVides(): ChampsImportNomenc {
  return Object.fromEntries(CLES_NOMENC.map((k) => [k, ""])) as ChampsImportNomenc;
}

function aliasVersCle<T extends { key: string; header: string; aliases: readonly string[] }>(
  cols: readonly T[],
  header: string,
): T["key"] | undefined {
  const n = normaliserTexteImport(header);
  if (!n) return undefined;
  for (const col of cols) {
    if (normaliserTexteImport(col.header) === n) return col.key;
    if (col.aliases.some((a) => a === n)) return col.key;
  }
  return undefined;
}

function detecterEntetes<T extends { key: string; header: string; aliases: readonly string[] }>(
  rows: string[][],
  cols: readonly T[],
  requises: T["key"][],
) {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const mapping: Partial<Record<number, T["key"]>> = {};
    rows[i].forEach((cell, ci) => {
      const cle = aliasVersCle(cols, cell);
      if (cle) mapping[ci] = cle;
    });
    const cles = new Set(Object.values(mapping));
    if (requises.every((k) => cles.has(k))) {
      return { indexEntete: i, mapping };
    }
  }
  return null;
}

export type KindImportCatalogue = "articles" | "nomenclatures";

export function detecterKindImportCatalogue(rows: string[][]): KindImportCatalogue | null {
  if (detecterEntetes(rows, COLONNES_IMPORT_NOMENCLATURES, ["codeProduit", "codeComposant"])) {
    return "nomenclatures";
  }
  if (detecterEntetes(rows, COLONNES_IMPORT_ARTICLES, ["code", "libelleCourt"])) {
    return "articles";
  }
  return null;
}

export function lignesArticlesDepuisGrille(rows: string[][]): ChampsImportArticle[] {
  const detected = detecterEntetes(rows, COLONNES_IMPORT_ARTICLES, ["code", "libelleCourt"]);
  if (!detected) {
    throw new Error(
      "En-têtes articles introuvables. Utilisez le modèle (colonnes « Code » et « Libellé court »).",
    );
  }
  const out: ChampsImportArticle[] = [];
  for (let i = detected.indexEntete + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((c) => (c ?? "").trim())) continue;
    const champs = champsArticleVides();
    for (const [idx, cle] of Object.entries(detected.mapping)) {
      if (!cle) continue;
      champs[cle] = String(row[Number(idx)] ?? "").trim();
    }
    out.push(champs);
  }
  return out;
}

export function lignesNomencDepuisGrille(rows: string[][]): ChampsImportNomenc[] {
  const detected = detecterEntetes(
    rows,
    COLONNES_IMPORT_NOMENCLATURES,
    ["codeProduit", "codeComposant"],
  );
  if (!detected) {
    throw new Error(
      "En-têtes nomenclatures introuvables. Utilisez le modèle (colonnes « Code produit » et « Code composant »).",
    );
  }
  const out: ChampsImportNomenc[] = [];
  for (let i = detected.indexEntete + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((c) => (c ?? "").trim())) continue;
    const champs = champsNomencVides();
    for (const [idx, cle] of Object.entries(detected.mapping)) {
      if (!cle) continue;
      champs[cle] = String(row[Number(idx)] ?? "").trim();
    }
    out.push(champs);
  }
  return out;
}

function parseNombre(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function parseOuiNon(raw: string, defaut: boolean) {
  const n = normaliserTexteImport(raw);
  if (!n) return defaut;
  if (["oui", "yes", "o", "y", "1", "vrai", "true", "actif"].includes(n)) return true;
  if (["non", "no", "n", "0", "faux", "false", "inactif"].includes(n)) return false;
  return defaut;
}

function parseNature(raw: string): NatureStock | undefined {
  const n = normaliserTexteImport(raw);
  if (!n) return undefined;
  const map: Record<string, NatureStock> = {
    "matiere premiere": "matiere_premiere",
    matiere_premiere: "matiere_premiere",
    mp: "matiere_premiere",
    marchandise: "marchandise",
    "marchandise standard": "marchandise",
    "semi fini": "semi_fini",
    semi_fini: "semi_fini",
    sf: "semi_fini",
    fini: "fini",
    "produit fini": "fini",
    pf: "fini",
  };
  if (n in map) return map[n];
  for (const [k, label] of Object.entries(NATURE_STOCK_LABELS)) {
    if (normaliserTexteImport(label) === n) return k as NatureStock;
  }
  return undefined;
}

function parseUsage(raw: string): UsageCommercialProduit | null {
  const n = normaliserTexteImport(raw);
  if (!n) return null;
  if (n === "achat" || n === "achete") return "achat";
  if (n === "vente" || n === "vendu") return "vente";
  if (
    n === "achat vente" ||
    n === "achat_vente" ||
    n === "les deux" ||
    (n.includes("achete") && n.includes("vendu"))
  ) {
    return "achat_vente";
  }
  if (estUsageCommercial(n)) return n;
  for (const u of USAGES_COMMERCIAUX) {
    if (normaliserTexteImport(USAGE_COMMERCIAL_LABELS[u]) === n) return u;
  }
  return null;
}

function parseTypeAchat(raw: string): TypeAchat | null {
  const n = normaliserTexteImport(raw);
  if (!n) return null;
  for (const t of TYPES_ACHAT_PRODUIT) {
    if (normaliserTexteImport(t) === n) return t;
    if (normaliserTexteImport(TYPE_ACHAT_LABELS[t]) === n) return t;
  }
  return null;
}

export function trouverCategorieImport(
  raw: string,
  categories: CategorieProduit[],
) {
  const n = normaliserTexteImport(raw);
  if (!n) return undefined;
  const code = normalizeCodeProduit(raw);
  return (
    categories.find((c) => normalizeCodeProduit(c.code) === code) ||
    categories.find((c) => normaliserTexteImport(c.libelle) === n)
  );
}

export type CtxImportArticles = {
  produits: Produit[];
  categories: CategorieProduit[];
  unites: UniteMesure[];
  tauxTVADefaut: number;
};

export function analyserLignesImportArticles(
  brouillons: ChampsImportArticle[],
  ctx: CtxImportArticles,
  conserver?: LigneImportArticle[],
): LigneImportArticle[] {
  const seen = new Map<string, number>();
  return brouillons.map((champs, i) => {
    const prev = conserver?.[i];
    const meme =
      prev && CLES_ARTICLES.every((k) => prev.champs[k] === champs[k])
        ? prev
        : undefined;
    const ligne: LigneImportArticle = {
      id: prev?.id ?? createId("imp"),
      numeroLigne: i + 1,
      champs: { ...champs },
      erreurs: [],
      avertissements: [],
      statut: "ok",
      choixDoublon: meme?.choixDoublon,
      doublonProduitId: undefined,
      doublonNom: undefined,
    };
    const code = normalizeCodeProduit(champs.code);
    if (!code) ligne.erreurs.push("Code obligatoire.");
    else if (!isCodeProduitValide(code)) {
      ligne.erreurs.push("Code invalide (2 à 32, lettres / chiffres / tirets).");
    }
    if (!champs.libelleCourt.trim()) ligne.erreurs.push("Libellé court obligatoire.");
    const cat = trouverCategorieImport(champs.categorie, ctx.categories);
    if (!champs.categorie.trim()) ligne.erreurs.push("Famille obligatoire.");
    else if (!cat) ligne.erreurs.push(`Famille « ${champs.categorie} » introuvable.`);
    if (champs.unite.trim() && !trouverUniteMesure(ctx.unites, champs.unite)) {
      ligne.erreurs.push(`Unité « ${champs.unite} » introuvable.`);
    }
    if (champs.natureStock.trim()) {
      const nat = parseNature(champs.natureStock);
      if (!nat) ligne.erreurs.push(`Nature de stock « ${champs.natureStock} » inconnue.`);
    }
    if (champs.usageCommercial.trim() && !parseUsage(champs.usageCommercial)) {
      ligne.erreurs.push(`Circuit « ${champs.usageCommercial} » inconnu.`);
    }
    if (champs.typeAchat.trim() && !parseTypeAchat(champs.typeAchat)) {
      ligne.erreurs.push(`Type d'achat « ${champs.typeAchat} » inconnu.`);
    }
    for (const [cle, label] of [
      ["prixAchat", "Prix d'achat"],
      ["prixVenteHT", "Prix de vente"],
      ["tauxTVA", "Taux TVA"],
      ["seuilReappro", "Seuil réappro"],
      ["seuilRupture", "Seuil rupture"],
      ["seuilSurstock", "Seuil surstock"],
      ["prixVenteM2HT", "Prix m²"],
    ] as const) {
      if (!champs[cle].trim()) continue;
      const n = parseNombre(champs[cle]);
      if (n == null || Number.isNaN(n) || n < 0) {
        ligne.erreurs.push(`${label} invalide.`);
      }
    }
    if (code) {
      const idxFichier = seen.get(code);
      if (idxFichier != null) {
        ligne.erreurs.push(`Code déjà présent ligne ${idxFichier + 1} du fichier.`);
      } else {
        seen.set(code, i);
      }
      const existant = ctx.produits.find(
        (p) => normalizeCodeProduit(p.code) === code,
      );
      if (existant) {
        ligne.statut = "doublon";
        ligne.doublonProduitId = existant.id;
        ligne.doublonNom = existant.libelleCourt;
        ligne.avertissements.push(
          `Code déjà utilisé : ${existant.libelleCourt}. Fusionner ou ignorer.`,
        );
      }
    }
    if (ligne.erreurs.length) ligne.statut = "erreur";
    else if (ligne.statut !== "doublon" && ligne.avertissements.length) {
      ligne.statut = "avertissement";
    }
    return ligne;
  });
}

export function payloadDepuisLigneArticle(
  ligne: LigneImportArticle,
  ctx: CtxImportArticles,
): PayloadImportArticle | null {
  const cat = trouverCategorieImport(ligne.champs.categorie, ctx.categories);
  if (!cat) return null;
  const nature = parseNature(ligne.champs.natureStock) ?? "matiere_premiere";
  const usage = parseUsage(ligne.champs.usageCommercial);
  const unite =
    trouverUniteMesure(ctx.unites, ligne.champs.unite)?.symbole ??
    symboleUniteDefaut(ctx.unites);
  const taux = parseNombre(ligne.champs.tauxTVA);
  const venduAuM2 = parseOuiNon(ligne.champs.venduAuM2, false);
  return {
    code: normalizeCodeProduit(ligne.champs.code),
    libelleCourt: ligne.champs.libelleCourt.trim(),
    libelleLong:
      ligne.champs.libelleLong.trim() || ligne.champs.libelleCourt.trim(),
    categorieId: cat.id,
    unite,
    prixAchat: parseNombre(ligne.champs.prixAchat) || 0,
    prixVenteHT: parseNombre(ligne.champs.prixVenteHT) || 0,
    tauxTVA:
      taux != null && Number.isFinite(taux) ? taux : ctx.tauxTVADefaut,
    actif: parseOuiNon(ligne.champs.actif, true),
    natureStock: nature,
    usageCommercial: usage ?? undefined,
    typeAchat: parseTypeAchat(ligne.champs.typeAchat) ?? undefined,
    seuilReappro: parseNombre(ligne.champs.seuilReappro) ?? undefined,
    seuilRupture: parseNombre(ligne.champs.seuilRupture) ?? undefined,
    seuilSurstock: parseNombre(ligne.champs.seuilSurstock) ?? undefined,
    venduAuM2: venduAuM2 || undefined,
    prixVenteM2HT: venduAuM2
      ? parseNombre(ligne.champs.prixVenteM2HT) || undefined
      : undefined,
  };
}

export function ligneArticleEligible(ligne: LigneImportArticle):
  | { ok: true; mode: "creer" | "fusionner" }
  | { ok: false; motif: string } {
  if (ligne.statut === "erreur") {
    return { ok: false, motif: ligne.erreurs[0] ?? "Ligne en erreur." };
  }
  if (ligne.statut === "doublon") {
    if (ligne.choixDoublon === "ignorer") {
      return { ok: false, motif: "Doublon ignoré." };
    }
    if (ligne.choixDoublon === "fusionner" && ligne.doublonProduitId) {
      return { ok: true, mode: "fusionner" };
    }
    return { ok: false, motif: "Choisissez Fusionner ou Ignorer." };
  }
  return { ok: true, mode: "creer" };
}

function parseTypeNomenc(raw: string): TypeNomenclature {
  const n = normaliserTexteImport(raw);
  if (n === "alternative" || n === "alt") return "alternative";
  return "automatique";
}

function parseTypeCalcul(raw: string): TypeCalculNomenclature | null {
  const n = normaliserTexteImport(raw);
  if (!n) return "fixe";
  if (n === "fixe") return "fixe";
  if (n === "surface" || n === "m2" || n === "m 2") return "surface";
  if (n === "perimetre" || n === "perimetre vente") return "perimetre";
  for (const [k, label] of Object.entries(TYPE_CALCUL_NOMENCLATURE_LABELS)) {
    if (normaliserTexteImport(label) === n) return k as TypeCalculNomenclature;
  }
  return null;
}

export function analyserLignesImportNomenc(
  brouillons: ChampsImportNomenc[],
  produits: Produit[],
): LigneImportNomenc[] {
  const byCode = new Map(
    produits.map((p) => [normalizeCodeProduit(p.code), p]),
  );
  return brouillons.map((champs, i) => {
    const ligne: LigneImportNomenc = {
      id: createId("impn"),
      numeroLigne: i + 1,
      champs: { ...champs },
      erreurs: [],
      avertissements: [],
      statut: "ok",
    };
    const codeP = normalizeCodeProduit(champs.codeProduit);
    const codeC = normalizeCodeProduit(champs.codeComposant);
    const produit = byCode.get(codeP);
    const composant = byCode.get(codeC);
    if (!codeP) ligne.erreurs.push("Code produit obligatoire.");
    else if (!produit) ligne.erreurs.push(`Produit « ${champs.codeProduit} » introuvable.`);
    else if (!produitEstFabrique(produit)) {
      ligne.erreurs.push("Le produit doit être semi-fini ou fini.");
    }
    if (!codeC) ligne.erreurs.push("Code composant obligatoire.");
    else if (!composant) {
      ligne.erreurs.push(`Composant « ${champs.codeComposant} » introuvable.`);
    } else {
      const nat = natureStockDuProduit(composant);
      if (nat !== "matiere_premiere" && nat !== "semi_fini") {
        ligne.erreurs.push("Le composant doit être matière première ou semi-fini.");
      }
    }
    if (produit && composant && produit.id === composant.id) {
      ligne.erreurs.push("Un produit ne peut pas se composer lui-même.");
    }
    const calcul = parseTypeCalcul(champs.typeCalcul);
    if (champs.typeCalcul.trim() && !calcul) {
      ligne.erreurs.push(`Type de calcul « ${champs.typeCalcul} » inconnu.`);
    }
    const type = calcul ?? "fixe";
    if (type === "fixe") {
      const q = parseNombre(champs.quantite);
      if (q == null || Number.isNaN(q) || !(q > 0)) {
        ligne.erreurs.push("Quantité positive obligatoire (type fixe).");
      }
    } else {
      const t = parseNombre(champs.taux);
      if (t == null || Number.isNaN(t) || !(t > 0)) {
        ligne.erreurs.push("Taux positif obligatoire (surface / périmètre).");
      }
    }
    if (ligne.erreurs.length) ligne.statut = "erreur";
    return ligne;
  });
}

export function nomenclaturesDepuisLignesImport(
  lignes: LigneImportNomenc[],
  produits: Produit[],
): Map<string, NomenclatureProduit[]> {
  const byCode = new Map(
    produits.map((p) => [normalizeCodeProduit(p.code), p]),
  );
  const groupes = new Map<
    string,
    { type: TypeNomenclature; nom: string; lignes: NomenclatureLigne[] }
  >();
  for (const l of lignes) {
    if (l.statut === "erreur") continue;
    const produit = byCode.get(normalizeCodeProduit(l.champs.codeProduit));
    const composant = byCode.get(normalizeCodeProduit(l.champs.codeComposant));
    if (!produit || !composant) continue;
    const type = parseTypeNomenc(l.champs.typeNomenclature);
    const nom =
      type === "automatique"
        ? "Nomenclature standard"
        : l.champs.nomNomenclature.trim() || "Nomenclature alternative";
    const key = `${produit.id}|${type}`;
    const cur = groupes.get(key) ?? { type, nom, lignes: [] };
    const calcul = parseTypeCalcul(l.champs.typeCalcul) ?? "fixe";
    cur.lignes.push({
      id: createId("nl"),
      composantId: composant.id,
      quantite: calcul === "fixe" ? parseNombre(l.champs.quantite) || 0 : 0,
      typeCalcul: calcul,
      taux:
        calcul === "surface" || calcul === "perimetre"
          ? parseNombre(l.champs.taux) || undefined
          : undefined,
    });
    groupes.set(key, cur);
  }
  const parProduit = new Map<string, NomenclatureProduit[]>();
  for (const [key, g] of groupes) {
    const produitId = key.split("|")[0];
    const existant = produits.find((p) => p.id === produitId);
    const list = [...(parProduit.get(produitId) ?? existant?.nomenclatures ?? [])];
    const next: NomenclatureProduit = {
      id:
        list.find((n) => n.type === g.type)?.id ?? createId("nomenc"),
      type: g.type,
      nom: g.nom,
      lignes: g.lignes,
    };
    const sans = list.filter((n) => n.type !== g.type);
    parProduit.set(produitId, [...sans, next]);
  }
  return parProduit;
}

function grilleModele(cols: readonly { header: string; comment: string }[], exemple: string[]) {
  return [
    cols.map((c) => c.header),
    exemple,
    [],
    ["Commentaires"],
    ...cols.map((c) => [c.header, c.comment]),
  ];
}

export function telechargerModeleImportArticles(format: "xlsx" | "csv") {
  const rows = grilleModele(COLONNES_IMPORT_ARTICLES, [
    "VIN-100",
    "Vinyle blanc",
    "Vinyle adhésif blanc brillant",
    "VIN",
    "rl",
    "marchandise",
    "achat_vente",
    "marchandises",
    "85000",
    "120000",
    "20",
    "5",
    "1",
    "",
    "oui",
    "non",
    "",
  ]);
  if (format === "csv") {
    downloadCsv("modele-import-articles.csv", rows);
    return;
  }
  downloadXlsx("modele-import-articles.xlsx", rows, "Articles");
}

export function telechargerModeleImportNomenc(format: "xlsx" | "csv") {
  const rows = grilleModele(COLONNES_IMPORT_NOMENCLATURES, [
    "PAN-A0",
    "automatique",
    "",
    "VIN-100",
    "1.2",
    "fixe",
    "",
  ]);
  if (format === "csv") {
    downloadCsv("modele-import-nomenclatures.csv", rows);
    return;
  }
  downloadXlsx("modele-import-nomenclatures.xlsx", rows, "Nomenclatures");
}

export function telechargerRapportImportCatalogue(
  rapport: RapportLigneImportCatalogue[],
) {
  downloadCsv("rapport-import-catalogue.csv", [
    ["Ligne", "Nom", "Résultat", "Motif"],
    ...rapport.map((r) => [r.numeroLigne, r.nom, r.resultat, r.motif]),
  ]);
}

export function libelleStatutImportCatalogue(s: StatutLigneImportCatalogue) {
  if (s === "ok") return "Prêt";
  if (s === "erreur") return "Erreur";
  if (s === "avertissement") return "Avertissement";
  return "Doublon";
}
