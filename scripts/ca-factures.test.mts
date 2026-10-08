/**
 * CA des tableaux de bord : factures émises, acomptes, finale nette, avoirs.
 * Exécuter : npm run test:ca-factures
 */
import { emptyAppState } from "../src/lib/empty-state.ts";
import {
  factureComptabiliseDansCA,
  factureImpacteExploitation,
  montantCaHtFacture,
  totauxFacture,
} from "../src/lib/commercial.ts";
import { caMoisEtAnnee } from "../src/lib/dashboard-indicateurs.ts";
import { definitionIndicateur } from "../src/lib/referentiel-indicateurs.ts";
import {
  caHtFacturesPeriode,
  caParProduitFactures,
  chiffreAffairesFactures,
  LIGNE_ACOMPTE_CA,
} from "../src/lib/rentabilite.ts";
import type { Facture, FactureStatut } from "../src/lib/types.ts";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const parametres = emptyAppState().parametres;
const janvier = {
  debut: new Date(2026, 0, 1),
  fin: new Date(2026, 0, 31, 23, 59, 59),
};
const mars = {
  debut: new Date(2026, 2, 1),
  fin: new Date(2026, 2, 31, 23, 59, 59),
};
const avril = {
  debut: new Date(2026, 3, 1),
  fin: new Date(2026, 3, 30, 23, 59, 59),
};
const annee = {
  debut: new Date(2026, 0, 1),
  fin: new Date(2026, 11, 31, 23, 59, 59),
};

function fac(extra: Partial<Facture> & Pick<Facture, "id" | "type" | "statut">): Facture {
  return {
    numero: extra.id,
    clientId: "cli",
    pointDeVenteId: "site-a",
    date: "2026-03-15T12:00:00.000Z",
    echeance: "2026-04-15T12:00:00.000Z",
    lignes: [
      {
        id: "l1",
        designation: "Portail",
        quantite: 1,
        prixUnitaire: 10000,
        produitId: "portail",
      },
    ],
    tauxTVA: 20,
    montantPaye: 0,
    ...extra,
  };
}

const acompte = fac({
  id: "aco",
  numero: "FACACO-1",
  type: "acompte",
  statut: "payee",
  date: "2026-01-10T12:00:00.000Z",
  commandeId: "cmd",
  montantPaye: 1200,
  lignes: [
    {
      id: "a1",
      designation: "Acompte",
      quantite: 1,
      prixUnitaire: 1000,
    },
  ],
});
const finale = fac({
  id: "fin",
  numero: "FAC-1",
  type: "solde",
  statut: "validee",
  date: "2026-03-15T12:00:00.000Z",
  commandeId: "cmd",
  acomptesDocument: [
    {
      numero: "ACO-1",
      date: "2026-01-10T12:00:00.000Z",
      montant: 1200,
    },
  ],
});
const seule = fac({
  id: "seule",
  type: "standard",
  statut: "validee",
  date: "2026-03-02T12:00:00.000Z",
  pointDeVenteId: "site-b",
  lignes: [
    {
      id: "s1",
      designation: "Service",
      quantite: 2,
      prixUnitaire: 500,
      produitId: "srv",
      remiseMode: "percent",
      remisePercent: 10,
    },
  ],
  remiseGlobale: 50,
  remiseGlobaleMode: "montant",
});
const avoir = fac({
  id: "avo",
  type: "avoir",
  statut: "validee",
  date: "2026-04-04T12:00:00.000Z",
  factureParenteId: "seule",
  lignes: [
    {
      id: "v1",
      designation: "Avoir",
      quantite: 1,
      prixUnitaire: 200,
      produitId: "srv",
    },
  ],
});
const annulee = fac({
  id: "ann",
  type: "standard",
  statut: "annulee",
  date: "2026-03-20T12:00:00.000Z",
});
const brouillon = fac({
  id: "br",
  type: "standard",
  statut: "brouillon",
});
const emise = fac({
  id: "old",
  type: "standard",
  statut: "emise" as FactureStatut,
  date: "2026-03-18T12:00:00.000Z",
  lignes: [
    {
      id: "e1",
      designation: "Ancien",
      quantite: 1,
      prixUnitaire: 300,
      produitId: "portail",
    },
  ],
});

