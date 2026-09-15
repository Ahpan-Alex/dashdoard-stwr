import { differenceInCalendarDays, parseISO } from "date-fns";
import { livraisonsActives } from "./achats";
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
  delai: "Délai le plus court",
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
    delais: number[];
  };
  const map = new Map<string, Acc>();

  const upsert = (fournisseurId: string) => {
    if (!estFournisseurClassable(fournisseurId)) return undefined;
    let row = map.get(fournisseurId);
    if (!row) {
      row = { fournisseurId, dernierPrix: null, delais: [] };
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
      if (j != null && j >= 0) upsert(a.fournisseurId)?.delais.push(j);
    }
  }

  for (const dp of ctx.demandesPrix ?? []) {
    if (dp.statut === "annulee") continue;
    for (const ligne of dp.lignes) {
      if (ligne.produitId !== produitId) continue;
      for (const o of dp.offres) {
        if (o.ligneId !== ligne.id) continue;
        noterPrix(o.fournisseurId, o.prixUnitaire, dp.date);
        if (o.delaiJours != null && o.delaiJours >= 0) {
          upsert(o.fournisseurId)?.delais.push(o.delaiJours);
        }
      }
    }
  }

  return [...map.values()].map((r) => ({
    fournisseurId: r.fournisseurId,
    dernierPrix: r.dernierPrix,
    dateDernierPrix: r.dateDernierPrix,
    delaiMoyenJours:
      r.delais.length === 0
        ? null
        : Math.round(r.delais.reduce((s, n) => s + n, 0) / r.delais.length),
    nbDelais: r.delais.length,
  }));
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
