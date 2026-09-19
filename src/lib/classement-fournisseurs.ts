import { differenceInCalendarDays, parseISO } from "date-fns";
import { livraisonsActives } from "./achats";
import { prixNetOffre, fournisseurRetenuLigne, offreLigneFournisseur, prixMiniLigne } from "./demandes-prix";
import { TIERS_DIVERS_MARCHE_ID } from "./missions";
import type {
  Achat,
  CritereClassementFournisseur,
  DemandePrix,
  Produit,
  ProduitFournisseurRang,
} from "./types";

export const CRITERE_CLASSEMENT_LABELS: Record<CritereClassementFournisseur, string> = {
  prix: "Prix le plus bas",
  delai: "Délai de livraison réel le plus court",
};

export function critereClassementProduit(
  p: Pick<Produit, "criteresClassementFournisseurs"> | undefined,
): CritereClassementFournisseur {
  return p?.criteresClassementFournisseurs === "delai" ? "delai" : "prix";
}

export type FicheFournisseurProduit = {
  fournisseurId: string;
  dernierPrix: number | null;
  dateDernierPrix?: string;
  delaiMoyenJours: number | null;
  nbDelais: number;
  rang: number;
  manuel: boolean;
};

function estFournisseurClassable(id: string) {
  return Boolean(id) && id !== TIERS_DIVERS_MARCHE_ID;
}

function joursEntre(debutIso: string, finIso: string) {
  try {
    return differenceInCalendarDays(parseISO(finIso), parseISO(debutIso));
  } catch {
    return null;
  }
}

export function historiqueFournisseursProduit(
  produitId: string,
  ctx: {
    achats: Achat[];
    demandesPrix?: DemandePrix[];
  },
): Omit<FicheFournisseurProduit, "rang" | "manuel">[] {
  type Acc = {
    fournisseurId: string;
    dernierPrix: number | null;
    dateDernierPrix?: string;
    delaisReels: number[];
    delaisPromis: number[];
  };
  const map = new Map<string, Acc>();

  const upsert = (fournisseurId: string) => {
    if (!estFournisseurClassable(fournisseurId)) return undefined;
    let row = map.get(fournisseurId);
    if (!row) {
      row = { fournisseurId, dernierPrix: null, delaisReels: [], delaisPromis: [] };
      map.set(fournisseurId, row);
    }
    return row;
  };

  const noterPrix = (fournisseurId: string, prix: number, date: string) => {
    const row = upsert(fournisseurId);
    if (!row || !(prix > 0)) return;
    if (!row.dateDernierPrix || date >= row.dateDernierPrix) {
      row.dernierPrix = prix;
      row.dateDernierPrix = date;
    }
  };

  for (const a of ctx.achats) {
    if (a.statut === "annule") continue;
    const ligne = a.lignes.find((l) => l.produitId === produitId);
    if (!ligne) continue;
    noterPrix(a.fournisseurId, ligne.prixAchatUnitaire, a.dateValidation ?? a.date);
    const livs = livraisonsActives(a)
      .filter((l) => l.lignes.some((x) => x.produitId === produitId && x.quantiteLivree > 0))
      .sort((x, y) => x.date.localeCompare(y.date));
    const premiere = livs[0];
    if (premiere) {
      const j = joursEntre(a.date, premiere.date);
      if (j != null && j >= 0) upsert(a.fournisseurId)?.delaisReels.push(j);
    }
  }

  for (const dp of ctx.demandesPrix ?? []) {
    if (dp.statut === "annulee") continue;
    for (const ligne of dp.lignes) {
      if (ligne.produitId !== produitId) continue;
      for (const o of dp.offres) {
        if (o.ligneId !== ligne.id) continue;
        noterPrix(o.fournisseurId, prixNetOffre(o) || o.prixUnitaire, dp.date);
        if (o.delaiJours != null && o.delaiJours >= 0) {
          upsert(o.fournisseurId)?.delaisPromis.push(o.delaiJours);
        }
      }
    }
  }

  return [...map.values()].map((r) => {
    const source = r.delaisReels.length > 0 ? r.delaisReels : r.delaisPromis;
    return {
      fournisseurId: r.fournisseurId,
      dernierPrix: r.dernierPrix,
      dateDernierPrix: r.dateDernierPrix,
      delaiMoyenJours:
        source.length === 0
          ? null
          : Math.round(source.reduce((s, n) => s + n, 0) / source.length),
      nbDelais: source.length,
    };
  });
}

