import { nextNumero } from "./commercial";
import { libelleProduit } from "./produits";
import type { DemandePrix, DemandePrixOffre, DemandePrixStatut, Produit } from "./types";

export const DP_STATUT_LABELS: Record<DemandePrixStatut, string> = {
  brouillon: "Brouillon",
  en_cours: "En cours",
  cloturee: "Clôturée",
  annulee: "Annulée",
};

export function nextNumeroDemandePrix(demandes: DemandePrix[]) {
  return nextNumero(
    "DP",
    demandes.map((d) => d.numero),
  );
}

export function dpEstVerrouillee(d: Pick<DemandePrix, "statut">) {
  return d.statut === "cloturee" || d.statut === "annulee";
}

export function offreLigneFournisseur(
  dp: Pick<DemandePrix, "offres">,
  ligneId: string,
  fournisseurId: string,
) {
  return (dp.offres ?? []).find((o) => o.ligneId === ligneId && o.fournisseurId === fournisseurId);
}

export function offresPricéesLigne(
  offres: DemandePrixOffre[],
  ligneId: string,
): DemandePrixOffre[] {
  return offres.filter((o) => o.ligneId === ligneId && o.prixUnitaire > 0);
}

/** Rang 1 = prix le plus bas. Prix égaux : même rang (compétition). */
export function rangsPrixParFournisseur(offres: DemandePrixOffre[]): Map<string, number> {
  const sorted = [...offres]
    .filter((o) => o.prixUnitaire > 0)
    .sort(
      (a, b) =>
        a.prixUnitaire - b.prixUnitaire || a.fournisseurId.localeCompare(b.fournisseurId),
    );
  const rangs = new Map<string, number>();
  let rang = 0;
  let prev: number | undefined;
  let seen = 0;
  for (const o of sorted) {
    seen += 1;
    if (prev === undefined || o.prixUnitaire > prev) {
      rang = seen;
      prev = o.prixUnitaire;
    }
    rangs.set(o.fournisseurId, rang);
  }
  return rangs;
}

export function prixMiniLigne(offres: DemandePrixOffre[], ligneId: string) {
  const prix = offresPricéesLigne(offres, ligneId).map((o) => o.prixUnitaire);
  if (prix.length === 0) return null;
  return Math.min(...prix);
}

export function trierOffresParPrix(
  offres: DemandePrixOffre[],
  sens: "asc" | "desc",
) {
  return [...offres].sort((a, b) => {
    const pa = a.prixUnitaire > 0 ? a.prixUnitaire : sens === "asc" ? Infinity : -Infinity;
    const pb = b.prixUnitaire > 0 ? b.prixUnitaire : sens === "asc" ? Infinity : -Infinity;
    if (pa !== pb) return sens === "asc" ? pa - pb : pb - pa;
    return a.fournisseurId.localeCompare(b.fournisseurId);
  });
}

export function fournisseursRetenusIds(dp: Pick<DemandePrix, "fournisseurIdsRetenus">) {
  return dp.fournisseurIdsRetenus ?? [];
}

export type LigneCommandeDepuisDp = {
  produitId: string;
  quantite: number;
  prixAchatUnitaire: number;
  designation: string;
};

/** Lignes préremplies pour un fournisseur retenu (prix de son offre, sinon 0). */
export function lignesCommandeDepuisDp(
  dp: Pick<DemandePrix, "lignes" | "offres">,
  fournisseurId: string,
  produits: Produit[],
): LigneCommandeDepuisDp[] {
  return (dp.lignes ?? [])
    .filter((l) => l.produitId)
    .map((l) => {
      const p = produits.find((x) => x.id === l.produitId);
      const offre = offreLigneFournisseur(dp, l.id, fournisseurId);
      return {
        produitId: l.produitId,
        quantite: l.quantite,
        prixAchatUnitaire: offre?.prixUnitaire ?? 0,
        designation: p
          ? `${p.code || ""} — ${libelleProduit(p) || "Article"}`.replace(/^ — /, "")
          : "Article",
      };
    });
}

export function dpPeutEtreTransformee(dp: Pick<DemandePrix, "statut" | "fournisseurIdsRetenus" | "lignes">) {
  if (dp.statut === "annulee") return false;
  if ((dp.lignes ?? []).length === 0) return false;
  return fournisseursRetenusIds(dp).length > 0;
}
