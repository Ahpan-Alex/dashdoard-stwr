import { nextNumero } from "./commercial";
import { etatCumpProduit, quantiteStockChronologique } from "./cump";
import type {
  EntreeStock,
  Inventaire,
  Produit,
  TransfertStock,
  TransfertStockLigne,
  Vente,
} from "./types";

export const STATUT_TRANSFERT_LABELS: Record<TransfertStock["statut"], string> = {
  demande: "Demande",
  expedie: "Expédié",
  recu: "Reçu",
  annule: "Annulé",
};

export function nextNumeroTransfert(transferts: TransfertStock[]) {
  return nextNumero(
    "TRF",
    transferts.map((t) => t.numero),
  );
}

export function regenererEntreesTransfert(
  entrees: EntreeStock[],
  transfert: TransfertStock,
  produits: Produit[],
): EntreeStock[] {
  const hors = entrees.filter((e) => e.transfertId !== transfert.id);
  return [...hors, ...entreesDepuisTransfert(transfert, produits)];
}

export function entreesDepuisTransfert(
  transfert: TransfertStock,
  produits: Produit[],
): EntreeStock[] {
  if (transfert.statut === "annule" || transfert.statut === "demande") return [];
  const out: EntreeStock[] = [];
  const dateOut = transfert.dateExpedition ?? transfert.dateDemande;
  const dateIn = transfert.dateReception ?? dateOut;

  for (const l of transfert.lignes) {
    if (l.quantite <= 0) continue;
    const prod = produits.find((p) => p.id === l.produitId);
    const pu = l.cumpSource ?? prod?.prixAchat ?? 0;
    const pv = prod?.prixVenteHT ?? 0;
    out.push({
      id: `ent-trf-out-${transfert.id}-${l.produitId}`,
      pointDeVenteId: transfert.siteSourceId,
      produitId: l.produitId,
      quantite: -l.quantite,
      prixAchatUnitaire: pu,
      prixVenteUnitaire: pv,
      fournisseur: "Transfert interne",
      date: dateOut,
      origine: "transfert_sortie",
      transfertId: transfert.id,
      note: transfert.note,
    });
    if (transfert.statut === "recu") {
      out.push({
        id: `ent-trf-in-${transfert.id}-${l.produitId}`,
        pointDeVenteId: transfert.siteDestinataireId,
        produitId: l.produitId,
        quantite: l.quantite,
        prixAchatUnitaire: pu,
        prixVenteUnitaire: pv,
        fournisseur: "Transfert interne",
        date: dateIn,
        origine: "transfert_entree",
        transfertId: transfert.id,
        note: transfert.note,
      });
    }
  }
  return out;
}

export function stockSuffisantPourTransfert(
  transfert: Pick<TransfertStock, "siteSourceId" | "lignes">,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires: Inventaire[];
    exclureTransfertId?: string;
  },
): string | null {
  const entrees = ctx.exclureTransfertId
    ? ctx.entrees.filter((e) => e.transfertId !== ctx.exclureTransfertId)
    : ctx.entrees;
  for (const l of transfert.lignes) {
    if (l.quantite <= 0) continue;
    const dispo = quantiteStockChronologique({
      produitId: l.produitId,
      pointDeVenteId: transfert.siteSourceId,
      entrees,
      ventes: ctx.ventes,
      inventaires: ctx.inventaires,
    });
    if (dispo + 1e-9 < l.quantite) {
      return `Stock insuffisant sur le site source (disponible : ${dispo}).`;
    }
  }
  return null;
}

/** Articles avec stock physique > 0 sur le site source. */
export function produitsEnStockPourTransfert(
  produits: Produit[],
  siteId: string,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires: Inventaire[];
  },
) {
  if (!siteId) return [];
  return produits
    .filter((p) => p.actif)
    .map((produit) => ({
      produit,
      quantite: quantiteStockChronologique({
        produitId: produit.id,
        pointDeVenteId: siteId,
        entrees: ctx.entrees,
        ventes: ctx.ventes,
        inventaires: ctx.inventaires,
      }),
    }))
    .filter((x) => x.quantite > 1e-9)
    .sort((a, b) =>
      (a.produit.libelleCourt || a.produit.libelleLong || "").localeCompare(
        b.produit.libelleCourt || b.produit.libelleLong || "",
      ),
    );
}

export function figerCumpLignesTransfert(
  lignes: TransfertStockLigne[],
  siteSourceId: string,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires: Inventaire[];
    produits: Produit[];
    exclureTransfertId?: string;
  },
): TransfertStockLigne[] {
  const entrees = ctx.exclureTransfertId
    ? ctx.entrees.filter((e) => e.transfertId !== ctx.exclureTransfertId)
    : ctx.entrees;
  return lignes.map((l) => {
    const produit = ctx.produits.find((p) => p.id === l.produitId);
    if (!produit) return l;
    const etat = etatCumpProduit({
      produitId: l.produitId,
      pointDeVenteId: siteSourceId,
      entrees,
      ventes: ctx.ventes,
      inventaires: ctx.inventaires,
      produit,
    });
    return { ...l, cumpSource: etat.cump };
  });
}

export type MouvementTransfertCump = {
  id: string;
  date: string;
  produitId: string;
  siteId: string;
  origine: "transfert_sortie" | "transfert_entree";
  quantite: number;
  prixUnitaire: number;
  transfertId?: string;
};

export function historiqueTransfertsCump(
  entrees: EntreeStock[],
  filtre: {
    produitId?: string;
    siteId?: string;
    debut?: string;
    fin?: string;
  } = {},
): MouvementTransfertCump[] {
  return entrees
    .filter((e) => {
      if (e.origine !== "transfert_sortie" && e.origine !== "transfert_entree") {
        return false;
      }
      if (filtre.produitId && e.produitId !== filtre.produitId) return false;
      if (filtre.siteId && e.pointDeVenteId !== filtre.siteId) return false;
      const jour = e.date.slice(0, 10);
      if (filtre.debut && jour < filtre.debut) return false;
      if (filtre.fin && jour > filtre.fin) return false;
      return true;
    })
    .map((e) => ({
      id: e.id,
      date: e.date,
      produitId: e.produitId,
      siteId: e.pointDeVenteId,
      origine: e.origine as "transfert_sortie" | "transfert_entree",
      quantite: e.quantite,
      prixUnitaire: e.prixAchatUnitaire,
      transfertId: e.transfertId,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
