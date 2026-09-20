import { totauxAchat, soldeAchat, STATUT_ACHAT_LABELS } from "./achats";
import {
  BL_STATUTS,
  COMMANDE_STATUTS,
  DEVIS_STATUTS,
  FACTURE_STATUTS,
  FACTURE_TYPES,
  resteAPayer,
  totauxBonDeLivraison,
  totauxCommande,
  totauxDevis,
  totauxFacture,
} from "./commercial";
import { etatCumpProduit } from "./cump";
import { downloadCsv } from "./csv";
import { pickAppState } from "./empty-state";
import { formatDate } from "./format";
import type { AppState } from "./types";

export type LotRecuperation = {
  id: string;
  titre: string;
  pourquoi: string;
  ouLabel: string;
  ouHref: string;
  compter: (s: AppState) => number;
  exporter: (s: AppState) => void;
};

function nomClient(s: AppState, id: string) {
  return s.clients.find((c) => c.id === id)?.nom ?? id;
}

function nomFournisseur(s: AppState, id: string) {
  return s.fournisseurs.find((f) => f.id === id)?.nom ?? id;
}

function nomSite(s: AppState, id: string) {
  return s.pointsDeVente.find((p) => p.id === id)?.nom ?? id;
}

export function telechargerJsonComplet(state: AppState) {
  const nom = (state.parametres.nomEntreprise || "negoo")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 40);
  const jour = new Date().toISOString().slice(0, 10);
  const blob = new Blob(
    [JSON.stringify(pickAppState(state), null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `negoo-donnees-${nom}-${jour}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export const LOTS_RECUPERATION: LotRecuperation[] = [
  {
    id: "clients",
    titre: "Fiches clients",
    pourquoi: "Coordonnées, NIF, plafonds de crédit.",
    ouLabel: "Paramètres → Clients",
    ouHref: "/parametres/clients",
    compter: (s) => s.clients.length,
    exporter: (s) =>
      downloadCsv("clients.csv", [
        ["Code", "Nom", "Téléphone", "E-mail", "Adresse", "Ville", "NIF", "STAT", "Actif", "Plafond crédit"],
        ...s.clients.map((c) => [
          c.code ?? "",
          c.nom,
          c.telephone ?? "",
          c.email ?? "",
          c.adresse ?? "",
          c.ville ?? "",
          c.nif ?? "",
          c.stat ?? "",
          c.actif ? "oui" : "non",
          c.plafondCredit ?? 0,
        ]),
      ]),
  },
  {
    id: "fournisseurs",
    titre: "Fiches fournisseurs",
    pourquoi: "Coordonnées et NIF des fournisseurs.",
    ouLabel: "Paramètres → Fournisseurs",
    ouHref: "/parametres/fournisseurs",
    compter: (s) => s.fournisseurs.length,
    exporter: (s) =>
      downloadCsv("fournisseurs.csv", [
        ["Nom", "Téléphone", "E-mail", "Adresse", "Ville", "NIF", "Actif"],
        ...s.fournisseurs.map((f) => [
          f.nom,
          f.telephone ?? "",
          f.email ?? "",
          f.adresse ?? "",
          f.ville ?? "",
          f.nif ?? "",
          f.actif ? "oui" : "non",
        ]),
      ]),
  },
  {
    id: "catalogue",
    titre: "Catalogue articles",
    pourquoi: "Codes, désignations, prix, familles.",
    ouLabel: "Paramètres → Catalogue",
    ouHref: "/parametres/produits",
    compter: (s) => s.produits.length,
    exporter: (s) =>
      downloadCsv("catalogue-articles.csv", [
        ["Code", "Désignation", "Famille", "Prix vente", "Prix achat", "Actif"],
        ...s.produits.map((p) => [
          p.code,
          p.libelleCourt,
          s.categoriesProduits.find((c) => c.id === p.categorieId)?.libelle ?? "",
          p.prixVenteHT,
          p.prixAchat,
          p.actif ? "oui" : "non",
        ]),
      ]),
  },
  {
    id: "factures",
    titre: "Factures clients",
    pourquoi: "Pièces de vente : n°, dates, montants, reste à payer.",
    ouLabel: "Commercial → Factures (Exporter PDF pièce par pièce)",
    ouHref: "/factures/liste",
    compter: (s) => s.factures.length,
    exporter: (s) =>
      downloadCsv("factures-clients.csv", [
        [
          "N°",
          "Type",
          "Date",
          "Échéance",
          "Client",
          "Site",
          "Statut",
          "HT",
          "TVA",
          "TTC",
          "Reste à payer",
        ],
        ...s.factures.map((f) => {
          const t = totauxFacture(f, s.parametres, s.acomptes);
          return [
            f.numero,
            FACTURE_TYPES[f.type] ?? f.type,
            formatDate(f.date),
            formatDate(f.echeance),
            nomClient(s, f.clientId),
            nomSite(s, f.pointDeVenteId),
            FACTURE_STATUTS[f.statut] ?? f.statut,
            t.totalHT,
            t.montantTVA,
            t.totalTTC,
            resteAPayer(f, s.parametres, s.acomptes, s.factures),
          ];
        }),
      ]),
  },
  {
    id: "devis",
    titre: "Devis",
    pourquoi: "Propositions commerciales et montants.",
    ouLabel: "Commercial → Devis",
    ouHref: "/devis/liste",
    compter: (s) => s.devis.length,
    exporter: (s) =>
      downloadCsv("devis.csv", [
        ["N°", "Date", "Client", "Statut", "HT", "TTC"],
        ...s.devis.map((d) => {
          const t = totauxDevis(d, s.parametres, s.acomptes);
          return [
            d.numero,
            formatDate(d.date),
            nomClient(s, d.clientId),
            DEVIS_STATUTS[d.statut] ?? d.statut,
            t.totalHT,
            t.totalTTC,
          ];
        }),
      ]),
  },
  {
    id: "commandes",
    titre: "Commandes clients",
    pourquoi: "Commandes confirmées et montants.",
    ouLabel: "Commercial → Commandes",
    ouHref: "/commandes/liste",
    compter: (s) => s.commandes.length,
    exporter: (s) =>
      downloadCsv("commandes-clients.csv", [
        ["N°", "Date", "Client", "Statut", "HT", "TTC"],
        ...s.commandes.map((c) => {
          const t = totauxCommande(c, s.parametres, s.acomptes);
          return [
            c.numero,
            formatDate(c.date),
            nomClient(s, c.clientId),
            COMMANDE_STATUTS[c.statut] ?? c.statut,
            t.totalHT,
            t.totalTTC,
          ];
        }),
      ]),
  },
  {
    id: "livraisons",
    titre: "Bons de livraison",
    pourquoi: "Livraisons clients.",
    ouLabel: "Commercial → Bons de livraison",
    ouHref: "/bons-de-livraison/liste",
    compter: (s) => s.bonsDeLivraison.length,
    exporter: (s) =>
      downloadCsv("bons-de-livraison.csv", [
        ["N°", "Date", "Client", "Statut", "HT", "TTC"],
        ...s.bonsDeLivraison.map((b) => {
          const t = totauxBonDeLivraison(b, s.parametres, s.acomptes);
          return [
            b.numero,
            formatDate(b.date),
            nomClient(s, b.clientId),
            BL_STATUTS[b.statut] ?? b.statut,
            t.totalHT,
            t.totalTTC,
          ];
        }),
      ]),
  },
  {
    id: "achats",
    titre: "Achats / factures fournisseur",
    pourquoi: "Commandes d'achat, n° facture fournisseur, soldes.",
    ouLabel: "Achats → Commandes fournisseurs",
    ouHref: "/achats",
    compter: (s) => s.achats.length,
    exporter: (s) =>
      downloadCsv("achats-fournisseurs.csv", [
        ["N° interne", "N° facture fournisseur", "Date", "Fournisseur", "Statut", "HT", "TTC", "Solde"],
        ...s.achats.map((a) => {
          const t = totauxAchat(a);
          return [
            a.numero,
            a.numeroFactureFournisseur ?? "",
            formatDate(a.date),
            nomFournisseur(s, a.fournisseurId),
            STATUT_ACHAT_LABELS[a.statut] ?? a.statut,
            t.ht,
            t.ttc,
            soldeAchat(a),
          ];
        }),
      ]),
  },
  {
    id: "stock",
    titre: "Stocks (quantités et valeurs)",
    pourquoi: "Quantité et CUMP par article et par site, à la date du téléchargement.",
    ouLabel: "Stocks",
    ouHref: "/stocks",
    compter: (s) => s.produits.length,
    exporter: (s) => {
      const rows: (string | number)[][] = [
        ["Code", "Article", "Site", "Quantité", "CUMP", "Valeur"],
      ];
      for (const p of s.produits) {
        for (const site of s.pointsDeVente) {
          const etat = etatCumpProduit({
            produitId: p.id,
            pointDeVenteId: site.id,
            entrees: s.entrees,
            ventes: s.ventes,
            inventaires: s.inventaires,
            produit: p,
          });
          if (etat.quantite === 0 && etat.valeur === 0) continue;
          rows.push([
            p.code,
            p.libelleCourt,
            site.nom,
            etat.quantite,
            Math.round(etat.cump),
            Math.round(etat.valeur),
          ]);
        }
      }
      downloadCsv("stocks.csv", rows);
    },
  },
  {
    id: "ecritures",
    titre: "Écritures comptables",
    pourquoi: "Journal des écritures générées (vente, achat, trésorerie).",
    ouLabel: "Comptabilité → Journaux",
    ouHref: "/comptabilite/journaux",
    compter: (s) => s.ecrituresComptables.length,
    exporter: (s) => {
      const rows: (string | number)[][] = [
        ["Date", "Pièce", "Journal", "Libellé", "Compte", "Libellé compte", "Débit", "Crédit"],
      ];
      for (const e of s.ecrituresComptables) {
        for (const l of e.lignes) {
          rows.push([
            formatDate(e.date),
            e.piece,
            e.journal,
            e.libelle,
            l.numero,
            l.libelle,
            l.debit,
            l.credit,
          ]);
        }
      }
      downloadCsv("ecritures-comptables.csv", rows);
    },
  },
  {
    id: "plan",
    titre: "Plan comptable",
    pourquoi: "Liste des comptes (numéro, libellé).",
    ouLabel: "Comptabilité → Plan comptable",
    ouHref: "/comptabilite/plan",
    compter: (s) => s.comptesComptables.length,
    exporter: (s) =>
      downloadCsv("plan-comptable.csv", [
        ["N°", "Libellé", "Classe"],
        ...s.comptesComptables.map((c) => [c.numero, c.libelle, c.numero.slice(0, 1)]),
      ]),
  },
  {
    id: "tresorerie",
    titre: "Comptes de trésorerie",
    pourquoi: "Caisses, banques, Mobile Money paramétrés.",
    ouLabel: "Paramètres → Trésorerie",
    ouHref: "/parametres/tresorerie",
    compter: (s) => s.comptesTresorerie.length,
    exporter: (s) =>
      downloadCsv("comptes-tresorerie.csv", [
        ["Libellé", "Type", "Site", "Actif"],
        ...s.comptesTresorerie.map((c) => [
          c.libelle,
          c.type,
          c.siteId ? nomSite(s, c.siteId) : "Tous sites",
          c.actif ? "oui" : "non",
        ]),
      ]),
  },
];
