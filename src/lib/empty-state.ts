import {
  normaliserParametresAlertes,
  PARAMETRES_ALERTES_DEFAUT,
} from "./alertes";
import { assurerModelesDocuments, createDefaultModeles } from "./document-templates";
import { ficheTiersDiversMarche } from "./missions";
import { normaliserCategoriesProduits, seedCategoriesProduits } from "./produits";
import { fusionnerUnitesMesure, seedUnitesMesure } from "./unites-mesure";
import { fusionnerTypesClients, seedTypesClients } from "./types-clients";
import {
  fusionnerNaturesDepenseMission,
  seedNaturesDepenseMission,
} from "./natures-depense-mission";
import {
  fusionnerMotifsSortieAtelier,
  seedMotifsSortieAtelier,
} from "./sorties-atelier";
import {
  fusionnerComptesTresorerie,
  fusionnerModesPaiement,
  seedModesPaiement,
} from "./tresorerie";
import type { AppState } from "./types";

/** État métier vide — plus de données fake côté client. */
export function emptyAppState(): AppState {
  return {
    pointDeVenteActifId: "tous",
    parametres: {
      nomEntreprise: "",
      formeJuridique: "SARL",
      capital: 0,
      devise: "Ar",
      nif: "",
      stat: "",
      rcs: "",
      adresse: "",
      ville: "",
      telephone: "",
      email: "",
      rib: "",
      banque: "",
      tauxTVA: 20,
      assujettiTVA: true,
      regimeFiscal: "tva",
      seuilMargePalier1Percent: 25,
      seuilMargePalier2Percent: 5,
      seuilMargeTheoriqueAvertissementPercent: 20,
      seuilMargeTheoriqueCritiquePercent: 0,
      conditionsPaiementDefaut:
        "Paiement à 30 jours. Acompte de 30 % à la commande. Espèces, virement ou Mobile Money.",
      tranchesBalanceAgeeJours: [30, 60, 90],
    },
    identiteNavigation: { nom: "" },
    modelesDocuments: createDefaultModeles(),
    preferencesModeles: {},
    preferencesAffichage: {},
    parametresAlertes: { ...PARAMETRES_ALERTES_DEFAUT },
    alertesSuivi: {},
    bilanInitial: {
      date: new Date().toISOString(),
      immobilisations: 0,
      stocks: 0,
      creancesClients: 0,
      disponibilites: 0,
      capital: 0,
      dettesFournisseurs: 0,
      dettesSociales: 0,
      emprunts: 0,
      resultatReporte: 0,
      compteCourantAssocie: 0,
    },
    immobilisations: [],
    mouvementsCompteCourant: [],
    clients: [],
    fournisseurs: [],
    tiers: [ficheTiersDiversMarche()],
    devis: [],
    commandes: [],
    bonsDePreparation: [],
    bonsDeLivraison: [],
    factures: [],
    acomptes: [],
    transformations: [],
    achats: [],
    lotsPaiementFournisseur: [],
    transfertsStock: [],
    transfertsMatiereOf: [],
    ordresFabrication: [],
    bonsATirer: [],
    missionsAchat: [],
    demandesPrix: [],
    besoinsAchat: [],
    pointsDeVente: [],
    categoriesProduits: seedCategoriesProduits(),
    unitesMesure: seedUnitesMesure(),
    typesClients: seedTypesClients(),
    naturesDepenseMission: seedNaturesDepenseMission(),
    motifsSortieAtelier: seedMotifsSortieAtelier(),
    emplacementsStock: [],
    sortiesAtelier: [],
    comptesTresorerie: [],
    lignesReleveBancaire: [],
    modesPaiement: seedModesPaiement(),
    exercicesComptables: [],
    produits: [],
    tarifsClients: [],
    historiquesPrix: [],
    journalAudit: [],
    entrees: [],
    ventes: [],
    relancesImpayes: [],
    inventaires: [],
    journalActivites: [],
    comptesComptables: [],
    ecrituresComptables: [],
    transfertsComptables: [],
  };
}

export function pickAppState(state: AppState): AppState {
  return {
    parametres: state.parametres,
    identiteNavigation: state.identiteNavigation ?? { nom: "" },
    modelesDocuments: assurerModelesDocuments(state.modelesDocuments),
    preferencesModeles: state.preferencesModeles ?? {},
    preferencesAffichage: state.preferencesAffichage ?? {},
    parametresAlertes: normaliserParametresAlertes(state.parametresAlertes),
    alertesSuivi: state.alertesSuivi ?? {},
    bilanInitial: state.bilanInitial,
    immobilisations: state.immobilisations,
    mouvementsCompteCourant: state.mouvementsCompteCourant ?? [],
    clients: state.clients,
    fournisseurs: state.fournisseurs,
    tiers: state.tiers ?? [],
    devis: state.devis,
    commandes: state.commandes,
    bonsDePreparation: state.bonsDePreparation ?? [],
    bonsDeLivraison: state.bonsDeLivraison,
    factures: state.factures,
    acomptes: state.acomptes,
    transformations: state.transformations ?? [],
    achats: state.achats ?? [],
    lotsPaiementFournisseur: Array.isArray(state.lotsPaiementFournisseur)
      ? state.lotsPaiementFournisseur
      : [],
    transfertsStock: state.transfertsStock ?? [],
    transfertsMatiereOf: state.transfertsMatiereOf ?? [],
    ordresFabrication: state.ordresFabrication ?? [],
    bonsATirer: state.bonsATirer ?? [],
    missionsAchat: state.missionsAchat ?? [],
    demandesPrix: state.demandesPrix ?? [],
    besoinsAchat: state.besoinsAchat ?? [],
    pointsDeVente: state.pointsDeVente,
    categoriesProduits: normaliserCategoriesProduits(state.categoriesProduits),
    unitesMesure: fusionnerUnitesMesure(state.unitesMesure, state.produits ?? []),
    typesClients: fusionnerTypesClients(
      state.typesClients,
      state.clients ?? [],
      state.tiers ?? [],
    ),
    naturesDepenseMission: fusionnerNaturesDepenseMission(
      state.naturesDepenseMission,
    ),
    motifsSortieAtelier: fusionnerMotifsSortieAtelier(state.motifsSortieAtelier),
    emplacementsStock: Array.isArray(state.emplacementsStock)
      ? state.emplacementsStock
      : [],
    sortiesAtelier: Array.isArray(state.sortiesAtelier)
      ? state.sortiesAtelier
      : [],
    comptesTresorerie: fusionnerComptesTresorerie(state.comptesTresorerie),
    lignesReleveBancaire: Array.isArray(state.lignesReleveBancaire)
      ? state.lignesReleveBancaire
      : [],
    modesPaiement: fusionnerModesPaiement(state.modesPaiement),
    exercicesComptables: Array.isArray(state.exercicesComptables)
      ? state.exercicesComptables
      : [],
    produits: state.produits ?? [],
    tarifsClients: state.tarifsClients,
    historiquesPrix: state.historiquesPrix,
    journalAudit: state.journalAudit,
    entrees: state.entrees,
    ventes: state.ventes,
    relancesImpayes: state.relancesImpayes ?? [],
    inventaires: state.inventaires ?? [],
    journalActivites: state.journalActivites ?? [],
    comptesComptables: state.comptesComptables ?? [],
    ecrituresComptables: state.ecrituresComptables ?? [],
    transfertsComptables: state.transfertsComptables ?? [],
    pointDeVenteActifId: state.pointDeVenteActifId,
  };
}
