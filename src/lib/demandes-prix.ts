import { nextNumero } from "./commercial";
import type { OptsNumeroDocument } from "./exercices";
import { libelleProduit } from "./produits";
import type {
  DemandePrix,
  DemandePrixConsultation,
  DemandePrixConsultationStatut,
  DemandePrixOffre,
  DemandePrixStatut,
  Produit,
} from "./types";

export const DP_STATUT_LABELS: Record<DemandePrixStatut, string> = {
  brouillon: "Brouillon",
  en_cours: "En cours",
  cloturee: "Clôturée",
  cloturee_sans_suite: "Clôturée sans suite",
  annulee: "Annulée",
};

export function badgeClasseDp(statut: DemandePrixStatut) {
  if (statut === "cloturee") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  if (statut === "annulee") return "badge-danger";
  if (statut === "cloturee_sans_suite") return "badge-sand";
  return "badge-sea";
}

export const DP_CONSULTATION_STATUT_LABELS: Record<
  DemandePrixConsultationStatut,
  string
> = {
  envoyee: "Envoyée",
  en_attente: "En attente",
  repondue: "Répondue",
  relancee: "Relancée",
  sans_reponse: "Sans réponse",
};

export function nextNumeroDemandePrix(
  demandes: DemandePrix[],
  opts?: OptsNumeroDocument,
) {
  return nextNumero(
    "DP",
    demandes.map((d) => d.numero),
    opts,
  );
}

export function dpEstVerrouillee(d: Pick<DemandePrix, "statut">) {
  return (
    d.statut === "cloturee" ||
    d.statut === "cloturee_sans_suite" ||
    d.statut === "annulee"
  );
}

export function prixNetOffre(
  o: Pick<DemandePrixOffre, "prixUnitaire" | "remisePercent">,
) {
  const pu = o.prixUnitaire || 0;
  const r = Math.min(100, Math.max(0, o.remisePercent ?? 0));
  return Math.round(pu * (1 - r / 100));
}

export function consultationsDp(
  dp: Pick<DemandePrix, "fournisseurIds" | "consultations">,
): DemandePrixConsultation[] {
  return (dp.fournisseurIds ?? []).map((fournisseurId) => {
    const exist = (dp.consultations ?? []).find((c) => c.fournisseurId === fournisseurId);
    return exist ?? { fournisseurId, statut: "en_attente" };
  });
}

function fournisseurARepondu(
  dp: Pick<DemandePrix, "offres">,
  fournisseurId: string,
) {
  return (dp.offres ?? []).some(
    (o) => o.fournisseurId === fournisseurId && o.prixUnitaire > 0,
  );
}

/** Statut affiché : Répondue dès qu'un prix est saisi, sinon le statut manuel. */
export function statutConsultationEffective(
  dp: Pick<DemandePrix, "offres" | "consultations" | "fournisseurIds">,
  fournisseurId: string,
): DemandePrixConsultationStatut {
  const base =
    consultationsDp(dp).find((c) => c.fournisseurId === fournisseurId)?.statut ??
    "en_attente";
  if (fournisseurARepondu(dp, fournisseurId) && base !== "sans_reponse") {
    return "repondue";
  }
  return base;
}

/**
 * Statut global : clôture/annulation stockées, sinon dérivé des consultations.
 */
export function statutGlobalDp(dp: DemandePrix): DemandePrixStatut {
  if (
    dp.statut === "annulee" ||
    dp.statut === "cloturee" ||
    dp.statut === "cloturee_sans_suite"
  ) {
    return dp.statut;
  }
  const ids = dp.fournisseurIds ?? [];
  if (ids.length === 0 || dp.statut === "brouillon") {
    const aucuneEnvoyee = ids.every((fid) => {
      const s = statutConsultationEffective(dp, fid);
      return s === "en_attente";
    });
    if (aucuneEnvoyee && !ids.some((fid) => fournisseurARepondu(dp, fid))) {
      return "brouillon";
    }
  }
  return "en_cours";
}

