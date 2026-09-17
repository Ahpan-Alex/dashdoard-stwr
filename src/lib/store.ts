"use client";

import { create } from "zustand";
import {
  prefsTableEffectives,
  tableAffichage,
  type PreferencesAffichage,
  type PrefsTableAffichage,
  type TableAffichageId,
} from "./affichage-tableaux";
import {
  fusionnerAlertesSuivi,
  normaliserParametresAlertes,
  normaliserSuiviUser,
  suiviVide,
  type AlertesSuivi,
  type ParametresAlertes,
  type SuiviAlertesUser,
} from "./alertes";
import {
  modelePourType,
  type ModeleDocument,
  type PreferencesModeles,
  type TypeDocumentCommercial,
} from "./document-templates";
import {
  creerEntreeHistorique,
  idsCategorieEtDescendants,
  produitEstReference,
} from "./produits";
import { creerEntreeJournal, factureEstFiscale, nextNumeroDocumentCommercial } from "./facturation-mg";
import { stockDisponible } from "./calculations";
import { quantiteStockChronologique, snapshotCumpLignesFacture } from "./cump";
import {
  entreesDepuisAchat,
  nextNumeroAchat,
  nextNumeroAvoirAchat,
  nextNumeroLivraison,
  quantiteLivreeProduit,
  quantiteRetourneeProduit,
  reliquatProduit,
  soldeAchat,
  statutLivraisonRecord,
} from "./achats";
import {
  appliqueTVA,
  ensureCodesClients,
  factureImpacteExploitation,
  fournisseurEstReference,
  motifLienClient,
  motifLienPointDeVente,
  nextCodeClient,
  nextNumero,
  rebuildVentesDepuisFactures,
  splitTTC,
  totauxFacture,
} from "./commercial";
import {
  putAlertesSuivi,
  putParametresAlertes,
  putPreferencesAffichage,
  resetBusinessState,
  scheduleBusinessSave,
  setBusinessSyncEnabled,
  installBusinessSaveLifecycle,
} from "./business-api";
import {
  avecPresentationSiBesoin,
  creerSnapshotPresentation,
} from "./document-presentation";
import { emptyAppState, pickAppState } from "./empty-state";
import { motifRepartitionInvalide, siteEstAtelier, sitesAchat, utilisateurRattacheAuSite } from "./sites";
import {
  appliquerRoleUnique,
  appliquerSeedComptesDefaut,
  compteChargeProduit,
  compteParNumero,
  compteUtiliseEnEcriture,
  filtrerEcrituresComptables,
  lignesExportEcritures,
  compteVenteProduit,
  chiffresNumeroCompte,
  completerNumeroCompte,
  libelleCompteTiersAuto,
  longueurNumeroCompteEffective,
  LONGUEUR_COMPTE_MAX,
  LONGUEUR_COMPTE_MIN,
  migrerProduitComptes,
  motifComptesTiersInvalides,
  moduleComptabiliteActif,
  motifCompteTiersIndisponible,
  motifLignesAchatInvalides,
  motifNumeroCompteInvalide,
  motifNumeroCompteSaisie,
  MSG_COMPTE_VERROUILLE,
  parserCsvPlanComptable,
  PREFIXE_COMPTE_CLIENT,
  PREFIXE_COMPTE_FOURNISSEUR,
  prochainNumeroSousCompteTiers,
  regenererEcrituresComptables,
  VALEUR_COMPTE_TIERS_AUTO,
  validerImportPlanComptable,
  dedupliquerIdsComptes,
  type PrefixeCompteTiers,
} from "./comptabilite";
import { PLAN_PCG_2005 } from "./pcg-2005";
import {
  assurerTiers,
  controlerPlafondCredit,
  factureImpacteEncours,
  synchroniserApresTiers,
  tiersDepuisClient,
  tiersDepuisFournisseur,
  upsertTiersDansListe,
} from "./tiers";
import {
  figerCumpLignesTransfert,
  nextNumeroTransfert,
  regenererEntreesTransfert,
  stockSuffisantPourTransfert,
} from "./transferts";
import {
  affecterPotAEntree,
  allouerReliquatSurSorties,
  copierNomenclatureVersOf,
  coutMod,
  coutsNonAffectes,
  cumpCourantSite,
  etapeValidation,
  lignesMainOeuvre,
  listerMouvementsBloquantAnnulationOf,
  messageAnnulationRefusee,
  montantEcartCloture,
  motifAchatNatureInterdite,
  motifProduitOfInvalide,
  nextNumeroOf,
  ofEstVerrouille,
  ofPeutMouvementer,
  regenererEntreesOf,
  reliquatsMatieres,
  stockDisponibleComposant,
  tauxHoraireModAtelier,
} from "./fabrication";
import {
  batAFichier,
  batCourant,
  motifBatOfManquant,
  motifCreationBatImpossible,
  prochaineVersionBat,
} from "./bat";
import {
  depensesValides,
  etapeValidationMission,
  evenementsSaisieMission,
  listerMouvementsBloquantAnnulationMission,
  messageAnnulationMissionRefusee,
  missionEstVerrouillee,
  motifClotureImpossible,
  motifDepenseDiverseInvalide,
  motifLigneMissionInvalide,
  nextNumeroMission,
  peutModifierDossierMission,
  peutSaisirMission,
  regenererEntreesMission,
  soldeMission,
  TIERS_DIVERS_MARCHE_ID,
  upsertTiersDiversMarche,
} from "./missions";
import {
  dpEstVerrouillee,
  nextNumeroDemandePrix,
  offreLigneFournisseur,
} from "./demandes-prix";
import { normaliserValiditeJours } from "./validite-document";
import {
  cycleNomenclature,
  normaliserNomenclatures,
} from "./nomenclature";
import {
  estUsageCommercial,
  natureStockDuProduit,
  produitEstFabrique,
  usageCommercialDuProduit,
} from "./nature-stock";
import {
  motifSymboleUniteInvalide,
  nbProduitsParUnite,
  normalizeSymboleUnite,
} from "./unites-mesure";
import {
  motifTypeClientInvalide,
  nbTiersParTypeClient,
  normalizeCodeTypeClient,
} from "./types-clients";
import {
  motifNatureDepenseInvalide,
  nbDepensesParNature,
} from "./natures-depense-mission";
import {
  bornesExerciceCalendaire,
  codeExerciceCheval,
  motifExerciceInvalide,
} from "./exercices";
import type { OptsNumeroDocument } from "./exercices";
import { createId } from "./id";
import { getActiviteActor } from "./activity-actor";
import { useAuthStore } from "./auth-store";
import {
  creerVerrouTransformation,
  verrouTransformationActif,
} from "./transformation-document";
import type {
  Achat,
  Acompte,
  ActiviteAction,
  ActiviteEntite,
  AppState,
  AvoirAchatLigne,
  BilanInitial,
  BonDeLivraison,
  BonDeLivraisonStatut,
  CategorieProduit,
  CibleTransformation,
  Client,
  CompteComptable,
  EcritureComptable,
  Commande,
  CommandeStatut,
  Devis,
  DevisStatut,
  EntreeStock,
  Facture,
  Fournisseur,
  HistoriquePrix,
  IdentiteNavigation,
  Immobilisation,
  Inventaire,
  JournalActivite,
  JournalAudit,
  JournalEcriture,
  LivraisonAchatLigne,
  ModePaiement,
  MouvementCompteCourant,
  Parametres,
  PointDeVente,
  Produit,
  RoleCompteComptable,
  RapportFinJournee,
  SourceTransformation,
  TarifClient,
  TransfertComptable,
  Tiers,
  TransfertStock,
  TransfertStockLigne,
  TransformationCommerciale,
  TypeClient,
  NatureDepenseMission,
  UniteMesure,
  Vente,
  OrdreFabrication,
  TypeNomenclature,
  MissionAchat,
  MissionAchatRealise,
  MissionDepenseDiverse,
  MissionJustificatif,
  MissionLignePrevisionnelle,
  MissionMouvementFonds,
  MissionReglementStatut,
  DemandePrix,
  DemandePrixLigne,
  DemandePrixOffre,
  DemandePrixStatut,
  ExerciceComptable,
  BonATirer,
} from "./types";

