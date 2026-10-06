import { stockDisponible } from "./calculations";
import { fournisseurPrioritaireId } from "./classement-fournisseurs";
import { produitSansCompteComptable } from "./comptabilite";
import {
  MODE_APPROVISIONNEMENT_LABELS,
  modeApprovisionnementDuProduit,
} from "./mode-approvisionnement";
import {
  NATURE_STOCK_LABELS,
  natureStockDuProduit,
  USAGE_COMMERCIAL_LABELS,
  usageCommercialDuProduit,
} from "./nature-stock";
import { cheminCategorie, produitAppartientFamille } from "./produits";
import { TYPE_ACHAT_LABELS } from "./type-achat";
import type {
  Achat,
  CategorieProduit,
  CompteComptable,
  DemandePrix,
  EntreeStock,
  Inventaire,
  JournalActivite,
  NatureStock,
  Produit,
  TypeAchat,
  Vente,
} from "./types";

export type SituationStockFiltre = "" | "rupture" | "seuil" | "disponible";
export type StatutArticleFiltre = "" | "actif" | "inactif";
export type ModeApproFiltre = "" | "sur_stock" | "fabrication_commande";

export type FiltresArticles = {
  recherche: string;
  code: string;
  libelle: string;
  familleId: string;
  sousFamilleId: string;
  natureStock: "" | NatureStock;
  modeApprovisionnement: ModeApproFiltre;
  siteId: string;
  statut: StatutArticleFiltre;
  situationStock: SituationStockFiltre;
  typeAchat: "" | TypeAchat;
  fournisseurId: string;
  sansFamille: boolean;
  compteManquant: boolean;
  sansNomenclature: boolean;
  dateDebut: string;
  dateFin: string;
};

export const FILTRES_ARTICLES_VIDE: FiltresArticles = {
  recherche: "",
  code: "",
  libelle: "",
  familleId: "",
  sousFamilleId: "",
  natureStock: "",
  modeApprovisionnement: "",
  siteId: "",
  statut: "",
  situationStock: "",
  typeAchat: "",
  fournisseurId: "",
  sansFamille: false,
  compteManquant: false,
  sansNomenclature: false,
  dateDebut: "",
  dateFin: "",
};

export const PAGE_ARTICLES = 25;

const CLES_SECONDAIRES = [
  "statut",
  "situationStock",
  "typeAchat",
  "fournisseurId",
  "sansFamille",
  "compteManquant",
  "sansNomenclature",
  "dateDebut",
  "dateFin",
] as const;

export type CleFiltreArticle = keyof FiltresArticles;

export type FiltreArticleEnregistre = {
  id: string;
  nom: string;
  filtres: FiltresArticles;
};

export type FiltresArticlesParUtilisateur = Record<
  string,
  FiltreArticleEnregistre[]
>;

export type BadgeFiltreArticle = {
  cle: CleFiltreArticle;
  libelle: string;
};