function valeurTri(
  f: Omit<FicheFournisseurProduit, "rang" | "manuel">,
  critere: CritereClassementFournisseur,
) {
  if (critere === "delai") {
    return f.delaiMoyenJours == null ? Number.POSITIVE_INFINITY : f.delaiMoyenJours;
  }
  return f.dernierPrix == null || f.dernierPrix <= 0
    ? Number.POSITIVE_INFINITY
    : f.dernierPrix;
}

export function classerFournisseursProduit(
  historique: Omit<FicheFournisseurProduit, "rang" | "manuel">[],
  opts: {
    critere: CritereClassementFournisseur;
    priorites?: ProduitFournisseurRang[];
  },
): FicheFournisseurProduit[] {
  const prioriteById = new Map((opts.priorites ?? []).map((p) => [p.fournisseurId, p]));
  const extra = (opts.priorites ?? [])
    .filter((p) => !historique.some((h) => h.fournisseurId === p.fournisseurId))
    .map((p) => ({
      fournisseurId: p.fournisseurId,
      dernierPrix: null,
      delaiMoyenJours: null,
      nbDelais: 0,
    }));
  const tous = [...historique, ...extra];
  const auto = [...tous].sort((a, b) => {
    const va = valeurTri(a, opts.critere);
    const vb = valeurTri(b, opts.critere);
    if (va !== vb) return va - vb;
    return a.fournisseurId.localeCompare(b.fournisseurId);
  });
  const autoRang = new Map<string, number>();
  auto.forEach((f, i) => autoRang.set(f.fournisseurId, i + 1));

  return tous
    .map((f) => {
      const p = prioriteById.get(f.fournisseurId);
      const manuel = Boolean(p?.manuel && p.rang > 0);
      return {
        ...f,
        rang: manuel ? p!.rang : (autoRang.get(f.fournisseurId) ?? 99),
        manuel,
      };
    })
    .sort((a, b) => a.rang - b.rang || a.fournisseurId.localeCompare(b.fournisseurId));
}

export function fichesFournisseursProduit(
  produit: Pick<Produit, "id" | "criteresClassementFournisseurs" | "fournisseursPriorite">,
  ctx: { achats: Achat[]; demandesPrix?: DemandePrix[] },
) {
  return classerFournisseursProduit(historiqueFournisseursProduit(produit.id, ctx), {
    critere: critereClassementProduit(produit),
    priorites: produit.fournisseursPriorite,
  });
}

export function fournisseurPrioritaireId(
  produit: Pick<Produit, "id" | "criteresClassementFournisseurs" | "fournisseursPriorite"> | undefined,
  ctx: { achats: Achat[]; demandesPrix?: DemandePrix[] },
) {
  if (!produit) return undefined;
  return fichesFournisseursProduit(produit, ctx)[0]?.fournisseurId;
}

export function appliquerRangManuel(
  priorites: ProduitFournisseurRang[] | undefined,
  fournisseurId: string,
  rang: number,
): ProduitFournisseurRang[] {
  const n = Math.max(1, Math.floor(rang));
  const rest = (priorites ?? []).filter((p) => p.fournisseurId !== fournisseurId);
  return [...rest, { fournisseurId, rang: n, manuel: true }];
}

/** Dernier prix d'achat réel (commande/facture d'achat), hors DP. */
export function dernierPrixAchatConnu(
  produitId: string,
  achats: Achat[],
): { prix: number; date: string; fournisseurId: string } | null {
  let best: { prix: number; date: string; fournisseurId: string } | null = null;
  for (const a of achats) {
    if (a.statut === "annule") continue;
    const ligne = a.lignes.find((l) => l.produitId === produitId);
    if (!ligne || !(ligne.prixAchatUnitaire > 0)) continue;
    const date = a.dateValidation ?? a.date;
    if (!best || date >= best.date) {
      best = { prix: ligne.prixAchatUnitaire, date, fournisseurId: a.fournisseurId };
    }
  }
  return best;
}

export type EvenementPrixFournisseur = {
  date: string;
  produitId: string;
  fournisseurId: string;
  prixUnitaire: number;
  source: "achat" | "dp";
  documentId: string;
  documentNumero: string;
  delaiJours?: number;
};

