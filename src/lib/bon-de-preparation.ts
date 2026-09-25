import { getActiviteActor } from "./activity-actor";
import { stockDisponible } from "./calculations";
import { isLigneProduit } from "./commercial";
import { createId } from "./id";
import { produitEstFabrique } from "./nature-stock";
import { emplacementParDefautDuSite } from "./emplacements-stock";
import {
  analyseLivraisonCommande,
  motifAucuneLigneLivrable,
} from "./mode-approvisionnement";
import type {
  BonDeLivraison,
  BonDePreparation,
  BonDePreparationStatut,
  Commande,
  EmplacementStock,
  EntreeStock,
  Inventaire,
  LigneDocument,
  OrdreFabrication,
  Parametres,
  PointDeVente,
  Produit,
  Vente,
  VersionBonDePreparation,
} from "./types";

export const BP_STATUTS: Record<BonDePreparationStatut, string> = {
  a_preparer: "À préparer",
  en_cours: "En cours",
  pret: "Prêt",
  en_transformation: "En cours de transformation",
  transforme: "Transformé en BL",
  annule: "Annulé",
};

export const COLONNES_PRIX_DOCUMENT = [
  "pu_ht",
  "pu_ttc",
  "remise_pct",
  "remise_ht",
  "pu_ht_remise",
  "pu_ttc_remise",
  "total_ht",
  "total_ht_remise",
  "tva_pct",
  "tva_montant",
  "total_ttc",
] as const;

export function moduleBonDePreparationActif(
  parametres?: Pick<Parametres, "moduleBonDePreparation"> | null,
) {
  return parametres?.moduleBonDePreparation === true;
}

export function commandePeutGenererBp(commande: Pick<Commande, "statut">) {
  return (
    commande.statut !== "brouillon" &&
    commande.statut !== "annulee" &&
    commande.statut !== "en_transformation"
  );
}

export function ofsOuvertsPourCommande(
  commandeId: string,
  ofs: OrdreFabrication[],
) {
  return ofs.filter(
    (o) =>
      o.commandeId === commandeId &&
      o.statut !== "annule" &&
      o.statut !== "cloture" &&
      o.statut !== "cloture_annule",
  );
}

export function raisonGenerationBp(opts: {
  commande: Commande | undefined;
  ofs: OrdreFabrication[];
  parametres?: Parametres | null;
  produits?: Produit[];
  bons?: BonDeLivraison[];
}): string | null {
  if (!moduleBonDePreparationActif(opts.parametres)) {
    return "Le bon de préparation n'est pas activé (Paramètres → Documents commerciaux).";
  }
  const c = opts.commande;
  if (!c) return "Commande introuvable.";
  if (c.statut === "annulee") return "Impossible de préparer une commande annulée.";
  if (c.statut === "brouillon") {
    return "Confirmez d'abord la commande avant de générer un bon de préparation.";
  }
  if (opts.produits) {
    return motifAucuneLigneLivrable(
      analyseLivraisonCommande({
        commande: c,
        produits: opts.produits,
        ofs: opts.ofs,
        bons: opts.bons ?? [],
      }),
    );
  }
  const ouverts = ofsOuvertsPourCommande(c.id, opts.ofs);
  if (ouverts.length > 0) {
    return `Terminez d'abord la fabrication liée (${ouverts.map((o) => o.numero).join(", ")}).`;
  }
  return null;
}

export function bpComptePourPreparation(b: Pick<BonDePreparation, "statut">) {
  return b.statut !== "annule";
}

export function lignesPreparationDepuisCommande(
  lignes: LigneDocument[],
  siteStockId: string,
  emplacements?: EmplacementStock[],
): LigneDocument[] {
  return lignes.map((l) => {
    const site = l.siteStockId || siteStockId;
    const defaut = emplacementParDefautDuSite(emplacements, site);
    return {
      ...l,
      id: createId("bpl"),
      prepare: false,
      siteStockId: site,
      emplacementId: l.emplacementId || defaut?.id,
    };
  });
}

export function nomSitePreparation(
  siteId: string | undefined,
  sites: PointDeVente[],
  repli?: string,
) {
  if (!siteId) return repli ?? "—";
  return sites.find((s) => s.id === siteId)?.nom ?? repli ?? "—";
}

export function stockLignePreparation(opts: {
  ligne: LigneDocument;
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
  siteDefautId: string;
}) {
  if (!isLigneProduit(opts.ligne) || !opts.ligne.produitId) return null;
  const siteId = opts.ligne.siteStockId || opts.siteDefautId;
  return stockDisponible(
    opts.ligne.produitId,
    siteId,
    opts.entrees,
    opts.ventes,
    opts.inventaires,
  );
}

export function commandeContientFabrique(
  commande: Commande,
  produits: Produit[],
) {
  return commande.lignes.some((l) => {
    if (!isLigneProduit(l) || !l.produitId) return false;
    const p = produits.find((x) => x.id === l.produitId);
    return p ? produitEstFabrique(p) : false;
  });
}

export function snapshotVersionBp(
  bp: BonDePreparation,
): VersionBonDePreparation {
  const actor = getActiviteActor();
  const versions = bp.versions ?? [];
  return {
    id: createId("bpv"),
    version: versions.length + 1,
    date: new Date().toISOString(),
    userId: actor.id,
    userNom: actor.nom,
    statut: bp.statut,
    afficherPrix: bp.afficherPrix === true,
    lignes: bp.lignes.map((l) => ({ ...l })),
    note: bp.note,
  };
}

export function avecVersionSiStatutChange(
  prev: BonDePreparation,
  next: BonDePreparation,
): BonDePreparation {
  if (prev.statut === next.statut) return next;
  return {
    ...next,
    versions: [...(next.versions ?? prev.versions ?? []), snapshotVersionBp(next)],
  };
}

export function toutesLignesPreparees(bp: Pick<BonDePreparation, "lignes">) {
  const produits = bp.lignes.filter((l) => isLigneProduit(l));
  if (produits.length === 0) return false;
  return produits.every((l) => l.prepare);
}