export function libelleStatutGlobalDp(dp: DemandePrix): string {
  const stocke = statutGlobalDp(dp);
  if (stocke !== "en_cours") return DP_STATUT_LABELS[stocke];
  const ids = dp.fournisseurIds ?? [];
  if (ids.length === 0) return DP_STATUT_LABELS.en_cours;
  const stats = ids.map((fid) => statutConsultationEffective(dp, fid));
  if (stats.every((s) => s === "repondue")) return "Répondue";
  if (stats.every((s) => s === "sans_reponse")) return "Sans réponse";
  if (stats.some((s) => s === "relancee") && !stats.every((s) => s === "repondue")) {
    return "Relancée";
  }
  if (stats.every((s) => s === "envoyee" || s === "en_attente")) {
    return stats.some((s) => s === "envoyee") ? "Envoyée" : "En attente";
  }
  return DP_STATUT_LABELS.en_cours;
}

export function fournisseurRetenuLigne(
  dp: Pick<DemandePrix, "retenuesParLigne">,
  ligneId: string,
) {
  return (dp.retenuesParLigne ?? []).find((r) => r.ligneId === ligneId)?.fournisseurId;
}

export function synchroniserConsultations(
  fournisseurIds: string[],
  prev: DemandePrixConsultation[] | undefined,
): DemandePrixConsultation[] {
  return fournisseurIds.map((fournisseurId) => {
    const exist = (prev ?? []).find((c) => c.fournisseurId === fournisseurId);
    return exist ?? { fournisseurId, statut: "en_attente" as const };
  });
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

/** Rang 1 = prix net le plus bas. Prix égaux : même rang (compétition). */
export function rangsPrixParFournisseur(offres: DemandePrixOffre[]): Map<string, number> {
  const sorted = [...offres]
    .filter((o) => o.prixUnitaire > 0)
    .sort(
      (a, b) =>
        prixNetOffre(a) - prixNetOffre(b) || a.fournisseurId.localeCompare(b.fournisseurId),
    );
  const rangs = new Map<string, number>();
  let rang = 0;
  let prev: number | undefined;
  let seen = 0;
  for (const o of sorted) {
    seen += 1;
    const net = prixNetOffre(o);
    if (prev === undefined || net > prev) {
      rang = seen;
      prev = net;
    }
    rangs.set(o.fournisseurId, rang);
  }
  return rangs;
}

export function prixMiniLigne(offres: DemandePrixOffre[], ligneId: string) {
  const prix = offresPricéesLigne(offres, ligneId).map((o) => prixNetOffre(o));
  if (prix.length === 0) return null;
  return Math.min(...prix);
}

export function trierOffresParPrix(
  offres: DemandePrixOffre[],
  sens: "asc" | "desc",
) {
  return [...offres].sort((a, b) => {
    const pa = a.prixUnitaire > 0 ? prixNetOffre(a) : sens === "asc" ? Infinity : -Infinity;
    const pb = b.prixUnitaire > 0 ? prixNetOffre(b) : sens === "asc" ? Infinity : -Infinity;
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
        prixAchatUnitaire: offre ? prixNetOffre(offre) || offre.prixUnitaire : 0,
        designation: p
          ? `${p.code || ""} — ${libelleProduit(p) || "Article"}`.replace(/^ — /, "")
          : "Article",
      };
    });
}

export function dpPeutEtreTransformee(
  dp: Pick<DemandePrix, "statut" | "fournisseurIdsRetenus" | "fournisseurIds" | "lignes" | "retenuesParLigne">,
) {
  if (dp.statut === "annulee" || dp.statut === "cloturee_sans_suite") return false;
  if ((dp.lignes ?? []).length === 0) return false;
  return (dp.fournisseurIdsRetenus ?? dp.fournisseurIds ?? []).length > 0;
}