export function historiquePrixFournisseurArticle(
  ctx: { achats: Achat[]; demandesPrix?: DemandePrix[] },
  filtre: { produitId?: string; fournisseurId?: string },
): EvenementPrixFournisseur[] {
  const out: EvenementPrixFournisseur[] = [];
  for (const a of ctx.achats) {
    if (a.statut === "annule") continue;
    if (filtre.fournisseurId && a.fournisseurId !== filtre.fournisseurId) continue;
    for (const l of a.lignes) {
      const produitId = l.produitId;
      if (!produitId) continue;
      if (filtre.produitId && produitId !== filtre.produitId) continue;
      if (!(l.prixAchatUnitaire > 0)) continue;
      out.push({
        date: a.dateValidation ?? a.date,
        produitId,
        fournisseurId: a.fournisseurId,
        prixUnitaire: l.prixAchatUnitaire,
        source: "achat",
        documentId: a.id,
        documentNumero: a.numero,
      });
    }
  }
  for (const dp of ctx.demandesPrix ?? []) {
    if (dp.statut === "annulee") continue;
    for (const ligne of dp.lignes ?? []) {
      if (filtre.produitId && ligne.produitId !== filtre.produitId) continue;
      for (const o of dp.offres ?? []) {
        if (o.ligneId !== ligne.id || !(o.prixUnitaire > 0)) continue;
        if (filtre.fournisseurId && o.fournisseurId !== filtre.fournisseurId) continue;
        out.push({
          date: dp.date,
          produitId: ligne.produitId,
          fournisseurId: o.fournisseurId,
          prixUnitaire: prixNetOffre(o) || o.prixUnitaire,
          source: "dp",
          documentId: dp.id,
          documentNumero: dp.numero,
          delaiJours: o.delaiJours,
        });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.documentNumero.localeCompare(a.documentNumero));
}

export type EvenementDelaiLivraison = {
  dateCommande: string;
  dateReception: string;
  jours: number;
  produitId: string;
  fournisseurId: string;
  achatId: string;
  achatNumero: string;
  livraisonId: string;
  quantite: number;
};

/** Délais réels commande → réception, couple fournisseur / article. */
export function historiqueDelaisLivraison(
  achats: Achat[],
  filtre: { produitId?: string; fournisseurId?: string } = {},
): EvenementDelaiLivraison[] {
  const out: EvenementDelaiLivraison[] = [];
  for (const a of achats) {
    if (a.statut === "annule") continue;
    if (filtre.fournisseurId && a.fournisseurId !== filtre.fournisseurId) continue;
    for (const liv of livraisonsActives(a)) {
      for (const l of liv.lignes) {
        if (!(l.quantiteLivree > 0) || !l.produitId) continue;
        if (filtre.produitId && l.produitId !== filtre.produitId) continue;
        const j = joursEntre(a.date, liv.date);
        if (j == null || j < 0) continue;
        out.push({
          dateCommande: a.date,
          dateReception: liv.date,
          jours: j,
          produitId: l.produitId,
          fournisseurId: a.fournisseurId,
          achatId: a.id,
          achatNumero: a.numero,
          livraisonId: liv.id,
          quantite: l.quantiteLivree,
        });
      }
    }
  }
  return out.sort(
    (a, b) =>
      b.dateReception.localeCompare(a.dateReception) ||
      b.achatNumero.localeCompare(a.achatNumero),
  );
}

export type AnomalieFournisseurRetenu = {
  ligneId: string;
  produitId: string;
  fournisseurId: string;
  prixNet: number;
  prixMini: number | null;
  dernierPrix: number | null;
};

/** Retenu ni moins cher du comparatif, ni conforme au dernier prix connu. */
export function anomaliesFournisseurRetenu(
  dp: DemandePrix,
  achats: Achat[],
): AnomalieFournisseurRetenu[] {
  const out: AnomalieFournisseurRetenu[] = [];
  for (const ligne of dp.lignes ?? []) {
    const fid = fournisseurRetenuLigne(dp, ligne.id);
    if (!fid) continue;
    const offre = offreLigneFournisseur(dp, ligne.id, fid);
    if (!offre || !(offre.prixUnitaire > 0)) continue;
    const net = prixNetOffre(offre);
    const mini = prixMiniLigne(dp.offres ?? [], ligne.id);
    const dernier = dernierPrixAchatConnu(ligne.produitId, achats);
    const estMoinsCher = mini != null && net <= mini + 1e-6;
    const conformeDernier =
      dernier != null && Math.abs(net - dernier.prix) <= 1;
    if (estMoinsCher || conformeDernier) continue;
    out.push({
      ligneId: ligne.id,
      produitId: ligne.produitId,
      fournisseurId: fid,
      prixNet: net,
      prixMini: mini,
      dernierPrix: dernier?.prix ?? null,
    });
  }
  return out;
}
