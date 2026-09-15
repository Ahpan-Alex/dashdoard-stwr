import { filterByPos } from "./calculations";
import {
  BL_STATUTS,
  COMMANDE_STATUTS,
  DEVIS_STATUTS,
  FACTURE_STATUTS,
  totauxBonDeLivraison,
  totauxCommande,
  totauxDevis,
  totauxFacture,
} from "./commercial";
import { DP_STATUT_LABELS } from "./demandes-prix";
import { statutSuiviAchat, totauxAchat } from "./achats";
import { achatConcerneSite } from "./sites";
import type {
  Achat,
  Acompte,
  BonDeLivraison,
  Client,
  Commande,
  DemandePrix,
  Devis,
  Facture,
  Fournisseur,
  Parametres,
  Tiers,
} from "./types";

export type TypeDocumentArchive =
  | "demande_prix"
  | "commande_fournisseur"
  | "devis"
  | "commande_client"
  | "bon_de_livraison"
  | "facture";

export const TYPE_DOCUMENT_ARCHIVE_LABELS: Record<TypeDocumentArchive, string> = {
  demande_prix: "Demande de prix",
  commande_fournisseur: "Bon de commande fournisseur",
  devis: "Devis",
  commande_client: "Commande client",
  bon_de_livraison: "Bon de livraison",
  facture: "Facture",
};

export type LigneDocumentArchive = {
  id: string;
  type: TypeDocumentArchive;
  numero: string;
  date: string;
  tiersNom: string;
  statut: string;
  statutLabel: string;
  href: string;
  montant?: number;
};

function nomTiers(
  id: string,
  clients: Client[],
  fournisseurs: Fournisseur[],
  tiers: Tiers[],
) {
  return (
    tiers.find((t) => t.id === id)?.nom ??
    clients.find((c) => c.id === id)?.nom ??
    fournisseurs.find((f) => f.id === id)?.nom ??
    "—"
  );
}

export function collecterDocumentsArchive(opts: {
  demandesPrix: DemandePrix[];
  achats: Achat[];
  devis: Devis[];
  commandes: Commande[];
  bonsDeLivraison: BonDeLivraison[];
  factures: Facture[];
  acomptes: Acompte[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  tiers: Tiers[];
  parametres: Parametres;
  pointDeVenteActifId: string | "tous";
}): LigneDocumentArchive[] {
  const {
    demandesPrix,
    achats,
    devis,
    commandes,
    bonsDeLivraison,
    factures,
    acomptes,
    clients,
    fournisseurs,
    tiers,
    parametres,
    pointDeVenteActifId,
  } = opts;
  const nom = (id: string) => nomTiers(id, clients, fournisseurs, tiers);
  const rows: LigneDocumentArchive[] = [];

  for (const d of demandesPrix ?? []) {
    rows.push({
      id: d.id,
      type: "demande_prix",
      numero: d.numero,
      date: d.date,
      tiersNom:
        (d.fournisseurIdsRetenus ?? d.fournisseurIds ?? [])
          .map((id) => nom(id))
          .filter((n) => n !== "—")
          .join(", ") || "—",
      statut: d.statut,
      statutLabel: DP_STATUT_LABELS[d.statut] ?? d.statut,
      href: `/demandes-prix/${d.id}`,
    });
  }

  for (const a of achats ?? []) {
    if (!achatConcerneSite(a, pointDeVenteActifId)) continue;
    const suivi = statutSuiviAchat(a);
    rows.push({
      id: a.id,
      type: "commande_fournisseur",
      numero: a.numero,
      date: a.date,
      tiersNom: nom(a.fournisseurId),
      statut: suivi.id,
      statutLabel: suivi.label,
      href: `/achats?id=${a.id}`,
      montant: totauxAchat(a).ttc,
    });
  }

  for (const d of filterByPos(devis ?? [], pointDeVenteActifId)) {
    rows.push({
      id: d.id,
      type: "devis",
      numero: d.numero,
      date: d.date,
      tiersNom: nom(d.clientId),
      statut: d.statut,
      statutLabel: DEVIS_STATUTS[d.statut] ?? d.statut,
      href: "/devis/liste",
      montant: totauxDevis(d, parametres, acomptes).totalTTC,
    });
  }

  for (const c of filterByPos(commandes ?? [], pointDeVenteActifId)) {
    rows.push({
      id: c.id,
      type: "commande_client",
      numero: c.numero,
      date: c.date,
      tiersNom: nom(c.clientId),
      statut: c.statut,
      statutLabel: COMMANDE_STATUTS[c.statut] ?? c.statut,
      href: "/commandes/liste",
      montant: totauxCommande(c, parametres, acomptes).totalTTC,
    });
  }

  for (const b of filterByPos(bonsDeLivraison ?? [], pointDeVenteActifId)) {
    rows.push({
      id: b.id,
      type: "bon_de_livraison",
      numero: b.numero,
      date: b.date,
      tiersNom: nom(b.clientId),
      statut: b.statut,
      statutLabel: BL_STATUTS[b.statut] ?? b.statut,
      href: "/bons-de-livraison/liste",
      montant: totauxBonDeLivraison(b, parametres).totalTTC,
    });
  }

  for (const f of filterByPos(factures ?? [], pointDeVenteActifId)) {
    rows.push({
      id: f.id,
      type: "facture",
      numero: f.numero,
      date: f.date,
      tiersNom: nom(f.clientId),
      statut: f.statut,
      statutLabel: FACTURE_STATUTS[f.statut] ?? f.statut,
      href: "/factures/liste",
      montant: totauxFacture(f, parametres, acomptes).totalTTC,
    });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.numero.localeCompare(a.numero));
}
