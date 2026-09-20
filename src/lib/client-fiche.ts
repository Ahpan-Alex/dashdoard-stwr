import { parseISO } from "date-fns";
import { caRapportMensuelYoY, ecartPct, montantVente } from "./calculations";
import {
  BL_STATUTS,
  COMMANDE_STATUTS,
  DEVIS_STATUTS,
  FACTURE_STATUTS,
  ACOMPTE_STATUTS,
  totalFacture,
  totauxBonDeLivraison,
  totauxCommande,
  totauxDevis,
} from "./commercial";
import { categorieRacine, libelleProduit } from "./produits";
import { BP_STATUTS } from "./bon-de-preparation";
import type {
  Acompte,
  BonDeLivraison,
  BonDePreparation,
  CategorieProduit,
  Commande,
  Devis,
  Facture,
  Parametres,
  Produit,
  Vente,
} from "./types";

const MOIS_COURTS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

/** Ventes (dérivées des factures) rattachées à un client. */
export function ventesDuClient(ventes: Vente[], clientId: string) {
  return ventes.filter((v) => v.clientId === clientId);
}

export type CaMoisClient = { mois: string; montant: number };

/** CA HT mensuel réalisé avec le client sur l'année donnée (12 mois). */
export function caMensuelClient(
  ventes: Vente[],
  clientId: string,
  annee = new Date().getFullYear(),
): CaMoisClient[] {
  const totals = new Array(12).fill(0) as number[];
  for (const v of ventesDuClient(ventes, clientId)) {
    const d = parseISO(v.date);
    if (d.getFullYear() !== annee) continue;
    totals[d.getMonth()] += montantVente(v);
  }
  return totals.map((montant, i) => ({ mois: MOIS_COURTS[i], montant }));
}

export type CaArticleClient = {
  id: string;
  nom: string;
  unite: string;
  quantite: number;
  montant: number;
};

/**
 * CA HT ventilé par article pour un client (produits les plus achetés).
 * Si `annee` est fourni, restreint à cette année civile.
 */
export function caParArticleClient(
  ventes: Vente[],
  produits: Produit[],
  clientId: string,
  annee?: number,
): CaArticleClient[] {
  const list = ventesDuClient(ventes, clientId).filter((v) =>
    annee ? parseISO(v.date).getFullYear() === annee : true,
  );
  const map = new Map<string, { quantite: number; montant: number }>();
  for (const v of list) {
    const cur = map.get(v.produitId) ?? { quantite: 0, montant: 0 };
    cur.quantite += v.quantite;
    cur.montant += montantVente(v);
    map.set(v.produitId, cur);
  }
  return [...map.entries()]
    .map(([produitId, agg]) => {
      const produit = produits.find((p) => p.id === produitId);
      return {
        id: produitId,
        nom: produit ? libelleProduit(produit) : "Produit supprimé",
        unite: produit?.unite ?? "",
        quantite: agg.quantite,
        montant: agg.montant,
      };
    })
    .filter((l) => l.montant !== 0 || l.quantite !== 0)
    .sort((a, b) => b.montant - a.montant);
}

export type CaAnnuelClient = {
  annee: number;
  anneePrec: number;
  caAnnee: number;
  caAnneePrec: number;
  ecart: number;
  pct: number | null;
};

/**
 * CA annuel (année civile) net des remises, ventes du tiers en tant que Client.
 */
export function caAnnuelClient(
  ventes: Vente[],
  clientId: string,
  annee = new Date().getFullYear(),
): CaAnnuelClient {
  const rapport = caRapportMensuelYoY(ventesDuClient(ventes, clientId), "tous", annee);
  return {
    annee: rapport.annee,
    anneePrec: rapport.anneePrec,
    caAnnee: rapport.total.caAnnee,
    caAnneePrec: rapport.total.caAnneePrec,
    ecart: rapport.total.ecart,
    pct: rapport.total.pct,
  };
}

export type CaFamilleClient = {
  id: string;
  libelle: string;
  caAnnee: number;
  caAnneePrec: number;
  ecart: number;
  pct: number | null;
};

const FAMILLE_SANS_ID = "__sans_famille__";

function montantParFamille(
  ventes: Vente[],
  produits: Produit[],
  categories: CategorieProduit[],
  clientId: string,
  annee: number,
): Map<string, { libelle: string; montant: number }> {
  const map = new Map<string, { libelle: string; montant: number }>();
  for (const art of caParArticleClient(ventes, produits, clientId, annee)) {
    const produit = produits.find((p) => p.id === art.id);
    const racine = categorieRacine(produit?.categorieId, categories);
    const id = racine?.id ?? FAMILLE_SANS_ID;
    const libelle = racine?.libelle ?? "Sans famille";
    const cur = map.get(id) ?? { libelle, montant: 0 };
    cur.montant += art.montant;
    map.set(id, cur);
  }
  return map;
}