const toutes = [acompte, finale, seule, avoir, annulee, brouillon, emise];

assert(factureComptabiliseDansCA(finale), "une facture émise (validee) compte");
assert(factureComptabiliseDansCA(emise), "l'ancien statut emise compte");
assert(factureComptabiliseDansCA(acompte), "une facture d'acompte émise compte");
assert(!factureComptabiliseDansCA(brouillon), "le brouillon ne compte pas");
assert(!factureComptabiliseDansCA(annulee), "l'annulée ne compte pas");
assert(
  !factureImpacteExploitation(acompte),
  "l'acompte ne sort pas de stock",
);

assert(totauxFacture(acompte, parametres).totalHT === 1000, "HT acompte");
assert(totauxFacture(finale, parametres).totalHT === 10000, "HT brut finale");
assert(montantCaHtFacture(acompte, parametres, toutes) === 1000, "CA acompte");
assert(montantCaHtFacture(finale, parametres, toutes) === 9000, "CA finale nette");
assert(
  montantCaHtFacture(acompte, parametres, toutes) +
    montantCaHtFacture(finale, parametres, toutes) ===
    10000,
  "CA cumulé = montant de la commande",
);

const htSeule = totauxFacture(seule, parametres).totalHT;
assert(htSeule === 850, `remise ligne + globale → ${htSeule}`);
assert(montantCaHtFacture(seule, parametres, toutes) === 850, "facture seule éditée");
assert(montantCaHtFacture(avoir, parametres, toutes) === -200, "avoir déduit");
assert(montantCaHtFacture(annulee, parametres, toutes) === 0, "annulée exclue");
assert(montantCaHtFacture(brouillon, parametres, toutes) === 0, "brouillon exclu");

assert(
  caHtFacturesPeriode(toutes, parametres, "tous", janvier) === 1000,
  "janvier = acompte seul",
);
assert(
  caHtFacturesPeriode(toutes, parametres, "tous", mars) === 9000 + 850 + 300,
  "mars = finale nette + facture seule + ancienne émise",
);
assert(
  caHtFacturesPeriode(toutes, parametres, "tous", avril) === -200,
  "avril = avoir",
);
assert(
  caHtFacturesPeriode(toutes, parametres, "site-a", annee) === 1000 + 9000 + 300 - 200,
  "site A",
);
assert(
  caHtFacturesPeriode(toutes, parametres, "site-b", annee) === 850,
  "site B isolé",
);
assert(
  chiffreAffairesFactures(toutes, parametres, "tous", annee) ===
    caHtFacturesPeriode(toutes, parametres, "tous", annee),
  "objectifs et CA période identiques",
);

const mois = caMoisEtAnnee(toutes, parametres, "tous", new Date(2026, 2, 20));
assert(mois.mois.actuel === 9000 + 850 + 300, "dashboard CA du mois");
assert(mois.annee.actuel === 1000 + 9000 + 850 + 300 - 200, "dashboard CA annuel");

const produits = caParProduitFactures(toutes, [], parametres, "tous", annee);
const acomptesLigne = produits.find((p) => p.id === LIGNE_ACOMPTE_CA);
assert(acomptesLigne?.montant === 1000, "acompte sans article visible");
const portail = produits.find((p) => p.id === "portail");
assert(portail?.montant === 9000 + 300, "produit net des acomptes");
assert(
  produits.reduce((s, p) => s + p.montant, 0) ===
    caHtFacturesPeriode(toutes, parametres, "tous", annee),
  "somme des familles = CA",
);

assert(
  definitionIndicateur("ca_mois").definition.includes("acomptes"),
  "pastille CA du mois",
);
assert(
  definitionIndicateur("ca_annuel").definition.includes("CA du mois"),
  "pastille CA annuel",
);

console.log("ca factures: ok");
