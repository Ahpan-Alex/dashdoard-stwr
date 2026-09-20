import { factureImpacteExploitation, isLigneProduit } from "./commercial";
import type {
  Achat,
  Commande,
  CommandeStatut,
  Facture,
  OrdreFabrication,
  TransfertMatiereOf,
} from "./types";

const EPS = 1e-6;

/** Commande qui bloque du stock (tout sauf brouillon / annulée). */
export function commandeReserveStock(
  commande: Pick<Commande, "statut">,
): boolean {
  const s: CommandeStatut = commande.statut;
  return s !== "brouillon" && s !== "annulee";
}

export function quantiteLignesProduit(
  lignes: { type?: string; produitId?: string; quantite: number }[],
  produitId: string,
) {
  return lignes
    .filter(
      (l) =>
        (l.type ?? "produit") === "produit" &&
        l.produitId === produitId &&
        Number(l.quantite) > 0,
    )
    .reduce((s, l) => s + (Number(l.quantite) || 0), 0);
}

/** Quantités déjà sorties du stock via facture fiscale liée à la commande. */
export function quantiteFactureeCommandeProduit(
  factures: Facture[],
  commandeId: string,
  produitId: string,
  siteId: string,
) {
  let q = 0;
  for (const f of factures) {
    if (f.commandeId !== commandeId) continue;
    if (f.pointDeVenteId !== siteId) continue;
    if (!factureImpacteExploitation(f)) continue;
    const signe = f.type === "avoir" ? -1 : 1;
    for (const l of f.lignes) {
      if (!isLigneProduit(l) || l.produitId !== produitId) continue;
      q += signe * Math.abs(Number(l.quantite) || 0);
    }
  }
  return q;
}

export function quantiteReserveeCommande(
  produitId: string,
  siteId: string,
  commande: Commande,
  factures: Facture[],
) {
  if (!commandeReserveStock(commande)) return 0;
  if (!siteId || commande.pointDeVenteId !== siteId) return 0;
  const commandee = quantiteLignesProduit(commande.lignes, produitId);
  if (commandee <= EPS) return 0;
  const facturee = quantiteFactureeCommandeProduit(
    factures,
    commande.id,
    produitId,
    siteId,
  );
  return Math.max(0, commandee - facturee);
}

export function quantiteReserveeCommandes(
  produitId: string,
  siteId: string,
  commandes: Commande[],
  factures: Facture[],
  horsCommandeId?: string,
) {
  let total = 0;
  for (const c of commandes) {
    if (horsCommandeId && c.id === horsCommandeId) continue;
    total += quantiteReserveeCommande(produitId, siteId, c, factures);
  }
  return total;
}

export type CtxReservationStock = {
  achats: Achat[];
  ordresFabrication: OrdreFabrication[];
  transfertsMatiereOf: TransfertMatiereOf[];
  commandes: Commande[];
  factures: Facture[];
  horsCommandeId?: string;
};

export function ctxReservationDepuisEtat(
  state: {
    achats: Achat[];
    ordresFabrication: OrdreFabrication[];
    transfertsMatiereOf?: TransfertMatiereOf[];
    commandes?: Commande[];
    factures?: Facture[];
  },
  horsCommandeId?: string,
): CtxReservationStock {
  return {
    achats: state.achats,
    ordresFabrication: state.ordresFabrication,
    transfertsMatiereOf: state.transfertsMatiereOf ?? [],
    commandes: state.commandes ?? [],
    factures: state.factures ?? [],
    horsCommandeId,
  };
}
