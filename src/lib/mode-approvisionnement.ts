import { stockDisponible } from "./calculations";
import { isLigneProduit } from "./commercial";
import { natureStockDuProduit, produitEstAchetable } from "./nature-stock";
import { nomenclatureStandardDuProduit } from "./nomenclature";
import { quantiteUnitaireResolue } from "./nomenclature-formules";
import type {
  BonDeLivraison,
  CategorieProduit,
  Commande,
  EntreeStock,
  Inventaire,
  LigneDocument,
  OrdreFabrication,
  PointDeVente,
  Produit,
  Vente,
} from "./types";

/** Comment le client est servi : négoce ou fabrication sur commande. */
export type ModeApprovisionnement = "sur_stock" | "fabrication_commande";

export const MODE_APPROVISIONNEMENT_LABELS: Record<ModeApprovisionnement, string> = {
  sur_stock: "Sur stock",
  fabrication_commande: "Fabrication sur commande",
};

export type StatutLigneFabrication =
  | "a_fabriquer"
  | "en_fabrication"
  | "pret_a_livrer";

export const STATUT_LIGNE_FABRICATION: Record<StatutLigneFabrication, string> = {
  a_fabriquer: "À fabriquer",
  en_fabrication: "En fabrication",
  pret_a_livrer: "Prêt à livrer",
};

export type StatutLigneSurStock =
  | "stock_insuffisant"
  | "disponible"
  | "partiellement_livree"
  | "livree";

export const STATUT_LIGNE_SUR_STOCK: Record<StatutLigneSurStock, string> = {
  stock_insuffisant: "Stock insuffisant",
  disponible: "Disponible",
  partiellement_livree: "Partiellement livrée",
  livree: "Livrée",
};

/**
 * Marchandise, fini et semi-fini se commandent.
 * La matière première n'est pas une ligne de vente client.
 */
export function natureAdmetModeApprovisionnement(
  nature: ReturnType<typeof natureStockDuProduit>,
) {
  return nature === "marchandise" || nature === "fini" || nature === "semi_fini";
}

/**
 * Suggestion à l'ouverture du champ. Le choix reste libre ensuite :
 * un fini sur mesure peut passer en fabrication sur commande,
 * un semi-fini vendu tel quel peut passer sur stock.
 */
export function modeApprovisionnementSuggere(
  nature: ReturnType<typeof natureStockDuProduit>,
): ModeApprovisionnement | null {
  if (!natureAdmetModeApprovisionnement(nature)) return null;
  if (nature === "semi_fini") return "fabrication_commande";
  return "sur_stock";
}

export function modeApprovisionnementEnregistre(
  nature: ReturnType<typeof natureStockDuProduit>,
  choisi: ModeApprovisionnement | undefined | null,
): ModeApprovisionnement | undefined {
  if (!natureAdmetModeApprovisionnement(nature)) return undefined;
  if (choisi === "fabrication_commande" || choisi === "sur_stock") return choisi;
  return modeApprovisionnementSuggere(nature) ?? "sur_stock";
}

export function modeApprovisionnementDuProduit(
  produit: Pick<Produit, "natureStock" | "modeApprovisionnement"> | undefined | null,
): ModeApprovisionnement | null {
  if (!produit) return null;
  const nature = natureStockDuProduit(produit);
  if (!natureAdmetModeApprovisionnement(nature)) return null;
  if (
    produit.modeApprovisionnement === "fabrication_commande" ||
    produit.modeApprovisionnement === "sur_stock"
  ) {
    return produit.modeApprovisionnement;
  }
  return modeApprovisionnementSuggere(nature);
}

/** Snapshot de la ligne s'il existe, sinon la fiche actuelle. */
export function modeApprovisionnementLigne(
  ligne: Pick<LigneDocument, "modeApprovisionnement" | "produitId" | "type">,
  produit: Pick<Produit, "natureStock" | "modeApprovisionnement"> | undefined,
): ModeApprovisionnement | null {
  if (!isLigneProduit(ligne)) return null;
  if (ligne.modeApprovisionnement === "fabrication_commande") {
    return "fabrication_commande";
  }
  if (ligne.modeApprovisionnement === "sur_stock") return "sur_stock";
  return modeApprovisionnementDuProduit(produit);
}

export function ligneEstFabricationCommande(
  ligne: Pick<LigneDocument, "modeApprovisionnement" | "produitId" | "type">,
  produit: Pick<Produit, "natureStock" | "modeApprovisionnement"> | undefined,
) {
  return modeApprovisionnementLigne(ligne, produit) === "fabrication_commande";
}

const OF_IGNORES = new Set(["annule", "cloture_annule"]);

export function ofsLiesALaLigne(
  ligne: Pick<LigneDocument, "id" | "produitId">,
  commandeId: string,
  ofs: OrdreFabrication[],
) {
  const vivants = ofs.filter((o) => !OF_IGNORES.has(o.statut));
  const directs = vivants.filter((o) => o.ligneCommandeId === ligne.id);
  if (directs.length > 0) return directs;
  if (!ligne.produitId) return [];
  return vivants.filter(
    (o) =>
      !o.ligneCommandeId &&
      o.commandeId === commandeId &&
      o.produitId === ligne.produitId,
  );
}