export type CtxFiltresArticles = {
  categories: CategorieProduit[];
  comptes: CompteComptable[];
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires: Inventaire[];
  /** Sites que l'utilisateur a le droit de voir. */
  siteIds: string[];
  achats: Achat[];
  demandesPrix: DemandePrix[];
  journal: JournalActivite[];
  nomSite: (id: string) => string;
  nomFournisseur: (id: string) => string;
  nomCategorie: (id: string) => string;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function contient(haystack: string | undefined, needle: string) {
  if (!needle) return true;
  return norm(haystack ?? "").includes(needle);
}

export function patchFiltresArticles(
  prev: FiltresArticles,
  patch: Partial<FiltresArticles>,
): FiltresArticles {
  const next = { ...prev, ...patch };
  if (
    patch.familleId !== undefined &&
    patch.familleId !== prev.familleId &&
    patch.sousFamilleId === undefined
  ) {
    next.sousFamilleId = "";
  }
  return next;
}

export function retirerFiltreArticle(
  filtres: FiltresArticles,
  cle: CleFiltreArticle,
): FiltresArticles {
  const vide = FILTRES_ARTICLES_VIDE[cle];
  return patchFiltresArticles(filtres, { [cle]: vide } as Partial<FiltresArticles>);
}

export function nombreFiltresSecondaires(filtres: FiltresArticles) {
  let n = 0;
  for (const cle of CLES_SECONDAIRES) {
    if (filtres[cle] !== FILTRES_ARTICLES_VIDE[cle]) n += 1;
  }
  return n;
}

export function filtresArticlesActifs(filtres: FiltresArticles) {
  return (Object.keys(FILTRES_ARTICLES_VIDE) as CleFiltreArticle[]).some(
    (cle) => filtres[cle] !== FILTRES_ARTICLES_VIDE[cle],
  );
}

const SITUATION_LABELS: Record<Exclude<SituationStockFiltre, "">, string> = {
  rupture: "En rupture",
  seuil: "Sous le seuil d'alerte",
  disponible: "Stock disponible",
};

export function badgesFiltresArticles(
  filtres: FiltresArticles,
  libelles: {
    nomCategorie: (id: string) => string;
    nomSite: (id: string) => string;
    nomFournisseur: (id: string) => string;
  },
): BadgeFiltreArticle[] {
  const out: BadgeFiltreArticle[] = [];
  const push = (cle: CleFiltreArticle, libelle: string) => {
    if (filtres[cle] === FILTRES_ARTICLES_VIDE[cle]) return;
    out.push({ cle, libelle });
  };
  if (filtres.recherche.trim()) {
    push("recherche", `Recherche : ${filtres.recherche.trim()}`);
  }
  if (filtres.code.trim()) push("code", `Code : ${filtres.code.trim()}`);
  if (filtres.libelle.trim()) push("libelle", `Libellé : ${filtres.libelle.trim()}`);
  if (filtres.familleId) {
    push("familleId", `Famille : ${libelles.nomCategorie(filtres.familleId)}`);
  }
  if (filtres.sousFamilleId) {
    push(
      "sousFamilleId",
      `Sous-famille : ${libelles.nomCategorie(filtres.sousFamilleId)}`,
    );
  }
  if (filtres.natureStock) {
    push("natureStock", NATURE_STOCK_LABELS[filtres.natureStock]);
  }
  if (filtres.modeApprovisionnement) {
    push(
      "modeApprovisionnement",
      MODE_APPROVISIONNEMENT_LABELS[filtres.modeApprovisionnement],
    );
  }
  if (filtres.siteId) push("siteId", `Site : ${libelles.nomSite(filtres.siteId)}`);
  if (filtres.statut) {
    push("statut", filtres.statut === "actif" ? "Actifs" : "Inactifs");
  }
  if (filtres.situationStock) {
    push("situationStock", SITUATION_LABELS[filtres.situationStock]);
  }
  if (filtres.typeAchat) {
    push("typeAchat", TYPE_ACHAT_LABELS[filtres.typeAchat]);
  }
  if (filtres.fournisseurId) {
    push(
      "fournisseurId",
      `Fournisseur : ${libelles.nomFournisseur(filtres.fournisseurId)}`,
    );
  }
  if (filtres.sansFamille) push("sansFamille", "Sans famille");
  if (filtres.compteManquant) push("compteManquant", "Compte manquant");
  if (filtres.sansNomenclature) push("sansNomenclature", "Sans nomenclature");
  if (filtres.dateDebut) push("dateDebut", `Créé depuis le ${filtres.dateDebut}`);
  if (filtres.dateFin) push("dateFin", `Créé jusqu'au ${filtres.dateFin}`);
  return out;
}

function jourLocal(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateCreationArticle(
  produitId: string,
  journal: JournalActivite[] | undefined,
): string | null {
  let plusAncienne: string | null = null;
  for (const j of journal ?? []) {
    if (j.entite !== "produit" || j.action !== "creation" || j.entiteId !== produitId) {
      continue;
    }
    const jour = jourLocal(j.date);
    if (jour && (!plusAncienne || jour < plusAncienne)) plusAncienne = jour;
  }
  return plusAncienne;
}

function dansPlage(jour: string | null, debut: string, fin: string) {
  if (!debut && !fin) return true;
  if (!jour) return false;
  if (debut && jour < debut) return false;
  if (fin && jour > fin) return false;
  return true;
}

function sitesDeCalcul(filtres: FiltresArticles, siteIds: string[]) {
  if (!filtres.siteId) return siteIds;
  return siteIds.includes(filtres.siteId) ? [filtres.siteId] : [];
}

export function quantiteStockArticle(
  produitId: string,
  filtres: FiltresArticles,
  ctx: Pick<CtxFiltresArticles, "siteIds" | "entrees" | "ventes" | "inventaires">,
) {
  return sitesDeCalcul(filtres, ctx.siteIds).reduce(
    (s, siteId) =>
      s +
      stockDisponible(
        produitId,
        siteId,
        ctx.entrees,
        ctx.ventes,
        ctx.inventaires,
      ),
    0,
  );
}

/** Rupture au seuil produit, sinon dès que le stock est à zéro. */
export function situationStockArticle(
  produit: Pick<Produit, "seuilRupture" | "seuilReappro">,
  quantite: number,
): Exclude<SituationStockFiltre, ""> {
  const rupture =
    produit.seuilRupture != null && Number.isFinite(produit.seuilRupture)
      ? quantite <= produit.seuilRupture
      : quantite <= 0;
  if (rupture) return "rupture";
  if (
    produit.seuilReappro != null &&
    Number.isFinite(produit.seuilReappro) &&
    quantite <= produit.seuilReappro
  ) {
    return "seuil";
  }
  return "disponible";
}

function sansFamille(
  produit: Pick<Produit, "categorieId">,
  categories: CategorieProduit[],
) {
  if (!produit.categorieId) return true;
  return !categories.some((c) => c.id === produit.categorieId);
}

function aUneNomenclature(produit: Produit) {
  return (produit.nomenclatures ?? []).some((n) =>
    (n.lignes ?? []).some((l) => Boolean(l.composantId)),
  );
}

export function filtrerArticles(
  produits: Produit[],
  filtres: FiltresArticles,
  ctx: CtxFiltresArticles,
): Produit[] {
  const recherche = norm(filtres.recherche);
  const code = norm(filtres.code);
  const libelle = norm(filtres.libelle);
  const besoinStock = Boolean(filtres.situationStock);

  return produits.filter((p) => {
    if (recherche) {
      const ok =
        contient(p.code, recherche) ||
        contient(p.libelleCourt, recherche) ||
        contient(p.libelleLong, recherche);
      if (!ok) return false;
    }
    if (code && !contient(p.code, code)) return false;
    if (
      libelle &&
      !contient(p.libelleCourt, libelle) &&
      !contient(p.libelleLong, libelle)
    ) {
      return false;
    }

    if (filtres.sansFamille && !sansFamille(p, ctx.categories)) return false;
    if (filtres.sousFamilleId) {
      if (!produitAppartientFamille(p, filtres.sousFamilleId, ctx.categories)) {
        return false;
      }
    } else if (filtres.familleId) {
      if (!produitAppartientFamille(p, filtres.familleId, ctx.categories)) {
        return false;
      }
    }

    if (filtres.natureStock && natureStockDuProduit(p) !== filtres.natureStock) {
      return false;
    }
    if (filtres.modeApprovisionnement) {
      if (modeApprovisionnementDuProduit(p) !== filtres.modeApprovisionnement) {
        return false;
      }
    }
    if (filtres.statut === "actif" && !p.actif) return false;
    if (filtres.statut === "inactif" && p.actif) return false;
    if (filtres.typeAchat && (p.typeAchat ?? "marchandises") !== filtres.typeAchat) {
      return false;
    }
    if (filtres.fournisseurId) {
      const prioritaire = fournisseurPrioritaireId(p, {
        achats: ctx.achats,
        demandesPrix: ctx.demandesPrix,
      });
      if (prioritaire !== filtres.fournisseurId) return false;
    }
    if (filtres.compteManquant && !produitSansCompteComptable(p, ctx.comptes)) {
      return false;
    }
    if (filtres.sansNomenclature) {
      const fabrication =
        modeApprovisionnementDuProduit(p) === "fabrication_commande";
      if (!fabrication || aUneNomenclature(p)) return false;
    }
    if (
      !dansPlage(
        dateCreationArticle(p.id, ctx.journal),
        filtres.dateDebut,
        filtres.dateFin,
      )
    ) {
      return false;
    }
    if (besoinStock) {
      if (filtres.siteId && !ctx.siteIds.includes(filtres.siteId)) return false;
      const qte = quantiteStockArticle(p.id, filtres, ctx);
      if (situationStockArticle(p, qte) !== filtres.situationStock) return false;
    }
    return true;
  });
}

export function paginerArticles<T>(
  liste: T[],
  page: number,
  pageSize = PAGE_ARTICLES,
) {
  const total = liste.length;
  const pages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const pageCourante = Math.min(Math.max(1, page), pages);
  const debut = (pageCourante - 1) * pageSize;
  return {
    total,
    pages,
    page: pageCourante,
    lignes: liste.slice(debut, debut + pageSize),
  };
}

export function ajouterFiltreEnregistre(
  liste: FiltreArticleEnregistre[],
  entree: FiltreArticleEnregistre,
): { ok: true; liste: FiltreArticleEnregistre[] } | { ok: false; reason: string } {
  const nom = entree.nom.trim();
  if (!nom) return { ok: false, reason: "Indiquez un nom pour ce filtre." };
  if (liste.some((f) => f.nom.toLowerCase() === nom.toLowerCase())) {
    return { ok: false, reason: "Un filtre porte déjà ce nom." };
  }
  return { ok: true, liste: [...liste, { ...entree, nom }] };
}

export function renommerFiltreEnregistre(
  liste: FiltreArticleEnregistre[],
  id: string,
  nom: string,
): { ok: true; liste: FiltreArticleEnregistre[] } | { ok: false; reason: string } {
  const propre = nom.trim();
  if (!propre) return { ok: false, reason: "Indiquez un nom pour ce filtre." };
  if (!liste.some((f) => f.id === id)) {
    return { ok: false, reason: "Filtre introuvable." };
  }
  if (
    liste.some(
      (f) => f.id !== id && f.nom.toLowerCase() === propre.toLowerCase(),
    )
  ) {
    return { ok: false, reason: "Un filtre porte déjà ce nom." };
  }
  return {
    ok: true,
    liste: liste.map((f) => (f.id === id ? { ...f, nom: propre } : f)),
  };
}

export function supprimerFiltreEnregistre(
  liste: FiltreArticleEnregistre[],
  id: string,
) {
  return liste.filter((f) => f.id !== id);
}

export const COLONNES_EXPORT_ARTICLES = [
  "Code",
  "Libellé",
  "Famille",
  "Unité",
  "Nature",
  "Approvisionnement",
  "Circuit",
  "Vente HT",
  "Statut",
] as const;

export function ligneExportArticle(
  produit: Produit,
  categories: CategorieProduit[],
) {
  const mode = modeApprovisionnementDuProduit(produit);
  return [
    produit.code,
    produit.libelleCourt,
    cheminCategorie(produit.categorieId, categories),
    produit.unite,
    NATURE_STOCK_LABELS[natureStockDuProduit(produit)],
    mode ? MODE_APPROVISIONNEMENT_LABELS[mode] : "",
    USAGE_COMMERCIAL_LABELS[usageCommercialDuProduit(produit, categories)],
    produit.prixVenteHT,
    produit.actif ? "Actif" : "Inactif",
  ];
}

export function lignesExportArticles(
  produits: Produit[],
  categories: CategorieProduit[],
) {
  return [
    [...COLONNES_EXPORT_ARTICLES],
    ...produits.map((p) => ligneExportArticle(p, categories)),
  ];
}