/** Fournisseurs parmi lesquels répartir les articles (retenus par ligne, sinon consultés). */
export function fournisseursPourTransformation(dp: DemandePrix) {
  const parLigne = [...new Set((dp.retenuesParLigne ?? []).map((r) => r.fournisseurId).filter(Boolean))];
  if (parLigne.length > 0) return parLigne;
  const retenus = dp.fournisseurIdsRetenus ?? [];
  if (retenus.length > 0) return retenus;
  return dp.fournisseurIds ?? [];
}

/** Fournisseur au prix le plus bas pour une ligne, parmi les candidats. */
export function fournisseurMoinsCherLigne(
  dp: Pick<DemandePrix, "offres">,
  ligneId: string,
  candidatIds: string[],
) {
  let best = candidatIds[0];
  let bestPrix = Infinity;
  for (const fid of candidatIds) {
    const o = offreLigneFournisseur(dp, ligneId, fid);
    if (o && o.prixUnitaire > 0 && prixNetOffre(o) < bestPrix) {
      bestPrix = prixNetOffre(o);
      best = fid;
    }
  }
  return best;
}

export type PartAffectationDp = {
  fournisseurId: string;
  quantite: number;
  prixAchatUnitaire: number;
};

export type AffectationArticleDp = {
  ligneId: string;
  produitId: string;
  designation: string;
  quantiteDemandee: number;
  parts: PartAffectationDp[];
};

/** Une part par article, chez le fournisseur le moins cher (retenus, sinon consultés). */
export function affectationsInitialesParArticle(
  dp: DemandePrix,
  produits: Produit[],
): AffectationArticleDp[] {
  const candidats = fournisseursPourTransformation(dp);
  return (dp.lignes ?? [])
    .filter((l) => l.produitId)
    .map((l) => {
      const p = produits.find((x) => x.id === l.produitId);
      const retenus = fournisseurRetenuLigne(dp, l.id);
      const fid =
        (retenus && candidats.includes(retenus) ? retenus : undefined) ??
        fournisseurMoinsCherLigne(dp, l.id, candidats) ??
        candidats[0] ??
        "";
      const offre = fid ? offreLigneFournisseur(dp, l.id, fid) : undefined;
      return {
        ligneId: l.id,
        produitId: l.produitId,
        designation: p
          ? `${p.code || ""} — ${libelleProduit(p) || "Article"}`.replace(/^ — /, "")
          : "Article",
        quantiteDemandee: l.quantite,
        parts: fid
          ? [
              {
                fournisseurId: fid,
                quantite: l.quantite,
                prixAchatUnitaire: offre ? prixNetOffre(offre) || offre.prixUnitaire : 0,
              },
            ]
          : [],
      };
    });
}

/** Regroupe les parts article → une commande par fournisseur. */
export function regrouperAffectationsEnCommandes(
  affectations: { produitId: string; parts: PartAffectationDp[] }[],
) {
  const parFrn = new Map<
    string,
    { produitId: string; quantite: number; prixAchatUnitaire: number }[]
  >();
  for (const aff of affectations) {
    for (const part of aff.parts) {
      if (!part.fournisseurId || !(part.quantite > 0)) continue;
      const lignes = parFrn.get(part.fournisseurId) ?? [];
      const exist = lignes.find((l) => l.produitId === aff.produitId);
      if (exist) {
        const total = exist.quantite + part.quantite;
        exist.prixAchatUnitaire =
          total > 0
            ? (exist.prixAchatUnitaire * exist.quantite +
                part.prixAchatUnitaire * part.quantite) /
              total
            : part.prixAchatUnitaire;
        exist.quantite = total;
      } else {
        lignes.push({
          produitId: aff.produitId,
          quantite: part.quantite,
          prixAchatUnitaire: part.prixAchatUnitaire,
        });
      }
      parFrn.set(part.fournisseurId, lignes);
    }
  }
  return [...parFrn.entries()].map(([fournisseurId, lignes]) => ({
    fournisseurId,
    lignes,
  }));
}
