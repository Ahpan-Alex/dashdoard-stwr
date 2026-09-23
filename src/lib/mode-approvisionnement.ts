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

/** Marchandise et fini se commandent. Matière et semi-fini, non. */
export function natureAdmetModeApprovisionnement(
  nature: ReturnType<typeof natureStockDuProduit>,
) {
  return nature === "marchandise" || nature === "fini";
}

/**
 * Suggestion à l'ouverture du champ. Le choix reste libre :
 * un fini sur mesure peut être « fabrication sur commande ».
 */
export function modeApprovisionnementSuggere(
  nature: ReturnType<typeof natureStockDuProduit>,
): ModeApprovisionnement | null {
  if (!natureAdmetModeApprovisionnement(nature)) return null;
  return "sur_stock";
}

export function modeApprovisionnementEnregistre(
  nature: ReturnType<typeof natureStockDuProduit>,
  choisi: ModeApprovisionnement | undefined | null,
): ModeApprovisionnement | undefined {
  if (!natureAdmetModeApprovisionnement(nature)) return undefined;
  return choisi === "fabrication_commande" ? "fabrication_commande" : "sur_stock";
}

export function modeApprovisionnementDuProduit(
  produit: Pick<Produit, "natureStock" | "modeApprovisionnement"> | undefined | null,
): ModeApprovisionnement | null {
  if (!produit) return null;
  const nature = natureStockDuProduit(produit);
  if (!natureAdmetModeApprovisionnement(nature)) return null;
  return produit.modeApprovisionnement === "fabrication_commande"
    ? "fabrication_commande"
    : "sur_stock";
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

/**
 * Statut de ligne seulement. Le badge global de la commande
 * (par exemple « partiellement livrée ») n'intègre pas encore l'état des
 * ordres de fabrication. À reprendre avec les bons de livraison sur commandes mixtes.
 */
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