export function statutLigneFabrication(
  ligne: Pick<LigneDocument, "id" | "produitId" | "quantite">,
  commandeId: string,
  ofs: OrdreFabrication[],
): StatutLigneFabrication {
  const lies = ofsLiesALaLigne(ligne, commandeId, ofs);
  const qteClose = lies
    .filter((o) => o.statut === "cloture")
    .reduce((s, o) => s + Math.max(0, o.quantitePrevue), 0);
  if (qteClose + 1e-9 >= Math.max(0, ligne.quantite) && ligne.quantite > 0) {
    return "pret_a_livrer";
  }
  if (lies.some((o) => o.statut === "en_cours" || o.statut === "cloture")) {
    return "en_fabrication";
  }
  return "a_fabriquer";
}

function quantiteLivreeProduitCommande(
  commandeId: string,
  produitId: string,
  bons: BonDeLivraison[],
) {
  let q = 0;
  for (const b of bons) {
    if (b.commandeId !== commandeId || b.statut === "annule") continue;
    for (const l of b.lignes) {
      if ((l.type ?? "produit") !== "produit") continue;
      if (l.produitId === produitId) q += Math.max(0, l.quantite);
    }
  }
  return q;
}

/**
 * Répartit les quantités déjà livrées sur les lignes du même article,
 * dans l'ordre de la commande.
 */
export function quantiteLivreeAffecteeLigne(
  commande: Pick<Commande, "id" | "lignes">,
  ligne: LigneDocument,
  bons: BonDeLivraison[],
) {
  if (!ligne.produitId) return 0;
  let reste = quantiteLivreeProduitCommande(
    commande.id,
    ligne.produitId,
    bons,
  );
  for (const l of commande.lignes) {
    if (!isLigneProduit(l) || l.produitId !== ligne.produitId) continue;
    const pris = Math.min(Math.max(0, l.quantite), reste);
    if (l.id === ligne.id) return pris;
    reste -= pris;
  }
  return 0;
}

/** Statut d'une ligne sur stock : disponibilité, puis livraisons déjà faites. */
export function statutLigneSurStock(opts: {
  ligne: LigneDocument;
  commande: Pick<Commande, "id" | "lignes">;
  bons: BonDeLivraison[];
  stockDispo: number;
}): StatutLigneSurStock {
  const livree = quantiteLivreeAffecteeLigne(
    opts.commande,
    opts.ligne,
    opts.bons,
  );
  const qte = Math.max(0, opts.ligne.quantite);
  if (qte > 0 && livree + 1e-9 >= qte) return "livree";
  if (livree > 1e-9) return "partiellement_livree";
  if (opts.stockDispo + 1e-9 >= qte) return "disponible";
  return "stock_insuffisant";
}

export type ManqueMatiere = {
  composantId: string;
  code: string;
  libelle: string;
  unite: string;
  besoin: number;
  disponible: number;
  manque: number;
  achetable: boolean;
};

function besoinComposantsLigne(
  ligne: LigneDocument,
  produit: Produit,
): Map<string, number> {
  const out = new Map<string, number>();
  const nomenc = nomenclatureStandardDuProduit(produit);
  const lignes = nomenc?.lignes ?? [];
  if (lignes.length === 0) return out;
  const dims = {
    largeur: ligne.largeurM,
    hauteur: ligne.hauteurM,
  };
  const qteProduit = Math.max(0, ligne.quantite);
  for (const l of lignes) {
    const unitaire = quantiteUnitaireResolue(l, lignes, dims);
    const besoin = unitaire * qteProduit;
    if (besoin <= 1e-9 || !l.composantId) continue;
    out.set(l.composantId, (out.get(l.composantId) ?? 0) + besoin);
  }
  return out;
}

export function manquesMatieresCommande(opts: {
  commande: Pick<Commande, "lignes" | "pointDeVenteId">;
  produits: Produit[];
  categories?: CategorieProduit[] | null;
  sites: PointDeVente[];
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
}): ManqueMatiere[] {
  const besoin = new Map<string, number>();
  for (const ligne of opts.commande.lignes) {
    if (!isLigneProduit(ligne) || !ligne.produitId) continue;
    const produit = opts.produits.find((p) => p.id === ligne.produitId);
    if (!ligneEstFabricationCommande(ligne, produit) || !produit) continue;
    const part = besoinComposantsLigne(ligne, produit);
    for (const [id, q] of part) besoin.set(id, (besoin.get(id) ?? 0) + q);
  }
  const sites = opts.sites.filter((s) => s.actif && s.id !== "tous");
  const manques: ManqueMatiere[] = [];
  for (const [composantId, qte] of besoin) {
    const composant = opts.produits.find((p) => p.id === composantId);
    const disponible = sites.reduce(
      (s, site) =>
        s +
        stockDisponible(
          composantId,
          site.id,
          opts.entrees,
          opts.ventes,
          opts.inventaires,
        ),
      0,
    );
    if (disponible + 1e-9 >= qte) continue;
    manques.push({
      composantId,
      code: composant?.code ?? "",
      libelle: composant?.libelleCourt || composant?.libelleLong || "Article",
      unite: composant?.unite ?? "",
      besoin: qte,
      disponible,
      manque: qte - disponible,
      achetable: composant
        ? produitEstAchetable(composant, opts.categories)
        : false,
    });
  }
  return manques.sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
}

