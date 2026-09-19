import { quantiteLivreeProduit, quantiteRetourneeProduit } from "./achats";
import { nextNumero } from "./commercial";
import { quantiteStockChronologique } from "./cump";
import type { OptsNumeroDocument } from "./exercices";
import type {
  Achat,
  AchatLigne,
  AchatRepartitionOf,
  EntreeStock,
  Inventaire,
  OrdreFabrication,
  TransfertMatiereOf,
  Vente,
} from "./types";

const EPS = 1e-6;

export const TMOF_STATUT_LABELS: Record<TransfertMatiereOf["statut"], string> = {
  demande: "Demande",
  valide_source: "Validé OF source",
  effectue: "Effectué",
  annule: "Annulé",
};

export function sommeRepartitionsOf(ligne: Pick<AchatLigne, "repartitionsOf">) {
  return (ligne.repartitionsOf ?? []).reduce(
    (s, r) => s + (Number(r.quantite) || 0),
    0,
  );
}

export function motifRepartitionOfInvalide(lignes: AchatLigne[]): string | null {
  for (const l of lignes) {
    const somme = sommeRepartitionsOf(l);
    if (somme - l.quantite > EPS) {
      return "La somme des répartitions OF ne peut pas dépasser la quantité de la ligne.";
    }
    for (const r of l.repartitionsOf ?? []) {
      if (!r.ofId) return "Chaque répartition OF doit viser un ordre de fabrication.";
      if (!(r.quantite > 0)) return "Chaque répartition OF doit avoir une quantité positive.";
    }
  }
  return null;
}

export function nextNumeroTransfertMatiereOf(
  liste: TransfertMatiereOf[],
  opts?: OptsNumeroDocument,
) {
  return nextNumero(
    "TMOF",
    liste.map((t) => t.numero),
    opts,
  );
}

export type CtxReservationOf = {
  achats: Achat[];
  ordresFabrication: OrdreFabrication[];
  transfertsMatiereOf: TransfertMatiereOf[];
};

export type LigneReservationOf = {
  achatId: string;
  achatNumero: string;
  achatLigneId: string;
  fournisseurId: string;
  ofId: string;
  produitId: string;
  pointDeVenteId: string;
  quantiteAllouee: number;
  quantiteReservee: number;
};

function fractionRecue(achat: Achat, ligne: AchatLigne) {
  if (!ligne.produitId || !(ligne.quantite > 0)) return 0;
  if (achat.statut === "annule") return 0;
  const nette = Math.max(
    0,
    quantiteLivreeProduit(achat, ligne.produitId) -
      quantiteRetourneeProduit(achat, ligne.produitId),
  );
  return Math.min(1, nette / ligne.quantite);
}

function siteRepartition(r: AchatRepartitionOf, achat: Achat) {
  return r.pointDeVenteId || achat.pointDeVenteId;
}

/** Allocations reçues (réservées) avant conso / transferts. */
export function allocationsRecuesOf(achats: Achat[]): LigneReservationOf[] {
  const out: LigneReservationOf[] = [];
  for (const a of achats) {
    if (a.statut === "annule") continue;
    for (const l of a.lignes) {
      if (!l.produitId) continue;
      const frac = fractionRecue(a, l);
      if (frac <= EPS) continue;
      for (const r of l.repartitionsOf ?? []) {
        if (!r.ofId || !(r.quantite > 0)) continue;
        out.push({
          achatId: a.id,
          achatNumero: a.numero,
          achatLigneId: l.id,
          fournisseurId: a.fournisseurId,
          ofId: r.ofId,
          produitId: l.produitId,
          pointDeVenteId: siteRepartition(r, a),
          quantiteAllouee: r.quantite,
          quantiteReservee: r.quantite * frac,
        });
      }
    }
  }
  return out;
}

function consommeOf(
  ofs: OrdreFabrication[],
  ofId: string,
  produitId: string,
  siteId: string,
) {
  const of_ = ofs.find((o) => o.id === ofId);
  if (!of_ || of_.statut === "annule") return 0;
  return (of_.sorties ?? [])
    .filter((s) => s.composantId === produitId && s.siteSourceId === siteId)
    .reduce((s, x) => s + x.quantite, 0);
}

function transfertsEffectifs(
  liste: TransfertMatiereOf[],
  filtre: { ofId: string; produitId: string; siteId: string; sens: "in" | "out" },
) {
  return liste
    .filter((t) => t.statut === "effectue" && t.produitId === filtre.produitId && t.pointDeVenteId === filtre.siteId)
    .filter((t) =>
      filtre.sens === "out"
        ? t.ofSourceId === filtre.ofId
        : t.ofDestinataireId === filtre.ofId,
    )
    .reduce((s, t) => s + t.quantite, 0);
}

