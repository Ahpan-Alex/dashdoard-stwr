/**
 * Cascade DA (alerte matière) à la suppression d'une commande client.
 * Exécuter : npm run test:cascade-da
 */
import { PARAMETRES_ALERTES_DEFAUT, evaluerAlertes } from "../src/lib/alertes.ts";
import {
  MENTION_COMMANDE_CLIENT_ORIGINE_SUPPRIMEE,
  cascadeDemandeAchatSuppressionCommande,
} from "../src/lib/besoins-achat.ts";
import { emptyAppState } from "../src/lib/empty-state.ts";
import type { Achat, BesoinAchat } from "../src/lib/types.ts";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const commandeId = "cmd-1";

function besoin(id: string, extra: Partial<BesoinAchat> = {}): BesoinAchat {
  return {
    id,
    numero: id.toUpperCase(),
    date: "2026-09-01T08:00:00.000Z",
    produitId: "tole",
    quantiteNecessaire: 4,
    pointDeVenteId: "site-1",
    ...extra,
  };
}

function achat(id: string, extra: Partial<Achat> = {}): Achat {
  return {
    id,
    numero: id.toUpperCase(),
    fournisseurId: "frn-1",
    pointDeVenteId: "site-1",
    date: "2026-09-10T08:00:00.000Z",
    statut: "valide",
    tauxTVA: 0,
    lignes: [
      {
        id: `${id}-l`,
        produitId: "tole",
        quantite: 4,
        prixAchatUnitaire: 1000,
      },
    ],
    livraisons: [],
    paiements: [],
    avoirs: [],
    echeance: "2026-08-01",
    ...extra,
  };
}

function appliquer(opts: {
  besoins: BesoinAchat[];
  achats: Achat[];
  ofs?: { id: string }[];
  bls?: { id: string; commandeId?: string }[];
  bps?: { id: string; commandeId?: string }[];
}) {
  const ofs = opts.ofs ?? [{ id: "of-1" }];
  const bls = opts.bls ?? [{ id: "bl-1", commandeId }];
  const bps = opts.bps ?? [{ id: "bp-1", commandeId }];
  const cascade = cascadeDemandeAchatSuppressionCommande({
    commandeId,
    besoins: opts.besoins,
    achats: opts.achats,
  });
  return {
    besoins: cascade.besoins,
    achats: cascade.achats,
    orphelins: cascade.achatsOrphelins,
    supprimes: cascade.besoinsSupprimes,
    ofs,
    bls,
    bps,
  };
}

const daDemande = besoin("ba-demande", {
  origine: "alerte_matiere_commande",
  commandeId,
});
const daTransformee = besoin("ba-ferme", {
  origine: "alerte_matiere_commande",
  commandeId,
});
const daAutre = besoin("ba-manuelle");
const achatFerme = achat("ach-ferme", {
  besoinAchatId: daTransformee.id,
  alerteMatiereCommandeId: commandeId,
  commandeId,
  destinationAchat: "projet_client",
});
const achatManuel = achat("ach-manuel", {
  commandeId,
  destinationAchat: "projet_client",
  numero: "ACH-MANUEL",
});

const sansDa = appliquer({ besoins: [daAutre], achats: [achatManuel] });
assert(sansDa.besoins.length === 1 && sansDa.besoins[0].id === "ba-manuelle", "DA manuelle conservée");
assert(sansDa.achats.length === 1 && sansDa.achats[0].id === "ach-manuel", "achat manuel conservé");
assert(!sansDa.achats[0].commandeClientOrigineSupprimee, "achat manuel non marqué orphelin");
assert(sansDa.achats[0].commandeId === commandeId, "lien projet client manuel inchangé");
assert(sansDa.supprimes.length === 0 && sansDa.orphelins.length === 0, "aucune cascade sans DA d'alerte");
assert(sansDa.ofs[0].id === "of-1" && sansDa.bls[0].id === "bl-1" && sansDa.bps[0].id === "bp-1", "OF, BL et BP inchangés");

const avecDemande = appliquer({
  besoins: [daDemande, daAutre],
  achats: [achatManuel],
});
assert(!avecDemande.besoins.some((b) => b.id === "ba-demande"), "DA encore demande supprimée");
assert(avecDemande.besoins.some((b) => b.id === "ba-manuelle"), "autre DA conservée");
assert(avecDemande.achats.some((a) => a.id === "ach-manuel" && !a.commandeClientOrigineSupprimee), "achat hors flux intact");
assert(avecDemande.supprimes.map((b) => b.id).join() === "ba-demande", "journal de la DA supprimée");
assert(avecDemande.ofs.length === 1 && avecDemande.bls.length === 1, "cascades OF/BL inchangées");