/** Vrai si une ligne à fabriquer n'a pas de nomenclature exploitable. */
export function lignesFabricationSansNomenclature(
  commande: Pick<Commande, "lignes">,
  produits: Produit[],
) {
  const noms: string[] = [];
  for (const ligne of commande.lignes) {
    if (!isLigneProduit(ligne) || !ligne.produitId) continue;
    const produit = produits.find((p) => p.id === ligne.produitId);
    if (!ligneEstFabricationCommande(ligne, produit) || !produit) continue;
    const nomenc = nomenclatureStandardDuProduit(produit);
    if (!nomenc || nomenc.lignes.length === 0) {
      noms.push(produit.libelleCourt || ligne.designation);
    }
  }
  return noms;
}

export type AnalyseLivraisonCommande = {
  /** Lignes produit prêtes, quantité = reste à livrer. */
  livrables: LigneDocument[];
  /** Lignes encore en fabrication, pas encore prêtes. */
  enAttente: {
    id: string;
    designation: string;
    statut: StatutLigneFabrication;
  }[];
  /**
   * Toutes les lignes produit partent en une fois, à leur quantité d'origine.
   * On peut alors recopier aussi les commentaires et sous-totaux.
   */
  integral: boolean;
};

/**
 * Une commande mixte livre chaque ligne selon son état.
 * Sur stock : le reste non encore livré.
 * Fabrication sur commande : seulement quand l'ordre de fabrication est terminé
 * (Prêt à livrer).
 */
export function analyseLivraisonCommande(opts: {
  commande: Pick<Commande, "id" | "lignes">;
  produits: Produit[];
  ofs: OrdreFabrication[];
  bons: BonDeLivraison[];
}): AnalyseLivraisonCommande {
  const livrables: LigneDocument[] = [];
  const enAttente: AnalyseLivraisonCommande["enAttente"] = [];
  let produitCount = 0;
  let integral = true;
  for (const ligne of opts.commande.lignes) {
    if (!isLigneProduit(ligne) || !ligne.produitId) continue;
    produitCount += 1;
    const produit = opts.produits.find((p) => p.id === ligne.produitId);
    const livree = quantiteLivreeAffecteeLigne(
      opts.commande,
      ligne,
      opts.bons,
    );
    const reste = Math.max(0, ligne.quantite - livree);
    if (ligneEstFabricationCommande(ligne, produit)) {
      const statut = statutLigneFabrication(ligne, opts.commande.id, opts.ofs);
      if (statut !== "pret_a_livrer") {
        if (reste > 1e-9) {
          enAttente.push({
            id: ligne.id,
            designation: ligne.designation,
            statut,
          });
        }
        integral = false;
        continue;
      }
    }
    if (reste <= 1e-9) {
      integral = false;
      continue;
    }
    if (reste + 1e-9 < ligne.quantite) integral = false;
    livrables.push({ ...ligne, quantite: reste });
  }
  if (produitCount === 0 || livrables.length !== produitCount) integral = false;
  return { livrables, enAttente, integral };
}

/** Lignes à recopier sur le bon : document entier, ou seulement le prêt à partir. */
export function lignesSortieCommande(
  commande: Pick<Commande, "lignes">,
  analyse: AnalyseLivraisonCommande,
): LigneDocument[] {
  return analyse.integral ? [...commande.lignes] : analyse.livrables;
}

/** Lignes à fabriquer encore non livrées, ordre de fabrication non terminé. */
export function nombreLignesEnFabricationNonLivrees(opts: {
  commande: Pick<Commande, "id" | "lignes">;
  produits: Produit[];
  ofs: OrdreFabrication[];
  bons: BonDeLivraison[];
}): number {
  return analyseLivraisonCommande(opts).enAttente.length;
}

export function motifAucuneLigneLivrable(
  analyse: AnalyseLivraisonCommande,
): string | null {
  if (analyse.livrables.length > 0) return null;
  if (analyse.enAttente.length === 0) {
    return "Cette commande est déjà livrée.";
  }
  const details = analyse.enAttente
    .map((l) => `${l.designation} (${STATUT_LIGNE_FABRICATION[l.statut]})`)
    .join(", ");
  return `Aucune ligne n'est prête à livrer : ${details}. Terminez la fabrication depuis la commande, puis relancez le bon de livraison.`;
}