/** CA HT par famille de produits (racine), N vs N-1. */
export function caParFamilleClient(
  ventes: Vente[],
  produits: Produit[],
  categories: CategorieProduit[],
  clientId: string,
  annee = new Date().getFullYear(),
): CaFamilleClient[] {
  const n = montantParFamille(ventes, produits, categories, clientId, annee);
  const n1 = montantParFamille(ventes, produits, categories, clientId, annee - 1);
  const ids = new Set([...n.keys(), ...n1.keys()]);
  return [...ids]
    .map((id) => {
      const caAnnee = n.get(id)?.montant ?? 0;
      const caAnneePrec = n1.get(id)?.montant ?? 0;
      const { ecart, pct } = ecartPct(caAnnee, caAnneePrec);
      return {
        id,
        libelle: n.get(id)?.libelle ?? n1.get(id)?.libelle ?? "Sans famille",
        caAnnee,
        caAnneePrec,
        ecart,
        pct,
      };
    })
    .filter((l) => l.caAnnee !== 0 || l.caAnneePrec !== 0)
    .sort((a, b) => b.caAnnee - a.caAnnee || a.libelle.localeCompare(b.libelle, "fr"));
}

export type CategorieDocumentClient =
  | "devis"
  | "commande"
  | "bon_de_preparation"
  | "bon_de_livraison"
  | "facture"
  | "acompte";

export type DocumentCommercialClient = {
  id: string;
  categorie: CategorieDocumentClient;
  categorieLabel: string;
  numero: string;
  date: string;
  statut: string;
  statutLabel: string;
  montant: number;
};

export const CATEGORIE_DOC_LABELS: Record<CategorieDocumentClient, string> = {
  devis: "Devis",
  commande: "Bon de commande",
  bon_de_preparation: "Bon de préparation",
  bon_de_livraison: "Bon de livraison",
  facture: "Facture",
  acompte: "Acompte",
};

/** Historique complet des documents commerciaux liés à un client. */
export function documentsCommerciauxClient(
  clientId: string,
  ctx: {
    devis: Devis[];
    commandes: Commande[];
    bonsDeLivraison: BonDeLivraison[];
    bonsDePreparation?: BonDePreparation[];
    factures: Facture[];
    acomptes: Acompte[];
    parametres: Parametres;
  },
): DocumentCommercialClient[] {
  const { parametres, acomptes } = ctx;
  const out: DocumentCommercialClient[] = [];

  for (const d of ctx.devis.filter((x) => x.clientId === clientId)) {
    out.push({
      id: d.id,
      categorie: "devis",
      categorieLabel: CATEGORIE_DOC_LABELS.devis,
      numero: d.numero,
      date: d.date,
      statut: d.statut,
      statutLabel: DEVIS_STATUTS[d.statut] ?? d.statut,
      montant: totauxDevis(d, parametres, acomptes).totalTTC,
    });
  }

  for (const c of ctx.commandes.filter((x) => x.clientId === clientId)) {
    out.push({
      id: c.id,
      categorie: "commande",
      categorieLabel: CATEGORIE_DOC_LABELS.commande,
      numero: c.numero,
      date: c.date,
      statut: c.statut,
      statutLabel: COMMANDE_STATUTS[c.statut] ?? c.statut,
      montant: totauxCommande(c, parametres, acomptes).totalTTC,
    });
  }

  for (const b of (ctx.bonsDePreparation ?? []).filter(
    (x) => x.clientId === clientId,
  )) {
    out.push({
      id: b.id,
      categorie: "bon_de_preparation",
      categorieLabel: CATEGORIE_DOC_LABELS.bon_de_preparation,
      numero: b.numero,
      date: b.date,
      statut: b.statut,
      statutLabel: BP_STATUTS[b.statut] ?? b.statut,
      montant: 0,
    });
  }

  for (const b of ctx.bonsDeLivraison.filter((x) => x.clientId === clientId)) {
    out.push({
      id: b.id,
      categorie: "bon_de_livraison",
      categorieLabel: CATEGORIE_DOC_LABELS.bon_de_livraison,
      numero: b.numero,
      date: b.date,
      statut: b.statut,
      statutLabel: BL_STATUTS[b.statut] ?? b.statut,
      montant: totauxBonDeLivraison(b, parametres, acomptes).totalTTC,
    });
  }

  for (const f of ctx.factures.filter((x) => x.clientId === clientId)) {
    out.push({
      id: f.id,
      categorie: "facture",
      categorieLabel: FACTURE_TYPE_LABEL(f),
      numero: f.numero,
      date: f.date,
      statut: f.statut,
      statutLabel: FACTURE_STATUTS[f.statut] ?? f.statut,
      montant: totalFacture(f, parametres),
    });
  }

  for (const a of ctx.acomptes.filter((x) => x.clientId === clientId)) {
    out.push({
      id: a.id,
      categorie: "acompte",
      categorieLabel: CATEGORIE_DOC_LABELS.acompte,
      numero: a.numero,
      date: a.date,
      statut: a.statut,
      statutLabel: ACOMPTE_STATUTS[a.statut] ?? a.statut,
      montant: a.montantTTC,
    });
  }

  return out.sort((x, y) => y.date.localeCompare(x.date));
}

function FACTURE_TYPE_LABEL(f: Facture) {
  switch (f.type) {
    case "avoir":
      return "Facture d'avoir";
    case "acompte":
      return "Facture d'acompte";
    case "solde":
      return "Facture de solde";
    case "proforma":
      return "Proforma";
    default:
      return "Facture";
  }
}