const avecFerme = appliquer({
  besoins: [daTransformee, daDemande],
  achats: [achatFerme, achatManuel],
});
const orphelin = avecFerme.achats.find((a) => a.id === "ach-ferme");
assert(orphelin, "commande fournisseur ferme conservée");
assert(orphelin.statut === "valide", "statut de la commande fournisseur inchangé");
assert(orphelin.commandeId === commandeId, "lien d'origine conservé");
assert(orphelin.commandeClientOrigineSupprimee === true, "lien marqué rompu");
assert(
  MENTION_COMMANDE_CLIENT_ORIGINE_SUPPRIMEE === "Commande client d'origine supprimée",
  "mention affichée",
);
const besoinReste = avecFerme.besoins.find((b) => b.id === "ba-ferme");
assert(besoinReste?.commandeClientOrigineSupprimee === true, "DA transformée conservée et signalée");
assert(!avecFerme.besoins.some((b) => b.id === "ba-demande"), "l'autre DA encore demande est supprimée");
assert(avecFerme.achats.find((a) => a.id === "ach-manuel")?.commandeClientOrigineSupprimee !== true, "achat indépendant ignoré");
assert(avecFerme.orphelins.length === 1 && avecFerme.orphelins[0].id === "ach-ferme", "un seul orphelin");

const brouillon = achat("ach-brouillon", {
  statut: "brouillon",
  besoinAchatId: "ba-brouillon",
  alerteMatiereCommandeId: commandeId,
  commandeId,
});
const daBrouillon = besoin("ba-brouillon", {
  origine: "alerte_matiere_commande",
  commandeId,
});
const avecBrouillon = appliquer({ besoins: [daBrouillon], achats: [brouillon] });
assert(avecBrouillon.achats.some((a) => a.id === "ach-brouillon"), "brouillon fournisseur non supprimé");
assert(avecBrouillon.besoins.some((b) => b.id === "ba-brouillon"), "DA déjà transformée en brouillon conservée");

const parametres = emptyAppState().parametres;
const site = { id: "site-1", nom: "Magasin", actif: true } as never;
const produit = {
  id: "vis",
  code: "VIS",
  libelleCourt: "Vis",
  unite: "u",
  seuilRupture: 5,
  prixAchat: 1,
  prixVente: 2,
  actif: true,
  natureStock: "marchandise",
} as never;
const ofRetard = {
  id: "of-retard",
  numero: "OF-1",
  statut: "en_cours",
  dateCloturePrevue: "2026-01-01",
  atelierId: "site-1",
  produitId: "vis",
  quantitePrevue: 1,
} as never;
const facture = {
  id: "fac-1",
  numero: "FAC-1",
  clientId: "cli-1",
  date: "2026-01-01T08:00:00.000Z",
  echeance: "2026-02-01",
  statut: "validee",
  type: "standard",
  lignes: [{ id: "fl", type: "produit", produitId: "vis", quantite: 1, prixUnitaire: 5000 }],
  montantPaye: 0,
  tauxTVA: 0,
} as never;

const alertes = evaluerAlertes({
  parametresAlertes: PARAMETRES_ALERTES_DEFAUT,
  parametres,
  achats: [orphelin!],
  factures: [facture],
  acomptes: [],
  journalAudit: [],
  clients: [{ id: "cli-1", nom: "Rasoanaivo", plafondCredit: 1000 }],
  fournisseurs: [{ id: "frn-1", nom: "Acier SA" } as never],
  produits: [produit],
  entrees: [
    {
      id: "ent-1",
      produitId: "vis",
      pointDeVenteId: "site-1",
      quantite: 1,
      prixAchatUnitaire: 1,
      date: "2026-09-01T08:00:00.000Z",
    } as never,
  ],
  ventes: [],
  pointsDeVente: [site],
  inventaires: [],
  ordresFabrication: [ofRetard],
  aujourdHui: "2026-09-26",
});

const types = new Set(alertes.map((a) => a.type));
assert(types.has("achat_echeance_depassee"), "l'achat orphelin reste dans les alertes d'échéance");
assert(!types.has("achat_sans_projet_client"), "l'orphelin n'est pas traité comme un achat sans projet");
assert(types.has("stock_rupture"), "alerte stock inchangée");
assert(types.has("of_retard"), "alerte production inchangée");
assert(types.has("vente_impayee") || types.has("vente_plafond_credit"), "alerte vente inchangée");

const sansOrphelin = evaluerAlertes({
  parametresAlertes: PARAMETRES_ALERTES_DEFAUT,
  parametres,
  achats: [],
  factures: [facture],
  acomptes: [],
  journalAudit: [],
  clients: [{ id: "cli-1", nom: "Rasoanaivo", plafondCredit: 1000 }],
  fournisseurs: [{ id: "frn-1", nom: "Acier SA" } as never],
  produits: [produit],
  entrees: [
    {
      id: "ent-1",
      produitId: "vis",
      pointDeVenteId: "site-1",
      quantite: 1,
      prixAchatUnitaire: 1,
      date: "2026-09-01T08:00:00.000Z",
    } as never,
  ],
  ventes: [],
  pointsDeVente: [site],
  inventaires: [],
  ordresFabrication: [ofRetard],
  aujourdHui: "2026-09-26",
});
const idsMetier = (liste: { id: string; categorie: string }[]) =>
  liste
    .filter((a) => a.categorie === "stock" || a.categorie === "production" || a.categorie === "vente")
    .map((a) => a.id)
    .sort()
    .join("|");
assert(
  idsMetier(alertes) === idsMetier(sansOrphelin),
  "les alertes stock, production et ventes ne changent pas avec une commande fournisseur orpheline",
);

console.log("cascade da commande: ok");