type Store = {
  parametres: Parametres;
  modelesDocuments: ModeleDocument[];
  preferencesModeles: PreferencesModeles;
  bilanInitial: BilanInitial;
  immobilisations: Immobilisation[];
  mouvementsCompteCourant: MouvementCompteCourant[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  tiers: Tiers[];
  devis: Devis[];
  commandes: Commande[];
  bonsDeLivraison: BonDeLivraison[];
  factures: Facture[];
  acomptes: Acompte[];
  transformations: TransformationCommerciale[];
  achats: Achat[];
  transfertsStock: TransfertStock[];
  ordresFabrication: OrdreFabrication[];
  bonsATirer: BonATirer[];
  missionsAchat: MissionAchat[];
  demandesPrix: DemandePrix[];
  pointsDeVente: PointDeVente[];
  categoriesProduits: CategorieProduit[];
  unitesMesure: UniteMesure[];
  typesClients: TypeClient[];
  naturesDepenseMission: NatureDepenseMission[];
  exercicesComptables: ExerciceComptable[];
  produits: Produit[];
  tarifsClients: TarifClient[];
  historiquesPrix: HistoriquePrix[];
  journalAudit: JournalAudit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  rapportsFinJournee: RapportFinJournee[];
  inventaires: Inventaire[];
  journalActivites: JournalActivite[];
  comptesComptables: CompteComptable[];
  ecrituresComptables: EcritureComptable[];
  transfertsComptables: TransfertComptable[];
  identiteNavigation: IdentiteNavigation;
  preferencesAffichage: PreferencesAffichage;
  parametresAlertes: ParametresAlertes;
  alertesSuivi: AlertesSuivi;
  pointDeVenteActifId: string | "tous";

  setPointDeVenteActif: (id: string | "tous") => void;
  updateParametres: (data: Partial<Parametres>) => void;
  definirLongueurNumeroCompte: (
    longueur: number,
  ) => { ok: true } | { ok: false; reason: string };
  assurerComptesComptablesDefaut: () => void;
  addCompteComptable: (data: {
    numero: string;
    libelle: string;
    roleCompte?: RoleCompteComptable;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateCompteComptable: (
    id: string,
    data: {
      numero?: string;
      libelle?: string;
      roleCompte?: RoleCompteComptable;
    },
  ) => { ok: true } | { ok: false; reason: string };
  deleteCompteComptable: (
    id: string,
  ) => { ok: true } | { ok: false; reason: string };
  importerComptesComptablesCsv: (
    texte: string,
  ) => { ok: true; imported: number } | { ok: false; reason: string };
  importerPlanComptableDefaut: () =>
    | { ok: true; imported: number }
    | { ok: false; reason: string };
  creerTransfertComptable: (opts: {
    journal: JournalEcriture | "tous";
    debut?: string;
    fin?: string;
  }) =>
    | { ok: true; id: string; count: number }
    | { ok: false; reason: string };
  updateIdentiteNavigation: (
    data: Partial<IdentiteNavigation>,
  ) => { ok: true } | { ok: false; reason: string };
  updateBilanInitial: (data: Partial<BilanInitial>) => void;

  addModeleDocument: (m: Omit<ModeleDocument, "id">) => string;
  updateModeleDocument: (id: string, data: Partial<ModeleDocument>) => void;
  deleteModeleDocument: (id: string) => void;
  /** Définit le modèle préféré d'un utilisateur pour un type de document. */
  setModelePreference: (
    userId: string,
    type: TypeDocumentCommercial,
    modeleId: string | null,
  ) => void;

  enregistrerTypesAffichage: (
    tableId: TableAffichageId,
    prefs: PrefsTableAffichage,
  ) => void;
  setTypeAffichageActif: (tableId: TableAffichageId, typeId: string) => void;
  updateParametresAlertes: (data: Partial<ParametresAlertes>) => void;
  marquerAlerte: (
    alerteId: string,
    action: "lue" | "nonlue" | "traitee" | "rouvrir",
  ) => void;

  addPointDeVente: (pdv: Omit<PointDeVente, "id">) => void;
  updatePointDeVente: (id: string, data: Partial<PointDeVente>) => void;
  deletePointDeVente: (id: string) => { ok: boolean; reason?: string };

  addEntree: (entree: Omit<EntreeStock, "id">) => void;
  updateEntree: (id: string, data: Partial<EntreeStock>) => {
    ok: boolean;
    reason?: string;
  };
  deleteEntree: (id: string) => { ok: boolean; reason?: string };

  addAchat: (
    achat: Omit<Achat, "id" | "livraisons" | "paiements" | "avoirs"> & {
      livraisons?: Achat["livraisons"];
      paiements?: Achat["paiements"];
      avoirs?: Achat["avoirs"];
    },
  ) => string;
  updateAchat: (
    id: string,
    data: Partial<Pick<Achat, "fournisseurId" | "pointDeVenteId" | "date" | "echeance" | "tauxTVA" | "lignes" | "note" | "validiteJours" | "numeroFactureFournisseur">>,
  ) => { ok: boolean; reason?: string };
  validerAchat: (id: string) => { ok: boolean; reason?: string };
  annulerAchat: (id: string) => { ok: boolean; reason?: string };
  deleteAchat: (id: string) => { ok: boolean; reason?: string };
  ajouterLivraisonAchat: (
    achatId: string,
    data: {
      date: string;
      lignes: LivraisonAchatLigne[];
      note?: string;
      confirmer?: boolean;
      datePeremption?: string;
    },
  ) => { ok: boolean; reason?: string; id?: string };
  confirmerLivraisonAchat: (
    achatId: string,
    livraisonId: string,
    lignes?: LivraisonAchatLigne[],
  ) => { ok: boolean; reason?: string };
  annulerLivraisonAchat: (
    achatId: string,
    livraisonId: string,
  ) => { ok: boolean; reason?: string };
  ajouterPaiementAchat: (
    achatId: string,
    data: { date: string; montant: number; modePaiement: ModePaiement; note?: string },
  ) => { ok: boolean; reason?: string };
  supprimerPaiementAchat: (
    achatId: string,
    paiementId: string,
  ) => { ok: boolean; reason?: string };
  ajouterAvoirAchat: (
    achatId: string,
    data: { date: string; lignes: AvoirAchatLigne[]; note?: string },
  ) => { ok: boolean; reason?: string; id?: string };
  validerAvoirAchat: (achatId: string, avoirId: string) => {
    ok: boolean;
    reason?: string;
  };
  supprimerAvoirAchat: (achatId: string, avoirId: string) => {
    ok: boolean;
    reason?: string;
  };

  demanderTransfert: (data: {
    siteSourceId: string;
    siteDestinataireId: string;
    dateDemande: string;
    lignes: TransfertStockLigne[];
    note?: string;
  }) => { ok: boolean; reason?: string; id?: string };
  expedierTransfert: (
    id: string,
    dateExpedition?: string,
  ) => { ok: boolean; reason?: string };
  receptionnerTransfert: (
    id: string,
    dateReception?: string,
  ) => { ok: boolean; reason?: string };
  annulerTransfert: (id: string) => { ok: boolean; reason?: string };

  creerOrdreFabrication: (data: {
    atelierId: string;
    produitId: string;
    quantitePrevue: number;
    nomenclatureSource?: TypeNomenclature;
    commandeId?: string;
    dateCloturePrevue?: string;
    note?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  modifierOrdreFabrication: (
    id: string,
    data: Partial<
      Pick<
        OrdreFabrication,
        | "atelierId"
        | "produitId"
        | "quantitePrevue"
        | "nomenclatureSource"
        | "nomenclatureNom"
        | "nomenclatureLignes"
        | "commandeId"
        | "dateCloturePrevue"
        | "note"
      >
    >,
  ) => { ok: boolean; reason?: string };
  demarrerOrdreFabrication: (
    id: string,
    opts?: { derogationBat?: boolean },
  ) => { ok: boolean; reason?: string };
  ajouterSortieOf: (
    ofId: string,
    data: {
      date: string;
      composantId: string;
      siteSourceId: string;
      quantite: number;
      heures?: number;
      atelierIdMod?: string;
    },
  ) => { ok: boolean; reason?: string; id?: string };
  supprimerSortieOf: (ofId: string, sortieId: string) => { ok: boolean; reason?: string };
  ajouterFraisOf: (
    ofId: string,
    data: { date: string; libelle: string; montant: number },
  ) => { ok: boolean; reason?: string };
  supprimerFraisOf: (ofId: string, fraisId: string) => { ok: boolean; reason?: string };
  ajouterMainOeuvreOf: (
    ofId: string,
    data: { date: string; atelierId: string; heures: number },
  ) => { ok: boolean; reason?: string };
  supprimerMainOeuvreOf: (
    ofId: string,
    ligneId: string,
  ) => { ok: boolean; reason?: string };
  enregistrerEntreeProductionOf: (
    ofId: string,
    data: { date: string; quantite: number },
  ) => { ok: boolean; reason?: string };
  cloturerOrdreFabrication: (
    id: string,
    data: {
      retours: {
        composantId: string;
        destination: "magasin" | "atelier";
        siteDestinataireId: string;
      }[];
      raisonEcart?: string;
    },
  ) => { ok: boolean; reason?: string };
  annulerOrdreFabrication: (id: string) => { ok: boolean; reason?: string };
  creerDemandeAchatDepuisOf: (
    ofId: string,
    data: {
      composantId: string;
      fournisseurId: string;
      quantite: number;
      pointDeVenteId: string;
    },
  ) => { ok: true; achatId: string } | { ok: false; reason: string };

  creerBonATirer: (data: {
    commandeId: string;
    fichierNom?: string;
    fichierMime?: string;
    fichierDataUrl?: string;
    commentaire?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  completerFichierBat: (
    id: string,
    fichier: { nom: string; mime: string; dataUrl: string },
  ) => { ok: boolean; reason?: string };
  enregistrerRetourBat: (
    id: string,
    data: {
      decision: "valide" | "modifications_demandees";
      validateurNom?: string;
      commentaire?: string;
      fichierSuivant?: { nom: string; mime: string; dataUrl: string };
    },
  ) => { ok: boolean; reason?: string };

  creerMissionAchat: (data: {
    acheteurUserId: string;
    acheteurNom: string;
    date: string;
    datePrevue?: string;
    siteDestinataireId: string;
    service?: string;
    objet?: string;
    fournisseursPrevus?: string;
    montantAvance: number;
    montantAvanceDemandee?: number;
    lignesPrevisionnelles: {
      produitId: string;
      quantiteSouhaitee: number;
      prixUnitaireEstime?: number;
      fournisseurId?: string;
      commentaire?: string;
    }[];
    note?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  modifierMissionAchat: (
    id: string,
    data: Partial<{
      acheteurUserId: string;
      acheteurNom: string;
      date: string;
      datePrevue: string;
      siteDestinataireId: string;
      service: string;
      objet: string;
      fournisseursPrevus: string;
      montantAvance: number;
      montantAvanceDemandee: number;
      lignesPrevisionnelles: MissionLignePrevisionnelle[];
      achatsRealises: MissionAchatRealise[];
      depensesDiverses: MissionDepenseDiverse[];
      justificatifs: MissionJustificatif[];
      mouvementsFonds: MissionMouvementFonds[];
      note: string;
    }>,
  ) => { ok: boolean; reason?: string };
  soumettreMissionAchat: (id: string) => { ok: boolean; reason?: string };
  validerMissionAchat: (id: string) => { ok: boolean; reason?: string };
  rejeterMissionAchat: (
    id: string,
    motif?: string,
  ) => { ok: boolean; reason?: string };
  remettreFondsMissionAchat: (
    id: string,
    data: {
      montant: number;
      date: string;
      modePaiement?: string;
      compteSource?: string;
      reference?: string;
    },
  ) => { ok: boolean; reason?: string };
  cloturerMissionAchat: (
    id: string,
    opts?: { exceptionJustificatifs?: boolean },
  ) => { ok: boolean; reason?: string };
  annulerMissionAchat: (id: string) => { ok: boolean; reason?: string };
  reglerMissionAchat: (
    id: string,
    data: { statutReglement: MissionReglementStatut; dateReglement?: string },
  ) => { ok: boolean; reason?: string };

  creerDemandePrix: (data: {
    date: string;
    lignes: { produitId: string; quantite: number }[];
    fournisseurIds: string[];
    note?: string;
    validiteJours?: number;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  modifierDemandePrix: (
    id: string,
    data: Partial<{
      date: string;
      lignes: DemandePrixLigne[];
      fournisseurIds: string[];
      offres: DemandePrixOffre[];
      fournisseurIdsRetenus: string[];
      note: string;
      validiteJours: number;
    }>,
  ) => { ok: boolean; reason?: string };
  patchOffreDemandePrix: (
    id: string,
    ligneId: string,
    fournisseurId: string,
    patch: Partial<Pick<DemandePrixOffre, "prixUnitaire" | "delaiJours">>,
  ) => { ok: boolean; reason?: string };
  changerStatutDemandePrix: (
    id: string,
    statut: DemandePrixStatut,
  ) => { ok: boolean; reason?: string };
  transformerDemandePrixEnAchats: (
    id: string,
    data: {
      pointDeVenteId: string;
      date?: string;
      validiteJours?: number;
      commandes: {
        fournisseurId: string;
        lignes: { produitId: string; quantite: number; prixAchatUnitaire: number }[];
        note?: string;
      }[];
    },
  ) => { ok: true; achatIds: string[] } | { ok: false; reason: string };

  addVente: (vente: Omit<Vente, "id">) => void;
  deleteVente: (id: string) => void;

  /** Crée ou met à jour la clôture du jour pour un PDV. */
  upsertRapportFinJournee: (
    data: Omit<RapportFinJournee, "id" | "updatedAt"> & { id?: string },
  ) => void;
  deleteRapportFinJournee: (id: string) => void;

  addCategorieProduit: (cat: Omit<CategorieProduit, "id">) => void;
  updateCategorieProduit: (id: string, data: Partial<CategorieProduit>) => void;
  deleteCategorieProduit: (id: string) => { ok: boolean; reason?: string };

  addUniteMesure: (data: {
    symbole: string;
    libelle: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateUniteMesure: (
    id: string,
    data: Partial<Pick<UniteMesure, "symbole" | "libelle" | "actif" | "ordre">>,
  ) => { ok: true } | { ok: false; reason: string };
  deleteUniteMesure: (id: string) => { ok: true } | { ok: false; reason: string };

  addNatureDepenseMission: (data: {
    libelle: string;
    compteChargeId?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateNatureDepenseMission: (
    id: string,
    data: Partial<
      Pick<NatureDepenseMission, "libelle" | "compteChargeId" | "actif" | "ordre">
    >,
  ) => { ok: true } | { ok: false; reason: string };
  deleteNatureDepenseMission: (
    id: string,
  ) => { ok: true } | { ok: false; reason: string };
  reclasseDepenseMission: (
    missionId: string,
    depenseId: string,
    compteId: string,
  ) => { ok: true } | { ok: false; reason: string };

  addTypeClient: (data: {
    code: string;
    libelle: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateTypeClient: (
    id: string,
    data: Partial<Pick<TypeClient, "code" | "libelle" | "actif" | "ordre">>,
  ) => { ok: true } | { ok: false; reason: string };
  deleteTypeClient: (id: string) => { ok: true } | { ok: false; reason: string };

  addExerciceComptable: (data: {
    calendaire: boolean;
    annee?: number;
    dateDebut?: string;
    dateFin?: string;
    libelle?: string;
    actif?: boolean;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateExerciceComptable: (
    id: string,
    data: Partial<
      Pick<
        ExerciceComptable,
        "libelle" | "dateDebut" | "dateFin" | "calendaire" | "actif" | "cloture" | "code"
      >
    >,
  ) => { ok: true } | { ok: false; reason: string };
  cloturerExerciceComptable: (id: string) => { ok: true } | { ok: false; reason: string };
  deleteExerciceComptable: (id: string) => { ok: true } | { ok: false; reason: string };

  addProduit: (
    produit: Omit<Produit, "id">,
  ) => { ok: true; id: string } | { ok: false; reason: string };
  updateProduit: (
    id: string,
    data: Partial<Produit>,
    opts?: { motifPrix?: string },
  ) => { ok: boolean; reason?: string };
  /** Désactive le produit ; suppression physique refusée si référencé. */
  desactiverProduit: (id: string) => void;
  deleteProduit: (id: string) => { ok: boolean; reason?: string };

  addTarifClient: (tarif: Omit<TarifClient, "id">) => void;
  updateTarifClient: (id: string, data: Partial<TarifClient>) => void;
  deleteTarifClient: (id: string) => void;

  addImmobilisation: (immo: Omit<Immobilisation, "id">) => void;
  updateImmobilisation: (id: string, data: Partial<Immobilisation>) => void;
  deleteImmobilisation: (id: string) => void;

  addMouvementCompteCourant: (
    m: Omit<MouvementCompteCourant, "id" | "userId" | "userNom">,
  ) => string;
  updateMouvementCompteCourant: (
    id: string,
    data: Partial<Omit<MouvementCompteCourant, "id" | "userId" | "userNom">>,
  ) => void;
  deleteMouvementCompteCourant: (id: string) => void;

  addClient: (
    client: Omit<Client, "id">,
  ) => { ok: true; id: string } | { ok: false; reason: string };
  updateClient: (
    id: string,
    data: Partial<Client>,
  ) => { ok: boolean; reason?: string };
  deleteClient: (id: string) => { ok: boolean; reason?: string };

  addFournisseur: (
    frn: Omit<Fournisseur, "id">,
  ) => { ok: true; id: string } | { ok: false; reason: string };
  updateFournisseur: (
    id: string,
    data: Partial<Fournisseur>,
  ) => { ok: boolean; reason?: string };
  deleteFournisseur: (id: string) => { ok: boolean; reason?: string };

  addTiers: (data: Omit<Tiers, "id">) => { ok: true; id: string } | { ok: false; reason: string };
  updateTiers: (id: string, data: Partial<Tiers>) => { ok: boolean; reason?: string };
  deleteTiers: (id: string) => { ok: boolean; reason?: string };
  /** Accessible à tout utilisateur connecté (pas réservé à l'admin). */
  updatePlafondCredit: (id: string, plafondCredit: number) => { ok: boolean; reason?: string };

  controlerPlafondCreditClient: (
    clientId: string,
    opts?: { montantSupplementaire?: number; derogation?: boolean },
  ) => ReturnType<typeof controlerPlafondCredit>;

  addDevis: (devis: Omit<Devis, "id">) => string;
  updateDevis: (id: string, data: Partial<Devis>) => void;
  deleteDevis: (id: string) => void;

  addCommande: (cmd: Omit<Commande, "id">) => string;
  updateCommande: (id: string, data: Partial<Commande>) => void;
  deleteCommande: (id: string) => void;

  addBonDeLivraison: (bl: Omit<BonDeLivraison, "id">) => string;
  updateBonDeLivraison: (id: string, data: Partial<BonDeLivraison>) => void;
  deleteBonDeLivraison: (id: string) => void;

  verrouillerTransformation: (
    kind: SourceTransformation,
    id: string,
    cible: CibleTransformation,
  ) => { ok: boolean; reason?: string };
  annulerTransformation: (kind: SourceTransformation, id: string) => void;
  libererVerrousExpires: () => void;
  finaliserTransformation: (payload: {
    sourceType: SourceTransformation;
    sourceId: string;
    cibleType: CibleTransformation;
    cibleId: string;
    cibleNumero: string;
    statutSource: string;
  }) => { ok: true } | { ok: false; reason: string };

  addFacture: (
    facture: Omit<Facture, "id">,
    audit?: { action: JournalAudit["action"]; detail?: string },
  ) => { ok: true; id: string } | { ok: false; reason: string };
  updateFacture: (
    id: string,
    data: Partial<Facture>,
    audit?: { action: JournalAudit["action"]; detail?: string },
  ) => void;
  deleteFacture: (id: string) => { ok: boolean; reason?: string };
  addJournalAudit: (entry: Omit<JournalAudit, "id">) => void;
  /** Purge les entrées journal métier plus anciennes que N jours. Retourne le nombre supprimé. */
  purgeJournalAuditOlderThan: (days: number) => number;

  /** Journalise une action significative dans l'historique (traçabilité). */
  logActivite: (
    action: ActiviteAction,
    entite: ActiviteEntite,
    opts?: { entiteId?: string; libelle?: string; detail?: string },
  ) => void;
  /** Purge l'historique des actions plus ancien que N jours. Retourne le nombre supprimé. */
  purgeJournalActivitesOlderThan: (days: number) => number;

  addInventaire: (inventaire: Omit<Inventaire, "id">) => string;
  updateInventaire: (id: string, data: Partial<Inventaire>) => void;
  deleteInventaire: (id: string) => void;
  /** Clôture un inventaire (statut validé) et le trace dans l'historique. */
  validerInventaire: (id: string) => void;

  addAcompte: (acompte: Omit<Acompte, "id">) => string;
  updateAcompte: (id: string, data: Partial<Acompte>) => void;
  deleteAcompte: (id: string) => void;
  /**
   * Enregistre un acompte encaissé (devis / commande / facture) et,
   * par défaut, émet la facture d'acompte (MG).
   */
  encaisserAcompte: (data: {
    clientId: string;
    pointDeVenteId: string;
    date: string;
    montantTTC: number;
    modePaiement: ModePaiement;
    devisId?: string;
    commandeId?: string;
    factureId?: string;
    refDocument: string;
    genererFactureAcompte?: boolean;
    note?: string;
  }) => { ok: true; acompteId: string; numero: string; factureAcompteId?: string } | { ok: false; reason: string };

  /** Remplace l'état métier (hydratation API). */
  applyBusinessData: (data: AppState) => void;
  clearBusinessData: () => void;
  /** Remet l'état métier à vide via API (admin). Mot de passe du compte requis. */
  resetBusinessData: (
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function uid(prefix: string) {
  return createId(prefix);
}

function optsNum(
  state: { exercicesComptables?: ExerciceComptable[] },
  date?: string,
): OptsNumeroDocument {
  return { date, exercices: state.exercicesComptables ?? [] };
}

function seedComptesDefautState(state: {
  parametres: Parametres;
  comptesComptables: CompteComptable[];
}) {
  let longueur = longueurNumeroCompteEffective(state.parametres);
  let parametres = state.parametres;
  if (longueur == null) {
    longueur = LONGUEUR_COMPTE_MIN;
    parametres = { ...parametres, longueurNumeroCompte: longueur };
  }
  const { comptes } = appliquerSeedComptesDefaut(
    state.comptesComptables,
    longueur,
  );
  return { parametres, comptesComptables: comptes };
}

function assignerComptesProduit(
  produit: Produit,
  comptes: CompteComptable[],
): Produit {
  return migrerProduitComptes(produit, comptes);
}

function etatApresMigrationComptes(state: {
  parametres: Parametres;
  comptesComptables: CompteComptable[];
  produits: Produit[];
}) {
  const seeded = seedComptesDefautState(state);
  const comptes = dedupliquerIdsComptes(seeded.comptesComptables);
  return {
    ...seeded,
    comptesComptables: comptes,
    produits: state.produits.map((p) => migrerProduitComptes(p, comptes)),
  };
}

function importerLignesPlanAtomique(
  getState: () => {
    parametres: Parametres;
    comptesComptables: CompteComptable[];
    ecrituresComptables: EcritureComptable[];
  },
  apply: (
    updater: (state: {
      parametres: Parametres;
      comptesComptables: CompteComptable[];
      factures: Facture[];
      achats: Achat[];
      produits: Produit[];
      clients: Client[];
      fournisseurs: Fournisseur[];
      journalActivites: JournalActivite[];
    }) => Record<string, unknown>,
  ) => void,
  lignes: { numero: string; libelle: string }[],
  libelleJournal: string,
  opts?: {
    prefererNumeroSourcePlusLong?: boolean;
    absorberComptesDefaut?: boolean;
  },
): { ok: true; imported: number } | { ok: false; reason: string } {
  const auth = useAuthStore.getState();
  if (!auth.hasPermission("comptabilite.gerer")) {
    return {
      ok: false,
      reason: "L'import du plan est réservé à l'administrateur ou au comptable.",
    };
  }
  const longueur = longueurNumeroCompteEffective(getState().parametres);
  if (longueur == null) {
    return {
      ok: false,
      reason: "Fixez d'abord la longueur des numéros de compte.",
    };
  }
  const state = getState();
  const numerosAbsorbables = new Set<string>();
  if (opts?.absorberComptesDefaut) {
    for (const c of state.comptesComptables) {
      if (
        (c.roleCompte === "defaut_charge" || c.roleCompte === "defaut_vente") &&
        !compteUtiliseEnEcriture(c.id, state.ecrituresComptables)
      ) {
        numerosAbsorbables.add(c.numero);
      }
    }
  }
  const valide = validerImportPlanComptable(
    lignes,
    state.comptesComptables,
    longueur,
    {
      prefererNumeroSourcePlusLong: opts?.prefererNumeroSourcePlusLong,
      numerosAbsorbables,
    },
  );
  if (!valide.ok) return valide;
  apply((prev) => {
    const absorbIds = new Set(
      prev.comptesComptables
        .filter((c) => numerosAbsorbables.has(c.numero))
        .map((c) => c.id),
    );
    const restants = valide.comptes.filter((row) => {
      const existant = prev.comptesComptables.find(
        (c) => chiffresNumeroCompte(c.numero) === chiffresNumeroCompte(row.numero),
      );
      return !existant || !absorbIds.has(existant.id);
    });
    const comptes = dedupliquerIdsComptes([
      ...restants.map((row) => ({
        id: uid("cpt"),
        numero: row.numero,
        libelle: row.libelle,
      })),
      ...prev.comptesComptables.map((c) => {
        if (!absorbIds.has(c.id)) return c;
        const row = valide.comptes.find(
          (r) => chiffresNumeroCompte(r.numero) === chiffresNumeroCompte(c.numero),
        );
        if (!row) return c;
        return { ...c, numero: row.numero, libelle: row.libelle, roleCompte: undefined };
      }),
    ]);
    return avecJournal(prev, {
      comptesComptables: comptes,
      journalActivites: [
        entreeActivite("creation", "compte_comptable", {
          libelle: `${libelleJournal} : ${valide.comptes.length} compte(s)`,
        }),
        ...prev.journalActivites,
      ],
    });
  });
  return { ok: true, imported: valide.comptes.length };
}

function journalDepuis(state: {
  factures: Facture[];
  achats: Achat[];
  produits: Produit[];
  comptesComptables: CompteComptable[];
  parametres: Parametres;
  clients: Client[];
  fournisseurs: Fournisseur[];
  tiers?: Tiers[];
  missionsAchat?: MissionAchat[];
  naturesDepenseMission?: NatureDepenseMission[];
  ecrituresComptables?: EcritureComptable[];
}): EcritureComptable[] {
  return regenererEcrituresComptables({
    factures: state.factures,
    achats: state.achats,
    produits: state.produits,
    comptesComptables: state.comptesComptables ?? [],
    parametres: state.parametres,
    clients: state.clients,
    fournisseurs: state.fournisseurs,
    tiers: state.tiers,
    missionsAchat: state.missionsAchat,
    naturesDepenseMission: state.naturesDepenseMission,
    existantes: state.ecrituresComptables,
  });
}

function avecJournal<T extends Record<string, unknown>>(
  state: {
    factures: Facture[];
    achats: Achat[];
    produits: Produit[];
    comptesComptables: CompteComptable[];
    parametres: Parametres;
    clients: Client[];
    fournisseurs: Fournisseur[];
    tiers?: Tiers[];
    missionsAchat?: MissionAchat[];
    naturesDepenseMission?: NatureDepenseMission[];
    ecrituresComptables?: EcritureComptable[];
  },
  patch: T,
): T & {
  ecrituresComptables: EcritureComptable[];
  parametres: Parametres;
  comptesComptables: CompteComptable[];
} {
  const merged = { ...state, ...patch };
  const seeded = seedComptesDefautState(merged);
  return {
    ...patch,
    parametres: seeded.parametres,
    comptesComptables: seeded.comptesComptables,
    ecrituresComptables: journalDepuis({
      ...merged,
      ...seeded,
      ecrituresComptables:
        (patch as { ecrituresComptables?: EcritureComptable[] })
          .ecrituresComptables ?? state.ecrituresComptables,
    }),
  };
}

function ecrirePrefsTable(
  all: PreferencesAffichage,
  userId: string,
  tableId: TableAffichageId,
  prefs: PrefsTableAffichage,
): PreferencesAffichage {
  return {
    ...all,
    [userId]: {
      ...(all[userId] ?? {}),
      [tableId]: prefs,
    },
  };
}

let prefsSaveTimer: ReturnType<typeof setTimeout> | null = null;
function persisterPrefsAffichage(
  prefs: import("./affichage-tableaux").PrefsUserAffichage,
) {
  if (typeof window === "undefined") return;
  if (prefsSaveTimer) clearTimeout(prefsSaveTimer);
  prefsSaveTimer = setTimeout(() => {
    prefsSaveTimer = null;
    void putPreferencesAffichage(prefs).catch((err) => {
      console.error("[affichage] sync failed", err);
    });
  }, 300);
}

let alertesParamsTimer: ReturnType<typeof setTimeout> | null = null;
function persisterParametresAlertes(params: ParametresAlertes) {
  if (typeof window === "undefined") return;
  if (alertesParamsTimer) clearTimeout(alertesParamsTimer);
  alertesParamsTimer = setTimeout(() => {
    alertesParamsTimer = null;
    void putParametresAlertes(params).catch((err) => {
      console.error("[alertes] config sync failed", err);
    });
  }, 300);
}

let alertesSuiviTimer: ReturnType<typeof setTimeout> | null = null;
function persisterAlertesSuivi(suivi: SuiviAlertesUser) {
  if (typeof window === "undefined") return;
  if (alertesSuiviTimer) clearTimeout(alertesSuiviTimer);
  alertesSuiviTimer = setTimeout(() => {
    alertesSuiviTimer = null;
    void putAlertesSuivi(suivi).catch((err) => {
      console.error("[alertes] suivi sync failed", err);
    });
  }, 300);
}

function nomFournisseur(state: { fournisseurs: Fournisseur[] }, id: string) {
  return state.fournisseurs.find((f) => f.id === id)?.nom ?? "Fournisseur";
}

function regenererEntreesAchat(
  entrees: EntreeStock[],
  achat: Achat,
  produits: Produit[],
  fournisseurNom: string,
): EntreeStock[] {
  const hors = entrees.filter((e) => e.achatId !== achat.id);
  const gen = entreesDepuisAchat(achat, produits, fournisseurNom).map((e) => ({
    ...e,
    id: e.livraisonId
      ? `ent-liv-${e.livraisonId}-${e.produitId}-${e.pointDeVenteId}`
      : `ent-avr-${e.avoirAchatId}-${e.produitId}-${e.pointDeVenteId}`,
  }));
  return [...gen, ...hors];
}

function syncTiersState(state: {
  clients: Client[];
  fournisseurs: Fournisseur[];
  tiers?: Tiers[];
}) {
  const tiers = assurerTiers({
    clients: state.clients,
    fournisseurs: state.fournisseurs,
    tiers: state.tiers ?? [],
  });
  return { tiers, ...synchroniserApresTiers(tiers) };
}

function resoudreCompteTiersAuto(opts: {
  valeur: string | undefined;
  prefixe: PrefixeCompteTiers;
  nomTiers: string;
  comptes: CompteComptable[];
  parametres: Parametres;
  tiers: Tiers[];
  ignoreId?: string;
}):
  | { ok: true; compteId?: string; comptes: CompteComptable[] }
  | { ok: false; reason: string } {
  const { valeur, prefixe, nomTiers, parametres, tiers, ignoreId } = opts;
  let comptes = opts.comptes;
  if (!valeur) return { ok: true, compteId: undefined, comptes };
  if (valeur !== VALEUR_COMPTE_TIERS_AUTO) {
    const motif = motifCompteTiersIndisponible(
      valeur,
      prefixe,
      comptes,
      tiers,
      ignoreId,
    );
    if (motif) return { ok: false, reason: motif };
    return { ok: true, compteId: valeur, comptes };
  }
  const longueur = longueurNumeroCompteEffective(parametres);
  if (longueur == null) {
    return {
      ok: false,
      reason: "Fixez d'abord la longueur des numéros de compte (6 à 9 chiffres).",
    };
  }
  const numero = prochainNumeroSousCompteTiers(prefixe, comptes, longueur);
  if (!numero) {
    return {
      ok: false,
      reason: `Impossible de créer un sous-compte ${prefixe} : plus de numéro disponible.`,
    };
  }
  const nouveau: CompteComptable = {
    id: uid("cpt"),
    numero,
    libelle: libelleCompteTiersAuto(prefixe, nomTiers),
  };
  comptes = [nouveau, ...comptes];
  return { ok: true, compteId: nouveau.id, comptes };
}

function utilisateurCourantPeutAgirSurSite(siteId: string) {
  const auth = useAuthStore.getState();
  const user = auth.currentUser();
  return utilisateurRattacheAuSite(
    siteId,
    user?.pointDeVenteIds,
    auth.hasPermission("sites.vue_globale"),
  );
}

function stockDevientNegatif(
  entrees: EntreeStock[],
  ventes: Vente[],
  inventaires: Inventaire[],
  pointDeVenteIds: string | string[],
  produitIds: string[],
) {
  const sites = Array.isArray(pointDeVenteIds)
    ? pointDeVenteIds
    : [pointDeVenteIds];
  for (const pointDeVenteId of sites) {
    for (const produitId of produitIds) {
      const q = quantiteStockChronologique({
        produitId,
        pointDeVenteId,
        entrees,
        ventes,
        inventaires,
      });
      if (q < -1e-9) return true;
    }
  }
  return false;
}

function figerCumpSiCloture(
  facture: Facture,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires: Inventaire[];
    produits: Produit[];
  },
): Facture {
  if (!factureImpacteExploitation(facture)) return facture;
  if (facture.lignes.some((l) => l.cumpFigee != null)) return facture;
  return {
    ...facture,
    lignes: snapshotCumpLignesFacture(facture, {
      entrees: ctx.entrees,
      ventes: ctx.ventes.filter((v) => v.factureId !== facture.id),
      inventaires: ctx.inventaires,
      produits: ctx.produits,
    }),
  };
}

function modeleCourant(
  state: { modelesDocuments: ModeleDocument[]; preferencesModeles: PreferencesModeles },
  type: TypeDocumentCommercial,
) {
  return modelePourType(state.modelesDocuments, type, {
    preferences: state.preferencesModeles,
    userId: getActiviteActor().id,
  });
}

/** Construit une entrée de journal d'historique attribuée à l'utilisateur courant. */
function entreeActivite(
  action: ActiviteAction,
  entite: ActiviteEntite,
  opts?: { entiteId?: string; libelle?: string; detail?: string },
): JournalActivite {
  const actor = getActiviteActor();
  return {
    id: createId("act"),
    date: new Date().toISOString(),
    userId: actor.id,
    userNom: actor.nom,
    action,
    entite,
    entiteId: opts?.entiteId,
    libelle: opts?.libelle,
    detail: opts?.detail,
  };
}

function actorPeutGererMissions() {
  return useAuthStore.getState().hasPermission("missions.gerer");
}

function actorPeutGererBat() {
  return useAuthStore.getState().hasPermission("commercial.gerer");
}

function actorPeutSaisirMission(m: Pick<MissionAchat, "acheteurUserId" | "statut">) {
  return peutSaisirMission(m, {
    gerer: actorPeutGererMissions(),
    userId: useAuthStore.getState().currentUser()?.id,
  });
}

function etatAvecTiersDivers(state: {
  clients: Client[];
  fournisseurs: Fournisseur[];
  tiers?: Tiers[];
}) {
  return syncTiersState({
    clients: state.clients,
    fournisseurs: state.fournisseurs,
    tiers: upsertTiersDiversMarche(state.tiers ?? []),
  });
}

type DocSource = Devis | Commande | BonDeLivraison;

function trouverSource(
  state: Pick<Store, "devis" | "commandes" | "bonsDeLivraison">,
  kind: SourceTransformation,
  id: string,
): DocSource | undefined {
  if (kind === "devis") return state.devis.find((d) => d.id === id);
  if (kind === "commande") return state.commandes.find((c) => c.id === id);
  return state.bonsDeLivraison.find((b) => b.id === id);
}

function patcherSource(
  state: Pick<Store, "devis" | "commandes" | "bonsDeLivraison">,
  kind: SourceTransformation,
  id: string,
  patch: Record<string, unknown>,
): Partial<Pick<Store, "devis" | "commandes" | "bonsDeLivraison">> {
  if (kind === "devis") {
    return {
      devis: state.devis.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    };
  }
  if (kind === "commande") {
    return {
      commandes: state.commandes.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    };
  }
  return {
    bonsDeLivraison: state.bonsDeLivraison.map((b) =>
      b.id === id ? { ...b, ...patch } : b,
    ),
  };
}

function entiteSource(kind: SourceTransformation): ActiviteEntite {
  if (kind === "devis") return "devis";
  if (kind === "commande") return "commande";
  return "bon_de_livraison";
}

function libererSiExpire<T extends DocSource>(doc: T): T {
  const v = doc.verrouTransformation;
  if (!v) return doc;
  if (verrouTransformationActif(v)) return doc;
  if (doc.statut === "transforme") {
    return { ...doc, verrouTransformation: null };
  }
  return {
    ...doc,
    statut: v.statutPrecedent as T["statut"],
    verrouTransformation: null,
  };
}

export const useStore = create<Store>()((set, get) => ({
      ...emptyAppState(),
      setPointDeVenteActif: (id) => set({ pointDeVenteActifId: id }),
      updateParametres: (data) =>
        set((state) => {
          const { longueurNumeroCompte: _longueur, ...reste } = data;
          const modele = modeleCourant(state, "facture");
          // Avant d'appliquer les nouveaux params : figer les factures fiscales
          // encore sans snapshot (état précédent = non impactées par la modif).
          const factures = state.factures.map((f) =>
            avecPresentationSiBesoin(f, state.parametres, modele),
          );
          return avecJournal(state, {
            parametres: { ...state.parametres, ...reste },
            factures,
            journalActivites: [
              entreeActivite("modification", "parametres", {
                libelle: "Paramètres entreprise",
              }),
              ...state.journalActivites,
            ],
          });
        }),
      definirLongueurNumeroCompte: (longueur) => {
        const n = Math.round(longueur);
        if (n < LONGUEUR_COMPTE_MIN || n > LONGUEUR_COMPTE_MAX) {
          return {
            ok: false as const,
            reason: `La longueur doit être entre ${LONGUEUR_COMPTE_MIN} et ${LONGUEUR_COMPTE_MAX} chiffres.`,
          };
        }
        const current = longueurNumeroCompteEffective(get().parametres);
        if (current != null && n < current) {
          return {
            ok: false as const,
            reason:
              "La longueur des numéros de compte ne peut qu'augmenter, jamais diminuer.",
          };
        }
        if (current === n) return { ok: true as const };
        set((state) => {
          const comptes =
            current == null
              ? state.comptesComptables
              : state.comptesComptables.map((c) => ({
                  ...c,
                  numero: completerNumeroCompte(c.numero, n),
                }));
          return avecJournal(state, {
            parametres: { ...state.parametres, longueurNumeroCompte: n },
            comptesComptables: comptes,
            journalActivites: [
              entreeActivite("modification", "compte_comptable", {
                libelle: `Longueur des numéros : ${n} chiffres`,
              }),
              ...state.journalActivites,
            ],
          });
        });
        return { ok: true as const };
      },
      assurerComptesComptablesDefaut: () => {
        set((state) => {
          const next = etatApresMigrationComptes(state);
          const inchange =
            next.parametres === state.parametres &&
            next.comptesComptables === state.comptesComptables &&
            next.produits.every((p, i) => p === state.produits[i]);
          return inchange ? state : next;
        });
      },
      addCompteComptable: (data) => {
        const auth = useAuthStore.getState();
        if (!auth.hasPermission("comptabilite.gerer")) {
          return {
            ok: false as const,
            reason: "Seul un administrateur ou un comptable peut créer un compte.",
          };
        }
        const longueur = longueurNumeroCompteEffective(get().parametres);
        const motifSaisie = motifNumeroCompteSaisie(data.numero, longueur);
        if (motifSaisie || longueur == null) {
          return { ok: false as const, reason: motifSaisie ?? "Longueur non définie." };
        }
        const numero = completerNumeroCompte(data.numero, longueur);
        const motif = motifNumeroCompteInvalide(numero, longueur);
        if (motif) {
          return { ok: false as const, reason: motif };
        }
        const libelle = data.libelle.trim();
        if (!libelle) {
          return { ok: false as const, reason: "Le libellé est obligatoire." };
        }
        if (compteParNumero(get().comptesComptables, numero)) {
          return {
            ok: false as const,
            reason: "Un compte porte déjà ce numéro.",
          };
        }
        const id = uid("cpt");
        set((state) => {
          const nouveau: CompteComptable = {
            id,
            numero,
            libelle,
            roleCompte:
              data.roleCompte && data.roleCompte !== "general"
                ? data.roleCompte
                : undefined,
          };
          const comptes = appliquerRoleUnique(
            [nouveau, ...state.comptesComptables],
            id,
            nouveau.roleCompte,
          );
          return avecJournal(state, {
            comptesComptables: comptes,
            journalActivites: [
              entreeActivite("creation", "compte_comptable", {
                entiteId: id,
                libelle: `${numero} ${libelle}`,
              }),
              ...state.journalActivites,
            ],
          });
        });
        return { ok: true as const, id };
      },
      updateCompteComptable: (id, data) => {
        const auth = useAuthStore.getState();
        if (!auth.hasPermission("comptabilite.gerer")) {
          return {
            ok: false as const,
            reason: "Modification du plan réservée à l'administrateur ou au comptable.",
          };
        }
        const prev = get().comptesComptables.find((c) => c.id === id);
        if (!prev) return { ok: false as const, reason: "Compte introuvable." };
        if (compteUtiliseEnEcriture(id, get().ecrituresComptables)) {
          return { ok: false as const, reason: MSG_COMPTE_VERROUILLE };
        }
        const longueur = longueurNumeroCompteEffective(get().parametres);
        const numeroRaw = data.numero ?? prev.numero;
        const motifSaisie = motifNumeroCompteSaisie(numeroRaw, longueur);
        if (motifSaisie || longueur == null) {
          return { ok: false as const, reason: motifSaisie ?? "Longueur non définie." };
        }
        const numero = completerNumeroCompte(numeroRaw, longueur);
        const motif = motifNumeroCompteInvalide(numero, longueur);
        if (motif) {
          return { ok: false as const, reason: motif };
        }
        if (compteParNumero(get().comptesComptables, numero, id)) {
          return {
            ok: false as const,
            reason: "Un compte porte déjà ce numéro.",
          };
        }
        const libelle = (data.libelle ?? prev.libelle).trim();
        if (!libelle) {
          return { ok: false as const, reason: "Le libellé est obligatoire." };
        }
        set((state) => {
          const role =
            data.roleCompte !== undefined ? data.roleCompte : prev.roleCompte;
          const comptes = appliquerRoleUnique(
            state.comptesComptables.map((c) =>
              c.id === id ? { ...c, numero, libelle, roleCompte: role } : c,
            ),
            id,
            role,
          );
          return avecJournal(state, {
            comptesComptables: comptes,
            journalActivites: [
              entreeActivite("modification", "compte_comptable", {
                entiteId: id,
                libelle: `${numero} ${libelle}`,
              }),
              ...state.journalActivites,
            ],
          });
        });
        return { ok: true as const };
      },
      deleteCompteComptable: (id) => {
        const auth = useAuthStore.getState();
        if (!auth.hasPermission("comptabilite.gerer")) {
          return {
            ok: false as const,
            reason: "Suppression du plan réservée à l'administrateur ou au comptable.",
          };
        }
        const prev = get().comptesComptables.find((c) => c.id === id);
        if (!prev) return { ok: false as const, reason: "Compte introuvable." };
        if (compteUtiliseEnEcriture(id, get().ecrituresComptables)) {
          return { ok: false as const, reason: MSG_COMPTE_VERROUILLE };
        }
        set((state) => {
          const tiers = (state.tiers ?? []).map((t) => ({
            ...t,
            compteClientId:
              t.compteClientId === id ? undefined : t.compteClientId,
            compteFournisseurId:
              t.compteFournisseurId === id ? undefined : t.compteFournisseurId,
          }));
          const sync = syncTiersState({
            clients: state.clients.map((c) => ({
              ...c,
              compteClientId:
                c.compteClientId === id ? undefined : c.compteClientId,
            })),
            fournisseurs: state.fournisseurs.map((f) => ({
              ...f,
              compteFournisseurId:
                f.compteFournisseurId === id
                  ? undefined
                  : f.compteFournisseurId,
            })),
            tiers,
          });
          return avecJournal(state, {
            ...sync,
            comptesComptables: state.comptesComptables.filter((c) => c.id !== id),
            produits: state.produits.map((p) => ({
              ...p,
              compteComptableId:
                p.compteComptableId === id ? undefined : p.compteComptableId,
              compteChargeId:
                p.compteChargeId === id ? undefined : p.compteChargeId,
              compteVenteId:
                p.compteVenteId === id ? undefined : p.compteVenteId,
            })),
            achats: state.achats.map((a) => ({
              ...a,
              lignes: a.lignes.map((l) =>
                l.compteComptableId === id
                  ? { ...l, compteComptableId: undefined }
                  : l,
              ),
            })),
            journalActivites: [
              entreeActivite("suppression", "compte_comptable", {
                entiteId: id,
                libelle: `${prev.numero} ${prev.libelle}`,
              }),
              ...state.journalActivites,
            ],
          });
        });
        return { ok: true as const };
      },
      importerComptesComptablesCsv: (texte) => {
        const { lignes, erreurs } = parserCsvPlanComptable(texte);
        if (erreurs.length > 0) {
          return {
            ok: false as const,
            reason: `Import annulé : aucun compte n'a été créé. ${erreurs.slice(0, 8).join(" ")}`,
          };
        }
        return importerLignesPlanAtomique(get, set, lignes, "Import CSV");
      },
      importerPlanComptableDefaut: () =>
        importerLignesPlanAtomique(
          get,
          set,
          PLAN_PCG_2005,
          "Import PCG 2005",
          {
            prefererNumeroSourcePlusLong: true,
            absorberComptesDefaut: true,
          },
        ),
      creerTransfertComptable: (opts) => {
        const auth = useAuthStore.getState();
        if (!auth.hasPermission("comptabilite.gerer")) {
          return {
            ok: false as const,
            reason: "Le transfert est réservé à l'administrateur ou au comptable.",
          };
        }
        const state = get();
        const aExporter = filtrerEcrituresComptables(state.ecrituresComptables, {
          journal: opts.journal,
          debut: opts.debut,
          fin: opts.fin,
          statut: "en_attente",
        });
        if (aExporter.length === 0) {
          return {
            ok: false as const,
            reason: "Aucune écriture en attente ne correspond à ces filtres.",
          };
        }
        const id = uid("trc");
        const date = new Date().toISOString();
        const stamp = date.slice(0, 10);
        const transfert: TransfertComptable = {
          id,
          date,
          journal: opts.journal,
          debut: opts.debut || undefined,
          fin: opts.fin || undefined,
          ecritureIds: aExporter.map((e) => e.id),
          lignes: lignesExportEcritures(aExporter),
          nomFichier: `transfert-comptable-${stamp}`,
        };
        const ids = new Set(transfert.ecritureIds);
        set((s) => ({
          ecrituresComptables: s.ecrituresComptables.map((e) =>
            ids.has(e.id)
              ? {
                  ...e,
                  transferee: true,
                  transfertId: id,
                  transfereeAt: date,
                }
              : e,
          ),
          transfertsComptables: [transfert, ...(s.transfertsComptables ?? [])],
          journalActivites: [
            entreeActivite("creation", "compte_comptable", {
              entiteId: id,
              libelle: `Transfert comptable : ${aExporter.length} écriture(s)`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id, count: aExporter.length };
      },
      updateIdentiteNavigation: (data) => {
        const auth = useAuthStore.getState();
        if (!auth.hasPermission("navigation.identite")) {
          return {
            ok: false as const,
            reason:
              "Seul l'administrateur peut modifier le nom et le logo du menu.",
          };
        }
        set((state) => ({
          identiteNavigation: {
            nom: state.identiteNavigation?.nom ?? "",
            logoDataUrl: state.identiteNavigation?.logoDataUrl,
            ...data,
          },
          journalActivites: [
            entreeActivite("modification", "parametres", {
              libelle: "Identité du menu",
              detail: "Nom et logo de la colonne de navigation",
            }),
            ...state.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      updateBilanInitial: (data) =>
        set((state) => ({
          bilanInitial: { ...state.bilanInitial, ...data },
        })),

      addModeleDocument: (m) => {
        const id = uid("modele");
        set((state) => ({
          modelesDocuments: [...state.modelesDocuments, { ...m, id }],
        }));
        return id;
      },
      updateModeleDocument: (id, data) =>
        set((state) => {
          const modeleFacture = modeleCourant(state, "facture");
          const factures = state.factures.map((f) =>
            avecPresentationSiBesoin(f, state.parametres, modeleFacture),
          );
          return {
            factures,
            modelesDocuments: state.modelesDocuments.map((m) =>
              m.id === id ? { ...m, ...data } : m,
            ),
          };
        }),
      deleteModeleDocument: (id) =>
        set((state) => {
          // Nettoie les préférences pointant vers le modèle supprimé.
          const prefs: PreferencesModeles = {};
          for (const [uid, map] of Object.entries(state.preferencesModeles)) {
            const clean = { ...map };
            for (const t of Object.keys(clean) as TypeDocumentCommercial[]) {
              if (clean[t] === id) delete clean[t];
            }
            prefs[uid] = clean;
          }
          return {
            modelesDocuments: state.modelesDocuments.filter((m) => m.id !== id),
            preferencesModeles: prefs,
          };
        }),
      setModelePreference: (userId, type, modeleId) =>
        set((state) => {
          const current = state.preferencesModeles[userId] ?? {};
          const next = { ...current };
          if (modeleId) next[type] = modeleId;
          else delete next[type];
          return {
            preferencesModeles: {
              ...state.preferencesModeles,
              [userId]: next,
            },
          };
        }),

      enregistrerTypesAffichage: (tableId, prefs) => {
        const userId = getActiviteActor().id;
        if (!userId) return;
        const table = tableAffichage(tableId);
        const normalisees = prefsTableEffectives(table, prefs);
        set((state) => ({
          preferencesAffichage: ecrirePrefsTable(
            state.preferencesAffichage,
            userId,
            tableId,
            normalisees,
          ),
        }));
        persisterPrefsAffichage(get().preferencesAffichage[userId] ?? {});
      },
      setTypeAffichageActif: (tableId, typeId) => {
        const userId = getActiviteActor().id;
        if (!userId) return;
        const table = tableAffichage(tableId);
        set((state) => {
          const actuelles = prefsTableEffectives(
            table,
            state.preferencesAffichage[userId]?.[tableId],
          );
          const next: PrefsTableAffichage = {
            ...actuelles,
            actifId: actuelles.types.some((t) => t.id === typeId)
              ? typeId
              : actuelles.actifId,
          };
          return {
            preferencesAffichage: ecrirePrefsTable(
              state.preferencesAffichage,
              userId,
              tableId,
              next,
            ),
          };
        });
        persisterPrefsAffichage(get().preferencesAffichage[userId] ?? {});
      },

      updateParametresAlertes: (data) => {
        set((state) => ({
          parametresAlertes: normaliserParametresAlertes({
            ...state.parametresAlertes,
            ...data,
          }),
        }));
        persisterParametresAlertes(get().parametresAlertes);
      },
      marquerAlerte: (alerteId, action) => {
        const userId = getActiviteActor().id;
        if (!userId) return;
        set((state) => {
          const actuel = normaliserSuiviUser(state.alertesSuivi[userId]);
          const lues = new Set(actuel.lues);
          const traitees = new Set(actuel.traitees);
          if (action === "lue") lues.add(alerteId);
          if (action === "nonlue") lues.delete(alerteId);
          if (action === "traitee") {
            traitees.add(alerteId);
            lues.add(alerteId);
          }
          if (action === "rouvrir") {
            traitees.delete(alerteId);
            lues.delete(alerteId);
          }
          return {
            alertesSuivi: fusionnerAlertesSuivi(
              state.alertesSuivi,
              { [userId]: { lues: [...lues], traitees: [...traitees] } },
              userId,
            ),
          };
        });
        persisterAlertesSuivi(
          normaliserSuiviUser(get().alertesSuivi[userId] ?? suiviVide()),
        );
      },

      addPointDeVente: (pdv) =>
        set((state) => {
          const nouveau = { ...pdv, id: uid("pdv") };
          return {
            pointsDeVente: [...state.pointsDeVente, nouveau],
            journalActivites: [
              entreeActivite("creation", "point_de_vente", {
                entiteId: nouveau.id,
                libelle: nouveau.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updatePointDeVente: (id, data) =>
        set((state) => {
          const prev = state.pointsDeVente.find((p) => p.id === id);
          return {
            pointsDeVente: state.pointsDeVente.map((p) =>
              p.id === id ? { ...p, ...data } : p,
            ),
            journalActivites: [
              entreeActivite("modification", "point_de_vente", {
                entiteId: id,
                libelle: prev?.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deletePointDeVente: (id) => {
        const state = get();
        const pdv = state.pointsDeVente.find((p) => p.id === id);
        if (!pdv) return { ok: false, reason: "Point de vente introuvable." };
        const motif = motifLienPointDeVente(id, {
          factures: state.factures,
          devis: state.devis,
          commandes: state.commandes,
          bonsDeLivraison: state.bonsDeLivraison,
          entrees: state.entrees,
          ventes: state.ventes,
          immobilisations: state.immobilisations,
          rapportsFinJournee: state.rapportsFinJournee,
          achats: state.achats,
          transfertsStock: state.transfertsStock,
          ordresFabrication: state.ordresFabrication,
          missionsAchat: state.missionsAchat,
        });
        if (motif) return { ok: false, reason: motif };
        set((s) => ({
          pointsDeVente: s.pointsDeVente.filter((p) => p.id !== id),
          pointDeVenteActifId:
            s.pointDeVenteActifId === id ? "tous" : s.pointDeVenteActifId,
          journalActivites: [
            entreeActivite("suppression", "point_de_vente", {
              entiteId: id,
              libelle: pdv.nom,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addEntree: (entree) =>
        set((state) => ({
          entrees: [{ ...entree, id: uid("ent") }, ...state.entrees],
        })),
      updateEntree: (id, data) => {
        const state = get();
        const prev = state.entrees.find((e) => e.id === id);
        if (!prev) return { ok: false, reason: "Entrée introuvable." };
        const next = { ...prev, ...data };
        const retireQty =
          prev.produitId !== next.produitId ||
          prev.pointDeVenteId !== next.pointDeVenteId
            ? prev.quantite
            : Math.max(0, prev.quantite - next.quantite);
        const dispo = stockDisponible(
          prev.produitId,
          prev.pointDeVenteId,
          state.entrees,
          state.ventes,
          state.inventaires,
        );
        if (retireQty > 0 && dispo + 1e-9 < retireQty) {
          return {
            ok: false,
            reason:
              "Stock insuffisant : cette entrée a déjà été consommée par des ventes.",
          };
        }
        set((s) => ({
          entrees: s.entrees.map((e) => (e.id === id ? next : e)),
        }));
        return { ok: true };
      },
      deleteEntree: (id) => {
        const state = get();
        const prev = state.entrees.find((e) => e.id === id);
        if (!prev) return { ok: false, reason: "Entrée introuvable." };
        const dispo = stockDisponible(
          prev.produitId,
          prev.pointDeVenteId,
          state.entrees,
          state.ventes,
          state.inventaires,
        );
        if (dispo + 1e-9 < prev.quantite) {
          return {
            ok: false,
            reason:
              "Stock insuffisant : cette entrée a déjà été consommée par des ventes.",
          };
        }
        set((s) => ({
          entrees: s.entrees.filter((e) => e.id !== id),
        }));
        return { ok: true };
      },

      addAchat: (achat) => {
        const id = uid("ach");
        const numero = achat.numero || nextNumeroAchat(get().achats, optsNum(get(), achat.date));
        const actor = getActiviteActor();
        set((state) => ({
          achats: [
            {
              ...achat,
              id,
              numero,
              livraisons: achat.livraisons ?? [],
              paiements: achat.paiements ?? [],
              avoirs: achat.avoirs ?? [],
              vendeurId: achat.vendeurId ?? actor.id,
              vendeurNom: achat.vendeurNom ?? actor.nom,
            },
            ...state.achats,
          ],
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: id,
              libelle: numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateAchat: (id, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "brouillon") {
          if (data.lignes || data.fournisseurId || data.pointDeVenteId) {
            return {
              ok: false,
              reason: "La commande validée ne peut plus être modifiée. Seuls l'échéance et la note restent éditables.",
            };
          }
        }
        if (data.lignes && prev.livraisons.some((l) => l.statut !== "annulee")) {
          return {
            ok: false,
            reason: "Des livraisons existent déjà : les lignes de commande ne peuvent plus être modifiées.",
          };
        }
        if (data.lignes) {
          const motifRep = motifRepartitionInvalide(data.lignes);
          if (motifRep) return { ok: false, reason: motifRep };
        }
        set((s) => ({
          achats: s.achats.map((a) => (a.id === id ? { ...a, ...data } : a)),
          journalActivites: [
            entreeActivite("modification", "achat", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      validerAchat: (id) => {
        const prev = get().achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut === "annule") {
          return { ok: false, reason: "Cet achat est annulé." };
        }
        if (prev.lignes.length === 0) {
          return { ok: false, reason: "Ajoutez au moins un article." };
        }
        const motifRep = motifRepartitionInvalide(prev.lignes);
        if (motifRep) return { ok: false, reason: motifRep };
        const motifNat = motifAchatNatureInterdite(
          get().produits,
          prev.lignes,
          get().categoriesProduits,
        );
        if (motifNat) return { ok: false, reason: motifNat };
        if (moduleComptabiliteActif(get().parametres)) {
          const motifCompta = motifLignesAchatInvalides(
            prev.lignes,
            get().comptesComptables,
          );
          if (motifCompta) return { ok: false, reason: motifCompta };
        }
        set((s) =>
          avecJournal(s, {
            achats: s.achats.map((a) =>
              a.id === id
                ? {
                    ...a,
                    statut: "valide" as const,
                    dateValidation: new Date().toISOString(),
                  }
                : a,
            ),
            journalActivites: [
              entreeActivite("validation", "achat", {
                entiteId: id,
                libelle: prev.numero,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },
      annulerAchat: (id) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (quantiteLivreeProduit(prev, prev.lignes[0]?.produitId ?? "") > 0 ||
            prev.livraisons.some((l) => l.statut !== "annulee" && l.lignes.some((x) => x.quantiteLivree > 0))) {
          return {
            ok: false,
            reason: "Annulez d'abord les livraisons déjà réceptionnées.",
          };
        }
        if (prev.paiements.length > 0) {
          return {
            ok: false,
            reason: "Des paiements sont enregistrés. Supprimez-les avant d'annuler.",
          };
        }
        const next: Achat = {
          ...prev,
          statut: "annule",
          livraisons: prev.livraisons.map((l) => ({ ...l, statut: "annulee" as const })),
        };
        set((s) =>
          avecJournal(s, {
          achats: s.achats.map((a) => (a.id === id ? next : a)),
          entrees: regenererEntreesAchat(
            s.entrees,
            next,
            s.produits,
            nomFournisseur(s, next.fournisseurId),
          ),
          journalActivites: [
            entreeActivite("annulation", "achat", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      deleteAchat: (id) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut === "valide") {
          return {
            ok: false,
            reason: "Un achat validé ne peut pas être supprimé. Annulez-le.",
          };
        }
        if (prev.livraisons.some((l) => l.statut !== "annulee" && l.lignes.some((x) => x.quantiteLivree > 0))) {
          return { ok: false, reason: "Des réceptions existent encore." };
        }
        set((s) =>
          avecJournal(s, {
            achats: s.achats.filter((a) => a.id !== id),
            entrees: s.entrees.filter((e) => e.achatId !== id),
            journalActivites: [
              entreeActivite("suppression", "achat", {
                entiteId: id,
                libelle: prev.numero,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },
      ajouterLivraisonAchat: (achatId, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "valide") {
          return { ok: false, reason: "Validez la commande avant d'enregistrer une livraison." };
        }
        for (const l of data.lignes) {
          const reliquat = reliquatProduit(prev, l.produitId);
          const q = data.confirmer === false ? 0 : l.quantiteLivree;
          if (q - reliquat > 1e-9) {
            return {
              ok: false,
              reason: "Quantité livrée supérieure au reliquat commandé.",
            };
          }
        }
        const id = uid("liv");
        const draft = {
          id,
          numero: nextNumeroLivraison(state.achats),
          date: data.date,
          statut: "en_attente" as const,
          lignes: data.lignes,
          note: data.note,
          datePeremption: data.datePeremption,
        };
        const confirmer = data.confirmer !== false;
        const liv = {
          ...draft,
          statut: confirmer
            ? statutLivraisonRecord({ ...draft, statut: "livree" })
            : ("en_attente" as const),
        };
        const next: Achat = { ...prev, livraisons: [liv, ...prev.livraisons] };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        set((s) => ({
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${liv.numero}`,
              detail: "Livraison",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id };
      },
      confirmerLivraisonAchat: (achatId, livraisonId, lignes) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const livPrev = prev.livraisons.find((l) => l.id === livraisonId);
        if (!livPrev) return { ok: false, reason: "Livraison introuvable." };
        if (livPrev.statut === "annulee") {
          return { ok: false, reason: "Cette livraison est annulée." };
        }
        const livLignes = lignes ?? livPrev.lignes;
        const horsCette = {
          ...prev,
          livraisons: prev.livraisons.filter((l) => l.id !== livraisonId),
        };
        for (const l of livLignes) {
          if (l.quantiteLivree - reliquatProduit(horsCette, l.produitId) > 1e-9) {
            return {
              ok: false,
              reason: "Quantité livrée supérieure au reliquat commandé.",
            };
          }
        }
        const liv = {
          ...livPrev,
          lignes: livLignes,
          statut: statutLivraisonRecord({ ...livPrev, lignes: livLignes, statut: "livree" }),
        };
        const next: Achat = {
          ...prev,
          livraisons: prev.livraisons.map((l) => (l.id === livraisonId ? liv : l)),
        };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        set((s) => ({
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("validation", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${liv.numero}`,
              detail: "Confirmation de livraison",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      annulerLivraisonAchat: (achatId, livraisonId) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const next: Achat = {
          ...prev,
          livraisons: prev.livraisons.map((l) =>
            l.id === livraisonId ? { ...l, statut: "annulee" as const } : l,
          ),
        };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        const produitIds = [
          ...new Set(
            prev.lignes
              .map((l) => l.produitId)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        if (
          stockDevientNegatif(
            entrees,
            state.ventes,
            state.inventaires,
            sitesAchat(prev),
            produitIds,
          )
        ) {
          return {
            ok: false,
            reason:
              "Stock insuffisant : cette réception a déjà été consommée par des ventes.",
          };
        }
        set((s) => ({
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("annulation", "achat", {
              entiteId: achatId,
              libelle: prev.numero,
              detail: "Livraison annulée",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      ajouterPaiementAchat: (achatId, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "valide") {
          return { ok: false, reason: "Validez la commande avant d'enregistrer un paiement." };
        }
        if (data.montant <= 0) {
          return { ok: false, reason: "Montant de paiement invalide." };
        }
        const solde = soldeAchat(prev);
        if (data.montant - solde > 0.5) {
          return {
            ok: false,
            reason: `Le paiement dépasse le solde restant (${Math.round(solde)} Ar).`,
          };
        }
        const paiement = { ...data, id: uid("pay") };
        set((s) => ({
          achats: s.achats.map((a) =>
            a.id === achatId
              ? { ...a, paiements: [paiement, ...a.paiements] }
              : a,
          ),
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: achatId,
              libelle: prev.numero,
              detail: "Paiement fournisseur",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      supprimerPaiementAchat: (achatId, paiementId) => {
        const prev = get().achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        set((s) => ({
          achats: s.achats.map((a) =>
            a.id === achatId
              ? { ...a, paiements: a.paiements.filter((p) => p.id !== paiementId) }
              : a,
          ),
          journalActivites: [
            entreeActivite("suppression", "achat", {
              entiteId: achatId,
              libelle: prev.numero,
              detail: "Paiement fournisseur",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      ajouterAvoirAchat: (achatId, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "valide") {
          return { ok: false, reason: "Validez la commande avant un retour." };
        }
        for (const l of data.lignes) {
          const dispo =
            quantiteLivreeProduit(prev, l.produitId) -
            quantiteRetourneeProduit(prev, l.produitId);
          if (l.quantite - dispo > 1e-9) {
            return {
              ok: false,
              reason: "Quantité retournée supérieure à la quantité encore en stock sur cet achat.",
            };
          }
        }
        const id = uid("avr");
        const avoir = {
          id,
          numero: nextNumeroAvoirAchat(state.achats),
          date: data.date,
          statut: "brouillon" as const,
          lignes: data.lignes,
          note: data.note,
        };
        set((s) => ({
          achats: s.achats.map((a) =>
            a.id === achatId ? { ...a, avoirs: [avoir, ...a.avoirs] } : a,
          ),
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${avoir.numero}`,
              detail: "Avoir fournisseur",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id };
      },
      validerAvoirAchat: (achatId, avoirId) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const avPrev = prev.avoirs.find((a) => a.id === avoirId);
        if (!avPrev) return { ok: false, reason: "Avoir introuvable." };
        const next: Achat = {
          ...prev,
          avoirs: prev.avoirs.map((a) =>
            a.id === avoirId ? { ...a, statut: "valide" as const } : a,
          ),
        };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        const produitIds = avPrev.lignes.map((l) => l.produitId);
        if (
          stockDevientNegatif(
            entrees,
            state.ventes,
            state.inventaires,
            sitesAchat(prev),
            produitIds,
          )
        ) {
          return {
            ok: false,
            reason: "Stock insuffisant pour ce retour fournisseur.",
          };
        }
        set((s) =>
          avecJournal(s, {
            achats: s.achats.map((a) => (a.id === achatId ? next : a)),
            entrees,
            journalActivites: [
              entreeActivite("validation", "achat", {
                entiteId: achatId,
                libelle: `${prev.numero} · ${avPrev.numero}`,
                detail: "Avoir fournisseur validé",
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },
      supprimerAvoirAchat: (achatId, avoirId) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const avPrev = prev.avoirs.find((a) => a.id === avoirId);
        if (!avPrev) return { ok: false, reason: "Avoir introuvable." };
        const next: Achat = {
          ...prev,
          avoirs: prev.avoirs.filter((a) => a.id !== avoirId),
        };
        const entrees = regenererEntreesAchat(
          state.entrees,
          next,
          state.produits,
          nomFournisseur(state, next.fournisseurId),
        );
        if (avPrev.statut === "valide") {
          const produitIds = avPrev.lignes.map((l) => l.produitId);
          // Removing a return adds stock back — should not go negative.
          if (
            stockDevientNegatif(
              entrees,
              state.ventes,
              state.inventaires,
              sitesAchat(prev),
              produitIds,
            )
          ) {
            return { ok: false, reason: "Impossible de supprimer cet avoir." };
          }
        }
        set((s) =>
          avecJournal(s, {
          achats: s.achats.map((a) => (a.id === achatId ? next : a)),
          entrees,
          journalActivites: [
            entreeActivite("suppression", "achat", {
              entiteId: achatId,
              libelle: `${prev.numero} · ${avPrev.numero}`,
              detail: "Avoir fournisseur",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      demanderTransfert: (data) => {
        if (data.siteSourceId === data.siteDestinataireId) {
          return {
            ok: false,
            reason: "Le site source et le site destinataire doivent être distincts.",
          };
        }
        if (!utilisateurCourantPeutAgirSurSite(data.siteSourceId)) {
          return {
            ok: false,
            reason: "Vous devez être rattaché au site source pour initier un transfert.",
          };
        }
        const lignes = data.lignes.filter((l) => l.quantite > 0 && l.produitId);
        if (lignes.length === 0) {
          return { ok: false, reason: "Ajoutez au moins un article." };
        }
        const state = get();
        const motifStock = stockSuffisantPourTransfert(
          { siteSourceId: data.siteSourceId, lignes },
          {
            entrees: state.entrees,
            ventes: state.ventes,
            inventaires: state.inventaires,
          },
        );
        if (motifStock) return { ok: false, reason: motifStock };
        const actor = getActiviteActor();
        const nouveau: TransfertStock = {
          id: uid("trf"),
          numero: nextNumeroTransfert(state.transfertsStock),
          siteSourceId: data.siteSourceId,
          siteDestinataireId: data.siteDestinataireId,
          dateDemande: data.dateDemande,
          statut: "demande",
          lignes,
          note: data.note,
          demandeParUserId: actor.id,
          demandeParNom: actor.nom,
        };
        set((s) => ({
          transfertsStock: [nouveau, ...s.transfertsStock],
          journalActivites: [
            entreeActivite("creation", "transfert", {
              entiteId: nouveau.id,
              libelle: nouveau.numero,
              detail: "Demande de transfert",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id: nouveau.id };
      },

      expedierTransfert: (id, dateExpedition) => {
        const state = get();
        const prev = state.transfertsStock.find((t) => t.id === id);
        if (!prev) return { ok: false, reason: "Transfert introuvable." };
        if (prev.statut !== "demande") {
          return { ok: false, reason: "Seule une demande peut être expédiée." };
        }
        if (!utilisateurCourantPeutAgirSurSite(prev.siteSourceId)) {
          return {
            ok: false,
            reason: "Vous devez être rattaché au site source pour expédier.",
          };
        }
        const motifStock = stockSuffisantPourTransfert(prev, {
          entrees: state.entrees,
          ventes: state.ventes,
          inventaires: state.inventaires,
        });
        if (motifStock) return { ok: false, reason: motifStock };
        const lignes = figerCumpLignesTransfert(prev.lignes, prev.siteSourceId, {
          entrees: state.entrees,
          ventes: state.ventes,
          inventaires: state.inventaires,
          produits: state.produits,
          exclureTransfertId: prev.id,
        });
        const next: TransfertStock = {
          ...prev,
          statut: "expedie",
          dateExpedition: dateExpedition ?? new Date().toISOString(),
          lignes,
        };
        const entrees = regenererEntreesTransfert(
          state.entrees,
          next,
          state.produits,
        );
        if (
          stockDevientNegatif(
            entrees,
            state.ventes,
            state.inventaires,
            prev.siteSourceId,
            lignes.map((l) => l.produitId),
          )
        ) {
          return { ok: false, reason: "Stock insuffisant sur le site source." };
        }
        set((s) => ({
          transfertsStock: s.transfertsStock.map((t) => (t.id === id ? next : t)),
          entrees,
          journalActivites: [
            entreeActivite("expedition", "transfert", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      receptionnerTransfert: (id, dateReception) => {
        const state = get();
        const prev = state.transfertsStock.find((t) => t.id === id);
        if (!prev) return { ok: false, reason: "Transfert introuvable." };
        if (prev.statut !== "expedie") {
          return { ok: false, reason: "Réception possible seulement après expédition." };
        }
        if (!utilisateurCourantPeutAgirSurSite(prev.siteDestinataireId)) {
          return {
            ok: false,
            reason: "Vous devez être rattaché au site destinataire pour réceptionner.",
          };
        }
        const next: TransfertStock = {
          ...prev,
          statut: "recu",
          dateReception: dateReception ?? new Date().toISOString(),
        };
        const entrees = regenererEntreesTransfert(
          state.entrees,
          next,
          state.produits,
        );
        set((s) => ({
          transfertsStock: s.transfertsStock.map((t) => (t.id === id ? next : t)),
          entrees,
          journalActivites: [
            entreeActivite("reception", "transfert", {
              entiteId: id,
              libelle: prev.numero,
              detail: "Entrée au CUMP du site source",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      annulerTransfert: (id) => {
        const state = get();
        const prev = state.transfertsStock.find((t) => t.id === id);
        if (!prev) return { ok: false, reason: "Transfert introuvable." };
        if (prev.statut === "annule") {
          return { ok: false, reason: "Ce transfert est déjà annulé." };
        }
        const next: TransfertStock = { ...prev, statut: "annule" };
        const entrees = regenererEntreesTransfert(
          state.entrees,
          next,
          state.produits,
        );
        if (prev.statut === "recu") {
          if (
            stockDevientNegatif(
              entrees,
              state.ventes,
              state.inventaires,
              prev.siteDestinataireId,
              prev.lignes.map((l) => l.produitId),
            )
          ) {
            return {
              ok: false,
              reason:
                "Impossible d'annuler : le stock du site destinataire serait négatif.",
            };
          }
        }
        set((s) => ({
          transfertsStock: s.transfertsStock.map((t) => (t.id === id ? next : t)),
          entrees,
          journalActivites: [
            entreeActivite("annulation", "transfert", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      creerOrdreFabrication: (data) => {
        const state = get();
        if (!utilisateurCourantPeutAgirSurSite(data.atelierId)) {
          return { ok: false, reason: "Vous devez être rattaché à cet atelier." };
        }
        const atelier = state.pointsDeVente.find((s) => s.id === data.atelierId);
        if (!atelier || !siteEstAtelier(atelier)) {
          return { ok: false, reason: "Choisissez un site de type atelier." };
        }
        const produit = state.produits.find((p) => p.id === data.produitId);
        const motifProd = motifProduitOfInvalide(produit);
        if (motifProd) return { ok: false, reason: motifProd };
        if (data.quantitePrevue <= 0) {
          return { ok: false, reason: "La quantité prévue doit être positive." };
        }
        if (data.commandeId) {
          const cmd = state.commandes.find((c) => c.id === data.commandeId);
          if (!cmd) return { ok: false, reason: "Commande client introuvable." };
        }
        const source = data.nomenclatureSource ?? "automatique";
        const copie = copierNomenclatureVersOf(produit!, source);
        const nouveau: OrdreFabrication = {
          id: uid("of"),
          numero: nextNumeroOf(state.ordresFabrication),
          atelierId: data.atelierId,
          produitId: data.produitId,
          quantitePrevue: data.quantitePrevue,
          nomenclatureSource: source,
          nomenclatureNom: copie.nom,
          nomenclatureLignes: copie.lignes,
          commandeId: data.commandeId,
          statut: "brouillon",
          dateCreation: new Date().toISOString(),
          dateCloturePrevue: data.dateCloturePrevue,
          sorties: [],
          frais: [],
          mainOeuvre: [],
          entreesProduction: [],
          retoursMatieres: [],
          validations: [],
          note: data.note,
        };
        set((s) => ({
          ordresFabrication: [nouveau, ...s.ordresFabrication],
          journalActivites: [
            entreeActivite("creation", "ordre_fabrication", {
              entiteId: nouveau.id,
              libelle: nouveau.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id: nouveau.id };
      },

      modifierOrdreFabrication: (id, data) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === id);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (ofEstVerrouille(prev)) {
          return { ok: false, reason: "Cet OF est clôturé ou annulé : aucune modification possible." };
        }
        if (prev.statut === "en_cours") {
          const interdit = ["atelierId", "produitId", "nomenclatureSource"] as const;
          for (const k of interdit) {
            if (data[k] != null && data[k] !== prev[k]) {
              return {
                ok: false,
                reason: "Atelier, produit et nomenclature de référence sont figés une fois l'OF démarré. Les lignes restent éditables pour cet OF uniquement.",
              };
            }
          }
        }
        if (data.atelierId && !utilisateurCourantPeutAgirSurSite(data.atelierId)) {
          return { ok: false, reason: "Vous n'êtes pas rattaché à cet atelier." };
        }
        if (data.atelierId) {
          const atelier = state.pointsDeVente.find((s) => s.id === data.atelierId);
          if (!atelier || !siteEstAtelier(atelier)) {
            return { ok: false, reason: "Choisissez un site de type atelier." };
          }
        }
        let nomenclatureLignes = data.nomenclatureLignes ?? prev.nomenclatureLignes;
        let nomenclatureNom = data.nomenclatureNom ?? prev.nomenclatureNom;
        let nomenclatureSource = data.nomenclatureSource ?? prev.nomenclatureSource;
        const produitId = data.produitId ?? prev.produitId;
        if (data.produitId || data.nomenclatureSource) {
          const produit = state.produits.find((p) => p.id === produitId);
          const motifProd = motifProduitOfInvalide(produit);
          if (motifProd) return { ok: false, reason: motifProd };
          if (!data.nomenclatureLignes) {
            const copie = copierNomenclatureVersOf(produit!, nomenclatureSource);
            nomenclatureLignes = copie.lignes;
            nomenclatureNom = copie.nom;
          }
        }
        const next: OrdreFabrication = {
          ...prev,
          ...data,
          nomenclatureLignes,
          nomenclatureNom,
          nomenclatureSource,
        };
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) => (o.id === id ? next : o)),
        }));
        return { ok: true };
      },

      demarrerOrdreFabrication: (id, opts) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === id);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (prev.statut !== "brouillon") {
          return { ok: false, reason: "Seul un brouillon peut être démarré." };
        }
        if (!utilisateurCourantPeutAgirSurSite(prev.atelierId)) {
          return { ok: false, reason: "Vous devez être rattaché à l'atelier." };
        }
        const bats = state.bonsATirer ?? [];
        const motifBat = motifBatOfManquant(prev, bats);
        if (motifBat && !opts?.derogationBat) {
          return { ok: false, reason: motifBat };
        }
        if (opts?.derogationBat && !useAuthStore.getState().hasPermission("fabrication.deroger_bat")) {
          return {
            ok: false,
            reason: "Vous n'êtes pas habilité à déroger à l'obligation de BAT validé.",
          };
        }
        const actor = getActiviteActor();
        const derogation = Boolean(opts?.derogationBat && motifBat);
        const next: OrdreFabrication = {
          ...prev,
          statut: "en_cours",
          derogationBat: derogation || prev.derogationBat,
          derogationBatDate: derogation ? new Date().toISOString() : prev.derogationBatDate,
          derogationBatUserId: derogation ? actor.id : prev.derogationBatUserId,
          derogationBatUserNom: derogation ? actor.nom : prev.derogationBatUserNom,
          validations: [
            ...prev.validations,
            etapeValidation(
              "demarrer",
              actor,
              derogation
                ? "Dérogation BAT : démarrage sans BAT validé"
                : undefined,
            ),
          ],
        };
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) => (o.id === id ? next : o)),
          journalActivites: [
            entreeActivite("validation", "ordre_fabrication", {
              entiteId: id,
              libelle: prev.numero,
              detail: derogation
                ? "Démarrage — dérogation BAT"
                : "Démarrage",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      ajouterSortieOf: (ofId, data) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === ofId);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (!ofPeutMouvementer(prev)) {
          return { ok: false, reason: "Les sorties ne sont possibles que sur un OF en cours." };
        }
        if (!utilisateurCourantPeutAgirSurSite(prev.atelierId)) {
          return { ok: false, reason: "Vous devez être rattaché à l'atelier." };
        }
        if (data.quantite <= 0) return { ok: false, reason: "Quantité invalide." };
        const composant = state.produits.find((p) => p.id === data.composantId);
        if (!composant) return { ok: false, reason: "Composant introuvable." };
        const dispo = stockDisponibleComposant({
          produitId: data.composantId,
          siteId: data.siteSourceId,
          entrees: state.entrees,
          ventes: state.ventes,
          inventaires: state.inventaires,
        });
        if (dispo + 1e-9 < data.quantite) {
          return {
            ok: false,
            reason: `Stock insuffisant sur le site source (disponible : ${dispo}). Créez une demande d'achat pour la quantité manquante.`,
          };
        }
        const etat = cumpCourantSite({
          produitId: data.composantId,
          siteId: data.siteSourceId,
          entrees: state.entrees,
          ventes: state.ventes,
          inventaires: state.inventaires,
          produit: composant,
        });
        const sortie = {
          id: uid("ofs"),
          date: data.date,
          composantId: data.composantId,
          siteSourceId: data.siteSourceId,
          quantite: data.quantite,
          cumpSortie: etat.cump,
          valeur: data.quantite * etat.cump,
        };
        const heures = Number(data.heures) || 0;
        const mainOeuvre = [...lignesMainOeuvre(prev)];
        if (heures > 0) {
          const siteSource = state.pointsDeVente.find(
            (s) => s.id === data.siteSourceId,
          );
          const atelierId =
            data.atelierIdMod ||
            (siteSource && siteEstAtelier(siteSource)
              ? data.siteSourceId
              : prev.atelierId);
          const atelier = state.pointsDeVente.find((s) => s.id === atelierId);
          const taux = tauxHoraireModAtelier(atelier);
          mainOeuvre.push({
            id: uid("ofmo"),
            date: data.date,
            atelierId,
            heures,
            tauxHoraire: taux,
            montant: coutMod(heures, taux),
          });
        }
        const next: OrdreFabrication = {
          ...prev,
          sorties: [...prev.sorties, sortie],
          mainOeuvre,
        };
        const entrees = regenererEntreesOf(state.entrees, next, state.produits);
        if (
          stockDevientNegatif(
            entrees,
            state.ventes,
            state.inventaires,
            data.siteSourceId,
            [data.composantId],
          )
        ) {
          return { ok: false, reason: "Stock insuffisant sur le site source." };
        }
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) => (o.id === ofId ? next : o)),
          entrees,
        }));
        return { ok: true, id: sortie.id };
      },

      supprimerSortieOf: (ofId, sortieId) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === ofId);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (!ofPeutMouvementer(prev)) {
          return { ok: false, reason: "OF non modifiable." };
        }
        const sortie = prev.sorties.find((s) => s.id === sortieId);
        if (!sortie) return { ok: false, reason: "Sortie introuvable." };
        if (sortie.affecteEntreeId) {
          return {
            ok: false,
            reason: "Cette sortie a déjà alimenté une entrée de production : elle est figée.",
          };
        }
        const next: OrdreFabrication = {
          ...prev,
          sorties: prev.sorties.filter((s) => s.id !== sortieId),
        };
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) => (o.id === ofId ? next : o)),
          entrees: regenererEntreesOf(s.entrees, next, s.produits),
        }));
        return { ok: true };
      },

      ajouterFraisOf: (ofId, data) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === ofId);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (!ofPeutMouvementer(prev)) {
          return { ok: false, reason: "Les frais ne sont possibles que sur un OF en cours." };
        }
        if (!data.libelle.trim() || !(data.montant > 0)) {
          return { ok: false, reason: "Libellé et montant positif requis." };
        }
        const next: OrdreFabrication = {
          ...prev,
          frais: [
            ...prev.frais,
            {
              id: uid("off"),
              date: data.date,
              libelle: data.libelle.trim(),
              montant: data.montant,
            },
          ],
        };
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) => (o.id === ofId ? next : o)),
        }));
        return { ok: true };
      },

      supprimerFraisOf: (ofId, fraisId) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === ofId);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (!ofPeutMouvementer(prev)) return { ok: false, reason: "OF non modifiable." };
        const ligne = prev.frais.find((f) => f.id === fraisId);
        if (!ligne) return { ok: false, reason: "Frais introuvable." };
        if (ligne.affecteEntreeId) {
          return { ok: false, reason: "Ce frais a déjà alimenté une entrée de production." };
        }
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) =>
            o.id === ofId
              ? { ...o, frais: o.frais.filter((f) => f.id !== fraisId) }
              : o,
          ),
        }));
        return { ok: true };
      },

      ajouterMainOeuvreOf: (ofId, data) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === ofId);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (!ofPeutMouvementer(prev)) {
          return { ok: false, reason: "La MOD n'est possible que sur un OF en cours." };
        }
        if (!utilisateurCourantPeutAgirSurSite(prev.atelierId)) {
          return { ok: false, reason: "Vous devez être rattaché à l'atelier." };
        }
        const heures = Number(data.heures) || 0;
        if (heures <= 0) return { ok: false, reason: "Indiquez un temps passé (heures)." };
        const atelier = state.pointsDeVente.find((s) => s.id === data.atelierId);
        if (!atelier || !siteEstAtelier(atelier)) {
          return { ok: false, reason: "Choisissez un atelier." };
        }
        const taux = tauxHoraireModAtelier(atelier);
        const ligne = {
          id: uid("ofmo"),
          date: data.date,
          atelierId: data.atelierId,
          heures,
          tauxHoraire: taux,
          montant: coutMod(heures, taux),
        };
        const next: OrdreFabrication = {
          ...prev,
          mainOeuvre: [...lignesMainOeuvre(prev), ligne],
        };
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) =>
            o.id === ofId ? next : o,
          ),
        }));
        return { ok: true };
      },

      supprimerMainOeuvreOf: (ofId, ligneId) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === ofId);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (!ofPeutMouvementer(prev)) return { ok: false, reason: "OF non modifiable." };
        const ligne = lignesMainOeuvre(prev).find((m) => m.id === ligneId);
        if (!ligne) return { ok: false, reason: "Ligne MOD introuvable." };
        if (ligne.affecteEntreeId) {
          return {
            ok: false,
            reason: "Cette MOD a déjà alimenté une entrée de production.",
          };
        }
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) =>
            o.id === ofId
              ? {
                  ...o,
                  mainOeuvre: lignesMainOeuvre(o).filter((m) => m.id !== ligneId),
                }
              : o,
          ),
        }));
        return { ok: true };
      },

      enregistrerEntreeProductionOf: (ofId, data) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === ofId);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (!ofPeutMouvementer(prev)) {
          return { ok: false, reason: "Les entrées de production sont possibles tant que l'OF est en cours." };
        }
        if (!utilisateurCourantPeutAgirSurSite(prev.atelierId)) {
          return { ok: false, reason: "Vous devez être rattaché à l'atelier." };
        }
        if (data.quantite <= 0) return { ok: false, reason: "Quantité produite invalide." };
        const pot = coutsNonAffectes(prev);
        const coutTotal = pot.total;
        const coutUnitaire = coutTotal / data.quantite;
        const entree = {
          id: uid("ofe"),
          date: data.date,
          quantite: data.quantite,
          coutUnitaire,
          coutTotal,
        };
        const affectes = affecterPotAEntree(prev, entree);
        const next: OrdreFabrication = {
          ...prev,
          sorties: affectes.sorties,
          frais: affectes.frais,
          mainOeuvre: affectes.mainOeuvre,
          entreesProduction: [...prev.entreesProduction, entree],
        };
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) => (o.id === ofId ? next : o)),
          entrees: regenererEntreesOf(s.entrees, next, s.produits),
        }));
        return { ok: true };
      },

      cloturerOrdreFabrication: (id, data) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === id);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (prev.statut !== "en_cours") {
          return { ok: false, reason: "Seuls les OF en cours peuvent être clôturés." };
        }
        if (!utilisateurCourantPeutAgirSurSite(prev.atelierId)) {
          return { ok: false, reason: "Vous devez être rattaché à l'atelier." };
        }
        const reliquats = reliquatsMatieres(prev);
        const retours: OrdreFabrication["retoursMatieres"] = [];
        for (const rel of reliquats) {
          const choix = data.retours.find((r) => r.composantId === rel.composantId);
          const destination = choix?.destination ?? "atelier";
          const siteDestinataireId =
            destination === "atelier"
              ? prev.atelierId
              : (choix?.siteDestinataireId ?? prev.atelierId);
          const parts = allouerReliquatSurSorties(
            prev.sorties,
            rel.composantId,
            rel.reliquat,
          );
          for (const p of parts) {
            retours.push({
              id: uid("ofr"),
              sortieId: p.sortieId,
              composantId: rel.composantId,
              quantite: p.quantite,
              destination,
              siteDestinataireId,
              cumpOrigine: p.cumpOrigine,
            });
          }
        }
        const montantEcart = montantEcartCloture(prev, retours);
        const actor = getActiviteActor();
        const next: OrdreFabrication = {
          ...prev,
          statut: "cloture",
          dateClotureReelle: new Date().toISOString(),
          retoursMatieres: retours,
          ecart:
            montantEcart > 1e-6
              ? { montant: montantEcart, raison: data.raisonEcart?.trim() || undefined }
              : undefined,
          validations: [
            ...prev.validations,
            etapeValidation(
              "confirmer_cloture",
              actor,
              montantEcart > 1e-6
                ? `Écart de fabrication ${Math.round(montantEcart)} Ar`
                : undefined,
            ),
          ],
        };
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) => (o.id === id ? next : o)),
          entrees: regenererEntreesOf(s.entrees, next, s.produits),
          journalActivites: [
            entreeActivite("validation", "ordre_fabrication", {
              entiteId: id,
              libelle: prev.numero,
              detail: "Clôture",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      annulerOrdreFabrication: (id) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === id);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        if (prev.statut === "annule" || prev.statut === "cloture_annule") {
          return { ok: false, reason: "Cet OF est déjà annulé." };
        }
        if (!utilisateurCourantPeutAgirSurSite(prev.atelierId)) {
          return { ok: false, reason: "Vous devez être rattaché à l'atelier." };
        }
        const actor = getActiviteActor();
        if (prev.statut === "brouillon") {
          const next: OrdreFabrication = {
            ...prev,
            statut: "annule",
            dateAnnulation: new Date().toISOString(),
            validations: [...prev.validations, etapeValidation("annuler_document", actor)],
          };
          set((s) => ({
            ordresFabrication: s.ordresFabrication.map((o) => (o.id === id ? next : o)),
            journalActivites: [
              entreeActivite("annulation", "ordre_fabrication", {
                entiteId: id,
                libelle: prev.numero,
              }),
              ...s.journalActivites,
            ],
          }));
          return { ok: true };
        }
        const bloquants = listerMouvementsBloquantAnnulationOf(prev, {
          entrees: state.entrees,
          ventes: state.ventes,
          inventaires: state.inventaires,
          factures: state.factures,
          transfertsStock: state.transfertsStock,
          ordresFabrication: state.ordresFabrication,
          produits: state.produits,
        });
        const motif = messageAnnulationRefusee(bloquants);
        if (motif) return { ok: false, reason: motif };
        const next: OrdreFabrication = {
          ...prev,
          statut: prev.statut === "cloture" ? "cloture_annule" : "annule",
          dateAnnulation: new Date().toISOString(),
          validations: [...prev.validations, etapeValidation("annuler_document", actor)],
        };
        const entrees = regenererEntreesOf(state.entrees, next, state.produits);
        set((s) => ({
          ordresFabrication: s.ordresFabrication.map((o) => (o.id === id ? next : o)),
          entrees,
          journalActivites: [
            entreeActivite("annulation", "ordre_fabrication", {
              entiteId: id,
              libelle: prev.numero,
              detail:
                next.statut === "cloture_annule"
                  ? "Contre-mouvement (OF clôturé)"
                  : "Annulation avec contre-mouvement",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      creerDemandeAchatDepuisOf: (ofId, data) => {
        const state = get();
        const prev = state.ordresFabrication.find((o) => o.id === ofId);
        if (!prev) return { ok: false, reason: "Ordre de fabrication introuvable." };
        const composant = state.produits.find((p) => p.id === data.composantId);
        if (!composant) return { ok: false, reason: "Composant introuvable." };
        if (!produitEstFabrique(composant) && natureStockDuProduit(composant) !== "matiere_premiere") {
          return { ok: false, reason: "Composant invalide." };
        }
        if (produitEstFabrique(composant)) {
          return {
            ok: false,
            reason:
              "Ce composant est un semi-fini : il ne s'achète pas. Créez un OF amont ou transférez le stock depuis l'atelier source.",
          };
        }
        if (data.quantite <= 0) return { ok: false, reason: "Quantité invalide." };
        const fournisseur = state.fournisseurs.find((f) => f.id === data.fournisseurId);
        if (!fournisseur) return { ok: false, reason: "Fournisseur introuvable." };
        const achatId = uid("ach");
        const numero = nextNumeroAchat(state.achats, optsNum(state));
        const actor = getActiviteActor();
        set((s) => ({
          achats: [
            {
              id: achatId,
              numero,
              fournisseurId: data.fournisseurId,
              pointDeVenteId: data.pointDeVenteId,
              date: new Date().toISOString(),
              statut: "brouillon" as const,
              tauxTVA: s.parametres.assujettiTVA ? s.parametres.tauxTVA : 0,
              lignes: [
                {
                  id: uid("al"),
                  produitId: data.composantId,
                  typeAchat: composant.typeAchat ?? "matieres_premieres",
                  quantite: data.quantite,
                  prixAchatUnitaire: composant.prixAchat,
                  repartitions: [
                    { pointDeVenteId: data.pointDeVenteId, quantite: data.quantite },
                  ],
                },
              ],
              livraisons: [],
              paiements: [],
              avoirs: [],
              note: `Demande générée depuis l'OF ${prev.numero}`,
              vendeurId: actor.id,
              vendeurNom: actor.nom,
              ofId,
              ofComposantId: data.composantId,
            },
            ...s.achats,
          ],
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: achatId,
              libelle: numero,
              detail: `Depuis OF ${prev.numero}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, achatId };
      },

      creerBonATirer: (data) => {
        if (!actorPeutGererBat()) {
          return { ok: false, reason: "La création d'un BAT est réservée au rôle commercial." };
        }
        const state = get();
        const cmd = state.commandes.find((c) => c.id === data.commandeId);
        if (!cmd) return { ok: false, reason: "Commande client introuvable." };
        const bats = state.bonsATirer ?? [];
        const courant = batCourant(bats, data.commandeId);
        if (courant?.statut === "en_attente" && !batAFichier(courant) && data.fichierDataUrl) {
          const res = get().completerFichierBat(courant.id, {
            nom: data.fichierNom ?? "bat",
            mime: data.fichierMime ?? "application/octet-stream",
            dataUrl: data.fichierDataUrl,
          });
          if (!res.ok) return { ok: false, reason: res.reason ?? "Impossible de joindre le fichier." };
          return { ok: true, id: courant.id };
        }
        const motif = motifCreationBatImpossible(bats, data.commandeId);
        if (motif) return { ok: false, reason: motif };
        if (!data.fichierDataUrl) {
          return { ok: false, reason: "Joignez le fichier du BAT (image ou PDF)." };
        }
        const id = uid("bat");
        const nouveau: BonATirer = {
          id,
          commandeId: data.commandeId,
          version: prochaineVersionBat(bats, data.commandeId),
          fichierNom: data.fichierNom,
          fichierMime: data.fichierMime,
          fichierDataUrl: data.fichierDataUrl,
          statut: "en_attente",
          dateEnvoi: new Date().toISOString(),
          commentaire: data.commentaire?.trim() || undefined,
        };
        set((s) => ({
          bonsATirer: [nouveau, ...(s.bonsATirer ?? [])],
          journalActivites: [
            entreeActivite("creation", "bon_a_tirer", {
              entiteId: id,
              libelle: `${cmd.numero} V${nouveau.version}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id };
      },

      completerFichierBat: (id, fichier) => {
        if (!actorPeutGererBat()) {
          return { ok: false, reason: "Seul le rôle commercial peut joindre un fichier BAT." };
        }
        const state = get();
        const prev = (state.bonsATirer ?? []).find((b) => b.id === id);
        if (!prev) return { ok: false, reason: "BAT introuvable." };
        if (prev.statut !== "en_attente") {
          return { ok: false, reason: "Cette version est en lecture seule." };
        }
        if (batAFichier(prev)) {
          return { ok: false, reason: "Un fichier est déjà joint à cette version." };
        }
        const cmd = state.commandes.find((c) => c.id === prev.commandeId);
        set((s) => ({
          bonsATirer: (s.bonsATirer ?? []).map((b) =>
            b.id === id
              ? {
                  ...b,
                  fichierNom: fichier.nom,
                  fichierMime: fichier.mime,
                  fichierDataUrl: fichier.dataUrl,
                  dateEnvoi: new Date().toISOString(),
                }
              : b,
          ),
          journalActivites: [
            entreeActivite("modification", "bon_a_tirer", {
              entiteId: id,
              libelle: `${cmd?.numero ?? ""} V${prev.version}`,
              detail: "Fichier joint",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      enregistrerRetourBat: (id, data) => {
        if (!actorPeutGererBat()) {
          return { ok: false, reason: "Seul le rôle commercial peut enregistrer le retour BAT." };
        }
        const state = get();
        const prev = (state.bonsATirer ?? []).find((b) => b.id === id);
        if (!prev) return { ok: false, reason: "BAT introuvable." };
        if (prev.statut !== "en_attente") {
          return { ok: false, reason: "Cette version est déjà clôturée (lecture seule)." };
        }
        if (!batAFichier(prev)) {
          return { ok: false, reason: "Joignez le fichier avant d'enregistrer le retour client." };
        }
        const cmd = state.commandes.find((c) => c.id === prev.commandeId);
        if (data.decision === "valide") {
          const nom = data.validateurNom?.trim();
          if (!nom) {
            return {
              ok: false,
              reason: "Indiquez le contact côté client qui a validé le BAT.",
            };
          }
          const now = new Date().toISOString();
          set((s) => ({
            bonsATirer: (s.bonsATirer ?? []).map((b) =>
              b.id === id
                ? {
                    ...b,
                    statut: "valide" as const,
                    dateValidation: now,
                    validateurNom: nom,
                    commentaire: data.commentaire?.trim() || b.commentaire,
                  }
                : b,
            ),
            journalActivites: [
              entreeActivite("validation", "bon_a_tirer", {
                entiteId: id,
                libelle: `${cmd?.numero ?? ""} V${prev.version}`,
                detail: `Validé par ${nom}`,
              }),
              ...s.journalActivites,
            ],
          }));
          return { ok: true };
        }
        const now = new Date().toISOString();
        const suivant: BonATirer = {
          id: uid("bat"),
          commandeId: prev.commandeId,
          version: prev.version + 1,
          fichierNom: data.fichierSuivant?.nom,
          fichierMime: data.fichierSuivant?.mime,
          fichierDataUrl: data.fichierSuivant?.dataUrl,
          statut: "en_attente",
          dateEnvoi: now,
        };
        set((s) => ({
          bonsATirer: [
            suivant,
            ...(s.bonsATirer ?? []).map((b) =>
              b.id === id
                ? {
                    ...b,
                    statut: "modifications_demandees" as const,
                    commentaire: data.commentaire?.trim() || b.commentaire,
                  }
                : b,
            ),
          ],
          journalActivites: [
            entreeActivite("modification", "bon_a_tirer", {
              entiteId: id,
              libelle: `${cmd?.numero ?? ""} V${prev.version}`,
              detail: `Modifications demandées → V${suivant.version}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      creerMissionAchat: (data) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "La création d'une mission est réservée au responsable achats." };
        }
        if (!data.acheteurUserId || !data.acheteurNom.trim()) {
          return { ok: false, reason: "Assignez un acheteur." };
        }
        if (!data.siteDestinataireId) {
          return { ok: false, reason: "Choisissez le site destinataire." };
        }
        const demande = data.montantAvanceDemandee ?? data.montantAvance;
        if (!(demande >= 0) || !(data.montantAvance >= 0)) {
          return { ok: false, reason: "Le montant de l'avance ne peut pas être négatif." };
        }
        const state = get();
        const site = state.pointsDeVente.find((s) => s.id === data.siteDestinataireId);
        if (!site) return { ok: false, reason: "Site destinataire introuvable." };
        const prevus: MissionLignePrevisionnelle[] = [];
        for (const l of data.lignesPrevisionnelles) {
          if (!l.produitId || !(l.quantiteSouhaitee > 0)) {
            return { ok: false, reason: "Chaque ligne prévisionnelle doit avoir un article et une quantité souhaitée positive." };
          }
          const motif = motifLigneMissionInvalide(
            { id: "tmp", produitId: l.produitId, quantite: 0, prixUnitaire: 0, fournisseurId: TIERS_DIVERS_MARCHE_ID },
            state.produits,
            state.categoriesProduits,
          );
          if (motif) return { ok: false, reason: motif };
          prevus.push({
            id: uid("misp"),
            produitId: l.produitId,
            quantiteSouhaitee: l.quantiteSouhaitee,
            prixUnitaireEstime: l.prixUnitaireEstime,
            fournisseurId: l.fournisseurId,
            commentaire: l.commentaire,
          });
        }
        const achatsRealises: MissionAchatRealise[] = prevus.map((p) => ({
          id: uid("misr"),
          previsionId: p.id,
          produitId: p.produitId,
          quantite: 0,
          prixUnitaire: p.prixUnitaireEstime ?? 0,
          fournisseurId: p.fournisseurId || TIERS_DIVERS_MARCHE_ID,
        }));
        const actor = getActiviteActor();
        const mouvementsFonds: MissionMouvementFonds[] =
          demande > 0
            ? [
                {
                  id: uid("misf"),
                  type: "demande",
                  montant: demande,
                  date: data.date,
                  responsableUserId: actor.id,
                  responsableNom: actor.nom,
                },
              ]
            : [];
        const nouveau: MissionAchat = {
          id: uid("mis"),
          numero: nextNumeroMission(state.missionsAchat ?? []),
          acheteurUserId: data.acheteurUserId,
          acheteurNom: data.acheteurNom.trim(),
          date: data.date,
          datePrevue: data.datePrevue,
          siteDestinataireId: data.siteDestinataireId,
          service: data.service,
          objet: data.objet,
          fournisseursPrevus: data.fournisseursPrevus,
          montantAvance: 0,
          montantAvanceDemandee: demande,
          statut: "brouillon",
          lignesPrevisionnelles: prevus,
          achatsRealises,
          depensesDiverses: [],
          justificatifs: [],
          mouvementsFonds,
          statutReglement: "non_regle",
          validations: [etapeValidationMission("creer", actor)],
          note: data.note,
        };
        const sync = etatAvecTiersDivers(state);
        set((s) =>
          avecJournal(
            { ...s, ...sync },
            {
              ...sync,
              missionsAchat: [nouveau, ...(s.missionsAchat ?? [])],
              journalActivites: [
                entreeActivite("creation", "mission_achat", {
                  entiteId: nouveau.id,
                  libelle: nouveau.numero,
                  detail: `${nouveau.acheteurNom}${nouveau.objet ? ` — ${nouveau.objet}` : ""}`,
                }),
                ...s.journalActivites,
              ],
            },
          ),
        );
        return { ok: true, id: nouveau.id };
      },

      modifierMissionAchat: (id, data) => {
        const state = get();
        const prev = (state.missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (missionEstVerrouillee(prev)) {
          return { ok: false, reason: "Cette mission est clôturée, rejetée ou annulée : aucune modification possible." };
        }
        const gerer = actorPeutGererMissions();
        const saisie = actorPeutSaisirMission(prev);
        if (!gerer && !saisie) {
          return { ok: false, reason: "Seul l'acheteur assigné peut saisir les achats de cette mission." };
        }
        const headerKeys = [
          "acheteurUserId",
          "acheteurNom",
          "date",
          "datePrevue",
          "siteDestinataireId",
          "service",
          "objet",
          "fournisseursPrevus",
          "montantAvance",
          "montantAvanceDemandee",
          "lignesPrevisionnelles",
        ] as const;
        if (!gerer) {
          for (const k of headerKeys) {
            if (data[k] !== undefined) {
              return {
                ok: false,
                reason: "L'en-tête et la liste prévisionnelle sont réservés au responsable achats.",
              };
            }
          }
        } else if (!peutModifierDossierMission(prev)) {
          const structureKeys = headerKeys.filter((k) => k !== "montantAvance");
          for (const k of structureKeys) {
            if (data[k] !== undefined) {
              return {
                ok: false,
                reason: "Une mission validée ne peut plus être modifiée librement.",
              };
            }
          }
        }
        let lignesPrevisionnelles = data.lignesPrevisionnelles ?? prev.lignesPrevisionnelles;
        if (data.lignesPrevisionnelles) {
          for (const l of data.lignesPrevisionnelles) {
            if (!l.produitId || !(l.quantiteSouhaitee > 0)) {
              return { ok: false, reason: "Chaque ligne prévisionnelle doit avoir un article et une quantité souhaitée positive." };
            }
            const motif = motifLigneMissionInvalide(
              { id: l.id, produitId: l.produitId, quantite: 0, prixUnitaire: 0, fournisseurId: TIERS_DIVERS_MARCHE_ID },
              state.produits,
              state.categoriesProduits,
            );
            if (motif) return { ok: false, reason: motif };
          }
        }
        let achatsRealises = data.achatsRealises ?? prev.achatsRealises;
        if (data.achatsRealises) {
          for (const l of data.achatsRealises) {
            const motif = motifLigneMissionInvalide(
              l,
              state.produits,
              state.categoriesProduits,
            );
            if (motif) return { ok: false, reason: motif };
            if (!l.fournisseurId) {
              return { ok: false, reason: "Chaque achat réalisé doit être rattaché à un tiers." };
            }
          }
        } else if (data.lignesPrevisionnelles) {
          const prevusIds = new Set(lignesPrevisionnelles.map((l) => l.id));
          const kept = prev.achatsRealises.filter((l) => {
            if (!l.previsionId) return true;
            if (prevusIds.has(l.previsionId)) return true;
            return l.quantite > 0;
          });
          const existingPrev = new Set(kept.map((l) => l.previsionId).filter(Boolean));
          const added = lignesPrevisionnelles
            .filter((p) => !existingPrev.has(p.id))
            .map((p) => ({
              id: uid("misr"),
              previsionId: p.id,
              produitId: p.produitId,
              quantite: 0,
              prixUnitaire: 0,
              fournisseurId: TIERS_DIVERS_MARCHE_ID,
            }));
          achatsRealises = [
            ...kept.map((l) => {
              const p = lignesPrevisionnelles.find((x) => x.id === l.previsionId);
              if (p && l.quantite === 0) return { ...l, produitId: p.produitId };
              return l;
            }),
            ...added,
          ];
        }
        let depensesDiverses = data.depensesDiverses ?? prev.depensesDiverses;
        if (data.depensesDiverses) {
          depensesDiverses = data.depensesDiverses.map((d) => ({
            ...d,
            nature: d.nature,
            fournisseurId: d.fournisseurId ?? "",
            montant: Math.max(0, d.montant),
          }));
          for (const d of depensesDiverses) {
            const motif = motifDepenseDiverseInvalide(d);
            if (motif) return { ok: false, reason: motif };
          }
        }
        if (data.montantAvance != null && data.montantAvance < 0) {
          return { ok: false, reason: "Le montant de l'avance ne peut pas être négatif." };
        }
        let next: MissionAchat = {
          ...prev,
          ...data,
          lignesPrevisionnelles,
          achatsRealises,
          depensesDiverses,
          justificatifs: data.justificatifs ?? prev.justificatifs,
          mouvementsFonds: data.mouvementsFonds ?? prev.mouvementsFonds,
        };
        if (
          prev.statut === "fonds_remis" &&
          next.achatsRealises.some((l) => l.quantite > 0)
        ) {
          next = { ...next, statut: "en_cours" };
        }
        const actor = getActiviteActor();
        const evenements = evenementsSaisieMission(prev, next);
        if (evenements.length) {
          next = {
            ...next,
            validations: [
              ...next.validations,
              ...evenements.map((e) =>
                etapeValidationMission(e.action, actor, e.detail),
              ),
            ],
          };
        }
        set((s) => ({
          missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
          ...(evenements.length
            ? {
                journalActivites: [
                  entreeActivite("modification", "mission_achat", {
                    entiteId: id,
                    libelle: prev.numero,
                    detail: evenements.map((e) => e.detail).join(" · "),
                  }),
                  ...s.journalActivites,
                ],
              }
            : {}),
        }));
        return { ok: true };
      },

      cloturerMissionAchat: (id, opts) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "La clôture est réservée au responsable achats." };
        }
        const state = get();
        const prev = (state.missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        const motif = motifClotureImpossible(prev, opts);
        if (motif) {
          if (
            prev.statut === "en_cours" ||
            prev.statut === "fonds_remis"
          ) {
            const actor = getActiviteActor();
            const next: MissionAchat = {
              ...prev,
              statut: "a_regulariser",
              validations: [
                ...prev.validations,
                etapeValidationMission("retour_edition", actor, motif),
              ],
            };
            set((s) => ({
              missionsAchat: (s.missionsAchat ?? []).map((m) =>
                m.id === id ? next : m,
              ),
              journalActivites: [
                entreeActivite("modification", "mission_achat", {
                  entiteId: id,
                  libelle: prev.numero,
                  detail: "Passage à régulariser",
                }),
                ...s.journalActivites,
              ],
            }));
          }
          return { ok: false, reason: motif };
        }
        for (const l of prev.achatsRealises) {
          const motifLigne = motifLigneMissionInvalide(
            l,
            state.produits,
            state.categoriesProduits,
          );
          if (motifLigne) return { ok: false, reason: motifLigne };
        }
        const actor = getActiviteActor();
        const next: MissionAchat = {
          ...prev,
          statut: "cloture",
          dateCloture: new Date().toISOString(),
          depensesDiverses: depensesValides(prev.depensesDiverses),
          clotureExceptionJustificatifs:
            Boolean(opts?.exceptionJustificatifs) ||
            prev.clotureExceptionJustificatifs,
          validations: [
            ...prev.validations,
            ...(opts?.exceptionJustificatifs
              ? [etapeValidationMission("exception_justificatifs", actor)]
              : []),
            etapeValidationMission("confirmer_cloture", actor),
          ],
        };
        const entrees = regenererEntreesMission(
          state.entrees,
          next,
          state.produits,
          upsertTiersDiversMarche(state.tiers ?? []),
        );
        set((s) =>
          avecJournal(s, {
            missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
            entrees,
            journalActivites: [
              entreeActivite("validation", "mission_achat", {
                entiteId: id,
                libelle: prev.numero,
                detail: "Clôture — entrée en stock (qté réceptionnée) et écritures 401",
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },

      annulerMissionAchat: (id) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "L'annulation est réservée au responsable achats." };
        }
        const state = get();
        const prev = (state.missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (prev.statut === "annule" || prev.statut === "cloture_annule") {
          return { ok: false, reason: "Cette mission est déjà annulée." };
        }
        const actor = getActiviteActor();
        if (prev.statut !== "cloture") {
          const next: MissionAchat = {
            ...prev,
            statut: "annule",
            dateAnnulation: new Date().toISOString(),
            validations: [...prev.validations, etapeValidationMission("annuler_document", actor)],
          };
          set((s) => ({
            missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
            journalActivites: [
              entreeActivite("annulation", "mission_achat", {
                entiteId: id,
                libelle: prev.numero,
              }),
              ...s.journalActivites,
            ],
          }));
          return { ok: true };
        }
        const bloquants = listerMouvementsBloquantAnnulationMission(prev, {
          entrees: state.entrees,
          ventes: state.ventes,
          inventaires: state.inventaires,
          factures: state.factures,
          transfertsStock: state.transfertsStock,
          ordresFabrication: state.ordresFabrication,
          produits: state.produits,
          tiers: upsertTiersDiversMarche(state.tiers ?? []),
        });
        const motif = messageAnnulationMissionRefusee(bloquants);
        if (motif) return { ok: false, reason: motif };
        const next: MissionAchat = {
          ...prev,
          statut: "cloture_annule",
          dateAnnulation: new Date().toISOString(),
          validations: [...prev.validations, etapeValidationMission("annuler_cloture", actor)],
        };
        const entrees = regenererEntreesMission(
          state.entrees,
          next,
          state.produits,
          upsertTiersDiversMarche(state.tiers ?? []),
        );
        set((s) =>
          avecJournal(s, {
            missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
            entrees,
            journalActivites: [
              entreeActivite("annulation", "mission_achat", {
                entiteId: id,
                libelle: prev.numero,
                detail: "Contre-mouvement (mission clôturée)",
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },

      reglerMissionAchat: (id, data) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "Le règlement de l'avance est réservé au responsable achats." };
        }
        const state = get();
        const prev = (state.missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (prev.statut !== "cloture" && prev.statut !== "a_regulariser" && prev.statut !== "en_cours" && prev.statut !== "fonds_remis") {
          return { ok: false, reason: "Le règlement n'est possible qu'en cours de mission ou après clôture." };
        }
        if (data.statutReglement === "regle" && !data.dateReglement) {
          return { ok: false, reason: "Indiquez la date de règlement." };
        }
        const actor = getActiviteActor();
        const mouvements = [...(prev.mouvementsFonds ?? [])];
        if (data.statutReglement === "regle" && prev.statutReglement !== "regle") {
          const solde = soldeMission(prev);
          if (Math.abs(solde) >= 0.5) {
            mouvements.push({
              id: uid("misf"),
              type: solde > 0 ? "restitution" : "remboursement",
              montant: Math.abs(solde),
              date: data.dateReglement ?? new Date().toISOString(),
              responsableUserId: actor.id,
              responsableNom: actor.nom,
            });
          }
        }
        const next: MissionAchat = {
          ...prev,
          statutReglement: data.statutReglement,
          dateReglement: data.statutReglement === "regle" ? data.dateReglement : undefined,
          mouvementsFonds: mouvements,
          validations: [
            ...prev.validations,
            etapeValidationMission(
              "regler",
              actor,
              data.statutReglement === "regle" ? data.dateReglement : "Non réglé",
            ),
          ],
        };
        set((s) => ({
          missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
          journalActivites: [
            entreeActivite("modification", "mission_achat", {
              entiteId: id,
              libelle: prev.numero,
              detail: data.statutReglement === "regle" ? "Règlement de l'avance" : "Règlement annulé",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      soumettreMissionAchat: (id) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "La soumission est réservée au responsable achats." };
        }
        const prev = (get().missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (prev.statut !== "brouillon") {
          return { ok: false, reason: "Seule une mission brouillon peut être soumise." };
        }
        if (prev.lignesPrevisionnelles.length === 0) {
          return { ok: false, reason: "Ajoutez au moins un article prévu." };
        }
        const actor = getActiviteActor();
        const next: MissionAchat = {
          ...prev,
          statut: "soumise",
          validations: [...prev.validations, etapeValidationMission("soumettre", actor)],
        };
        set((s) => ({
          missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
          journalActivites: [
            entreeActivite("validation", "mission_achat", {
              entiteId: id,
              libelle: prev.numero,
              detail: "Soumission pour validation",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      validerMissionAchat: (id) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "La validation est réservée au responsable achats." };
        }
        const prev = (get().missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (prev.statut !== "soumise") {
          return { ok: false, reason: "Seule une mission soumise peut être validée." };
        }
        const actor = getActiviteActor();
        const demande = prev.montantAvanceDemandee ?? 0;
        const mouvements = [...(prev.mouvementsFonds ?? [])];
        if (demande > 0) {
          mouvements.push({
            id: uid("misf"),
            type: "validation",
            montant: demande,
            date: new Date().toISOString(),
            responsableUserId: actor.id,
            responsableNom: actor.nom,
          });
        }
        const next: MissionAchat = {
          ...prev,
          statut: "validee",
          montantAvanceValidee: demande,
          valideurUserId: actor.id,
          valideurNom: actor.nom,
          mouvementsFonds: mouvements,
          validations: [...prev.validations, etapeValidationMission("valider", actor)],
        };
        set((s) => ({
          missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
          journalActivites: [
            entreeActivite("validation", "mission_achat", {
              entiteId: id,
              libelle: prev.numero,
              detail: actor.nom ? `Validée par ${actor.nom}` : "Validation",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      rejeterMissionAchat: (id, motif) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "Le rejet est réservé au responsable achats." };
        }
        const prev = (get().missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (prev.statut !== "soumise" && prev.statut !== "brouillon") {
          return { ok: false, reason: "Cette mission ne peut plus être rejetée." };
        }
        const actor = getActiviteActor();
        const next: MissionAchat = {
          ...prev,
          statut: "rejetee",
          validations: [
            ...prev.validations,
            etapeValidationMission("rejeter", actor, motif),
          ],
        };
        set((s) => ({
          missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
          journalActivites: [
            entreeActivite("annulation", "mission_achat", {
              entiteId: id,
              libelle: prev.numero,
              detail: motif ? `Rejet — ${motif}` : "Rejet",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      remettreFondsMissionAchat: (id, data) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "La remise des fonds est réservée au responsable achats." };
        }
        const prev = (get().missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (
          prev.statut !== "validee" &&
          prev.statut !== "fonds_remis" &&
          prev.statut !== "en_cours"
        ) {
          return { ok: false, reason: "Les fonds se remettent après validation de la mission." };
        }
        if (!(data.montant > 0)) {
          return { ok: false, reason: "Indiquez un montant remis positif." };
        }
        const actor = getActiviteActor();
        const mouvement: MissionMouvementFonds = {
          id: uid("misf"),
          type: "remise",
          montant: data.montant,
          date: data.date,
          modePaiement: data.modePaiement,
          compteSource: data.compteSource,
          reference: data.reference,
          responsableUserId: actor.id,
          responsableNom: actor.nom,
        };
        const mouvements = [...(prev.mouvementsFonds ?? []), mouvement];
        const remis = mouvements
          .filter((x) => x.type === "remise")
          .reduce((s, x) => s + x.montant, 0);
        const next: MissionAchat = {
          ...prev,
          statut: prev.statut === "en_cours" ? "en_cours" : "fonds_remis",
          montantAvance: remis,
          mouvementsFonds: mouvements,
          validations: [
            ...prev.validations,
            etapeValidationMission(
              "remettre_fonds",
              actor,
              `${Math.round(data.montant)} Ar${data.reference ? ` — ${data.reference}` : ""}`,
            ),
          ],
        };
        set((s) => ({
          missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
          journalActivites: [
            entreeActivite("modification", "mission_achat", {
              entiteId: id,
              libelle: prev.numero,
              detail: `Remise de fonds ${Math.round(data.montant)} Ar`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      creerDemandePrix: (data) => {
        if (data.lignes.length === 0) {
          return { ok: false, reason: "Ajoutez au moins un article." };
        }
        if (data.fournisseurIds.length < 1) {
          return { ok: false, reason: "Sélectionnez au moins un fournisseur à consulter." };
        }
        for (const l of data.lignes) {
          if (!l.produitId || !(l.quantite > 0)) {
            return { ok: false, reason: "Chaque ligne doit avoir un article et une quantité positive." };
          }
        }
        const state = get();
        const lignes: DemandePrixLigne[] = data.lignes.map((l) => ({
          id: uid("dpl"),
          produitId: l.produitId,
          quantite: l.quantite,
        }));
        const offres: DemandePrixOffre[] = [];
        for (const ligne of lignes) {
          for (const fournisseurId of data.fournisseurIds) {
            offres.push({
              id: uid("dpo"),
              ligneId: ligne.id,
              fournisseurId,
              prixUnitaire: 0,
            });
          }
        }
        const nouveau: DemandePrix = {
          id: uid("dp"),
          numero: nextNumeroDemandePrix(state.demandesPrix ?? [], optsNum(state, data.date)),
          date: data.date,
          statut: "brouillon",
          lignes,
          fournisseurIds: [...new Set(data.fournisseurIds)],
          offres,
          note: data.note,
          validiteJours: normaliserValiditeJours(data.validiteJours),
        };
        set((s) => ({
          demandesPrix: [nouveau, ...(s.demandesPrix ?? [])],
          journalActivites: [
            entreeActivite("creation", "demande_prix", {
              entiteId: nouveau.id,
              libelle: nouveau.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id: nouveau.id };
      },

      modifierDemandePrix: (id, data) => {
        const state = get();
        const prev = (state.demandesPrix ?? []).find((d) => d.id === id);
        if (!prev) return { ok: false, reason: "Demande de prix introuvable." };
        if (prev.statut === "annulee") {
          return { ok: false, reason: "Cette demande de prix est annulée." };
        }
        const patchRetenus = data.fournisseurIdsRetenus !== undefined;
        const patchMetier =
          data.lignes !== undefined ||
          data.fournisseurIds !== undefined ||
          data.offres !== undefined ||
          data.date !== undefined;
        if (dpEstVerrouillee(prev) && patchMetier) {
          return {
            ok: false,
            reason:
              "Cette demande est clôturée. Consultez-la, indiquez les fournisseurs retenus, ou transformez-la en commande.",
          };
        }
        let lignes = data.lignes ?? prev.lignes;
        let fournisseurIds = data.fournisseurIds ?? prev.fournisseurIds;
        let offres = data.offres ?? prev.offres;
        if (data.lignes || data.fournisseurIds) {
          if (lignes.length === 0) return { ok: false, reason: "Ajoutez au moins un article." };
          if (fournisseurIds.length === 0) {
            return { ok: false, reason: "Sélectionnez au moins un fournisseur." };
          }
          const nextOffres: DemandePrixOffre[] = [];
          for (const ligne of lignes) {
            for (const fournisseurId of fournisseurIds) {
              const exist =
                offres.find((o) => o.ligneId === ligne.id && o.fournisseurId === fournisseurId) ??
                prev.offres.find((o) => o.ligneId === ligne.id && o.fournisseurId === fournisseurId);
              nextOffres.push(
                exist ?? {
                  id: uid("dpo"),
                  ligneId: ligne.id,
                  fournisseurId,
                  prixUnitaire: 0,
                },
              );
            }
          }
          offres = nextOffres;
        }
        const consultes = new Set(fournisseurIds);
        const retenus = patchRetenus
          ? [...new Set(data.fournisseurIdsRetenus ?? [])].filter((fid) => consultes.has(fid))
          : prev.fournisseurIdsRetenus;
        const next: DemandePrix = {
          ...prev,
          ...data,
          lignes,
          fournisseurIds,
          offres,
          fournisseurIdsRetenus: retenus,
          validiteJours:
            data.validiteJours !== undefined
              ? normaliserValiditeJours(data.validiteJours)
              : prev.validiteJours,
        };
        set((s) => ({
          demandesPrix: (s.demandesPrix ?? []).map((d) => (d.id === id ? next : d)),
        }));
        return { ok: true };
      },

      patchOffreDemandePrix: (id, ligneId, fournisseurId, patch) => {
        const prev = (get().demandesPrix ?? []).find((d) => d.id === id);
        if (!prev) return { ok: false, reason: "Demande de prix introuvable." };
        if (dpEstVerrouillee(prev)) {
          return { ok: false, reason: "Cette demande de prix est clôturée ou annulée." };
        }
        const exist = offreLigneFournisseur(prev, ligneId, fournisseurId);
        const offres = exist
          ? prev.offres.map((o) => (o.id === exist.id ? { ...o, ...patch } : o))
          : [
              ...prev.offres,
              {
                id: uid("dpo"),
                ligneId,
                fournisseurId,
                prixUnitaire: 0,
                ...patch,
              },
            ];
        set((s) => ({
          demandesPrix: (s.demandesPrix ?? []).map((d) =>
            d.id === id ? { ...d, offres } : d,
          ),
        }));
        return { ok: true };
      },

      changerStatutDemandePrix: (id, statut) => {
        const state = get();
        const prev = (state.demandesPrix ?? []).find((d) => d.id === id);
        if (!prev) return { ok: false, reason: "Demande de prix introuvable." };
        if (prev.statut === "annulee") {
          return { ok: false, reason: "Cette demande est déjà annulée." };
        }
        if (prev.statut === "cloturee" && statut !== "annulee") {
          return { ok: false, reason: "Document verrouillé." };
        }
        set((s) => ({
          demandesPrix: (s.demandesPrix ?? []).map((d) => (d.id === id ? { ...d, statut } : d)),
          journalActivites: [
            entreeActivite(
              statut === "annulee" ? "annulation" : "validation",
              "demande_prix",
              { entiteId: id, libelle: prev.numero, detail: statut },
            ),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      transformerDemandePrixEnAchats: (id, data) => {
        const state = get();
        const prev = (state.demandesPrix ?? []).find((d) => d.id === id);
        if (!prev) return { ok: false, reason: "Demande de prix introuvable." };
        if (prev.statut === "annulee") {
          return { ok: false, reason: "Cette demande de prix est annulée." };
        }
        const consultes = new Set(prev.fournisseurIds ?? []);
        if (consultes.size === 0) {
          return { ok: false, reason: "Aucun fournisseur consulté sur cette demande." };
        }
        if (!data.pointDeVenteId) {
          return { ok: false, reason: "Choisissez un site de destination." };
        }
        if (data.commandes.length === 0) {
          return { ok: false, reason: "Répartissez au moins un article vers un fournisseur." };
        }
        const produits = state.produits ?? [];
        const actor = getActiviteActor();
        const nouveaux: Achat[] = [];
        let achatsCourants = state.achats;
        const validite = normaliserValiditeJours(
          data.validiteJours ?? prev.validiteJours,
        );
        for (const cmd of data.commandes) {
          if (!consultes.has(cmd.fournisseurId)) {
            return {
              ok: false,
              reason: "Chaque commande doit concerner un fournisseur consulté sur la DP.",
            };
          }
          if (cmd.lignes.length === 0) {
            return { ok: false, reason: "Chaque commande doit avoir au moins un article." };
          }
          for (const l of cmd.lignes) {
            if (!l.produitId || !(l.quantite > 0) || l.prixAchatUnitaire < 0) {
              return {
                ok: false,
                reason: "Chaque ligne doit avoir un article, une quantité positive et un prix.",
              };
            }
          }
          const lignesAchat = cmd.lignes.map((l) => ({
            id: uid("acl"),
            produitId: l.produitId,
            quantite: l.quantite,
            prixAchatUnitaire: l.prixAchatUnitaire,
            typeAchat: produits.find((p) => p.id === l.produitId)?.typeAchat,
          }));
          const motifNat = motifAchatNatureInterdite(
            produits,
            lignesAchat,
            state.categoriesProduits,
          );
          if (motifNat) return { ok: false, reason: motifNat };
          const achatId = uid("ach");
          const numero = nextNumeroAchat(
            achatsCourants,
            optsNum(state, data.date ?? prev.date),
          );
          const achat: Achat = {
            id: achatId,
            numero,
            fournisseurId: cmd.fournisseurId,
            pointDeVenteId: data.pointDeVenteId,
            date: data.date ?? prev.date,
            statut: "brouillon",
            tauxTVA: state.parametres.assujettiTVA ? state.parametres.tauxTVA : 0,
            lignes: lignesAchat,
            livraisons: [],
            paiements: [],
            avoirs: [],
            note:
              cmd.note?.trim() ||
              `Issu de la demande de prix ${prev.numero}`,
            vendeurId: actor.id,
            vendeurNom: actor.nom,
            demandePrixId: prev.id,
            validiteJours: validite,
          };
          nouveaux.push(achat);
          achatsCourants = [achat, ...achatsCourants];
        }
        const achatIds = [...(prev.achatIds ?? []), ...nouveaux.map((a) => a.id)];
        const retenusMaj = [
          ...new Set([
            ...(prev.fournisseurIdsRetenus ?? []),
            ...data.commandes.map((c) => c.fournisseurId),
          ]),
        ];
        set((s) => ({
          achats: [...nouveaux, ...s.achats],
          demandesPrix: (s.demandesPrix ?? []).map((d) =>
            d.id === id ? { ...d, achatIds, fournisseurIdsRetenus: retenusMaj } : d,
          ),
          journalActivites: [
            ...nouveaux.map((a) =>
              entreeActivite("creation", "achat", {
                entiteId: a.id,
                libelle: a.numero,
                detail: `Depuis ${prev.numero}`,
              }),
            ),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, achatIds: nouveaux.map((a) => a.id) };
      },

      addVente: (vente) =>
        set((state) => ({
          ventes: [{ ...vente, id: uid("v") }, ...state.ventes],
        })),
      deleteVente: (id) =>
        set((state) => ({
          ventes: state.ventes.filter((v) => v.id !== id),
        })),

      upsertRapportFinJournee: (data) =>
        set((state) => {
          const updatedAt = new Date().toISOString();
          const existing =
            (data.id
              ? state.rapportsFinJournee.find((r) => r.id === data.id)
              : undefined) ??
            state.rapportsFinJournee.find(
              (r) =>
                r.dateJour === data.dateJour &&
                r.pointDeVenteId === data.pointDeVenteId,
            );
          if (existing) {
            return {
              rapportsFinJournee: state.rapportsFinJournee.map((r) =>
                r.id === existing.id
                  ? {
                      ...r,
                      ...data,
                      id: existing.id,
                      updatedAt,
                    }
                  : r,
              ),
            };
          }
          return {
            rapportsFinJournee: [
              {
                ...data,
                id: uid("rfj"),
                updatedAt,
              },
              ...state.rapportsFinJournee,
            ],
          };
        }),
      deleteRapportFinJournee: (id) =>
        set((state) => ({
          rapportsFinJournee: state.rapportsFinJournee.filter(
            (r) => r.id !== id,
          ),
        })),

      addProduit: (produit) => {
        const state = get();
        const nature = natureStockDuProduit(produit);
        const nomenclatures = normaliserNomenclatures(
          produit.nomenclatures,
          produitEstFabrique({ natureStock: nature }),
        );
        if (nomenclatures) {
          const cycle = cycleNomenclature(
            "nouveau",
            nomenclatures,
            [{ ...produit, id: "nouveau", nomenclatures }, ...state.produits],
          );
          if (cycle) return { ok: false, reason: cycle };
        }
        const usage = usageCommercialDuProduit(
          {
            ...produit,
            natureStock: nature,
          },
          state.categoriesProduits,
        );
        const seeded = seedComptesDefautState(state);
        const nouveau = assignerComptesProduit(
          {
            ...produit,
            id: uid("prod"),
            natureStock: nature,
            usageCommercial: usage,
            nomenclatures,
          },
          seeded.comptesComptables,
        );
        set((s) => ({
          ...seeded,
          produits: [nouveau, ...s.produits],
          journalActivites: [
            entreeActivite("creation", "produit", {
              entiteId: nouveau.id,
              libelle: nouveau.libelleCourt || nouveau.libelleLong,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id: nouveau.id };
      },
      updateProduit: (id, data, opts) => {
        const state = get();
        const prev = state.produits.find((p) => p.id === id);
        if (!prev) return { ok: false, reason: "Produit introuvable." };
        const natureCible = data.natureStock ?? natureStockDuProduit(prev);
        if (natureCible !== natureStockDuProduit(prev)) {
          const achete = state.entrees.some(
            (e) =>
              e.produitId === id &&
              (e.origine === "livraison_achat" ||
                e.origine === "achat" ||
                e.origine === "retour_fournisseur" ||
                !e.origine),
          );
          const fabrique = state.entrees.some(
            (e) => e.produitId === id && e.origine === "of_entree",
          );
          if (produitEstFabrique({ natureStock: natureCible }) && achete) {
            return {
              ok: false,
              reason:
                "Ce produit a déjà été acheté : il ne peut pas devenir semi-fini ou fini. Créez une nouvelle fiche.",
            };
          }
          if (natureCible === "matiere_premiere" && fabrique) {
            return {
              ok: false,
              reason:
                "Ce produit a déjà été fabriqué par un OF : il ne peut pas devenir matière première.",
            };
          }
        }
        const nomenclatures = normaliserNomenclatures(
          data.nomenclatures !== undefined ? data.nomenclatures : prev.nomenclatures,
          produitEstFabrique({ natureStock: natureCible }),
        );
        if (nomenclatures) {
          const cycle = cycleNomenclature(
            id,
            nomenclatures,
            state.produits.map((p) =>
              p.id === id ? { ...p, nomenclatures, natureStock: natureCible } : p,
            ),
          );
          if (cycle) return { ok: false, reason: cycle };
        }
        data = {
          ...data,
          natureStock: natureCible,
          nomenclatures,
          usageCommercial: usageCommercialDuProduit(
            {
              ...prev,
              ...data,
              natureStock: natureCible,
            },
            state.categoriesProduits,
          ),
        };
        const seeded = seedComptesDefautState(state);
        const auth = useAuthStore.getState();
        const patch: Partial<Produit> = { ...data };
        if (!auth.hasPermission("parametres.gerer")) {
          delete patch.compteChargeId;
          delete patch.compteVenteId;
          delete patch.compteComptableId;
        }
        const chargeEffective = compteChargeProduit(
          prev,
          seeded.comptesComptables,
        );
        const venteEffective = compteVenteProduit(
          prev,
          seeded.comptesComptables,
        );
        if (
          patch.compteChargeId !== undefined &&
          patch.compteChargeId !== (prev.compteChargeId ?? chargeEffective?.id) &&
          compteUtiliseEnEcriture(
            chargeEffective?.id,
            state.ecrituresComptables,
          )
        ) {
          delete patch.compteChargeId;
        }
        if (
          patch.compteVenteId !== undefined &&
          patch.compteVenteId !== (prev.compteVenteId ?? venteEffective?.id) &&
          compteUtiliseEnEcriture(
            venteEffective?.id,
            state.ecrituresComptables,
          )
        ) {
          delete patch.compteVenteId;
        }
        const next = assignerComptesProduit(
          { ...prev, ...patch },
          seeded.comptesComptables,
        );
        const hist: HistoriquePrix[] = [];
        const push = (
          champ: HistoriquePrix["champ"],
          ancien: number,
          nouveau: number,
        ) => {
          if (ancien === nouveau) return;
          hist.push({
            id: uid("hprix"),
            ...creerEntreeHistorique({
              produitId: id,
              champ,
              ancienMontant: ancien,
              nouveauMontant: nouveau,
              motif: opts?.motifPrix,
            }),
          });
        };
        if (data.prixAchat != null) {
          push("achat", prev.prixAchat, next.prixAchat);
        }
        if (data.prixVenteHT != null) {
          push("vente_ht", prev.prixVenteHT, next.prixVenteHT);
        }
        if (data.prixVenteGrosHT != null) {
          push(
            "gros_ht",
            prev.prixVenteGrosHT ?? 0,
            next.prixVenteGrosHT ?? 0,
          );
        }
        set((s) =>
          avecJournal(s, {
            ...seeded,
            produits: s.produits.map((p) => (p.id === id ? next : p)),
            historiquesPrix: [...hist, ...s.historiquesPrix],
            journalActivites: [
              entreeActivite("modification", "produit", {
                entiteId: id,
                libelle: next.libelleCourt || next.libelleLong,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },
      desactiverProduit: (id) =>
        set((state) => {
          const prev = state.produits.find((p) => p.id === id);
          return {
            produits: state.produits.map((p) =>
              p.id === id ? { ...p, actif: false } : p,
            ),
            journalActivites: [
              entreeActivite("desactivation", "produit", {
                entiteId: id,
                libelle: prev?.libelleCourt || prev?.libelleLong,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteProduit: (id) => {
        const state = get();
        if (
          produitEstReference(id, {
            entrees: state.entrees,
            ventes: state.ventes,
            devis: state.devis,
            commandes: state.commandes,
            bonsDeLivraison: state.bonsDeLivraison,
            factures: state.factures,
            achats: state.achats,
            ordresFabrication: state.ordresFabrication,
            missionsAchat: state.missionsAchat,
            demandesPrix: state.demandesPrix,
            nomenclaturesProduits: state.produits,
          })
        ) {
          return {
            ok: false,
            reason:
              "Produit déjà utilisé (stocks, ventes ou documents). Désactivez-le pour préserver l'historique.",
          };
        }
        const prod = state.produits.find((p) => p.id === id);
        set((s) => ({
          produits: s.produits.filter((p) => p.id !== id),
          tarifsClients: s.tarifsClients.filter((t) => t.produitId !== id),
          journalActivites: [
            entreeActivite("suppression", "produit", {
              entiteId: id,
              libelle: prod?.libelleCourt || prod?.libelleLong,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addCategorieProduit: (cat) =>
        set((state) => {
          const id = uid("cat");
          return {
            categoriesProduits: [
              ...state.categoriesProduits,
              { ...cat, id },
            ],
            journalActivites: [
              entreeActivite("creation", "categorie", {
                entiteId: id,
                libelle: cat.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateCategorieProduit: (id, data) =>
        set((state) => {
          const prev = state.categoriesProduits.find((c) => c.id === id);
          const categoriesProduits = state.categoriesProduits.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          );
          const journal = [
            entreeActivite("modification", "categorie", {
              entiteId: id,
              libelle: data.libelle ?? prev?.libelle,
            }),
            ...state.journalActivites,
          ];
          const usageChange =
            data.usageCommercial !== undefined &&
            data.usageCommercial !== prev?.usageCommercial;
          if (!usageChange) {
            return { categoriesProduits, journalActivites: journal };
          }
          const seeded = seedComptesDefautState(state);
          const sousArbre = new Set(
            idsCategorieEtDescendants(id, categoriesProduits),
          );
          const exclus = new Set<string>();
          for (const c of categoriesProduits) {
            if (c.id === id || !sousArbre.has(c.id)) continue;
            if (!estUsageCommercial(c.usageCommercial)) continue;
            for (const d of idsCategorieEtDescendants(
              c.id,
              categoriesProduits,
            )) {
              exclus.add(d);
            }
          }
          const usage = estUsageCommercial(data.usageCommercial)
            ? data.usageCommercial
            : "achat_vente";
          return {
            ...seeded,
            categoriesProduits,
            produits: state.produits.map((p) => {
              if (
                !p.categorieId ||
                !sousArbre.has(p.categorieId) ||
                exclus.has(p.categorieId)
              ) {
                return p;
              }
              return assignerComptesProduit(
                { ...p, usageCommercial: usage },
                seeded.comptesComptables,
              );
            }),
            journalActivites: journal,
          };
        }),
      deleteCategorieProduit: (id) => {
        const state = get();
        const enfants = state.categoriesProduits.filter(
          (c) => c.parentId === id,
        );
        if (enfants.length > 0) {
          return {
            ok: false,
            reason: `Cette famille a ${enfants.length} sous-famille(s). Supprimez-les d'abord.`,
          };
        }
        const nbProduits = state.produits.filter(
          (p) => p.categorieId === id,
        ).length;
        if (nbProduits > 0) {
          return {
            ok: false,
            reason: `${nbProduits} produit(s) y sont rattachés. Réassignez-les avant de supprimer.`,
          };
        }
        const cat = state.categoriesProduits.find((c) => c.id === id);
        set((s) => ({
          categoriesProduits: s.categoriesProduits.filter((c) => c.id !== id),
          journalActivites: [
            entreeActivite("suppression", "categorie", {
              entiteId: id,
              libelle: cat?.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addUniteMesure: (data) => {
        const state = get();
        const symbole = data.symbole.trim();
        const libelle = data.libelle.trim();
        const motif = motifSymboleUniteInvalide(
          symbole,
          libelle,
          state.unitesMesure,
        );
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("um");
        const ordre =
          state.unitesMesure.reduce((m, u) => Math.max(m, u.ordre), 0) + 1;
        set((s) => ({
          unitesMesure: [
            ...s.unitesMesure,
            { id, symbole, libelle, ordre, actif: true },
          ],
          journalActivites: [
            entreeActivite("creation", "unite_mesure", {
              entiteId: id,
              libelle: `${symbole} — ${libelle}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updateUniteMesure: (id, data) => {
        const state = get();
        const prev = state.unitesMesure.find((u) => u.id === id);
        if (!prev) return { ok: false as const, reason: "Unité introuvable." };
        const symbole = (data.symbole ?? prev.symbole).trim();
        const libelle = (data.libelle ?? prev.libelle).trim();
        const motif = motifSymboleUniteInvalide(
          symbole,
          libelle,
          state.unitesMesure,
          id,
        );
        if (motif) return { ok: false as const, reason: motif };
        const symboleChange =
          normalizeSymboleUnite(symbole) !==
          normalizeSymboleUnite(prev.symbole);
        set((s) => ({
          unitesMesure: s.unitesMesure.map((u) =>
            u.id === id
              ? {
                  ...u,
                  symbole,
                  libelle,
                  actif: data.actif ?? u.actif,
                  ordre: data.ordre ?? u.ordre,
                }
              : u,
          ),
          produits: symboleChange
            ? s.produits.map((p) =>
                normalizeSymboleUnite(p.unite) ===
                normalizeSymboleUnite(prev.symbole)
                  ? { ...p, unite: symbole }
                  : p,
              )
            : s.produits,
          journalActivites: [
            entreeActivite("modification", "unite_mesure", {
              entiteId: id,
              libelle: `${symbole} — ${libelle}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      deleteUniteMesure: (id) => {
        const state = get();
        const prev = state.unitesMesure.find((u) => u.id === id);
        if (!prev) return { ok: false as const, reason: "Unité introuvable." };
        const n = nbProduitsParUnite(state.produits, prev.symbole);
        if (n > 0) {
          return {
            ok: false as const,
            reason: `${n} article(s) utilisent « ${prev.symbole} ». Réassignez-les avant de supprimer.`,
          };
        }
        set((s) => ({
          unitesMesure: s.unitesMesure.filter((u) => u.id !== id),
          journalActivites: [
            entreeActivite("suppression", "unite_mesure", {
              entiteId: id,
              libelle: `${prev.symbole} — ${prev.libelle}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },

      addTypeClient: (data) => {
        const state = get();
        const code = normalizeCodeTypeClient(data.code);
        const libelle = data.libelle.trim();
        const motif = motifTypeClientInvalide(code, libelle, state.typesClients);
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("tc");
        const ordre =
          state.typesClients.reduce((m, t) => Math.max(m, t.ordre), 0) + 1;
        set((s) => ({
          typesClients: [
            ...s.typesClients,
            { id, code, libelle, ordre, actif: true },
          ],
          journalActivites: [
            entreeActivite("creation", "type_client", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updateTypeClient: (id, data) => {
        const state = get();
        const prev = state.typesClients.find((t) => t.id === id);
        if (!prev) return { ok: false as const, reason: "Type introuvable." };
        const code = normalizeCodeTypeClient(data.code ?? prev.code);
        const libelle = (data.libelle ?? prev.libelle).trim();
        const motif = motifTypeClientInvalide(
          code,
          libelle,
          state.typesClients,
          id,
        );
        if (motif) return { ok: false as const, reason: motif };
        const codeChange =
          normalizeCodeTypeClient(code) !== normalizeCodeTypeClient(prev.code);
        set((s) => ({
          typesClients: s.typesClients.map((t) =>
            t.id === id
              ? {
                  ...t,
                  code,
                  libelle,
                  actif: data.actif ?? t.actif,
                  ordre: data.ordre ?? t.ordre,
                }
              : t,
          ),
          clients: codeChange
            ? s.clients.map((c) =>
                normalizeCodeTypeClient(c.type) ===
                normalizeCodeTypeClient(prev.code)
                  ? { ...c, type: code }
                  : c,
              )
            : s.clients,
          tiers: codeChange
            ? (s.tiers ?? []).map((t) =>
                normalizeCodeTypeClient(t.type) ===
                normalizeCodeTypeClient(prev.code)
                  ? { ...t, type: code }
                  : t,
              )
            : s.tiers,
          journalActivites: [
            entreeActivite("modification", "type_client", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      deleteTypeClient: (id) => {
        const state = get();
        const prev = state.typesClients.find((t) => t.id === id);
        if (!prev) return { ok: false as const, reason: "Type introuvable." };
        const n = nbTiersParTypeClient(state.clients, state.tiers ?? [], prev.code);
        if (n > 0) {
          return {
            ok: false as const,
            reason: `${n} client(s) sont de type « ${prev.libelle} ». Réassignez-les avant de supprimer.`,
          };
        }
        set((s) => ({
          typesClients: s.typesClients.filter((t) => t.id !== id),
          journalActivites: [
            entreeActivite("suppression", "type_client", {
              entiteId: id,
              libelle: prev.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },

      addNatureDepenseMission: (data) => {
        const state = get();
        const libelle = data.libelle.trim();
        const motif = motifNatureDepenseInvalide(
          libelle,
          state.naturesDepenseMission ?? [],
        );
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("ndm");
        const ordre =
          (state.naturesDepenseMission ?? []).reduce(
            (m, n) => Math.max(m, n.ordre),
            0,
          ) + 1;
        set((s) => ({
          naturesDepenseMission: [
            ...(s.naturesDepenseMission ?? []),
            {
              id,
              libelle,
              compteChargeId: data.compteChargeId,
              ordre,
              actif: true,
            },
          ],
          journalActivites: [
            entreeActivite("creation", "nature_depense_mission", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updateNatureDepenseMission: (id, data) => {
        const state = get();
        const prev = (state.naturesDepenseMission ?? []).find((n) => n.id === id);
        if (!prev) return { ok: false as const, reason: "Nature introuvable." };
        const libelle = (data.libelle ?? prev.libelle).trim();
        const motif = motifNatureDepenseInvalide(
          libelle,
          state.naturesDepenseMission ?? [],
          id,
        );
        if (motif) return { ok: false as const, reason: motif };
        const libelleChange = libelle !== prev.libelle;
        set((s) => ({
          naturesDepenseMission: (s.naturesDepenseMission ?? []).map((n) =>
            n.id === id
              ? {
                  ...n,
                  libelle,
                  compteChargeId:
                    data.compteChargeId !== undefined
                      ? data.compteChargeId || undefined
                      : n.compteChargeId,
                  actif: data.actif ?? n.actif,
                  ordre: data.ordre ?? n.ordre,
                }
              : n,
          ),
          missionsAchat: libelleChange
            ? (s.missionsAchat ?? []).map((m) => ({
                ...m,
                depensesDiverses: m.depensesDiverses.map((d) =>
                  d.natureId === id ? { ...d, nature: libelle } : d,
                ),
              }))
            : s.missionsAchat,
          journalActivites: [
            entreeActivite("modification", "nature_depense_mission", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      deleteNatureDepenseMission: (id) => {
        const state = get();
        const prev = (state.naturesDepenseMission ?? []).find((n) => n.id === id);
        if (!prev) return { ok: false as const, reason: "Nature introuvable." };
        const n = nbDepensesParNature(state.missionsAchat ?? [], id);
        if (n > 0) {
          return {
            ok: false as const,
            reason: `${n} dépense(s) utilisent « ${prev.libelle} ». Suppression bloquée.`,
          };
        }
        set((s) => ({
          naturesDepenseMission: (s.naturesDepenseMission ?? []).filter(
            (x) => x.id !== id,
          ),
          journalActivites: [
            entreeActivite("suppression", "nature_depense_mission", {
              entiteId: id,
              libelle: prev.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      reclasseDepenseMission: (missionId, depenseId, compteId) => {
        if (!useAuthStore.getState().hasPermission("comptabilite.gerer")) {
          return {
            ok: false as const,
            reason: "Le reclassement est réservé au comptable.",
          };
        }
        const state = get();
        const mission = (state.missionsAchat ?? []).find((m) => m.id === missionId);
        if (!mission) return { ok: false as const, reason: "Mission introuvable." };
        const depense = mission.depensesDiverses.find((d) => d.id === depenseId);
        if (!depense) return { ok: false as const, reason: "Dépense introuvable." };
        const compte = state.comptesComptables.find((c) => c.id === compteId);
        if (!compte) return { ok: false as const, reason: "Compte introuvable." };
        const next: MissionAchat = {
          ...mission,
          depensesDiverses: mission.depensesDiverses.map((d) =>
            d.id === depenseId ? { ...d, compteReclasseId: compteId } : d,
          ),
        };
        set((s) =>
          avecJournal(s, {
            missionsAchat: (s.missionsAchat ?? []).map((m) =>
              m.id === missionId ? next : m,
            ),
            journalActivites: [
              entreeActivite("modification", "mission_achat", {
                entiteId: missionId,
                libelle: mission.numero,
                detail: `Reclassement dépense ${depense.nature} → ${compte.numero}`,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true as const };
      },

      addExerciceComptable: (data) => {
        const state = get();
        const existants = state.exercicesComptables ?? [];
        let dateDebut = "";
        let dateFin = "";
        let code = "";
        let libelle = (data.libelle ?? "").trim();
        let calendaire = data.calendaire;
        if (calendaire) {
          const annee = data.annee ?? new Date().getFullYear();
          if (!Number.isFinite(annee) || annee < 1990 || annee > 2200) {
            return { ok: false as const, reason: "Année d’exercice invalide." };
          }
          const bornes = bornesExerciceCalendaire(annee);
          dateDebut = bornes.dateDebut;
          dateFin = bornes.dateFin;
          code = bornes.code;
          libelle = libelle || bornes.libelle;
        } else {
          dateDebut = (data.dateDebut ?? "").slice(0, 10);
          dateFin = (data.dateFin ?? "").slice(0, 10);
          code = codeExerciceCheval(dateDebut, dateFin);
          libelle = libelle || (code ? `Exercice ${code}` : "");
        }
        const motif = motifExerciceInvalide(
          { code, libelle, dateDebut, dateFin },
          existants,
        );
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("ex");
        const actif = data.actif !== false && existants.filter((e) => e.actif && !e.cloture).length === 0
          ? true
          : Boolean(data.actif);
        const nouveau: ExerciceComptable = {
          id,
          code,
          libelle,
          dateDebut,
          dateFin,
          calendaire,
          actif,
          cloture: false,
        };
        set((s) => ({
          exercicesComptables: [
            nouveau,
            ...(s.exercicesComptables ?? []).map((e) =>
              actif ? { ...e, actif: false } : e,
            ),
          ],
          journalActivites: [
            entreeActivite("creation", "exercice_comptable", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updateExerciceComptable: (id, data) => {
        const state = get();
        const prev = (state.exercicesComptables ?? []).find((e) => e.id === id);
        if (!prev) return { ok: false as const, reason: "Exercice introuvable." };
        if (prev.cloture && data.cloture !== false) {
          if (data.dateDebut || data.dateFin || data.code) {
            return { ok: false as const, reason: "Un exercice clôturé ne peut plus changer de dates." };
          }
        }
        const calendaire = data.calendaire ?? prev.calendaire;
        let dateDebut = (data.dateDebut ?? prev.dateDebut).slice(0, 10);
        let dateFin = (data.dateFin ?? prev.dateFin).slice(0, 10);
        let code = (data.code ?? prev.code).trim();
        if (calendaire) {
          const annee = Number(dateDebut.slice(0, 4)) || new Date().getFullYear();
          const bornes = bornesExerciceCalendaire(annee);
          dateDebut = bornes.dateDebut;
          dateFin = bornes.dateFin;
          code = bornes.code;
        } else if (data.dateDebut || data.dateFin) {
          code = codeExerciceCheval(dateDebut, dateFin) || code;
        }
        const libelle = (data.libelle ?? prev.libelle).trim();
        const motif = motifExerciceInvalide(
          { code, libelle, dateDebut, dateFin },
          state.exercicesComptables ?? [],
          id,
        );
        if (motif) return { ok: false as const, reason: motif };
        const actif = data.actif ?? prev.actif;
        const cloture = data.cloture ?? prev.cloture;
        set((s) => ({
          exercicesComptables: (s.exercicesComptables ?? []).map((e) => {
            if (e.id === id) {
              return {
                ...e,
                code,
                libelle,
                dateDebut,
                dateFin,
                calendaire,
                actif: cloture ? false : actif,
                cloture,
              };
            }
            if (actif && !cloture) return { ...e, actif: false };
            return e;
          }),
          journalActivites: [
            entreeActivite("modification", "exercice_comptable", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      cloturerExerciceComptable: (id) => {
        const prev = (get().exercicesComptables ?? []).find((e) => e.id === id);
        if (!prev) return { ok: false as const, reason: "Exercice introuvable." };
        if (prev.cloture) return { ok: false as const, reason: "Cet exercice est déjà clôturé." };
        set((s) => ({
          exercicesComptables: (s.exercicesComptables ?? []).map((e) =>
            e.id === id ? { ...e, cloture: true, actif: false } : e,
          ),
          journalActivites: [
            entreeActivite("validation", "exercice_comptable", {
              entiteId: id,
              libelle: prev.libelle,
              detail: "cloture",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      deleteExerciceComptable: (id) => {
        const prev = (get().exercicesComptables ?? []).find((e) => e.id === id);
        if (!prev) return { ok: false as const, reason: "Exercice introuvable." };
        set((s) => ({
          exercicesComptables: (s.exercicesComptables ?? []).filter((e) => e.id !== id),
          journalActivites: [
            entreeActivite("suppression", "exercice_comptable", {
              entiteId: id,
              libelle: prev.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },

      addTarifClient: (tarif) =>
        set((state) => {
          const id = uid("tarif");
          const cli = state.clients.find((c) => c.id === tarif.clientId);
          return {
            tarifsClients: [{ ...tarif, id }, ...state.tarifsClients],
            journalActivites: [
              entreeActivite("creation", "tarif_client", {
                entiteId: id,
                libelle: cli?.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateTarifClient: (id, data) =>
        set((state) => {
          const prev = state.tarifsClients.find((t) => t.id === id);
          const hist: HistoriquePrix[] = [];
          if (prev && data.prixHT != null && data.prixHT !== prev.prixHT) {
            hist.push({
              id: uid("hprix"),
              ...creerEntreeHistorique({
                produitId: prev.produitId,
                champ: "tarif_client",
                ancienMontant: prev.prixHT,
                nouveauMontant: data.prixHT,
                clientId: prev.clientId,
              }),
            });
          }
          return {
            tarifsClients: state.tarifsClients.map((t) =>
              t.id === id ? { ...t, ...data } : t,
            ),
            historiquesPrix: [...hist, ...state.historiquesPrix],
          };
        }),
      deleteTarifClient: (id) =>
        set((state) => {
          const prev = state.tarifsClients.find((t) => t.id === id);
          const cli = state.clients.find((c) => c.id === prev?.clientId);
          return {
            tarifsClients: state.tarifsClients.filter((t) => t.id !== id),
            journalActivites: [
              entreeActivite("suppression", "tarif_client", {
                entiteId: id,
                libelle: cli?.nom,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addImmobilisation: (immo) =>
        set((state) => {
          const id = uid("immo");
          return {
            immobilisations: [{ ...immo, id }, ...state.immobilisations],
            journalActivites: [
              entreeActivite("creation", "immobilisation", {
                entiteId: id,
                libelle: immo.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      updateImmobilisation: (id, data) =>
        set((state) => {
          const prev = state.immobilisations.find((i) => i.id === id);
          return {
            immobilisations: state.immobilisations.map((i) =>
              i.id === id ? { ...i, ...data } : i,
            ),
            journalActivites: [
              entreeActivite("modification", "immobilisation", {
                entiteId: id,
                libelle: prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteImmobilisation: (id) =>
        set((state) => {
          const prev = state.immobilisations.find((i) => i.id === id);
          return {
            immobilisations: state.immobilisations.filter((i) => i.id !== id),
            journalActivites: [
              entreeActivite("suppression", "immobilisation", {
                entiteId: id,
                libelle: prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addMouvementCompteCourant: (m) => {
        const actor = getActiviteActor();
        const id = uid("cca");
        set((state) => ({
          mouvementsCompteCourant: [
            {
              ...m,
              id,
              userId: actor.id,
              userNom: actor.nom,
            },
            ...state.mouvementsCompteCourant,
          ],
          journalActivites: [
            entreeActivite("creation", "compte_courant", {
              entiteId: id,
              libelle: m.libelle,
              detail: `${m.type === "apport" ? "Apport" : "Retrait"} de ${m.montant} Ar`,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateMouvementCompteCourant: (id, data) =>
        set((state) => {
          const prev = state.mouvementsCompteCourant.find((x) => x.id === id);
          return {
            mouvementsCompteCourant: state.mouvementsCompteCourant.map((x) =>
              x.id === id ? { ...x, ...data } : x,
            ),
            journalActivites: [
              entreeActivite("modification", "compte_courant", {
                entiteId: id,
                libelle: data.libelle ?? prev?.libelle,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteMouvementCompteCourant: (id) =>
        set((state) => {
          const prev = state.mouvementsCompteCourant.find((x) => x.id === id);
          return {
            mouvementsCompteCourant: state.mouvementsCompteCourant.filter(
              (x) => x.id !== id,
            ),
            journalActivites: [
              entreeActivite("suppression", "compte_courant", {
                entiteId: id,
                libelle: prev?.libelle,
                detail: prev
                  ? `${prev.type === "apport" ? "Apport" : "Retrait"} de ${prev.montant} Ar`
                  : undefined,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addClient: (client) => {
        const fromClient = tiersDepuisClient({
          ...client,
          id: "tmp",
          code:
            client.code && client.code.trim()
              ? client.code.trim()
              : undefined,
        });
        return get().addTiers({
          ...fromClient,
          actif: client.actif,
        });
      },
      updateClient: (id, data) => {
        const state = get();
        const prevTiers = (state.tiers ?? []).find((t) => t.id === id);
        const prevClient = state.clients.find((c) => c.id === id);
        if (!prevTiers && !prevClient) {
          return { ok: false, reason: "Client introuvable." };
        }
        const patch: Partial<Tiers> = {
          nom: data.nom,
          code: data.code,
          telephone: data.telephone,
          email: data.email,
          adresse: data.adresse,
          ville: data.ville,
          nif: data.nif,
          stat: data.stat,
          type: data.type,
          actif: data.actif,
          contacts: data.contacts,
          delaiPaiementClientJours: data.delaiPaiementJours,
          remiseHabituelleClientPercent: data.remiseHabituellePercent,
          plafondCredit: data.plafondCredit,
          compteClientId: data.compteClientId,
        };
        const cleaned = Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined),
        ) as Partial<Tiers>;
        if (prevTiers) {
          return get().updateTiers(id, {
            ...cleaned,
            roles: prevTiers.roles.includes("client")
              ? prevTiers.roles
              : [...prevTiers.roles, "client"],
          });
        }
        return get().updateTiers(id, {
          ...tiersDepuisClient({ ...prevClient!, ...data }),
          roles: ["client"],
        });
      },
      deleteClient: (id) => {
        const state = get();
        const client = state.clients.find((c) => c.id === id);
        if (!client) return { ok: false, reason: "Client introuvable." };
        const motif = motifLienClient(id, {
          factures: state.factures,
          devis: state.devis,
          commandes: state.commandes,
          bonsDeLivraison: state.bonsDeLivraison,
          acomptes: state.acomptes,
          tarifsClients: state.tarifsClients,
        });
        if (motif) {
          return { ok: false, reason: motif };
        }
        set((s) => {
          const clients = s.clients.filter((c) => c.id !== id);
          const tiers = (s.tiers ?? [])
            .map((t) =>
              t.id === id
                ? { ...t, roles: t.roles.filter((r) => r !== "client") }
                : t,
            )
            .filter((t) => t.roles.length > 0);
          const sync = syncTiersState({
            clients,
            fournisseurs: s.fournisseurs,
            tiers,
          });
          return {
            ...sync,
            journalActivites: [
              entreeActivite("suppression", "client", {
                entiteId: id,
                libelle: client.nom,
              }),
              ...s.journalActivites,
            ],
          };
        });
        return { ok: true };
      },

      addFournisseur: (frn) => {
        const fromFrn = tiersDepuisFournisseur({
          ...frn,
          id: "tmp",
        });
        return get().addTiers({
          ...fromFrn,
          actif: frn.actif,
        });
      },
      updateFournisseur: (id, data) => {
        const state = get();
        const prevTiers = (state.tiers ?? []).find((t) => t.id === id);
        const prevFrn = state.fournisseurs.find((f) => f.id === id);
        if (!prevTiers && !prevFrn) {
          return { ok: false, reason: "Fournisseur introuvable." };
        }
        const patch: Partial<Tiers> = {
          nom: data.nom,
          telephone: data.telephone,
          email: data.email,
          adresse: data.adresse,
          ville: data.ville,
          nif: data.nif,
          stat: data.stat,
          specialite: data.specialite,
          actif: data.actif,
          delaiPaiementFournisseurJours: data.delaiPaiementJours,
          remiseHabituelleFournisseurPercent: data.remiseHabituellePercent,
          compteFournisseurId: data.compteFournisseurId,
        };
        const cleaned = Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined),
        ) as Partial<Tiers>;
        if (prevTiers) {
          return get().updateTiers(id, {
            ...cleaned,
            roles: prevTiers.roles.includes("fournisseur")
              ? prevTiers.roles
              : [...prevTiers.roles, "fournisseur"],
          });
        }
        return get().updateTiers(id, {
          ...tiersDepuisFournisseur({ ...prevFrn!, ...data }),
          roles: ["fournisseur"],
        });
      },
      deleteFournisseur: (id) => {
        const state = get();
        const frn = state.fournisseurs.find((f) => f.id === id);
        if (!frn) return { ok: false, reason: "Fournisseur introuvable." };
        if (frn.id === TIERS_DIVERS_MARCHE_ID) {
          return { ok: false, reason: "Le tiers système « Divers / Marché » ne peut pas être supprimé." };
        }
        if (fournisseurEstReference(id, frn.nom, state.entrees, state.achats, state.missionsAchat, state.demandesPrix)) {
          return {
            ok: false,
            reason:
              "Fournisseur déjà utilisé sur des entrées de stock. Désactivez-le pour préserver l'historique.",
          };
        }
        set((s) => {
          const fournisseurs = s.fournisseurs.filter((f) => f.id !== id);
          const tiers = (s.tiers ?? [])
            .map((t) =>
              t.id === id
                ? { ...t, roles: t.roles.filter((r) => r !== "fournisseur") }
                : t,
            )
            .filter((t) => t.roles.length > 0);
          const sync = syncTiersState({
            clients: s.clients,
            fournisseurs,
            tiers,
          });
          return {
            ...sync,
            journalActivites: [
              entreeActivite("suppression", "fournisseur", {
                entiteId: id,
                libelle: frn.nom,
              }),
              ...s.journalActivites,
            ],
          };
        });
        return { ok: true };
      },

      addTiers: (data) => {
        const roles = (data.roles ?? []).filter(
          (r) => r === "client" || r === "fournisseur",
        );
        if (roles.length === 0) {
          return { ok: false, reason: "Cochez au moins un rôle : Client ou Fournisseur." };
        }
        if (!data.nom.trim()) {
          return { ok: false, reason: "Le nom du tiers est obligatoire." };
        }
        const state = get();
        let comptes = state.comptesComptables;
        let compteClientId = roles.includes("client")
          ? data.compteClientId
          : undefined;
        let compteFournisseurId = roles.includes("fournisseur")
          ? data.compteFournisseurId
          : undefined;
        if (roles.includes("client")) {
          const auto = resoudreCompteTiersAuto({
            valeur: compteClientId,
            prefixe: PREFIXE_COMPTE_CLIENT,
            nomTiers: data.nom,
            comptes,
            parametres: state.parametres,
            tiers: state.tiers ?? [],
          });
          if (!auto.ok) return auto;
          comptes = auto.comptes;
          compteClientId = auto.compteId;
        }
        if (roles.includes("fournisseur")) {
          const auto = resoudreCompteTiersAuto({
            valeur: compteFournisseurId,
            prefixe: PREFIXE_COMPTE_FOURNISSEUR,
            nomTiers: data.nom,
            comptes,
            parametres: state.parametres,
            tiers: state.tiers ?? [],
          });
          if (!auto.ok) return auto;
          comptes = auto.comptes;
          compteFournisseurId = auto.compteId;
        }
        const motifComptes = motifComptesTiersInvalides(
          { roles, compteClientId, compteFournisseurId },
          comptes,
          state.tiers ?? [],
        );
        if (motifComptes) return { ok: false, reason: motifComptes };
        const id = uid(roles.includes("client") ? "cli" : "frn");
        const nouveau: Tiers = {
          ...data,
          id,
          nom: data.nom.trim(),
          roles,
          compteClientId,
          compteFournisseurId,
          code:
            data.code?.trim() ||
            (roles.includes("client") ? nextCodeClient(state.clients) : undefined),
          type: data.type ?? "autre",
        };
        const sync = syncTiersState({
          clients: state.clients,
          fournisseurs: state.fournisseurs,
          tiers: upsertTiersDansListe(state.tiers ?? [], nouveau),
        });
        set((s) =>
          avecJournal(s, {
            ...sync,
            comptesComptables: comptes,
            journalActivites: [
              entreeActivite("creation", "tiers", {
                entiteId: id,
                libelle: nouveau.nom,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true, id };
      },

      updateTiers: (id, data) => {
        const state = get();
        const prev = (state.tiers ?? []).find((t) => t.id === id);
        if (!prev) return { ok: false, reason: "Tiers introuvable." };
        const roles = data.roles
          ? data.roles.filter((r) => r === "client" || r === "fournisseur")
          : prev.roles;
        if (roles.length === 0) {
          return { ok: false, reason: "Cochez au moins un rôle : Client ou Fournisseur." };
        }
        if (prev.roles.includes("client") && !roles.includes("client")) {
          const motif = motifLienClient(id, {
            factures: state.factures,
            devis: state.devis,
            commandes: state.commandes,
            bonsDeLivraison: state.bonsDeLivraison,
            acomptes: state.acomptes,
            tarifsClients: state.tarifsClients,
          });
          if (motif) return { ok: false, reason: motif };
        }
        if (prev.roles.includes("fournisseur") && !roles.includes("fournisseur")) {
          if (
            fournisseurEstReference(
              id,
              prev.nom,
              state.entrees,
              state.achats,
              state.missionsAchat,
              state.demandesPrix,
            )
          ) {
            return {
              ok: false,
              reason:
                "Ce tiers a des achats ou des entrées fournisseur. Conservez le rôle Fournisseur.",
            };
          }
        }
        let comptes = state.comptesComptables;
        let compteClientId =
          data.compteClientId !== undefined
            ? data.compteClientId
            : prev.compteClientId;
        let compteFournisseurId =
          data.compteFournisseurId !== undefined
            ? data.compteFournisseurId
            : prev.compteFournisseurId;

        if (
          prev.compteClientId &&
          compteClientId !== prev.compteClientId &&
          compteUtiliseEnEcriture(prev.compteClientId, state.ecrituresComptables)
        ) {
          return { ok: false, reason: MSG_COMPTE_VERROUILLE };
        }
        if (
          prev.compteFournisseurId &&
          compteFournisseurId !== prev.compteFournisseurId &&
          compteUtiliseEnEcriture(
            prev.compteFournisseurId,
            state.ecrituresComptables,
          )
        ) {
          return { ok: false, reason: MSG_COMPTE_VERROUILLE };
        }

        if (!roles.includes("client")) {
          if (
            prev.compteClientId &&
            compteUtiliseEnEcriture(prev.compteClientId, state.ecrituresComptables)
          ) {
            compteClientId = prev.compteClientId;
          } else {
            compteClientId = undefined;
          }
        } else {
          const auto = resoudreCompteTiersAuto({
            valeur: compteClientId,
            prefixe: PREFIXE_COMPTE_CLIENT,
            nomTiers: data.nom ?? prev.nom,
            comptes,
            parametres: state.parametres,
            tiers: state.tiers ?? [],
            ignoreId: id,
          });
          if (!auto.ok) return auto;
          comptes = auto.comptes;
          compteClientId = auto.compteId;
        }
        if (!roles.includes("fournisseur")) {
          if (
            prev.compteFournisseurId &&
            compteUtiliseEnEcriture(
              prev.compteFournisseurId,
              state.ecrituresComptables,
            )
          ) {
            compteFournisseurId = prev.compteFournisseurId;
          } else {
            compteFournisseurId = undefined;
          }
        } else {
          const auto = resoudreCompteTiersAuto({
            valeur: compteFournisseurId,
            prefixe: PREFIXE_COMPTE_FOURNISSEUR,
            nomTiers: data.nom ?? prev.nom,
            comptes,
            parametres: state.parametres,
            tiers: state.tiers ?? [],
            ignoreId: id,
          });
          if (!auto.ok) return auto;
          comptes = auto.comptes;
          compteFournisseurId = auto.compteId;
        }

        const motifComptes = motifComptesTiersInvalides(
          { roles, compteClientId, compteFournisseurId },
          comptes,
          state.tiers ?? [],
          id,
          {
            exigerClient:
              roles.includes("client") &&
              (!prev.roles.includes("client") ||
                data.compteClientId !== undefined ||
                Boolean(prev.compteClientId)),
            exigerFournisseur:
              roles.includes("fournisseur") &&
              (!prev.roles.includes("fournisseur") ||
                data.compteFournisseurId !== undefined ||
                Boolean(prev.compteFournisseurId)),
          },
        );
        if (motifComptes) return { ok: false, reason: motifComptes };

        const next: Tiers = {
          ...prev,
          ...data,
          id,
          roles,
          compteClientId,
          compteFournisseurId,
        };
        const sync = syncTiersState({
          clients: state.clients,
          fournisseurs: state.fournisseurs,
          tiers: upsertTiersDansListe(state.tiers ?? [], next),
        });
        set((s) =>
          avecJournal(s, {
            ...sync,
            comptesComptables: comptes,
            journalActivites: [
              entreeActivite("modification", "tiers", {
                entiteId: id,
                libelle: next.nom,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },

      deleteTiers: (id) => {
        const state = get();
        const prev = (state.tiers ?? []).find((t) => t.id === id);
        if (!prev) return { ok: false, reason: "Tiers introuvable." };
        if (prev.systeme || prev.id === TIERS_DIVERS_MARCHE_ID) {
          return { ok: false, reason: "Ce tiers système ne peut pas être supprimé." };
        }
        if (prev.roles.includes("client")) {
          const motif = motifLienClient(id, {
            factures: state.factures,
            devis: state.devis,
            commandes: state.commandes,
            bonsDeLivraison: state.bonsDeLivraison,
            acomptes: state.acomptes,
            tarifsClients: state.tarifsClients,
          });
          if (motif) return { ok: false, reason: motif };
        }
        if (
          prev.roles.includes("fournisseur") &&
          fournisseurEstReference(id, prev.nom, state.entrees, state.achats, state.missionsAchat, state.demandesPrix)
        ) {
          return {
            ok: false,
            reason:
              "Tiers déjà utilisé sur des achats. Désactivez-le pour préserver l'historique.",
          };
        }
        const tiers = (state.tiers ?? []).filter((t) => t.id !== id);
        const sync = syncTiersState({
          clients: state.clients.filter((c) => c.id !== id),
          fournisseurs: state.fournisseurs.filter((f) => f.id !== id),
          tiers,
        });
        set((s) => ({
          ...sync,
          journalActivites: [
            entreeActivite("suppression", "tiers", {
              entiteId: id,
              libelle: prev.nom,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      updatePlafondCredit: (id, plafondCredit) => {
        const plafond = Math.max(0, Number(plafondCredit) || 0);
        const state = get();
        const prev = (state.tiers ?? []).find((t) => t.id === id);
        if (!prev) {
          const client = state.clients.find((c) => c.id === id);
          if (!client) return { ok: false, reason: "Tiers introuvable." };
          get().updateClient(id, { plafondCredit: plafond });
          return { ok: true };
        }
        return get().updateTiers(id, { plafondCredit: plafond });
      },

      controlerPlafondCreditClient: (clientId, opts) => {
        const state = get();
        const client = state.clients.find((c) => c.id === clientId);
        return controlerPlafondCredit(client, state, opts);
      },

      addDevis: (devis) => {
        const id = uid("dev");
        set((state) => ({
          devis: [{ ...devis, id }, ...state.devis],
          journalActivites: [
            entreeActivite("creation", "devis", {
              entiteId: id,
              libelle: devis.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateDevis: (id, data) =>
        set((state) => {
          const prev = state.devis.find((d) => d.id === id);
          if (prev && verrouTransformationActif(prev.verrouTransformation)) {
            return state;
          }
          const annulation = data.statut === "refuse" || data.statut === "expire";
          return {
            devis: state.devis.map((d) =>
              d.id === id ? { ...d, ...data } : d,
            ),
            journalActivites: [
              entreeActivite(
                annulation ? "annulation" : "modification",
                "devis",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteDevis: (id) =>
        set((state) => {
          const prev = state.devis.find((d) => d.id === id);
          return {
            devis: state.devis.filter((d) => d.id !== id),
            journalActivites: [
              entreeActivite("suppression", "devis", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addCommande: (cmd) => {
        const id = uid("cmd");
        set((state) => ({
          commandes: [{ ...cmd, id }, ...state.commandes],
          journalActivites: [
            entreeActivite("creation", "commande", {
              entiteId: id,
              libelle: cmd.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateCommande: (id, data) =>
        set((state) => {
          const prev = state.commandes.find((c) => c.id === id);
          if (prev && verrouTransformationActif(prev.verrouTransformation)) {
            return state;
          }
          return {
            commandes: state.commandes.map((c) =>
              c.id === id ? { ...c, ...data } : c,
            ),
            journalActivites: [
              entreeActivite(
                data.statut === "annulee" ? "annulation" : "modification",
                "commande",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteCommande: (id) =>
        set((state) => {
          const prev = state.commandes.find((c) => c.id === id);
          return {
            commandes: state.commandes.filter((c) => c.id !== id),
            bonsATirer: (state.bonsATirer ?? []).filter((b) => b.commandeId !== id),
            journalActivites: [
              entreeActivite("suppression", "commande", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addBonDeLivraison: (bl) => {
        const id = uid("bl");
        set((state) => ({
          bonsDeLivraison: [{ ...bl, id }, ...state.bonsDeLivraison],
          journalActivites: [
            entreeActivite("creation", "bon_de_livraison", {
              entiteId: id,
              libelle: bl.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateBonDeLivraison: (id, data) =>
        set((state) => {
          const prev = state.bonsDeLivraison.find((b) => b.id === id);
          if (prev && verrouTransformationActif(prev.verrouTransformation)) {
            return state;
          }
          return {
            bonsDeLivraison: state.bonsDeLivraison.map((b) =>
              b.id === id ? { ...b, ...data } : b,
            ),
            journalActivites: [
              entreeActivite(
                data.statut === "annule" ? "annulation" : "modification",
                "bon_de_livraison",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteBonDeLivraison: (id) =>
        set((state) => {
          const prev = state.bonsDeLivraison.find((b) => b.id === id);
          return {
            bonsDeLivraison: state.bonsDeLivraison.filter((b) => b.id !== id),
            journalActivites: [
              entreeActivite("suppression", "bon_de_livraison", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),

      verrouillerTransformation: (kind, id, cible) => {
        get().libererVerrousExpires();
        const state = get();
        const doc = trouverSource(state, kind, id);
        if (!doc) return { ok: false, reason: "Document introuvable." };
        if (kind === "devis" && doc.statut === "transforme") {
          return {
            ok: false,
            reason: "Ce devis a déjà été transformé.",
          };
        }
        if (verrouTransformationActif(doc.verrouTransformation)) {
          const v = doc.verrouTransformation!;
          const actor = getActiviteActor();
          if (
            v.cible === cible &&
            v.userId &&
            actor.id &&
            v.userId === actor.id
          ) {
            return { ok: true };
          }
          return {
            ok: false,
            reason: `Document verrouillé par ${v.userNom || "un autre utilisateur"} (transformation en cours).`,
          };
        }
        const statutPrecedent =
          doc.statut === "en_transformation"
            ? (doc.verrouTransformation?.statutPrecedent ?? "brouillon")
            : doc.statut;
        const verrou = creerVerrouTransformation(cible, statutPrecedent);
        const statutVerrou =
          kind === "devis"
            ? ("en_transformation" as DevisStatut)
            : kind === "commande"
              ? ("en_transformation" as CommandeStatut)
              : ("en_transformation" as BonDeLivraisonStatut);
        set((s) => ({
          ...patcherSource(s, kind, id, {
            statut: statutVerrou,
            verrouTransformation: verrou,
          }),
        }));
        return { ok: true };
      },

      annulerTransformation: (kind, id) => {
        const doc = trouverSource(get(), kind, id);
        if (!doc?.verrouTransformation) return;
        const precedent = doc.verrouTransformation.statutPrecedent;
        set((s) => ({
          ...patcherSource(s, kind, id, {
            statut: precedent,
            verrouTransformation: null,
          }),
        }));
      },

      libererVerrousExpires: () =>
        set((state) => ({
          devis: state.devis.map(libererSiExpire),
          commandes: state.commandes.map(libererSiExpire),
          bonsDeLivraison: state.bonsDeLivraison.map(libererSiExpire),
        })),

      finaliserTransformation: (payload) => {
        const state = get();
        const doc = trouverSource(state, payload.sourceType, payload.sourceId);
        if (!doc) return { ok: false, reason: "Document source introuvable." };
        if (!verrouTransformationActif(doc.verrouTransformation)) {
          get().libererVerrousExpires();
          return {
            ok: false,
            reason:
              "Le délai de validation (10 min) est dépassé, ou le document n'est plus verrouillé.",
          };
        }
        const actor = getActiviteActor();
        const transformation: TransformationCommerciale = {
          id: uid("trf"),
          date: new Date().toISOString(),
          userId: actor.id,
          userNom: actor.nom,
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          sourceNumero: doc.numero,
          cibleType: payload.cibleType,
          cibleId: payload.cibleId,
          cibleNumero: payload.cibleNumero,
        };
        set((s) => ({
          ...patcherSource(s, payload.sourceType, payload.sourceId, {
            statut: payload.statutSource,
            verrouTransformation: null,
          }),
          transformations: [transformation, ...(s.transformations ?? [])],
          journalActivites: [
            entreeActivite("validation", entiteSource(payload.sourceType), {
              entiteId: payload.sourceId,
              libelle: doc.numero,
              detail: `${doc.numero} → ${payload.cibleNumero}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      addFacture: (facture, audit) => {
        const state = get();
        if (factureImpacteEncours(facture) && !facture.derogationCredit) {
          const client = state.clients.find((c) => c.id === facture.clientId);
          const montant = totauxFacture(
            { ...facture, id: "tmp-credit" },
            state.parametres,
            state.acomptes,
          ).totalTTC;
          const garde = controlerPlafondCredit(client, state, {
            montantSupplementaire: montant,
          });
          if (!garde.ok) {
            return { ok: false, reason: garde.reason ?? "Plafond de crédit dépassé." };
          }
        }
        const id = uid("fac");
        set((state) => {
          const modele = modeleCourant(state, "facture");
          const actor = getActiviteActor();
          const complete = figerCumpSiCloture(
            avecPresentationSiBesoin(
              {
                ...facture,
                id,
                vendeurId: facture.vendeurId ?? actor.id,
                vendeurNom: facture.vendeurNom ?? actor.nom,
              },
              state.parametres,
              modele,
            ),
            state,
          );
          const factures = [complete, ...state.factures];
          return avecJournal(state, {
            factures,
            ventes: rebuildVentesDepuisFactures(factures),
            journalActivites: [
              entreeActivite("creation", "facture", {
                entiteId: id,
                libelle: facture.numero,
                detail: audit?.detail,
              }),
              ...state.journalActivites,
            ],
            journalAudit: [
              {
                id: uid("aud"),
                ...creerEntreeJournal({
                  action:
                    audit?.action ??
                    (facture.statut === "proforma"
                      ? "facture_proforma"
                      : facture.statut === "brouillon"
                        ? "facture_brouillon"
                        : "facture_validee"),
                  entiteId: id,
                  numero: facture.numero,
                  detail: audit?.detail,
                }),
              },
              ...state.journalAudit,
            ],
          });
        });
        return { ok: true, id };
      },
      updateFacture: (id, data, audit) =>
        set((state) => {
          const prev = state.factures.find((f) => f.id === id);
          if (!prev) return state;

          const {
            lignes,
            clientId,
            pointDeVenteId,
            date,
            echeance,
            tauxTVA,
            conditionsPaiement,
            note,
            remiseGlobale,
            remiseGlobaleMode,
            devisId,
            commandeId,
            bonDeLivraisonId,
            factureParenteId: _factureParenteId,
            acomptesDocument: acomptesDocumentPatch,
            presentation: presentationPatch,
            ...suiviAutorise
          } = data;

          const patch: Partial<typeof prev> = { ...suiviAutorise };

          const estConversionFiscale =
            (prev.statut === "brouillon" ||
              prev.statut === "proforma" ||
              prev.type === "proforma") &&
            (data.statut === "validee" ||
              data.statut === "envoyee" ||
              data.statut === "payee" ||
              data.statut === "partiellement_payee");

          /** Brouillons / proformas : contenu encore modifiable. Factures fiscales : figées. */
          if (!factureEstFiscale(prev) && !estConversionFiscale) {
            if (lignes !== undefined) patch.lignes = lignes;
            if (clientId !== undefined) patch.clientId = clientId;
            if (pointDeVenteId !== undefined) patch.pointDeVenteId = pointDeVenteId;
            if (date !== undefined) patch.date = date;
            if (echeance !== undefined) patch.echeance = echeance;
            if (tauxTVA !== undefined) patch.tauxTVA = tauxTVA;
            if (conditionsPaiement !== undefined)
              patch.conditionsPaiement = conditionsPaiement;
            if (note !== undefined) patch.note = note;
            if ("remiseGlobale" in data) patch.remiseGlobale = remiseGlobale;
            if ("remiseGlobaleMode" in data)
              patch.remiseGlobaleMode = remiseGlobaleMode;
            if (devisId !== undefined) patch.devisId = devisId;
            if (commandeId !== undefined) patch.commandeId = commandeId;
            if (bonDeLivraisonId !== undefined)
              patch.bonDeLivraisonId = bonDeLivraisonId;
            if (acomptesDocumentPatch !== undefined)
              patch.acomptesDocument = acomptesDocumentPatch;
            delete patch.numero;
            delete patch.type;
            delete patch.dateValidation;
            delete patch.presentation;
          }

          if (estConversionFiscale) {
            if (data.numero !== undefined) patch.numero = data.numero;
            if (data.type !== undefined) patch.type = data.type;
            if (data.dateValidation !== undefined)
              patch.dateValidation = data.dateValidation;
            if (acomptesDocumentPatch !== undefined)
              patch.acomptesDocument = acomptesDocumentPatch;
            const modele = modeleCourant(state, "facture");
            patch.presentation =
              presentationPatch ??
              prev.presentation ??
              creerSnapshotPresentation(state.parametres, modele);
          }

          const journal = [...state.journalAudit];
          if (audit) {
            journal.unshift({
              id: uid("aud"),
              ...creerEntreeJournal({
                action: audit.action,
                entiteId: id,
                numero: patch.numero ?? prev.numero,
                detail: audit.detail,
              }),
            });
          }
          const factures = state.factures.map((f) =>
            f.id === id
              ? figerCumpSiCloture({ ...f, ...patch }, state)
              : f,
          );
          const estAnnulation = data.statut === "annulee";
          return avecJournal(state, {
            factures,
            ventes: rebuildVentesDepuisFactures(factures),
            journalAudit: journal,
            journalActivites: [
              entreeActivite(
                estAnnulation ? "annulation" : "modification",
                "facture",
                {
                  entiteId: id,
                  libelle: patch.numero ?? prev.numero,
                  detail: audit?.detail,
                },
              ),
              ...state.journalActivites,
            ],
          });
        }),
      deleteFacture: (id) => {
        const state = get();
        const prev = state.factures.find((f) => f.id === id);
        if (!prev) return { ok: false, reason: "Document introuvable." };
        if (factureEstFiscale(prev)) {
          return {
            ok: false,
            reason:
              "Les factures fiscales ne peuvent pas être supprimées : utilisez une facture d'avoir.",
          };
        }
        set((s) => {
          const factures = s.factures
            .filter((f) => f.id !== id)
            .map((f) =>
              f.factureParenteId === id
                ? { ...f, factureParenteId: undefined }
                : f,
            );
          return avecJournal(s, {
            factures,
            ventes: rebuildVentesDepuisFactures(factures),
            journalActivites: [
              entreeActivite("suppression", "facture", {
                entiteId: id,
                libelle: prev.numero,
              }),
              ...s.journalActivites,
            ],
            journalAudit: [
              {
                id: uid("aud"),
                ...creerEntreeJournal({
                  action: "facture_supprimee",
                  entiteId: id,
                  numero: prev.numero,
                  detail:
                    prev.type === "proforma" || prev.statut === "proforma"
                      ? "Suppression proforma"
                      : "Suppression brouillon",
                }),
              },
              ...s.journalAudit,
            ],
          });
        });
        return { ok: true };
      },
      addJournalAudit: (entry) =>
        set((state) => ({
          journalAudit: [{ ...entry, id: uid("aud") }, ...state.journalAudit],
        })),
      purgeJournalAuditOlderThan: (days) => {
        const cutoff = Date.now() - days * 86_400_000;
        const before = get().journalAudit;
        const kept = before.filter(
          (e) => new Date(e.date).getTime() >= cutoff,
        );
        set({ journalAudit: kept });
        return before.length - kept.length;
      },

      logActivite: (action, entite, opts) =>
        set((state) => ({
          journalActivites: [
            entreeActivite(action, entite, opts),
            ...state.journalActivites,
          ],
        })),
      purgeJournalActivitesOlderThan: (days) => {
        const cutoff = Date.now() - days * 86_400_000;
        const before = get().journalActivites;
        const kept = before.filter(
          (e) => new Date(e.date).getTime() >= cutoff,
        );
        set({ journalActivites: kept });
        return before.length - kept.length;
      },

      addInventaire: (inventaire) => {
        const id = uid("inv");
        set((state) => ({
          inventaires: [{ ...inventaire, id }, ...state.inventaires],
          journalActivites: [
            entreeActivite("creation", "inventaire", {
              entiteId: id,
              libelle: inventaire.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateInventaire: (id, data) =>
        set((state) => {
          const prev = state.inventaires.find((i) => i.id === id);
          return {
            inventaires: state.inventaires.map((i) =>
              i.id === id ? { ...i, ...data } : i,
            ),
            journalActivites: [
              entreeActivite("modification", "inventaire", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      deleteInventaire: (id) =>
        set((state) => {
          const prev = state.inventaires.find((i) => i.id === id);
          return {
            inventaires: state.inventaires.filter((i) => i.id !== id),
            journalActivites: [
              entreeActivite("suppression", "inventaire", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      validerInventaire: (id) =>
        set((state) => {
          const prev = state.inventaires.find((i) => i.id === id);
          return {
            inventaires: state.inventaires.map((i) =>
              i.id === id
                ? {
                    ...i,
                    statut: "valide",
                    dateValidation: new Date().toISOString(),
                  }
                : i,
            ),
            journalActivites: [
              entreeActivite("validation", "inventaire", {
                entiteId: id,
                libelle: prev?.numero,
                detail: "Clôture d'inventaire",
              }),
              ...state.journalActivites,
            ],
          };
        }),

      addAcompte: (acompte) => {
        const id = uid("aco");
        set((state) => ({
          acomptes: [{ ...acompte, id }, ...state.acomptes],
          journalActivites: [
            entreeActivite("creation", "acompte", {
              entiteId: id,
              libelle: acompte.numero,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateAcompte: (id, data) =>
        set((state) => {
          const prev = state.acomptes.find((a) => a.id === id);
          return {
            acomptes: state.acomptes.map((a) =>
              a.id === id ? { ...a, ...data } : a,
            ),
            journalActivites: [
              entreeActivite(
                data.statut === "annule" ? "annulation" : "modification",
                "acompte",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteAcompte: (id) =>
        set((state) => {
          const prev = state.acomptes.find((a) => a.id === id);
          return {
            acomptes: state.acomptes.filter((a) => a.id !== id),
            journalActivites: [
              entreeActivite("suppression", "acompte", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      encaisserAcompte: (data) => {
        const montantTTC = Math.round(Number(data.montantTTC) || 0);
        if (!data.clientId || montantTTC <= 0) {
          return { ok: false, reason: "Montant d'acompte invalide." };
        }
        const state = get();
        const assujetti = appliqueTVA(state.parametres);
        const { ht } = splitTTC(
          montantTTC,
          state.parametres.tauxTVA,
          assujetti,
        );
        const numeroAco = nextNumero(
          "ACO",
          state.acomptes.map((a) => a.numero),
          optsNum(state, data.date),
        );
        const generer = data.genererFactureAcompte !== false;
        let factureAcompteId: string | undefined;
        if (generer) {
          const pdvId =
            data.pointDeVenteId || state.pointsDeVente[0]?.id || "";
          const numeroFac = nextNumeroDocumentCommercial({
            prefix: "FACACO",
            pointDeVenteId: pdvId,
            pointsDeVente: state.pointsDeVente,
            existing: state.factures.map((f) => f.numero),
            date: data.date,
            parametres: state.parametres,
          });
          const facAco = get().addFacture({
            numero: numeroFac,
            type: "acompte",
            clientId: data.clientId,
            pointDeVenteId: pdvId,
            date: data.date,
            echeance: data.date,
            statut: "payee",
            montantPaye: montantTTC,
            devisId: data.devisId,
            commandeId: data.commandeId,
            factureParenteId: data.factureId,
            tauxTVA: state.parametres.tauxTVA,
            dateValidation: new Date().toISOString(),
            note: `Facture d'acompte — ${numeroAco}`,
            acomptesDocument: [],
            lignes: [
              {
                id: "aco-ligne-1",
                designation: `Acompte sur ${data.refDocument}`,
                quantite: 1,
                prixUnitaire: ht,
                unite: "forfait",
              },
            ],
          });
          if (facAco.ok) factureAcompteId = facAco.id;
        }
        const acompteId = get().addAcompte({
          numero: numeroAco,
          date: data.date,
          clientId: data.clientId,
          montantTTC,
          tauxTVA: state.parametres.tauxTVA,
          modePaiement: data.modePaiement,
          devisId: data.devisId,
          commandeId: data.commandeId,
          factureId: data.factureId || factureAcompteId,
          factureAcompteId,
          statut: data.factureId || factureAcompteId ? "impute" : "enregistre",
          note: data.note,
        });
        return {
          ok: true,
          acompteId,
          numero: numeroAco,
          factureAcompteId,
        };
      },

      applyBusinessData: (data) => {
        set((state) => {
          const modele = modelePourType(
            data.modelesDocuments,
            "facture",
            {
              preferences: data.preferencesModeles ?? state.preferencesModeles,
              userId: getActiviteActor().id,
            },
          );
          const parametres = data.parametres ?? state.parametres;
          const factures = data.factures.map((f) =>
            avecPresentationSiBesoin(f, parametres, modele, {
              legacySansSignature: true,
            }),
          );
          const merged = pickAppState({ ...data, factures });
          const sync = etatAvecTiersDivers({
            clients: ensureCodesClients(merged.clients),
            fournisseurs: merged.fournisseurs,
            tiers: merged.tiers,
          });
          const comptesProduits = etatApresMigrationComptes({
            ...merged,
            ...sync,
          });
          return avecJournal(
            { ...merged, ...sync, ...comptesProduits },
            {
              ...merged,
              ...sync,
              ...comptesProduits,
              ventes: rebuildVentesDepuisFactures(factures),
            },
          );
        });
        get().libererVerrousExpires();
      },
      clearBusinessData: () => set({ ...emptyAppState() }),
      resetBusinessData: async (password) => {
        setBusinessSyncEnabled(false);
        try {
          const res = await resetBusinessState(password);
          set({
            ...pickAppState(res.data),
            ventes: rebuildVentesDepuisFactures(res.data.factures),
          });
          return { ok: true as const };
        } catch (err) {
          return {
            ok: false as const,
            error:
              err instanceof Error
                ? err.message
                : "Reset impossible.",
          };
        } finally {
          setBusinessSyncEnabled(true);
        }
      },
}));

/** Sync automatique vers l'API après chaque mutation métier. */
if (typeof window !== "undefined") {
  useStore.subscribe((state) => {
    scheduleBusinessSave(pickAppState(state));
  });
  installBusinessSaveLifecycle();
  try {
    localStorage.removeItem("stwr-poissonnerie-v4");
  } catch {
    /* ignore */
  }
}