export function quantiteReserveeOf(
  produitId: string,
  siteId: string,
  ofId: string,
  ctx: CtxReservationOf,
) {
  const alloue = allocationsRecuesOf(ctx.achats)
    .filter((r) => r.produitId === produitId && r.pointDeVenteId === siteId && r.ofId === ofId)
    .reduce((s, r) => s + r.quantiteReservee, 0);
  const consomme = consommeOf(ctx.ordresFabrication, ofId, produitId, siteId);
  const out = transfertsEffectifs(ctx.transfertsMatiereOf ?? [], {
    ofId,
    produitId,
    siteId,
    sens: "out",
  });
  const inn = transfertsEffectifs(ctx.transfertsMatiereOf ?? [], {
    ofId,
    produitId,
    siteId,
    sens: "in",
  });
  return Math.max(0, alloue + inn - out - consomme);
}

export function quantiteReserveeProduitSite(
  produitId: string,
  siteId: string,
  ctx: CtxReservationOf,
) {
  const ofs = new Set<string>();
  for (const r of allocationsRecuesOf(ctx.achats)) {
    if (r.produitId === produitId && r.pointDeVenteId === siteId) ofs.add(r.ofId);
  }
  for (const t of ctx.transfertsMatiereOf ?? []) {
    if (t.statut !== "effectue" || t.produitId !== produitId || t.pointDeVenteId !== siteId) {
      continue;
    }
    ofs.add(t.ofSourceId);
    ofs.add(t.ofDestinataireId);
  }
  let total = 0;
  for (const ofId of ofs) {
    total += quantiteReserveeOf(produitId, siteId, ofId, ctx);
  }
  return total;
}

export function stockPhysique(
  produitId: string,
  siteId: string,
  entrees: EntreeStock[],
  ventes: Vente[],
  inventaires: Inventaire[],
) {
  if (!siteId || siteId === "tous") return 0;
  return quantiteStockChronologique({
    produitId,
    pointDeVenteId: siteId,
    entrees,
    ventes,
    inventaires,
  });
}

/** Stock non affecté à un OF (disponible magasin / autres usages). */
export function stockLibreDisponible(
  produitId: string,
  siteId: string,
  entrees: EntreeStock[],
  ventes: Vente[],
  inventaires: Inventaire[],
  ctx: CtxReservationOf,
) {
  const phy = stockPhysique(produitId, siteId, entrees, ventes, inventaires);
  const reserve = quantiteReserveeProduitSite(produitId, siteId, ctx);
  return Math.max(0, phy - reserve);
}

/** Stock que cet OF peut consommer : libre + sa propre réservation. */
export function stockDisponiblePourOf(
  produitId: string,
  siteId: string,
  ofId: string,
  entrees: EntreeStock[],
  ventes: Vente[],
  inventaires: Inventaire[],
  ctx: CtxReservationOf,
) {
  return (
    stockLibreDisponible(produitId, siteId, entrees, ventes, inventaires, ctx) +
    quantiteReserveeOf(produitId, siteId, ofId, ctx)
  );
}

export type MatiereReserveeOf = {
  produitId: string;
  pointDeVenteId: string;
  quantite: number;
  origines: {
    achatId: string;
    achatNumero: string;
    fournisseurId: string;
    quantite: number;
  }[];
};

export function matieresReserveesPourOf(ofId: string, ctx: CtxReservationOf): MatiereReserveeOf[] {
  const map = new Map<string, MatiereReserveeOf>();
  for (const r of allocationsRecuesOf(ctx.achats).filter((x) => x.ofId === ofId)) {
    const reste = quantiteReserveeOf(r.produitId, r.pointDeVenteId, ofId, ctx);
    if (reste <= EPS) continue;
    const key = `${r.produitId}|${r.pointDeVenteId}`;
    const cur = map.get(key) ?? {
      produitId: r.produitId,
      pointDeVenteId: r.pointDeVenteId,
      quantite: 0,
      origines: [],
    };
    if (!cur.origines.some((o) => o.achatId === r.achatId)) {
      cur.origines.push({
        achatId: r.achatId,
        achatNumero: r.achatNumero,
        fournisseurId: r.fournisseurId,
        quantite: r.quantiteReservee,
      });
    }
    map.set(key, cur);
  }
  for (const t of ctx.transfertsMatiereOf ?? []) {
    if (t.statut !== "effectue") continue;
    if (t.ofDestinataireId !== ofId && t.ofSourceId !== ofId) continue;
    const key = `${t.produitId}|${t.pointDeVenteId}`;
    if (!map.has(key)) {
      map.set(key, {
        produitId: t.produitId,
        pointDeVenteId: t.pointDeVenteId,
        quantite: 0,
        origines: [],
      });
    }
  }
  return [...map.values()]
    .map((row) => ({
      ...row,
      quantite: quantiteReserveeOf(row.produitId, row.pointDeVenteId, ofId, ctx),
    }))
    .filter((row) => row.quantite > EPS);
}

export function achatsReservantOf(achats: Achat[], ofId: string) {
  return achats.filter(
    (a) =>
      a.ofId === ofId ||
      a.lignes.some((l) => (l.repartitionsOf ?? []).some((r) => r.ofId === ofId)),
  );
}
