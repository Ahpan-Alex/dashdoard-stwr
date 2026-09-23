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
  completerLigneLivraison,
  motifEcartLivraisonNonValide,
  quantiteLivreeProduit,
  quantiteRetourneeProduit,
  reliquatProduit,
  soldeAchat,
  statutLivraisonRecord,
  motifDestinationAchatManquante,
  destinationDepuisOf,
} from "./achats";
import {
  motifVentilationInvalide,
  nextNumeroLotPaiement,
  repartirModesSurVentilations,
} from "./lots-paiement";
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
  regenererEntreesAvoirsClient,
  splitTTC,
  totauxFacture,
  resteAPayer,
  totalAvoirsSurFacture,
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
import {
  completerLignePaiement,
  compteTresorerieUtilise,
  modePaiementUtilise,
  infererTypeComptePourMode,
  motifCompteTresorerieInvalide,
  motifModeCompteTresorerie,
  motifModePaiementInvalide,
  motifOperationTresorerieInvalide,
  motifSaisieLignePaiement,
  motifSiteSansTresorerie,
  montantLignesPaiement,
  normaliserSoldeInitial,
  type SaisieLignePaiement,
} from "./tresorerie";
import {
  assurerJournauxParCompteTresorerie,
  codeJournalDepuisLibelle,
  journalTresorerieUtilise,
  motifJournalTresorerieInvalide,
  normaliserCodeJournal,
} from "./journaux-tresorerie";
import {
  libelleMotifSortieAtelier,
  motifSortieAtelierInvalide,
  regenererEntreesSortiesAtelier,
} from "./sorties-atelier";
import {
  libelleEmplacement,
  motifEmplacementInvalide,
  nbLignesBpSurEmplacement,
} from "./emplacements-stock";
import { emptyAppState, pickAppState } from "./empty-state";
import { motifRepartitionInvalide, siteEstAtelier, sitesAchat, utilisateurRattacheAuSite } from "./sites";
import {
  motifRepartitionOfInvalide,
  nextNumeroTransfertMatiereOf,
  quantiteReserveeOf,
  stockDisponiblePourOf,
  stockLibreDisponible,
} from "./repartition-achat-of";
import { ctxReservationDepuisEtat } from "./reservation-commande";
import {
  motifBesoinAchatInvalide,
  nextNumeroBesoinAchat,
  prorataRepartitionsOf,
} from "./besoins-achat";
import {
  appliquerRoleUnique,
  appliquerSeedComptesDefaut,
  assurerComptesGlDesComptesTresorerie,
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
  numeroEstCompte471,
  MSG_COMPTE_VERROUILLE,
  parserCsvPlanComptable,
  PREFIXE_COMPTE_CLIENT,
  PREFIXE_COMPTE_FOURNISSEUR,
  PREFIXE_COMPTE_MISSION_ACHETEUR,
  prochainNumeroSousCompteTiers,
  regenererEcrituresComptables,
  numeroEstCompte467,
  VALEUR_COMPTE_TIERS_AUTO,
  validerImportPlanComptable,
  dedupliquerIdsComptes,
  type PrefixeCompteTiers,
} from "./comptabilite";
import { PLAN_PCG_2005 } from "./pcg-2005";
import {
  appliquerFusionTiers,
  type ChampFusionTiers,
} from "./import-tiers";
import {
  enregistrerJournalAudit,
  resumeRemisesDocument,
  type JournalAuditPayload,
} from "./journal-audit";
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
  motifLancementOfDimension,
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
  actorPeutValiderBat,
  batAFichier,
  batCourantCycle,
  cycleIdBat,
  motifBatOfManquant,
  motifCreationBatImpossible,
  prochaineVersionCycle,
  produitIdsBat,
} from "./bat";
import {
  depensesValides,
  etapeValidationMission,
  evenementsSaisieMission,
  listerMouvementsBloquantAnnulationMission,
  messageAnnulationMissionRefusee,
  missionEstVerrouillee,
  missionPeutEtreSupprimee,
  motifClotureImpossible,
  motifDepenseDiverseInvalide,
  motifLigneMissionInvalide,
  nextNumeroMission,
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
  synchroniserConsultations,
} from "./demandes-prix";
import { normaliserValiditeJours } from "./validite-document";
import {
  cycleNomenclature,
  normaliserNomenclatures,
} from "./nomenclature";
import {
  dimensionDepuisCommande,
  motifDimensionNomenclatureManquante,
  motifNomenclaturesProduit,
  resoudreLignesNomenclatureOf,
} from "./nomenclature-formules";
import {
  estUsageCommercial,
  motifProduitNonAchetable,
  natureStockDuProduit,
  produitEstAchetable,
  produitEstFabrique,
  usageCommercialDuProduit,
} from "./nature-stock";
import { modeApprovisionnementEnregistre } from "./mode-approvisionnement";
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
import { parserReleveBancaireCsv } from "./rapprochement-bancaire";
import { getActiviteActor } from "./activity-actor";
import { useAuthStore } from "./auth-store";
import { estAdministrateur } from "./auth/rbac";
import {
  creerVerrouTransformation,
  verrouTransformationActif,
} from "./transformation-document";
import {
  avecVersionSiStatutChange,
  snapshotVersionBp,
} from "./bon-de-preparation";
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
  BonDePreparation,
  BonDePreparationStatut,
  CategorieProduit,
  CibleTransformation,
  Client,
  CompteComptable,
  CompteTresorerie,
  JournalTresorerie,
  LigneReleveBancaire,
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
  LignePaiement,
  LivraisonAchatLigne,
  LotPaiementFournisseur,
  ModePaiement,
  ModePaiementParam,
  MouvementCompteCourant,
  NomenclatureProduit,
  Parametres,
  PointDeVente,
  Produit,
  RelanceImpayee,
  RelanceImpayeeCanal,
  Reclassement471,
  RoleCompteComptable,
  SourceTransformation,
  SortieAtelier,
  StatutChequeDiffere,
  TarifClient,
  TransfertComptable,
  Tiers,
  TypeCompteTresorerie,
  TransfertStock,
  TransfertStockLigne,
  TransfertMatiereOf,
  TransformationCommerciale,
  TypeClient,
  NatureDepenseMission,
  OperationTresorerie,
  UniteMesure,
  Vente,
  BesoinAchat,
  OrdreFabrication,
  TypeNomenclature,
  CompteMissionAcheteur,
  MissionAchat,
  MissionAchatRealise,
  MissionDepenseDiverse,
  MissionJustificatif,
  MissionLignePrevisionnelle,
  MissionMouvementFonds,
  MissionReglementStatut,
  MotifSortieAtelier,
  EmplacementStock,
  DemandePrix,
  DemandePrixConsultationStatut,
  DemandePrixLigne,
  DemandePrixOffre,
  DemandePrixStatut,
  DestinationAchat,
  ExerciceComptable,
  BatMotifRefus,
  BatOrigine,
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
  bonsDePreparation: BonDePreparation[];
  bonsDeLivraison: BonDeLivraison[];
  factures: Facture[];
  acomptes: Acompte[];
  transformations: TransformationCommerciale[];
  achats: Achat[];
  lotsPaiementFournisseur: LotPaiementFournisseur[];
  transfertsStock: TransfertStock[];
  transfertsMatiereOf: TransfertMatiereOf[];
  ordresFabrication: OrdreFabrication[];
  bonsATirer: BonATirer[];
  missionsAchat: MissionAchat[];
  comptesMissionAcheteur: CompteMissionAcheteur[];
  demandesPrix: DemandePrix[];
  besoinsAchat: BesoinAchat[];
  pointsDeVente: PointDeVente[];
  categoriesProduits: CategorieProduit[];
  unitesMesure: UniteMesure[];
  typesClients: TypeClient[];
  naturesDepenseMission: NatureDepenseMission[];
  motifsSortieAtelier: MotifSortieAtelier[];
  emplacementsStock: EmplacementStock[];
  sortiesAtelier: SortieAtelier[];
  comptesTresorerie: CompteTresorerie[];
  journauxTresorerie: JournalTresorerie[];
  operationsTresorerie: OperationTresorerie[];
  lignesReleveBancaire: LigneReleveBancaire[];
  modesPaiement: ModePaiementParam[];
  exercicesComptables: ExerciceComptable[];
  produits: Produit[];
  tarifsClients: TarifClient[];
  historiquesPrix: HistoriquePrix[];
  journalAudit: JournalAudit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  relancesImpayes: RelanceImpayee[];
  inventaires: Inventaire[];
  journalActivites: JournalActivite[];
  comptesComptables: CompteComptable[];
  ecrituresComptables: EcritureComptable[];
  reclassements471: Reclassement471[];
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

  addPointDeVente: (
    pdv: Omit<PointDeVente, "id">,
  ) => { ok: true; id: string } | { ok: false; reason: string };
  updatePointDeVente: (
    id: string,
    data: Partial<PointDeVente>,
  ) => { ok: boolean; reason?: string };
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
    data: Partial<Pick<Achat, "fournisseurId" | "pointDeVenteId" | "date" | "echeance" | "tauxTVA" | "lignes" | "note" | "validiteJours" | "numeroFactureFournisseur" | "modePaiement" | "destinationAchat" | "commandeId">>,
  ) => { ok: boolean; reason?: string };
  validerAchat: (id: string) => { ok: boolean; reason?: string };
  annulerAchat: (id: string) => { ok: boolean; reason?: string };
  deleteAchat: (id: string) => { ok: boolean; reason?: string };
  dupliquerAchat: (
    id: string,
  ) => { ok: true; id: string } | { ok: false; reason: string };
  ajouterLivraisonAchat: (
    achatId: string,
    data: {
      date: string;
      lignes: LivraisonAchatLigne[];
      note?: string;
      confirmer?: boolean;
      datePeremption?: string;
      validerEcarts?: boolean;
    },
  ) => { ok: boolean; reason?: string; id?: string };
  confirmerLivraisonAchat: (
    achatId: string,
    livraisonId: string,
    lignes?: LivraisonAchatLigne[],
    opts?: { validerEcarts?: boolean },
  ) => { ok: boolean; reason?: string };
  annulerLivraisonAchat: (
    achatId: string,
    livraisonId: string,
  ) => { ok: boolean; reason?: string };
  ajouterPaiementAchat: (
    achatId: string,
    data: SaisieLignePaiement,
  ) => { ok: boolean; reason?: string };
  ajouterPaiementsAchat: (
    achatId: string,
    lignes: SaisieLignePaiement[],
  ) => { ok: boolean; reason?: string };
  supprimerPaiementAchat: (
    achatId: string,
    paiementId: string,
  ) => { ok: boolean; reason?: string };
  creerLotPaiementFournisseur: (data: {
    fournisseurId: string;
    date?: string;
    montant: number;
    lignes: SaisieLignePaiement[];
    ventilations: { achatId: string; montant: number }[];
    note?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  annulerLotPaiementFournisseur: (
    id: string,
  ) => { ok: boolean; reason?: string };
  changerStatutChequeLot: (
    lotId: string,
    ligneId: string,
    statut: StatutChequeDiffere,
  ) => { ok: boolean; reason?: string };
  changerStatutChequeAchat: (
    achatId: string,
    paiementId: string,
    statut: StatutChequeDiffere,
  ) => { ok: boolean; reason?: string };
  ajouterRemboursementAvoirAchat: (
    achatId: string,
    avoirId: string,
    data: SaisieLignePaiement,
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

  majRepartitionsOfAchat: (
    achatId: string,
    ligneId: string,
    repartitionsOf: Achat["lignes"][number]["repartitionsOf"],
  ) => { ok: boolean; reason?: string };
  demanderTransfertMatiereOf: (data: {
    produitId: string;
    pointDeVenteId: string;
    ofSourceId: string;
    ofDestinataireId: string;
    quantite: number;
    achatId?: string;
    achatLigneId?: string;
    note?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  validerTransfertMatiereOfSource: (id: string) => { ok: boolean; reason?: string };
  validerTransfertMatiereOfDestinataire: (id: string) => { ok: boolean; reason?: string };
  annulerTransfertMatiereOf: (id: string) => { ok: boolean; reason?: string };

  creerBesoinAchat: (data: {
    produitId: string;
    quantiteNecessaire: number;
    pointDeVenteId: string;
    repartitionsOf?: Achat["lignes"][number]["repartitionsOf"];
    note?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  modifierBesoinAchat: (
    id: string,
    data: Partial<Pick<BesoinAchat, "quantiteNecessaire" | "pointDeVenteId" | "repartitionsOf" | "note">>,
  ) => { ok: boolean; reason?: string };
  annulerBesoinAchat: (id: string) => { ok: boolean; reason?: string };
  creerAchatDepuisBesoin: (data: {
    besoinId: string;
    fournisseurId: string;
    quantite: number;
    prixAchatUnitaire: number;
    modePaiement: ModePaiement;
    pointDeVenteId?: string;
    note?: string;
  }) => { ok: true; achatId: string } | { ok: false; reason: string };

  creerOrdreFabrication: (data: {
    atelierId: string;
    produitId: string;
    quantitePrevue: number;
    nomenclatureSource?: TypeNomenclature;
    commandeId?: string;
    ligneCommandeId?: string;
    dateCloturePrevue?: string;
    note?: string;
    dimensionLargeur?: number;
    dimensionHauteur?: number;
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
        | "dimensionLargeur"
        | "dimensionHauteur"
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
  ajouterSortieAtelier: (data: {
    date: string;
    atelierId: string;
    siteSourceId?: string;
    produitId: string;
    quantite: number;
    motifId?: string;
    motifLibre?: string;
  }) => { ok: boolean; reason?: string; id?: string };
  supprimerSortieAtelier: (id: string) => { ok: boolean; reason?: string };
  addMotifSortieAtelier: (data: {
    libelle: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateMotifSortieAtelier: (
    id: string,
    data: Partial<Pick<MotifSortieAtelier, "libelle" | "actif" | "ordre">>,
  ) => { ok: true } | { ok: false; reason: string };
  deleteMotifSortieAtelier: (id: string) => { ok: true } | { ok: false; reason: string };
  addEmplacementStock: (data: {
    siteId: string;
    allee: string;
    casier: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateEmplacementStock: (
    id: string,
    data: Partial<Pick<EmplacementStock, "siteId" | "allee" | "casier" | "actif">>,
  ) => { ok: true } | { ok: false; reason: string };
  deleteEmplacementStock: (id: string) => { ok: true } | { ok: false; reason: string };
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
    ligneIds?: string[];
    fichierNom?: string;
    fichierMime?: string;
    fichierDataUrl?: string;
    commentaire?: string;
    origine?: BatOrigine;
    sourceBatId?: string;
    gabarit?: boolean;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  completerFichierBat: (
    id: string,
    fichier: { nom: string; mime: string; dataUrl: string },
  ) => { ok: boolean; reason?: string };
  enregistrerRetourBat: (
    id: string,
    data: {
      decision: "valide" | "modifications_demandees";
      commentaire?: string;
      motifRefus?: BatMotifRefus;
      fichierSuivant?: { nom: string; mime: string; dataUrl: string };
    },
  ) => { ok: boolean; reason?: string };
  dupliquerBatValide: (data: {
    sourceId: string;
    commandeId: string;
    ligneIds?: string[];
  }) => { ok: true; id: string } | { ok: false; reason: string };
  creerBatDepuisGabarit: (data: {
    gabaritId: string;
    commandeId: string;
    ligneIds?: string[];
  }) => { ok: true; id: string } | { ok: false; reason: string };
  marquerGabaritBat: (
    id: string,
    gabarit: boolean,
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
  dupliquerMissionAchat: (
    id: string,
  ) => { ok: true; id: string } | { ok: false; reason: string };
  supprimerMissionAchat: (id: string) => { ok: boolean; reason?: string };
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
      compteTresorerieId?: string;
      reference?: string;
    },
  ) => { ok: boolean; reason?: string };
  annulerRemiseFondsMissionAchat: (
    id: string,
    mouvementId: string,
  ) => { ok: boolean; reason?: string };
  cloturerMissionAchat: (
    id: string,
    opts?: { exceptionJustificatifs?: boolean },
  ) => { ok: boolean; reason?: string };
  annulerMissionAchat: (id: string) => { ok: boolean; reason?: string };
  reglerMissionAchat: (
    id: string,
    data: {
      statutReglement: MissionReglementStatut;
      dateReglement?: string;
      modePaiement?: string;
      compteTresorerieId?: string;
      reference?: string;
    },
  ) => { ok: boolean; reason?: string };

  creerDemandePrix: (data: {
    date: string;
    lignes: {
      produitId: string;
      quantite: number;
      dateLivraisonSouhaitee?: string;
      pointDeVenteId?: string;
      specifications?: string;
    }[];
    fournisseurIds: string[];
    note?: string;
    validiteJours?: number;
    pointDeVenteId?: string;
    dateLivraisonSouhaitee?: string;
    origine?: "libre" | "alerte_stock";
    alerteId?: string;
    destinationAchat?: DestinationAchat;
    commandeId?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  modifierDemandePrix: (
    id: string,
    data: Partial<{
      date: string;
      lignes: DemandePrixLigne[];
      fournisseurIds: string[];
      offres: DemandePrixOffre[];
      fournisseurIdsRetenus: string[];
      retenuesParLigne: { ligneId: string; fournisseurId: string }[];
      consultations: DemandePrix["consultations"];
      note: string;
      validiteJours: number;
      pointDeVenteId: string;
      dateLivraisonSouhaitee: string;
      destinationAchat?: DestinationAchat;
      commandeId?: string;
    }>,
  ) => { ok: boolean; reason?: string };
  patchOffreDemandePrix: (
    id: string,
    ligneId: string,
    fournisseurId: string,
    patch: Partial<
      Pick<
        DemandePrixOffre,
        | "prixUnitaire"
        | "delaiJours"
        | "remisePercent"
        | "validiteOffreJours"
        | "francoPort"
        | "conditions"
      >
    >,
  ) => { ok: boolean; reason?: string };
  majConsultationDemandePrix: (
    id: string,
    fournisseurId: string,
    statut: DemandePrixConsultationStatut,
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
      destinationAchat?: DestinationAchat;
      commandeId?: string;
      commandes: {
        fournisseurId: string;
        lignes: { produitId: string; quantite: number; prixAchatUnitaire: number }[];
        note?: string;
      }[];
    },
  ) => { ok: true; achatIds: string[] } | { ok: false; reason: string };

  addVente: (vente: Omit<Vente, "id">) => void;
  deleteVente: (id: string) => void;

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
  reclasseLigne471: (
    ecritureId: string,
    ligneId: string,
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

  addTiers: (
    data: Omit<Tiers, "id">,
    opts?: { exigerComptes?: boolean },
  ) => { ok: true; id: string } | { ok: false; reason: string };
  updateTiers: (
    id: string,
    data: Partial<Tiers>,
    opts?: { exigerComptes?: boolean },
  ) => { ok: boolean; reason?: string };
  importerLigneTiers: (input: {
    mode: "creer" | "fusionner";
    payload: Omit<Tiers, "id">;
    fusionId?: string;
    champsFusion?: ChampFusionTiers[];
  }) =>
    | { ok: true; id: string; compteManquant: boolean }
    | { ok: false; reason: string };
  importerLigneArticle: (input: {
    mode: "creer" | "fusionner";
    payload: Omit<Produit, "id">;
    fusionId?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  importerNomenclaturesProduit: (
    produitId: string,
    nomenclatures: NomenclatureProduit[],
  ) => { ok: true } | { ok: false; reason: string };
  ajouterRelanceImpayee: (data: {
    factureId: string;
    canal: RelanceImpayeeCanal;
    note?: string;
    prochaineRelance?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  tracerEnvoiDocument: (data: {
    entite: ActiviteEntite;
    entiteId: string;
    libelle: string;
    canal: string;
    destinataire: string;
  }) => void;
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

  addBonDePreparation: (bp: Omit<BonDePreparation, "id">) => string;
  updateBonDePreparation: (id: string, data: Partial<BonDePreparation>) => void;
  deleteBonDePreparation: (id: string) => void;
  sauvegarderVersionBonDePreparation: (id: string) => void;

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
    compteTresorerieId?: string;
    reference?: string;
    devisId?: string;
    commandeId?: string;
    factureId?: string;
    refDocument: string;
    genererFactureAcompte?: boolean;
    note?: string;
  }) => { ok: true; acompteId: string; numero: string; factureAcompteId?: string } | { ok: false; reason: string };

  ajouterPaiementsFacture: (
    factureId: string,
    lignes: SaisieLignePaiement[],
  ) => { ok: boolean; reason?: string };
  supprimerPaiementFacture: (
    factureId: string,
    paiementId: string,
  ) => { ok: boolean; reason?: string };
  changerStatutChequeFacture: (
    factureId: string,
    paiementId: string,
    statut: StatutChequeDiffere,
  ) => { ok: boolean; reason?: string };

  importerReleveBancaire: (opts: {
    compteTresorerieId: string;
    texte: string;
    fichierNom?: string;
  }) => { ok: true; imported: number } | { ok: false; reason: string };
  pointerLigneReleve: (
    ligneId: string,
    mouvementId: string | null,
  ) => { ok: true } | { ok: false; reason: string };
  supprimerLigneReleve: (ligneId: string) => { ok: true } | { ok: false; reason: string };

  addOperationTresorerie: (data: {
    type: OperationTresorerie["type"];
    date: string;
    montant: number;
    compteTresorerieId: string;
    compteLieId?: string;
    libelle?: string;
    reference?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  deleteOperationTresorerie: (
    id: string,
  ) => { ok: true } | { ok: false; reason: string };

  addCompteTresorerie: (data: {
    libelle: string;
    type: CompteTresorerie["type"];
    siteId?: string;
    compteComptableId?: string;
    journalTresorerieId?: string;
    soldeInitial?: number;
    soldeInitialSens?: CompteTresorerie["soldeInitialSens"];
    soldeInitialDate?: string;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateCompteTresorerie: (
    id: string,
    data: Partial<
      Pick<
        CompteTresorerie,
        | "libelle"
        | "type"
        | "siteId"
        | "actif"
        | "ordre"
        | "compteComptableId"
        | "journalTresorerieId"
        | "soldeInitial"
        | "soldeInitialSens"
        | "soldeInitialDate"
      >
    >,
  ) => { ok: true } | { ok: false; reason: string };
  deleteCompteTresorerie: (id: string) => { ok: true } | { ok: false; reason: string };

  addJournalTresorerie: (data: {
    code: string;
    libelle: string;
    type: CompteTresorerie["type"];
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateJournalTresorerie: (
    id: string,
    data: Partial<
      Pick<JournalTresorerie, "code" | "libelle" | "type" | "actif" | "ordre">
    >,
  ) => { ok: true } | { ok: false; reason: string };
  deleteJournalTresorerie: (id: string) => { ok: true } | { ok: false; reason: string };

  addModePaiement: (data: {
    libelle: string;
    necessiteEcheance?: boolean;
    typeCompteTresorerie?: TypeCompteTresorerie;
  }) => { ok: true; id: string } | { ok: false; reason: string };
  updateModePaiement: (
    id: string,
    data: Partial<
      Pick<
        ModePaiementParam,
        "libelle" | "necessiteEcheance" | "actif" | "ordre" | "typeCompteTresorerie"
      >
    >,
  ) => { ok: true } | { ok: false; reason: string };
  deleteModePaiement: (id: string) => { ok: true } | { ok: false; reason: string };

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
  sortiesAtelier?: SortieAtelier[];
  ecrituresComptables?: EcritureComptable[];
  comptesTresorerie?: CompteTresorerie[];
  journauxTresorerie?: JournalTresorerie[];
  acomptes?: Acompte[];
  lotsPaiementFournisseur?: LotPaiementFournisseur[];
  modesPaiement?: ModePaiementParam[];
  operationsTresorerie?: OperationTresorerie[];
  reclassements471?: Reclassement471[];
  comptesMissionAcheteur?: CompteMissionAcheteur[];
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
    sortiesAtelier: state.sortiesAtelier,
    existantes: state.ecrituresComptables,
    comptesTresorerie: state.comptesTresorerie,
    journauxTresorerie: state.journauxTresorerie,
    acomptes: state.acomptes,
    lotsPaiementFournisseur: state.lotsPaiementFournisseur,
    modesPaiement: state.modesPaiement,
    operationsTresorerie: state.operationsTresorerie,
    reclassements471: state.reclassements471,
    comptesMissionAcheteur: state.comptesMissionAcheteur,
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
    sortiesAtelier?: SortieAtelier[];
    entrees?: EntreeStock[];
    ecrituresComptables?: EcritureComptable[];
    comptesTresorerie?: CompteTresorerie[];
    journauxTresorerie?: JournalTresorerie[];
    acomptes?: Acompte[];
    lotsPaiementFournisseur?: LotPaiementFournisseur[];
    modesPaiement?: ModePaiementParam[];
    operationsTresorerie?: OperationTresorerie[];
    reclassements471?: Reclassement471[];
    comptesMissionAcheteur?: CompteMissionAcheteur[];
  },
  patch: T,
): T & {
  ecrituresComptables: EcritureComptable[];
  parametres: Parametres;
  comptesComptables: CompteComptable[];
  comptesMissionAcheteur: CompteMissionAcheteur[];
} {
  const merged = { ...state, ...patch };
  const seeded = seedComptesDefautState(merged);
  const comptes467 = etatAvecComptes467Missions({
    ...merged,
    ...seeded,
  });
  const glTreso = assurerComptesGlDesComptesTresorerie(
    merged.comptesTresorerie ?? [],
    comptes467.comptesComptables,
    longueurNumeroCompteEffective(seeded.parametres) ?? null,
  );
  const assures = assurerJournauxParCompteTresorerie(
    glTreso.comptesTresorerie,
    merged.journauxTresorerie ?? [],
  );
  const entrees = regenererEntreesAvoirsClient(
    ((patch as { entrees?: EntreeStock[] }).entrees ?? state.entrees ?? []) as EntreeStock[],
    (merged.factures as Facture[]) ?? [],
    (merged.produits as Produit[]) ?? [],
  );
  return {
    ...patch,
    entrees,
    comptesTresorerie: assures.comptes,
    journauxTresorerie: assures.journaux,
    parametres: seeded.parametres,
    comptesComptables: glTreso.comptes,
    comptesMissionAcheteur: comptes467.comptesMissionAcheteur,
    ecrituresComptables: journalDepuis({
      ...merged,
      ...seeded,
      entrees,
      comptesComptables: glTreso.comptes,
      comptesMissionAcheteur: comptes467.comptesMissionAcheteur,
      comptesTresorerie: assures.comptes,
      journauxTresorerie: assures.journaux,
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

function completerLignesLivraisonAchat(
  achat: Achat,
  lignes: LivraisonAchatLigne[],
  validerEcarts?: boolean,
  ignoreLivraisonId?: string,
) {
  const actor = getActiviteActor();
  return lignes.map((l) => {
    const cmd =
      achat.lignes.find((x) => x.produitId === l.produitId)?.quantite ??
      l.quantiteCommandee ??
      l.quantitePrevue;
    const horsCourante = ignoreLivraisonId
      ? {
          ...achat,
          livraisons: achat.livraisons.filter((liv) => liv.id !== ignoreLivraisonId),
        }
      : achat;
    const dejaLivre = l.produitId
      ? quantiteLivreeProduit(horsCourante, l.produitId)
      : 0;
    return completerLigneLivraison(l, cmd, { validerEcarts, actor, dejaLivre });
  });
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

function etatAvecCompte467Acheteur(opts: {
  userId: string;
  nom: string;
  comptes: CompteComptable[];
  liens: CompteMissionAcheteur[];
  parametres: Parametres;
}): { comptes: CompteComptable[]; liens: CompteMissionAcheteur[] } {
  const nomTrim = opts.nom.trim() || "Acheteur";
  let comptes = opts.comptes;
  let liens = opts.liens;
  if (!opts.userId) return { comptes, liens };
  const existant = liens.find((l) => l.userId === opts.userId);
  if (existant) {
    const c = comptes.find((x) => x.id === existant.compteId);
    if (c && numeroEstCompte467(c.numero)) {
      if (nomTrim !== existant.nom) {
        liens = liens.map((l) =>
          l.userId === opts.userId ? { ...l, nom: nomTrim } : l,
        );
        const libelle = libelleCompteTiersAuto(
          PREFIXE_COMPTE_MISSION_ACHETEUR,
          nomTrim,
        );
        comptes = comptes.map((x) =>
          x.id === existant.compteId ? { ...x, libelle } : x,
        );
      }
      return { comptes, liens };
    }
    liens = liens.filter((l) => l.userId !== opts.userId);
  }
  const longueur = longueurNumeroCompteEffective(opts.parametres);
  if (longueur == null) return { comptes, liens };
  const numeroParent = completerNumeroCompte(
    PREFIXE_COMPTE_MISSION_ACHETEUR,
    longueur,
  );
  if (
    !comptes.some(
      (c) => chiffresNumeroCompte(c.numero) === chiffresNumeroCompte(numeroParent),
    )
  ) {
    comptes = [
      {
        id: uid("cpt"),
        numero: numeroParent,
        libelle: "Autres comptes débiteurs ou créditeurs",
      },
      ...comptes,
    ];
  }
  const numero = prochainNumeroSousCompteTiers(
    PREFIXE_COMPTE_MISSION_ACHETEUR,
    comptes,
    longueur,
  );
  if (!numero) return { comptes, liens };
  const nouveau: CompteComptable = {
    id: uid("cpt"),
    numero,
    libelle: libelleCompteTiersAuto(PREFIXE_COMPTE_MISSION_ACHETEUR, nomTrim),
  };
  comptes = [nouveau, ...comptes];
  liens = [
    { userId: opts.userId, nom: nomTrim, compteId: nouveau.id },
    ...liens,
  ];
  return { comptes, liens };
}

function etatAvecComptes467Missions(state: {
  missionsAchat?: MissionAchat[];
  comptesMissionAcheteur?: CompteMissionAcheteur[];
  comptesComptables: CompteComptable[];
  parametres: Parametres;
}) {
  let comptes = state.comptesComptables;
  let liens = state.comptesMissionAcheteur ?? [];
  const vus = new Map<string, string>();
  for (const l of liens) {
    if (l.userId && !vus.has(l.userId)) vus.set(l.userId, l.nom);
  }
  for (const m of state.missionsAchat ?? []) {
    if (m.acheteurUserId && !vus.has(m.acheteurUserId)) {
      vus.set(m.acheteurUserId, m.acheteurNom);
    }
  }
  for (const [userId, nom] of vus) {
    const next = etatAvecCompte467Acheteur({
      userId,
      nom,
      comptes,
      liens,
      parametres: state.parametres,
    });
    comptes = next.comptes;
    liens = next.liens;
  }
  return { comptesComptables: comptes, comptesMissionAcheteur: liens };
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

function libelleCompteAudit(
  comptes: Array<{ id: string; numero: string; libelle: string }>,
  id?: string | null,
) {
  if (!id) return "—";
  const c = comptes.find((x) => x.id === id);
  return c ? `${c.numero} ${c.libelle}` : id;
}

function tracerAudit(
  state: { pointsDeVente?: Array<{ id: string; nom: string }> },
  payload: JournalAuditPayload,
) {
  const site = payload.siteId
    ? (state.pointsDeVente ?? []).find((p) => p.id === payload.siteId)
    : undefined;
  enregistrerJournalAudit({
    ...payload,
    siteLibelle: payload.siteLibelle ?? site?.nom,
  });
}

function tracerRemiseDocument(
  state: { pointsDeVente?: Array<{ id: string; nom: string }> },
  opts: {
    objetType: "devis" | "commande" | "facture" | "bon_de_livraison";
    objetId: string;
    objetLibelle?: string;
    objetHref: string;
    siteId?: string;
    avant?: string;
    apres: string;
  },
) {
  if (!opts.apres && !opts.avant) return;
  if (opts.avant === opts.apres) return;
  tracerAudit(state, {
    categorie: "prix",
    action: "remise_exceptionnelle",
    module: "commercial",
    objetType: opts.objetType,
    objetId: opts.objetId,
    objetLibelle: opts.objetLibelle,
    objetHref: opts.objetHref,
    champ: "remise",
    ancienneValeur: opts.avant || "—",
    nouvelleValeur: opts.apres || "—",
    siteId: opts.siteId,
  });
}

function actorPeutGererMissions() {
  const auth = useAuthStore.getState();
  const user = auth.currentUser();
  if (user && estAdministrateur(user)) return true;
  return auth.hasPermission("missions.gerer");
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

type DocSource = Devis | Commande | BonDeLivraison | BonDePreparation;

function trouverSource(
  state: Pick<Store, "devis" | "commandes" | "bonsDeLivraison" | "bonsDePreparation">,
  kind: SourceTransformation,
  id: string,
): DocSource | undefined {
  if (kind === "devis") return state.devis.find((d) => d.id === id);
  if (kind === "commande") return state.commandes.find((c) => c.id === id);
  if (kind === "bon_de_preparation") {
    return (state.bonsDePreparation ?? []).find((b) => b.id === id);
  }
  return state.bonsDeLivraison.find((b) => b.id === id);
}

function patcherSource(
  state: Pick<Store, "devis" | "commandes" | "bonsDeLivraison" | "bonsDePreparation">,
  kind: SourceTransformation,
  id: string,
  patch: Record<string, unknown>,
): Partial<
  Pick<Store, "devis" | "commandes" | "bonsDeLivraison" | "bonsDePreparation">
> {
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
  if (kind === "bon_de_preparation") {
    return {
      bonsDePreparation: (state.bonsDePreparation ?? []).map((b) =>
        b.id === id ? { ...b, ...patch } : b,
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
  if (kind === "bon_de_preparation") return "bon_de_preparation";
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
        const role =
          data.roleCompte !== undefined ? data.roleCompte : prev.roleCompte;
        set((state) => {
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
        if (
          prev.numero !== numero ||
          prev.libelle !== libelle ||
          prev.roleCompte !== role
        ) {
          tracerAudit(get(), {
            categorie: "comptabilite",
            action: "modification_compte_comptable",
            module: "comptabilite",
            objetType: "compte_comptable",
            objetId: id,
            objetLibelle: `${numero} ${libelle}`,
            objetHref: "/comptabilite/plan",
            champ: "compte",
            ancienneValeur: `${prev.numero} ${prev.libelle}`,
            nouvelleValeur: `${numero} ${libelle}`,
          });
        }
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
        tracerAudit(get(), {
          categorie: "comptabilite",
          action: "suppression_compte_comptable",
          module: "comptabilite",
          objetType: "compte_comptable",
          objetId: id,
          objetLibelle: `${prev.numero} ${prev.libelle}`,
          objetHref: "/comptabilite/plan",
          ancienneValeur: `${prev.numero} ${prev.libelle}`,
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
          lignes: lignesExportEcritures(
            aExporter,
            state.journauxTresorerie ?? [],
          ),
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

      addPointDeVente: (pdv) => {
        const state = get();
        const id = uid("pdv");
        const motif = motifSiteSansTresorerie(
          { ...pdv, id },
          state.comptesTresorerie ?? [],
        );
        if (motif) return { ok: false as const, reason: motif };
        const nouveau = { ...pdv, id };
        set((s) => ({
          pointsDeVente: [...s.pointsDeVente, nouveau],
          journalActivites: [
            entreeActivite("creation", "point_de_vente", {
              entiteId: nouveau.id,
              libelle: nouveau.nom,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updatePointDeVente: (id, data) => {
        const state = get();
        const prev = state.pointsDeVente.find((p) => p.id === id);
        if (!prev) return { ok: false, reason: "Point de vente introuvable." };
        const next = { ...prev, ...data };
        if (data.rolesSite !== undefined) {
          const motif = motifSiteSansTresorerie(next, state.comptesTresorerie ?? []);
          if (motif) return { ok: false, reason: motif };
        }
        set((s) => ({
          pointsDeVente: s.pointsDeVente.map((p) => (p.id === id ? next : p)),
          journalActivites: [
            entreeActivite("modification", "point_de_vente", {
              entiteId: id,
              libelle: next.nom,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },
      deletePointDeVente: (id) => {
        const state = get();
        const pdv = state.pointsDeVente.find((p) => p.id === id);
        if (!pdv) return { ok: false, reason: "Point de vente introuvable." };
        const motif = motifLienPointDeVente(id, {
          factures: state.factures,
          devis: state.devis,
          commandes: state.commandes,
          bonsDeLivraison: state.bonsDeLivraison,
          bonsDePreparation: state.bonsDePreparation,
          entrees: state.entrees,
          ventes: state.ventes,
          immobilisations: state.immobilisations,
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

      addEntree: (entree) => {
        if (entree.origine && entree.origine !== "stock_initial") return;
        set((state) => ({
          entrees: [
            { ...entree, id: uid("ent"), origine: "stock_initial" },
            ...state.entrees,
          ],
        }));
      },
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
          const motifOf = motifRepartitionOfInvalide(data.lignes);
          if (motifOf) return { ok: false, reason: motifOf };
          const motifNat = motifAchatNatureInterdite(
            state.produits,
            data.lignes,
            state.categoriesProduits,
          );
          if (motifNat) return { ok: false, reason: motifNat };
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
        const motifOf = motifRepartitionOfInvalide(prev.lignes);
        if (motifOf) return { ok: false, reason: motifOf };
        const motifNat = motifAchatNatureInterdite(
          get().produits,
          prev.lignes,
          get().categoriesProduits,
        );
        if (motifNat) return { ok: false, reason: motifNat };
        const motifDest = motifDestinationAchatManquante(prev);
        if (motifDest) return { ok: false, reason: motifDest };
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
      dupliquerAchat: (id) => {
        const prev = get().achats.find((a) => a.id === id);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const date = new Date().toISOString().slice(0, 10);
        const nouveauId = get().addAchat({
          numero: "",
          fournisseurId: prev.fournisseurId,
          pointDeVenteId: prev.pointDeVenteId,
          date,
          echeance: prev.echeance,
          statut: "brouillon",
          tauxTVA: prev.tauxTVA,
          lignes: prev.lignes.map((l) => ({
            ...l,
            id: uid("alg"),
            besoinAchatId: undefined,
          })),
          note: prev.note,
          validiteJours: prev.validiteJours,
          modePaiement: prev.modePaiement,
          destinationAchat: prev.destinationAchat,
          commandeId: prev.commandeId,
        });
        return { ok: true, id: nouveauId };
      },
      ajouterLivraisonAchat: (achatId, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "valide") {
          return { ok: false, reason: "Validez la commande avant d'enregistrer une livraison." };
        }
        const confirmer = data.confirmer !== false;
        const lignes = completerLignesLivraisonAchat(
          prev,
          data.lignes,
          data.validerEcarts,
        );
        if (confirmer) {
          const motifEcart = motifEcartLivraisonNonValide(lignes);
          if (motifEcart) return { ok: false, reason: motifEcart };
        }
        const id = uid("liv");
        const draft = {
          id,
          numero: nextNumeroLivraison(state.achats),
          date: data.date,
          statut: "en_attente" as const,
          lignes,
          note: data.note,
          datePeremption: data.datePeremption,
        };
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
      confirmerLivraisonAchat: (achatId, livraisonId, lignes, opts) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const livPrev = prev.livraisons.find((l) => l.id === livraisonId);
        if (!livPrev) return { ok: false, reason: "Livraison introuvable." };
        if (livPrev.statut === "annulee") {
          return { ok: false, reason: "Cette livraison est annulée." };
        }
        const livLignes = completerLignesLivraisonAchat(
          prev,
          lignes ?? livPrev.lignes,
          opts?.validerEcarts,
          livraisonId,
        );
        const motifEcart = motifEcartLivraisonNonValide(livLignes);
        if (motifEcart) return { ok: false, reason: motifEcart };
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
        return get().ajouterPaiementsAchat(achatId, [data]);
      },
      ajouterPaiementsAchat: (achatId, lignes) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut !== "valide") {
          return { ok: false, reason: "Validez la commande avant d'enregistrer un paiement." };
        }
        const modes = state.modesPaiement ?? [];
        const comptes = state.comptesTresorerie ?? [];
        const solde = soldeAchat(prev);
        let cumul = 0;
        const creees: LignePaiement[] = [];
        for (const data of lignes) {
          const motif = motifSaisieLignePaiement(data, modes, comptes);
          if (motif) return { ok: false, reason: motif };
          cumul += data.montant;
          creees.push(completerLignePaiement(data, uid("pay"), modes));
        }
        if (cumul - solde > 0.5) {
          return {
            ok: false,
            reason: `Le paiement dépasse le solde restant (${Math.round(solde)} Ar).`,
          };
        }
        set((s) =>
          avecJournal(s, {
            achats: s.achats.map((a) =>
              a.id === achatId
                ? { ...a, paiements: [...creees, ...a.paiements] }
                : a,
            ),
            journalActivites: [
              entreeActivite("creation", "achat", {
                entiteId: achatId,
                libelle: prev.numero,
                detail: creees.length > 1 ? `${creees.length} paiements` : "Paiement fournisseur",
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },
      supprimerPaiementAchat: (achatId, paiementId) => {
        const prev = get().achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const ligne = prev.paiements.find((p) => p.id === paiementId);
        if (ligne?.lotId) {
          const lot = (get().lotsPaiementFournisseur ?? []).find(
            (l) => l.id === ligne.lotId,
          );
          return {
            ok: false,
            reason: `Ce règlement fait partie du lot ${lot?.numero ?? ligne.lotNumero ?? ""}. Annulez le paiement groupé en une seule action.`,
          };
        }
        set((s) =>
          avecJournal(s, {
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
          }),
        );
        return { ok: true };
      },
      creerLotPaiementFournisseur: (data) => {
        const state = get();
        const fournisseur =
          state.fournisseurs.find((f) => f.id === data.fournisseurId) ??
          (state.tiers ?? []).find((t) => t.id === data.fournisseurId);
        if (!fournisseur) return { ok: false, reason: "Fournisseur introuvable." };
        const modes = state.modesPaiement ?? [];
        const comptes = state.comptesTresorerie ?? [];
        if (!data.lignes.length) {
          return { ok: false, reason: "Indiquez au moins un mode de paiement." };
        }
        let cumulModes = 0;
        const lotLignes: LignePaiement[] = [];
        for (const ligne of data.lignes) {
          const motif = motifSaisieLignePaiement(ligne, modes, comptes);
          if (motif) return { ok: false, reason: motif };
          cumulModes += ligne.montant;
          lotLignes.push(completerLignePaiement(ligne, uid("lpay"), modes));
        }
        const montant = Math.round(data.montant);
        if (Math.abs(cumulModes - montant) > 0.5) {
          return {
            ok: false,
            reason: `Le total des modes (${Math.round(cumulModes)} Ar) doit égaler le montant du lot (${montant} Ar).`,
          };
        }
        const ventilations = data.ventilations.filter((v) => v.montant > 0);
        const motifVent = motifVentilationInvalide(
          state.achats,
          ventilations,
          montant,
        );
        if (motifVent) return { ok: false, reason: motifVent };
        const ids = new Set(ventilations.map((v) => v.achatId));
        if (
          [...ids].some((id) => {
            const a = state.achats.find((x) => x.id === id);
            return a && a.fournisseurId !== data.fournisseurId;
          })
        ) {
          return { ok: false, reason: "Les factures doivent appartenir au même fournisseur." };
        }
        const id = uid("lotp");
        const numero = nextNumeroLotPaiement(
          state.lotsPaiementFournisseur ?? [],
          optsNum(state, data.date),
        );
        const date = data.date || new Date().toISOString();
        const parts = repartirModesSurVentilations(
          lotLignes.map((l) => ({ id: l.id, montant: l.montant })),
          ventilations,
        );
        const lot: LotPaiementFournisseur = {
          id,
          numero,
          fournisseurId: data.fournisseurId,
          fournisseurNom: fournisseur.nom,
          date,
          montant,
          lignes: lotLignes,
          ventilations: ventilations.map((v) => {
            const a = state.achats.find((x) => x.id === v.achatId)!;
            return {
              achatId: v.achatId,
              achatNumero: a.numeroFactureFournisseur?.trim() || a.numero,
              montant: Math.round(v.montant),
            };
          }),
          statut: "actif",
          note: data.note?.trim() || undefined,
        };
        const paiementsParAchat = new Map<string, LignePaiement[]>();
        for (const part of parts) {
          const mode = lotLignes.find((l) => l.id === part.modeLigneId);
          if (!mode || part.montant <= 0) continue;
          const ligne: LignePaiement = {
            ...mode,
            id: uid("pay"),
            montant: part.montant,
            lotId: id,
            lotNumero: numero,
            lotLigneId: mode.id,
            note: `Lot ${numero}`,
          };
          const liste = paiementsParAchat.get(part.achatId) ?? [];
          liste.push(ligne);
          paiementsParAchat.set(part.achatId, liste);
        }
        set((s) =>
          avecJournal(s, {
            lotsPaiementFournisseur: [lot, ...(s.lotsPaiementFournisseur ?? [])],
            achats: s.achats.map((a) => {
              const extra = paiementsParAchat.get(a.id);
              if (!extra?.length) return a;
              return { ...a, paiements: [...extra, ...a.paiements] };
            }),
            journalActivites: [
              entreeActivite("creation", "lot_paiement", {
                entiteId: id,
                libelle: numero,
                detail: `${lot.ventilations.length} facture(s) · ${fournisseur.nom}`,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        tracerAudit(get(), {
          categorie: "statut_critique",
          action: "creation_lot_paiement",
          module: "tresorerie",
          objetType: "lot_paiement",
          objetId: id,
          objetLibelle: numero,
          objetHref: `/achats/lots/${id}`,
          nouvelleValeur: `${montant} Ar · ${lot.ventilations.map((v) => v.achatNumero).join(", ")}`,
          detail: fournisseur.nom,
        });
        return { ok: true, id };
      },
      annulerLotPaiementFournisseur: (id) => {
        const state = get();
        const prev = (state.lotsPaiementFournisseur ?? []).find((l) => l.id === id);
        if (!prev) return { ok: false, reason: "Paiement groupé introuvable." };
        if (prev.statut === "annule") {
          return { ok: false, reason: "Ce lot est déjà annulé." };
        }
        set((s) =>
          avecJournal(s, {
            lotsPaiementFournisseur: (s.lotsPaiementFournisseur ?? []).map((l) =>
              l.id === id
                ? {
                    ...l,
                    statut: "annule" as const,
                    dateAnnulation: new Date().toISOString(),
                  }
                : l,
            ),
            achats: s.achats.map((a) => ({
              ...a,
              paiements: a.paiements.filter((p) => p.lotId !== id),
            })),
            journalActivites: [
              entreeActivite("annulation", "lot_paiement", {
                entiteId: id,
                libelle: prev.numero,
                detail: "Annulation groupée — soldes facture restaurés",
              }),
              ...s.journalActivites,
            ],
          }),
        );
        tracerAudit(get(), {
          categorie: "statut_critique",
          action: "annulation_lot_paiement",
          module: "tresorerie",
          objetType: "lot_paiement",
          objetId: id,
          objetLibelle: prev.numero,
          objetHref: `/achats/lots/${id}`,
          ancienneValeur: "actif",
          nouvelleValeur: "annule",
          champ: "statut",
          detail: prev.ventilations.map((v) => v.achatNumero).join(", "),
        });
        return { ok: true };
      },
      changerStatutChequeLot: (lotId, ligneId, statut) => {
        const prev = (get().lotsPaiementFournisseur ?? []).find((l) => l.id === lotId);
        if (!prev) return { ok: false, reason: "Paiement groupé introuvable." };
        if (prev.statut !== "actif") {
          return { ok: false, reason: "Ce lot est annulé." };
        }
        const ligne = prev.lignes.find((p) => p.id === ligneId);
        if (!ligne) return { ok: false, reason: "Paiement introuvable." };
        set((s) =>
          avecJournal(s, {
            lotsPaiementFournisseur: (s.lotsPaiementFournisseur ?? []).map((l) =>
              l.id === lotId
                ? {
                    ...l,
                    lignes: l.lignes.map((p) =>
                      p.id === ligneId ? { ...p, statutCheque: statut } : p,
                    ),
                  }
                : l,
            ),
            achats: s.achats.map((a) => ({
              ...a,
              paiements: a.paiements.map((p) =>
                p.lotLigneId === ligneId ? { ...p, statutCheque: statut } : p,
              ),
            })),
          }),
        );
        if (statut === "rejete" && ligne.statutCheque !== "rejete") {
          tracerAudit(get(), {
            categorie: "statut_critique",
            action: "rejet_cheque_differe",
            module: "tresorerie",
            objetType: "lot_paiement",
            objetId: lotId,
            objetLibelle: prev.numero,
            objetHref: `/achats/lots/${lotId}`,
            champ: "chèque différé",
            ancienneValeur: ligne.statutCheque ?? "en_attente",
            nouvelleValeur: "rejete",
          });
        }
        return { ok: true };
      },
      changerStatutChequeAchat: (achatId, paiementId, statut) => {
        const prev = get().achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const ligne = prev.paiements.find((p) => p.id === paiementId);
        if (!ligne) return { ok: false, reason: "Paiement introuvable." };
        if (ligne.lotId && ligne.lotLigneId) {
          return get().changerStatutChequeLot(ligne.lotId, ligne.lotLigneId, statut);
        }
        set((s) =>
          avecJournal(s, {
            achats: s.achats.map((a) =>
              a.id === achatId
                ? {
                    ...a,
                    paiements: a.paiements.map((p) =>
                      p.id === paiementId ? { ...p, statutCheque: statut } : p,
                    ),
                  }
                : a,
            ),
            journalActivites: [
              entreeActivite("modification", "achat", {
                entiteId: achatId,
                libelle: prev.numero,
                detail: `Chèque ${statut}`,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        if (statut === "rejete" && ligne.statutCheque !== "rejete") {
          tracerAudit(get(), {
            categorie: "statut_critique",
            action: "rejet_cheque_differe",
            module: "tresorerie",
            objetType: "achat",
            objetId: achatId,
            objetLibelle: prev.numero,
            objetHref: "/achats",
            champ: "chèque différé",
            ancienneValeur: ligne.statutCheque ?? "en_attente",
            nouvelleValeur: "rejete",
            siteId: prev.pointDeVenteId,
          });
        }
        return { ok: true };
      },
      ajouterRemboursementAvoirAchat: (achatId, avoirId, data) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        const avoir = prev.avoirs.find((x) => x.id === avoirId);
        if (!avoir) return { ok: false, reason: "Avoir introuvable." };
        if (avoir.statut !== "valide") {
          return { ok: false, reason: "Validez l'avoir avant un remboursement." };
        }
        const modes = state.modesPaiement ?? [];
        const motif = motifSaisieLignePaiement(
          data,
          modes,
          state.comptesTresorerie ?? [],
        );
        if (motif) return { ok: false, reason: motif };
        const ligne = completerLignePaiement(data, uid("pay"), modes);
        set((s) =>
          avecJournal(s, {
            achats: s.achats.map((a) =>
              a.id === achatId
                ? {
                    ...a,
                    avoirs: a.avoirs.map((av) =>
                      av.id === avoirId
                        ? { ...av, paiements: [ligne, ...(av.paiements ?? [])] }
                        : av,
                    ),
                  }
                : a,
            ),
            journalActivites: [
              entreeActivite("creation", "achat", {
                entiteId: achatId,
                libelle: prev.numero,
                detail: `Remboursement ${avoir.numero}`,
              }),
              ...s.journalActivites,
            ],
          }),
        );
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
        const ctxRes = ctxReservationDepuisEtat(state);
        for (const l of lignes) {
          const libre = stockLibreDisponible(
            l.produitId,
            data.siteSourceId,
            state.entrees,
            state.ventes,
            state.inventaires,
            ctxRes,
          );
          if (libre + 1e-9 < l.quantite) {
            return {
              ok: false,
              reason: `Stock libre insuffisant (disponible : ${libre}). Le reste est réservé à des OF ou des commandes.`,
            };
          }
        }
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

      majRepartitionsOfAchat: (achatId, ligneId, repartitionsOf) => {
        const state = get();
        const prev = state.achats.find((a) => a.id === achatId);
        if (!prev) return { ok: false, reason: "Achat introuvable." };
        if (prev.statut === "annule") {
          return { ok: false, reason: "Cet achat est annulé." };
        }
        const ligne = prev.lignes.find((l) => l.id === ligneId);
        if (!ligne) return { ok: false, reason: "Ligne introuvable." };
        const nextLigne = { ...ligne, repartitionsOf: repartitionsOf ?? [] };
        const motifOf = motifRepartitionOfInvalide(
          prev.lignes.map((l) => (l.id === ligneId ? nextLigne : l)),
        );
        if (motifOf) return { ok: false, reason: motifOf };
        set((s) => ({
          achats: s.achats.map((a) =>
            a.id === achatId
              ? {
                  ...a,
                  lignes: a.lignes.map((l) => (l.id === ligneId ? nextLigne : l)),
                }
              : a,
          ),
        }));
        return { ok: true };
      },

      demanderTransfertMatiereOf: (data) => {
        if (data.ofSourceId === data.ofDestinataireId) {
          return { ok: false, reason: "Les OF source et destinataire doivent être distincts." };
        }
        if (!(data.quantite > 0)) return { ok: false, reason: "Quantité invalide." };
        const state = get();
        const source = state.ordresFabrication.find((o) => o.id === data.ofSourceId);
        const dest = state.ordresFabrication.find((o) => o.id === data.ofDestinataireId);
        if (!source || !dest) return { ok: false, reason: "OF introuvable." };
        if (source.statut === "annule" || dest.statut === "annule") {
          return { ok: false, reason: "Un des OF est annulé." };
        }
        if (!utilisateurCourantPeutAgirSurSite(source.atelierId)) {
          return {
            ok: false,
            reason: "Vous devez être rattaché à l'atelier de l'OF source pour demander le transfert.",
          };
        }
        const ctxRes = {
          achats: state.achats,
          ordresFabrication: state.ordresFabrication,
          transfertsMatiereOf: state.transfertsMatiereOf ?? [],
        };
        const reserve = quantiteReserveeOf(
          data.produitId,
          data.pointDeVenteId,
          data.ofSourceId,
          ctxRes,
        );
        if (reserve + 1e-9 < data.quantite) {
          return {
            ok: false,
            reason: `Quantité réservée insuffisante sur l'OF source (${reserve}).`,
          };
        }
        const actor = getActiviteActor();
        const nouveau: TransfertMatiereOf = {
          id: uid("tmof"),
          numero: nextNumeroTransfertMatiereOf(state.transfertsMatiereOf ?? [], optsNum(state)),
          date: new Date().toISOString(),
          produitId: data.produitId,
          pointDeVenteId: data.pointDeVenteId,
          ofSourceId: data.ofSourceId,
          ofDestinataireId: data.ofDestinataireId,
          quantite: data.quantite,
          achatId: data.achatId,
          achatLigneId: data.achatLigneId,
          statut: "demande",
          note: data.note,
        };
        set((s) => ({
          transfertsMatiereOf: [nouveau, ...(s.transfertsMatiereOf ?? [])],
          journalActivites: [
            entreeActivite("creation", "transfert_matiere_of", {
              entiteId: nouveau.id,
              libelle: nouveau.numero,
              detail: actor.nom,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id: nouveau.id };
      },

      validerTransfertMatiereOfSource: (id) => {
        const state = get();
        const prev = (state.transfertsMatiereOf ?? []).find((t) => t.id === id);
        if (!prev) return { ok: false, reason: "Transfert introuvable." };
        if (prev.statut !== "demande") {
          return { ok: false, reason: "Ce transfert n'est pas en attente de validation source." };
        }
        const source = state.ordresFabrication.find((o) => o.id === prev.ofSourceId);
        if (!source) return { ok: false, reason: "OF source introuvable." };
        if (!utilisateurCourantPeutAgirSurSite(source.atelierId)) {
          return {
            ok: false,
            reason: "Validation source : rattachement à l'atelier de l'OF source requis.",
          };
        }
        const actor = getActiviteActor();
        set((s) => ({
          transfertsMatiereOf: (s.transfertsMatiereOf ?? []).map((t) =>
            t.id === id
              ? {
                  ...t,
                  statut: "valide_source" as const,
                  dateValidationSource: new Date().toISOString(),
                  validateurSourceId: actor.id,
                  validateurSourceNom: actor.nom,
                }
              : t,
          ),
          journalActivites: [
            entreeActivite("validation", "transfert_matiere_of", {
              entiteId: id,
              libelle: prev.numero,
              detail: "Validation OF source",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      validerTransfertMatiereOfDestinataire: (id) => {
        const state = get();
        const prev = (state.transfertsMatiereOf ?? []).find((t) => t.id === id);
        if (!prev) return { ok: false, reason: "Transfert introuvable." };
        if (prev.statut !== "valide_source") {
          return {
            ok: false,
            reason: "La validation de l'OF source est requise avant celle du destinataire.",
          };
        }
        const dest = state.ordresFabrication.find((o) => o.id === prev.ofDestinataireId);
        if (!dest) return { ok: false, reason: "OF destinataire introuvable." };
        if (!utilisateurCourantPeutAgirSurSite(dest.atelierId)) {
          return {
            ok: false,
            reason: "Validation destinataire : rattachement à l'atelier de l'OF destinataire requis.",
          };
        }
        const ctxRes = {
          achats: state.achats,
          ordresFabrication: state.ordresFabrication,
          transfertsMatiereOf: state.transfertsMatiereOf ?? [],
        };
        const reserve = quantiteReserveeOf(
          prev.produitId,
          prev.pointDeVenteId,
          prev.ofSourceId,
          ctxRes,
        );
        if (reserve + 1e-9 < prev.quantite) {
          return {
            ok: false,
            reason: `La quantité réservée sur l'OF source a changé (${reserve}).`,
          };
        }
        const actor = getActiviteActor();
        set((s) => ({
          transfertsMatiereOf: (s.transfertsMatiereOf ?? []).map((t) =>
            t.id === id
              ? {
                  ...t,
                  statut: "effectue" as const,
                  dateValidationDestinataire: new Date().toISOString(),
                  validateurDestId: actor.id,
                  validateurDestNom: actor.nom,
                }
              : t,
          ),
          journalActivites: [
            entreeActivite("validation", "transfert_matiere_of", {
              entiteId: id,
              libelle: prev.numero,
              detail: "Validation OF destinataire — transfert effectif",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      annulerTransfertMatiereOf: (id) => {
        const state = get();
        const prev = (state.transfertsMatiereOf ?? []).find((t) => t.id === id);
        if (!prev) return { ok: false, reason: "Transfert introuvable." };
        if (prev.statut === "effectue" || prev.statut === "annule") {
          return { ok: false, reason: "Ce transfert ne peut plus être annulé." };
        }
        set((s) => ({
          transfertsMatiereOf: (s.transfertsMatiereOf ?? []).map((t) =>
            t.id === id ? { ...t, statut: "annule" as const } : t,
          ),
          journalActivites: [
            entreeActivite("annulation", "transfert_matiere_of", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      creerBesoinAchat: (data) => {
        const motif = motifBesoinAchatInvalide(data);
        if (motif) return { ok: false, reason: motif };
        const state = get();
        const produit = state.produits.find((p) => p.id === data.produitId);
        if (!produit) return { ok: false, reason: "Article introuvable." };
        if (!produitEstAchetable(produit, state.categoriesProduits)) {
          return {
            ok: false,
            reason: motifProduitNonAchetable(produit),
          };
        }
        const site = state.pointsDeVente.find((s) => s.id === data.pointDeVenteId);
        if (!site) return { ok: false, reason: "Site introuvable." };
        const nouveau: BesoinAchat = {
          id: uid("ba"),
          numero: nextNumeroBesoinAchat(state.besoinsAchat ?? [], optsNum(state)),
          date: new Date().toISOString(),
          produitId: data.produitId,
          quantiteNecessaire: data.quantiteNecessaire,
          pointDeVenteId: data.pointDeVenteId,
          repartitionsOf: (data.repartitionsOf ?? []).map((r) => ({
            ...r,
            id: r.id || uid("bao"),
          })),
          note: data.note?.trim() || undefined,
        };
        set((s) => ({
          besoinsAchat: [nouveau, ...(s.besoinsAchat ?? [])],
          journalActivites: [
            entreeActivite("creation", "besoin_achat", {
              entiteId: nouveau.id,
              libelle: nouveau.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, id: nouveau.id };
      },

      modifierBesoinAchat: (id, data) => {
        const state = get();
        const prev = (state.besoinsAchat ?? []).find((b) => b.id === id);
        if (!prev) return { ok: false, reason: "Besoin introuvable." };
        if (prev.annule) return { ok: false, reason: "Ce besoin est annulé." };
        const next: BesoinAchat = { ...prev, ...data };
        const motif = motifBesoinAchatInvalide(next);
        if (motif) return { ok: false, reason: motif };
        set((s) => ({
          besoinsAchat: (s.besoinsAchat ?? []).map((b) => (b.id === id ? next : b)),
          journalActivites: [
            entreeActivite("modification", "besoin_achat", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      annulerBesoinAchat: (id) => {
        const state = get();
        const prev = (state.besoinsAchat ?? []).find((b) => b.id === id);
        if (!prev) return { ok: false, reason: "Besoin introuvable." };
        if (prev.annule) return { ok: false, reason: "Ce besoin est déjà annulé." };
        set((s) => ({
          besoinsAchat: (s.besoinsAchat ?? []).map((b) =>
            b.id === id ? { ...b, annule: true } : b,
          ),
          journalActivites: [
            entreeActivite("annulation", "besoin_achat", {
              entiteId: id,
              libelle: prev.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      creerAchatDepuisBesoin: (data) => {
        if (!(data.quantite > 0)) return { ok: false, reason: "Quantité invalide." };
        if (data.prixAchatUnitaire < 0) return { ok: false, reason: "Prix unitaire invalide." };
        const state = get();
        const besoin = (state.besoinsAchat ?? []).find((b) => b.id === data.besoinId);
        if (!besoin) return { ok: false, reason: "Besoin introuvable." };
        if (besoin.annule) return { ok: false, reason: "Ce besoin est annulé." };
        const produit = state.produits.find((p) => p.id === besoin.produitId);
        if (!produit) return { ok: false, reason: "Article introuvable." };
        const fournisseur = state.fournisseurs.find((f) => f.id === data.fournisseurId);
        if (!fournisseur) return { ok: false, reason: "Fournisseur introuvable." };
        const siteId = data.pointDeVenteId || besoin.pointDeVenteId;
        const site = state.pointsDeVente.find((s) => s.id === siteId);
        if (!site) return { ok: false, reason: "Site introuvable." };
        const motifNat = motifAchatNatureInterdite(
          state.produits,
          [{ produitId: besoin.produitId }],
          state.categoriesProduits,
        );
        if (motifNat) return { ok: false, reason: motifNat };
        const repsOf = prorataRepartitionsOf(
          besoin.repartitionsOf,
          besoin.quantiteNecessaire,
          data.quantite,
        ).map((r) => ({ ...r, id: uid("rof") }));
        const ofsUniques = [...new Set(repsOf.map((r) => r.ofId))];
        const ofPrincipal =
          ofsUniques.length === 1
            ? state.ordresFabrication.find((o) => o.id === ofsUniques[0])
            : ofsUniques.length > 0
              ? state.ordresFabrication.find((o) => o.id === ofsUniques[0] && o.commandeId)
              : undefined;
        const destOf = destinationDepuisOf(ofPrincipal);
        const achatId = uid("ach");
        const numero = nextNumeroAchat(state.achats, optsNum(state));
        const actor = getActiviteActor();
        const achat: Achat = {
          id: achatId,
          numero,
          fournisseurId: data.fournisseurId,
          pointDeVenteId: siteId,
          date: new Date().toISOString(),
          statut: "brouillon",
          tauxTVA: state.parametres.assujettiTVA ? state.parametres.tauxTVA : 0,
          lignes: [
            {
              id: uid("al"),
              produitId: besoin.produitId,
              typeAchat: produit.typeAchat ?? "matieres_premieres",
              quantite: data.quantite,
              prixAchatUnitaire: data.prixAchatUnitaire,
              repartitions: [{ pointDeVenteId: siteId, quantite: data.quantite }],
              repartitionsOf: repsOf,
              besoinAchatId: besoin.id,
            },
          ],
          livraisons: [],
          paiements: [],
          avoirs: [],
          note:
            data.note?.trim() ||
            `Couverture du besoin ${besoin.numero}`,
          vendeurId: actor.id,
          vendeurNom: actor.nom,
          besoinAchatId: besoin.id,
          modePaiement: data.modePaiement,
          ofId: ofsUniques.length === 1 ? ofsUniques[0] : undefined,
          ofComposantId: ofsUniques.length === 1 ? besoin.produitId : undefined,
          destinationAchat: destOf.destinationAchat,
          commandeId: destOf.commandeId,
        };
        set((s) => ({
          achats: [achat, ...s.achats],
          journalActivites: [
            entreeActivite("creation", "achat", {
              entiteId: achatId,
              libelle: numero,
              detail: `Besoin ${besoin.numero}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true, achatId };
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
        const cmd = data.commandeId
          ? state.commandes.find((c) => c.id === data.commandeId)
          : undefined;
        const dimCmd = data.commandeId
          ? dimensionDepuisCommande(cmd, data.produitId)
          : null;
        const dimensionLargeur =
          Number(data.dimensionLargeur) > 0
            ? Number(data.dimensionLargeur)
            : dimCmd?.largeur;
        const dimensionHauteur =
          Number(data.dimensionHauteur) > 0
            ? Number(data.dimensionHauteur)
            : dimCmd?.hauteur;
        const nomC = (cid: string) =>
          state.produits.find((p) => p.id === cid)?.code ?? cid;
        const copie = copierNomenclatureVersOf(
          produit!,
          source,
          { largeur: dimensionLargeur, hauteur: dimensionHauteur },
          nomC,
        );
        const motifDim = motifDimensionNomenclatureManquante(
          copie.lignes,
          dimensionLargeur,
          dimensionHauteur,
        );
        if (motifDim) return { ok: false, reason: motifDim };
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
          ligneCommandeId: data.ligneCommandeId,
          dimensionLargeur,
          dimensionHauteur,
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
        const commandeId =
          data.commandeId !== undefined ? data.commandeId : prev.commandeId;
        const cmd = commandeId
          ? state.commandes.find((c) => c.id === commandeId)
          : undefined;
        const dimCmd = commandeId
          ? dimensionDepuisCommande(cmd, produitId)
          : null;
        const dimensionLargeur =
          data.dimensionLargeur !== undefined
            ? data.dimensionLargeur
            : dimCmd && data.commandeId
              ? dimCmd.largeur
              : prev.dimensionLargeur;
        const dimensionHauteur =
          data.dimensionHauteur !== undefined
            ? data.dimensionHauteur
            : dimCmd && data.commandeId
              ? dimCmd.hauteur
              : prev.dimensionHauteur;
        const nomC = (cid: string) =>
          state.produits.find((p) => p.id === cid)?.code ?? cid;
        const dims = { largeur: dimensionLargeur, hauteur: dimensionHauteur };
        if (data.produitId || data.nomenclatureSource) {
          const produit = state.produits.find((p) => p.id === produitId);
          const motifProd = motifProduitOfInvalide(produit);
          if (motifProd) return { ok: false, reason: motifProd };
          if (!data.nomenclatureLignes) {
            const copie = copierNomenclatureVersOf(produit!, nomenclatureSource, dims, nomC);
            nomenclatureLignes = copie.lignes;
            nomenclatureNom = copie.nom;
          }
        } else if (
          (data.dimensionLargeur !== undefined ||
            data.dimensionHauteur !== undefined ||
            data.commandeId !== undefined) &&
          !data.nomenclatureLignes
        ) {
          nomenclatureLignes = resoudreLignesNomenclatureOf(
            nomenclatureLignes,
            dims,
            nomC,
          );
        }
        const next: OrdreFabrication = {
          ...prev,
          ...data,
          nomenclatureLignes,
          nomenclatureNom,
          nomenclatureSource,
          commandeId,
          dimensionLargeur,
          dimensionHauteur,
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
        const motifBat = motifBatOfManquant(prev, bats, state.commandes);
        if (motifBat && !opts?.derogationBat) {
          return { ok: false, reason: motifBat };
        }
        if (opts?.derogationBat && !useAuthStore.getState().hasPermission("fabrication.deroger_bat")) {
          return {
            ok: false,
            reason: "Vous n'êtes pas habilité à déroger à l'obligation de BAT validé.",
          };
        }
        const motifDim = motifLancementOfDimension(prev);
        if (motifDim) return { ok: false, reason: motifDim };
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
        const ctxRes = {
          achats: state.achats,
          ordresFabrication: state.ordresFabrication,
          transfertsMatiereOf: state.transfertsMatiereOf ?? [],
        };
        const dispo = stockDisponiblePourOf(
          data.composantId,
          data.siteSourceId,
          ofId,
          state.entrees,
          state.ventes,
          state.inventaires,
          ctxRes,
        );
        if (dispo + 1e-9 < data.quantite) {
          return {
            ok: false,
            reason: `Stock insuffisant pour cet OF (disponible : ${dispo}, hors réservations des autres OF). Créez une demande d'achat pour la quantité manquante.`,
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

      ajouterSortieAtelier: (data) => {
        const state = get();
        if (data.quantite <= 0) return { ok: false, reason: "Quantité invalide." };
        const atelier = state.pointsDeVente.find((s) => s.id === data.atelierId);
        if (!atelier || !siteEstAtelier(atelier)) {
          return { ok: false, reason: "Choisissez un atelier destinataire." };
        }
        if (!utilisateurCourantPeutAgirSurSite(data.atelierId)) {
          return { ok: false, reason: "Vous devez être rattaché à cet atelier." };
        }
        const siteSourceId = data.siteSourceId || data.atelierId;
        if (!utilisateurCourantPeutAgirSurSite(siteSourceId)) {
          return { ok: false, reason: "Vous n'êtes pas rattaché au site source." };
        }
        const produit = state.produits.find((p) => p.id === data.produitId);
        if (!produit) return { ok: false, reason: "Article introuvable." };
        const dispo = stockDisponible(
          data.produitId,
          siteSourceId,
          state.entrees,
          state.ventes,
          state.inventaires,
        );
        if (dispo + 1e-9 < data.quantite) {
          return {
            ok: false,
            reason: `Stock insuffisant (disponible : ${dispo}).`,
          };
        }
        const etat = cumpCourantSite({
          produitId: data.produitId,
          siteId: siteSourceId,
          entrees: state.entrees,
          ventes: state.ventes,
          inventaires: state.inventaires,
          produit,
        });
        const motifCatalogue = libelleMotifSortieAtelier(
          state.motifsSortieAtelier,
          data.motifId,
          "",
        );
        const motif =
          [motifCatalogue !== "—" ? motifCatalogue : "", data.motifLibre?.trim()]
            .filter(Boolean)
            .join(" — ") || "Sortie atelier";
        const id = uid("sat");
        const sortie: SortieAtelier = {
          id,
          date: data.date,
          atelierId: data.atelierId,
          siteSourceId,
          produitId: data.produitId,
          quantite: data.quantite,
          motifId: data.motifId,
          motif,
          cumpSortie: etat.cump,
          valeur: data.quantite * etat.cump,
        };
        const sorties = [sortie, ...(state.sortiesAtelier ?? [])];
        const entrees = regenererEntreesSortiesAtelier(
          state.entrees,
          sorties,
          state.produits,
        );
        if (
          stockDevientNegatif(
            entrees,
            state.ventes,
            state.inventaires,
            siteSourceId,
            [data.produitId],
          )
        ) {
          return { ok: false, reason: "Stock insuffisant sur le site source." };
        }
        set((s) =>
          avecJournal(s, {
            sortiesAtelier: sorties,
            entrees,
            journalActivites: [
              entreeActivite("creation", "sortie_atelier", {
                entiteId: id,
                libelle: `${produit.libelleCourt || produit.code} → ${atelier.nom}`,
                detail: motif,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true, id };
      },
      supprimerSortieAtelier: (id) => {
        const state = get();
        const prev = (state.sortiesAtelier ?? []).find((s) => s.id === id);
        if (!prev) return { ok: false, reason: "Sortie introuvable." };
        const sorties = (state.sortiesAtelier ?? []).filter((s) => s.id !== id);
        const entrees = regenererEntreesSortiesAtelier(
          state.entrees,
          sorties,
          state.produits,
        );
        set((s) =>
          avecJournal(s, {
            sortiesAtelier: sorties,
            entrees,
            journalActivites: [
              entreeActivite("suppression", "sortie_atelier", {
                entiteId: id,
                libelle: prev.motif,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },

      addMotifSortieAtelier: (data) => {
        const state = get();
        const motif = motifSortieAtelierInvalide(
          data.libelle,
          state.motifsSortieAtelier ?? [],
        );
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("msa");
        const ordre =
          (state.motifsSortieAtelier ?? []).reduce(
            (m, n) => Math.max(m, n.ordre),
            0,
          ) + 1;
        const libelle = data.libelle.trim();
        set((s) => ({
          motifsSortieAtelier: [
            ...(s.motifsSortieAtelier ?? []),
            { id, libelle, ordre, actif: true },
          ],
          journalActivites: [
            entreeActivite("creation", "motif_sortie_atelier", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updateMotifSortieAtelier: (id, data) => {
        const state = get();
        const prev = (state.motifsSortieAtelier ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false as const, reason: "Motif introuvable." };
        if (data.libelle != null) {
          const motif = motifSortieAtelierInvalide(
            data.libelle,
            state.motifsSortieAtelier ?? [],
            id,
          );
          if (motif) return { ok: false as const, reason: motif };
        }
        set((s) => ({
          motifsSortieAtelier: (s.motifsSortieAtelier ?? []).map((m) =>
            m.id === id
              ? {
                  ...m,
                  ...data,
                  libelle: data.libelle != null ? data.libelle.trim() : m.libelle,
                }
              : m,
          ),
          journalActivites: [
            entreeActivite("modification", "motif_sortie_atelier", {
              entiteId: id,
              libelle: data.libelle?.trim() || prev.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      deleteMotifSortieAtelier: (id) => {
        const state = get();
        const prev = (state.motifsSortieAtelier ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false as const, reason: "Motif introuvable." };
        if ((state.sortiesAtelier ?? []).some((s) => s.motifId === id)) {
          return {
            ok: false as const,
            reason: "Ce motif est déjà utilisé : suppression impossible.",
          };
        }
        set((s) => ({
          motifsSortieAtelier: (s.motifsSortieAtelier ?? []).filter(
            (m) => m.id !== id,
          ),
          journalActivites: [
            entreeActivite("suppression", "motif_sortie_atelier", {
              entiteId: id,
              libelle: prev.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },

      addEmplacementStock: (data) => {
        const state = get();
        const motif = motifEmplacementInvalide(
          data,
          state.emplacementsStock ?? [],
        );
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("ems");
        const allee = data.allee.trim();
        const casier = data.casier.trim();
        set((s) => ({
          emplacementsStock: [
            ...(s.emplacementsStock ?? []),
            { id, siteId: data.siteId, allee, casier, actif: true },
          ],
          journalActivites: [
            entreeActivite("creation", "emplacement_stock", {
              entiteId: id,
              libelle: libelleEmplacement({ allee, casier }),
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updateEmplacementStock: (id, data) => {
        const state = get();
        const prev = (state.emplacementsStock ?? []).find((e) => e.id === id);
        if (!prev) return { ok: false as const, reason: "Emplacement introuvable." };
        const next = {
          siteId: data.siteId ?? prev.siteId,
          allee: data.allee ?? prev.allee,
          casier: data.casier ?? prev.casier,
        };
        const motif = motifEmplacementInvalide(
          next,
          state.emplacementsStock ?? [],
          id,
        );
        if (motif) return { ok: false as const, reason: motif };
        const libelle = libelleEmplacement({
          allee: next.allee.trim(),
          casier: next.casier.trim(),
        });
        set((s) => ({
          emplacementsStock: (s.emplacementsStock ?? []).map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...data,
                  siteId: next.siteId,
                  allee: next.allee.trim(),
                  casier: next.casier.trim(),
                }
              : e,
          ),
          journalActivites: [
            entreeActivite("modification", "emplacement_stock", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      deleteEmplacementStock: (id) => {
        const state = get();
        const prev = (state.emplacementsStock ?? []).find((e) => e.id === id);
        if (!prev) return { ok: false as const, reason: "Emplacement introuvable." };
        const nb = nbLignesBpSurEmplacement(state.bonsDePreparation ?? [], id);
        if (nb > 0) {
          return {
            ok: false as const,
            reason: "Cet emplacement est déjà utilisé sur un bon de préparation.",
          };
        }
        set((s) => ({
          emplacementsStock: (s.emplacementsStock ?? []).filter((e) => e.id !== id),
          journalActivites: [
            entreeActivite("suppression", "emplacement_stock", {
              entiteId: id,
              libelle: libelleEmplacement(prev),
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
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
        if (next.statut === "cloture_annule") {
          tracerAudit(get(), {
            categorie: "statut_critique",
            action: "annulation_of_cloture",
            module: "fabrication",
            objetType: "ordre_fabrication",
            objetId: id,
            objetLibelle: prev.numero,
            objetHref: "/fabrication",
            champ: "statut",
            ancienneValeur: "cloture",
            nouvelleValeur: "cloture_annule",
            siteId: prev.atelierId,
          });
        }
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
        const destOf = destinationDepuisOf(prev);
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
              destinationAchat: destOf.destinationAchat,
              commandeId: destOf.commandeId,
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
          return { ok: false, reason: "La création d'un BAT est réservée aux utilisateurs ayant accès à la commande." };
        }
        const state = get();
        const cmd = state.commandes.find((c) => c.id === data.commandeId);
        if (!cmd) return { ok: false, reason: "Commande client introuvable." };
        if (cmd.statut === "annulee") {
          return { ok: false, reason: "Impossible de créer un BAT sur une commande annulée." };
        }
        const bats = state.bonsATirer ?? [];
        const ligneIds = (data.ligneIds ?? []).filter(Boolean);
        const courantSansFichier = bats
          .filter((b) => b.commandeId === data.commandeId && b.statut === "en_attente" && !batAFichier(b))
          .sort((a, b) => b.version - a.version)[0];
        if (courantSansFichier && data.fichierDataUrl) {
          const res = get().completerFichierBat(courantSansFichier.id, {
            nom: data.fichierNom ?? "bat",
            mime: data.fichierMime ?? "application/octet-stream",
            dataUrl: data.fichierDataUrl,
          });
          if (!res.ok) return { ok: false, reason: res.reason ?? "Impossible de joindre le fichier." };
          return { ok: true, id: courantSansFichier.id };
        }
        const motif = motifCreationBatImpossible(bats, cmd, ligneIds);
        if (motif) return { ok: false, reason: motif };
        if (!data.fichierDataUrl) {
          return { ok: false, reason: "Joignez le fichier du BAT (image ou PDF)." };
        }
        const id = uid("bat");
        const cycleId = uid("btc");
        const nouveau: BonATirer = {
          id,
          cycleId,
          commandeId: data.commandeId,
          ligneIds: ligneIds.length ? ligneIds : undefined,
          version: 1,
          fichierNom: data.fichierNom,
          fichierMime: data.fichierMime,
          fichierDataUrl: data.fichierDataUrl,
          statut: "en_attente",
          dateEnvoi: new Date().toISOString(),
          commentaire: data.commentaire?.trim() || undefined,
          origine: data.origine ?? "scratch",
          sourceBatId: data.sourceBatId,
          gabarit: data.gabarit,
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
          return { ok: false, reason: "Seul un utilisateur habilité peut joindre un fichier BAT." };
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
        const actor = getActiviteActor();
        if (data.decision === "valide") {
          if (!actorPeutValiderBat(useAuthStore.getState().currentUser(), state.parametres)) {
            return {
              ok: false,
              reason: "La validation du BAT est réservée au rôle habilité (Paramètres BAT).",
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
                    validateurUserId: actor.id,
                    validateurUserNom: actor.nom,
                    validateurNom: actor.nom,
                    commentaire: data.commentaire?.trim() || b.commentaire,
                  }
                : b,
            ),
            journalActivites: [
              entreeActivite("validation", "bon_a_tirer", {
                entiteId: id,
                libelle: `${cmd?.numero ?? ""} V${prev.version}`,
                detail: `Validé par ${actor.nom ?? "utilisateur interne"}`,
              }),
              ...s.journalActivites,
            ],
          }));
          return { ok: true };
        }
        if (!actorPeutGererBat()) {
          return { ok: false, reason: "Vous n'êtes pas habilité à enregistrer des modifications BAT." };
        }
        if (!data.motifRefus) {
          return {
            ok: false,
            reason: "Indiquez le motif des modifications (Couleur, Texte, Dimension ou Autre).",
          };
        }
        const now = new Date().toISOString();
        const cycleId = cycleIdBat(prev);
        const suivant: BonATirer = {
          id: uid("bat"),
          cycleId,
          commandeId: prev.commandeId,
          ligneIds: prev.ligneIds,
          version: prochaineVersionCycle(state.bonsATirer ?? [], cycleId),
          fichierNom: data.fichierSuivant?.nom,
          fichierMime: data.fichierSuivant?.mime,
          fichierDataUrl: data.fichierSuivant?.dataUrl,
          statut: "en_attente",
          dateEnvoi: now,
          origine: prev.origine,
          sourceBatId: prev.sourceBatId,
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
                    motifRefus: data.motifRefus,
                  }
                : b,
            ),
          ],
          journalActivites: [
            entreeActivite("modification", "bon_a_tirer", {
              entiteId: id,
              libelle: `${cmd?.numero ?? ""} V${prev.version}`,
              detail: `Modifications demandées (${data.motifRefus}) → V${suivant.version}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
      },

      dupliquerBatValide: (data) => {
        if (!actorPeutGererBat()) {
          return { ok: false, reason: "La duplication d'un BAT est réservée aux utilisateurs ayant accès à la commande." };
        }
        const state = get();
        const source = (state.bonsATirer ?? []).find((b) => b.id === data.sourceId);
        if (!source || source.statut !== "valide" || !batAFichier(source)) {
          return { ok: false, reason: "Choisissez un BAT validé avec fichier." };
        }
        const cmd = state.commandes.find((c) => c.id === data.commandeId);
        if (!cmd) return { ok: false, reason: "Commande cible introuvable." };
        const sourceCmd = state.commandes.find((c) => c.id === source.commandeId);
        if (sourceCmd && sourceCmd.clientId !== cmd.clientId) {
          return { ok: false, reason: "La duplication fidèle est réservée au même client. Utilisez un gabarit pour un autre client." };
        }
        const idsCibles =
          data.ligneIds && data.ligneIds.length > 0
            ? data.ligneIds.filter((id) => cmd.lignes.some((l) => l.id === id))
            : sourceCmd
              ? cmd.lignes
                  .filter(
                    (l) =>
                      l.produitId &&
                      produitIdsBat(source, sourceCmd).includes(l.produitId),
                  )
                  .map((l) => l.id)
              : [];
        const creer = get().creerBonATirer({
          commandeId: data.commandeId,
          ligneIds: idsCibles,
          fichierNom: source.fichierNom,
          fichierMime: source.fichierMime,
          fichierDataUrl: source.fichierDataUrl,
          commentaire: source.commentaire,
          origine: "duplication",
          sourceBatId: source.id,
        });
        if (creer.ok !== true) {
          return { ok: false, reason: ("reason" in creer ? creer.reason : undefined) ?? "Duplication impossible." };
        }
        const nouveauId = creer.id;
        const val = get().enregistrerRetourBat(nouveauId, {
          decision: "valide",
          commentaire: "Duplication d'un BAT déjà validé (même client / même produit).",
        });
        if (!val.ok) {
          return { ok: false, reason: val.reason ?? "Validation impossible." };
        }
        return { ok: true, id: nouveauId };
      },

      creerBatDepuisGabarit: (data) => {
        const state = get();
        const gabarit = (state.bonsATirer ?? []).find((b) => b.id === data.gabaritId);
        if (!gabarit?.gabarit || gabarit.statut !== "valide" || !batAFichier(gabarit)) {
          return { ok: false, reason: "Choisissez un BAT marqué comme modèle de référence, validé, avec fichier." };
        }
        return get().creerBonATirer({
          commandeId: data.commandeId,
          ligneIds: data.ligneIds,
          fichierNom: gabarit.fichierNom,
          fichierMime: gabarit.fichierMime,
          fichierDataUrl: gabarit.fichierDataUrl,
          origine: "gabarit",
          sourceBatId: gabarit.id,
        });
      },

      marquerGabaritBat: (id, gabarit) => {
        if (!actorPeutGererBat()) {
          return { ok: false, reason: "Marquage gabarit réservé aux utilisateurs ayant accès à la commande." };
        }
        const state = get();
        const prev = (state.bonsATirer ?? []).find((b) => b.id === id);
        if (!prev) return { ok: false, reason: "BAT introuvable." };
        const courant = batCourantCycle(state.bonsATirer ?? [], cycleIdBat(prev));
        if (!courant || courant.statut !== "valide") {
          return { ok: false, reason: "Seul un BAT validé peut être marqué comme modèle de référence." };
        }
        const cmd = state.commandes.find((c) => c.id === prev.commandeId);
        const cycle = cycleIdBat(prev);
        set((s) => ({
          bonsATirer: (s.bonsATirer ?? []).map((b) =>
            cycleIdBat(b) === cycle ? { ...b, gabarit } : b,
          ),
          journalActivites: [
            entreeActivite("modification", "bon_a_tirer", {
              entiteId: courant.id,
              libelle: `${cmd?.numero ?? ""} V${courant.version}`,
              detail: gabarit ? "Marqué gabarit" : "Gabarit retiré",
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

      dupliquerMissionAchat: (id) => {
        const prev = (get().missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        const objet = (prev.objet ?? "").trim();
        return get().creerMissionAchat({
          acheteurUserId: prev.acheteurUserId,
          acheteurNom: prev.acheteurNom,
          date: new Date().toISOString().slice(0, 10),
          datePrevue: prev.datePrevue,
          siteDestinataireId: prev.siteDestinataireId,
          service: prev.service,
          objet: objet ? `${objet} (copie)` : prev.numero,
          fournisseursPrevus: prev.fournisseursPrevus,
          montantAvance: 0,
          montantAvanceDemandee: prev.montantAvanceDemandee ?? 0,
          lignesPrevisionnelles: (prev.lignesPrevisionnelles ?? []).map((l) => ({
            produitId: l.produitId,
            quantiteSouhaitee: l.quantiteSouhaitee,
            prixUnitaireEstime: l.prixUnitaireEstime,
            fournisseurId: l.fournisseurId,
            commentaire: l.commentaire,
          })),
          note: prev.note,
        });
      },

      supprimerMissionAchat: (id) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "La suppression est réservée au responsable achats." };
        }
        const prev = (get().missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (!missionPeutEtreSupprimee(prev)) {
          return {
            ok: false,
            reason:
              "Cette mission a déjà des fonds ou des achats. Annulez-la depuis la fiche plutôt que de la supprimer.",
          };
        }
        set((s) => ({
          missionsAchat: (s.missionsAchat ?? []).filter((m) => m.id !== id),
          journalActivites: [
            entreeActivite("annulation", "mission_achat", {
              entiteId: id,
              libelle: prev.numero,
              detail: "Suppression du brouillon",
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true };
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
        if (data.siteDestinataireId && data.siteDestinataireId !== prev.siteDestinataireId) {
          const site = state.pointsDeVente.find((s) => s.id === data.siteDestinataireId);
          if (!site) return { ok: false, reason: "Site destinataire introuvable." };
        }
        if (data.acheteurUserId !== undefined && !data.acheteurUserId) {
          return { ok: false, reason: "Assignez un acheteur." };
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
        set((s) =>
          avecJournal(s, {
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
          }),
        );
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
        let mouvements = [...(prev.mouvementsFonds ?? [])];
        if (data.statutReglement !== "regle") {
          mouvements = mouvements.filter(
            (mv) => mv.type !== "restitution" && mv.type !== "remboursement",
          );
        } else if (prev.statutReglement !== "regle") {
          const solde = soldeMission(prev);
          if (Math.abs(solde) >= 0.5) {
            const motifPaiement = motifSaisieLignePaiement(
              {
                montant: Math.abs(solde),
                modePaiement: data.modePaiement ?? "",
                compteTresorerieId: data.compteTresorerieId,
                date: data.dateReglement ?? new Date().toISOString(),
              },
              get().modesPaiement ?? [],
              get().comptesTresorerie ?? [],
              { compteObligatoire: true },
            );
            if (motifPaiement) return { ok: false, reason: motifPaiement };
            mouvements.push({
              id: uid("misf"),
              type: solde > 0 ? "restitution" : "remboursement",
              montant: Math.abs(solde),
              date: data.dateReglement ?? new Date().toISOString(),
              modePaiement: data.modePaiement,
              compteTresorerieId: data.compteTresorerieId,
              reference: data.reference,
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
        set((s) =>
          avecJournal(s, {
            missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
            journalActivites: [
              entreeActivite("modification", "mission_achat", {
                entiteId: id,
                libelle: prev.numero,
                detail: data.statutReglement === "regle" ? "Règlement de l'avance" : "Règlement annulé",
              }),
              ...s.journalActivites,
            ],
          }),
        );
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
        const motifPaiement = motifSaisieLignePaiement(
          {
            montant: data.montant,
            modePaiement: data.modePaiement ?? "",
            compteTresorerieId: data.compteTresorerieId,
            date: data.date,
          },
          get().modesPaiement ?? [],
          get().comptesTresorerie ?? [],
          { compteObligatoire: true },
        );
        if (motifPaiement) return { ok: false, reason: motifPaiement };
        const actor = getActiviteActor();
        const mouvement: MissionMouvementFonds = {
          id: uid("misf"),
          type: "remise",
          montant: data.montant,
          date: data.date,
          modePaiement: data.modePaiement,
          compteSource: data.compteSource,
          compteTresorerieId: data.compteTresorerieId,
          reference: data.reference,
          responsableUserId: actor.id,
          responsableNom: actor.nom,
        };
        const mouvements = [...(prev.mouvementsFonds ?? []), mouvement];
        const remis = mouvements
          .filter((x) => x.type === "remise" && !x.annule)
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
        set((s) =>
          avecJournal(s, {
            missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
            journalActivites: [
              entreeActivite("modification", "mission_achat", {
                entiteId: id,
                libelle: prev.numero,
                detail: `Remise de fonds ${Math.round(data.montant)} Ar · ${mouvement.id}`,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },

      annulerRemiseFondsMissionAchat: (id, mouvementId) => {
        if (!actorPeutGererMissions()) {
          return { ok: false, reason: "L'annulation d'un décaissement est réservée au responsable achats." };
        }
        const prev = (get().missionsAchat ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false, reason: "Mission introuvable." };
        if (missionEstVerrouillee(prev)) {
          return { ok: false, reason: "Cette mission est clôturée, rejetée ou annulée : le décaissement ne peut plus être annulé." };
        }
        if (prev.statutReglement === "regle") {
          return { ok: false, reason: "L'avance est déjà réglée. Passez d'abord le règlement à « non réglé » pour annuler un décaissement." };
        }
        const cible = (prev.mouvementsFonds ?? []).find((mv) => mv.id === mouvementId);
        if (!cible) return { ok: false, reason: "Décaissement introuvable." };
        if (cible.type !== "remise") {
          return { ok: false, reason: "Seule une remise de fonds à l'acheteur peut être annulée ici." };
        }
        if (cible.annule) {
          return { ok: false, reason: "Ce décaissement est déjà annulé." };
        }
        const actor = getActiviteActor();
        const mouvements = (prev.mouvementsFonds ?? []).map((mv) =>
          mv.id === mouvementId
            ? {
                ...mv,
                annule: true,
                dateAnnulation: new Date().toISOString(),
                note: [mv.note, "Annulé"].filter(Boolean).join(" · "),
              }
            : mv,
        );
        const remis = mouvements
          .filter((x) => x.type === "remise" && !x.annule)
          .reduce((s, x) => s + Math.max(0, x.montant), 0);
        let statut = prev.statut;
        if (remis <= 0 && prev.statut === "fonds_remis") statut = "validee";
        const next: MissionAchat = {
          ...prev,
          statut,
          montantAvance: remis,
          mouvementsFonds: mouvements,
          validations: [
            ...prev.validations,
            etapeValidationMission(
              "annuler_remise_fonds",
              actor,
              `${Math.round(cible.montant)} Ar${cible.reference ? ` — ${cible.reference}` : ""}`,
            ),
          ],
        };
        set((s) =>
          avecJournal(s, {
            missionsAchat: (s.missionsAchat ?? []).map((m) => (m.id === id ? next : m)),
            journalActivites: [
              entreeActivite("annulation", "mission_achat", {
                entiteId: id,
                libelle: prev.numero,
                detail: `Annulation décaissement ${Math.round(cible.montant)} Ar`,
              }),
              ...s.journalActivites.filter(
                (j) =>
                  !(
                    j.entite === "mission_achat" &&
                    j.entiteId === id &&
                    typeof j.detail === "string" &&
                    j.detail.includes(cible.id)
                  ),
              ),
            ],
          }),
        );
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
        const motifNat = motifAchatNatureInterdite(
          state.produits,
          data.lignes,
          state.categoriesProduits,
        );
        if (motifNat) return { ok: false, reason: motifNat };
        const motifDest = motifDestinationAchatManquante({
          destinationAchat: data.destinationAchat,
          commandeId: data.commandeId,
        });
        if (motifDest) return { ok: false, reason: motifDest };
        const lignes: DemandePrixLigne[] = data.lignes.map((l) => ({
          id: uid("dpl"),
          produitId: l.produitId,
          quantite: l.quantite,
          dateLivraisonSouhaitee: l.dateLivraisonSouhaitee || data.dateLivraisonSouhaitee,
          pointDeVenteId: l.pointDeVenteId || data.pointDeVenteId,
          specifications: l.specifications?.trim() || undefined,
        }));
        const fournisseurIds = [...new Set(data.fournisseurIds)];
        const offres: DemandePrixOffre[] = [];
        for (const ligne of lignes) {
          for (const fournisseurId of fournisseurIds) {
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
          fournisseurIds,
          offres,
          consultations: synchroniserConsultations(fournisseurIds, []),
          note: data.note,
          validiteJours: normaliserValiditeJours(data.validiteJours),
          pointDeVenteId: data.pointDeVenteId,
          dateLivraisonSouhaitee: data.dateLivraisonSouhaitee,
          origine: data.origine ?? "libre",
          alerteId: data.alerteId,
          destinationAchat: data.destinationAchat,
          commandeId:
            data.destinationAchat === "projet_client"
              ? data.commandeId
              : undefined,
        };
        set((s) => ({
          demandesPrix: [nouveau, ...(s.demandesPrix ?? [])],
          journalActivites: [
            entreeActivite("creation", "demande_prix", {
              entiteId: nouveau.id,
              libelle: nouveau.numero,
              detail: data.origine === "alerte_stock" ? "Depuis une alerte stock" : undefined,
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
        const patchRetenus =
          data.fournisseurIdsRetenus !== undefined || data.retenuesParLigne !== undefined;
        const patchMetier =
          data.lignes !== undefined ||
          data.fournisseurIds !== undefined ||
          data.offres !== undefined ||
          data.date !== undefined ||
          data.consultations !== undefined ||
          data.pointDeVenteId !== undefined ||
          data.dateLivraisonSouhaitee !== undefined;
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
          const motifNat = motifAchatNatureInterdite(
            state.produits,
            lignes,
            state.categoriesProduits,
          );
          if (motifNat) return { ok: false, reason: motifNat };
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
        const retenus = patchRetenus && data.fournisseurIdsRetenus !== undefined
          ? [...new Set(data.fournisseurIdsRetenus ?? [])].filter((fid) => consultes.has(fid))
          : prev.fournisseurIdsRetenus;
        const retenuesParLigne = (data.retenuesParLigne ?? prev.retenuesParLigne ?? [])
          .filter((r) => consultes.has(r.fournisseurId) && lignes.some((l) => l.id === r.ligneId));
        const consultations = synchroniserConsultations(
          fournisseurIds,
          data.consultations ?? prev.consultations,
        );
        const next: DemandePrix = {
          ...prev,
          ...data,
          lignes,
          fournisseurIds,
          offres,
          consultations,
          fournisseurIdsRetenus: retenus,
          retenuesParLigne,
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
        const aRepondu = offres.some(
          (o) => o.fournisseurId === fournisseurId && o.prixUnitaire > 0,
        );
        const consultations = synchroniserConsultations(
          prev.fournisseurIds,
          prev.consultations,
        ).map((c) => {
          if (c.fournisseurId !== fournisseurId) return c;
          if (aRepondu && c.statut !== "sans_reponse") {
            return {
              ...c,
              statut: "repondue" as const,
              dateReponse: c.dateReponse ?? new Date().toISOString(),
            };
          }
          return c;
        });
        const passeEnCours =
          prev.statut === "brouillon" && aRepondu ? "en_cours" : prev.statut;
        set((s) => ({
          demandesPrix: (s.demandesPrix ?? []).map((d) =>
            d.id === id ? { ...d, offres, consultations, statut: passeEnCours } : d,
          ),
        }));
        return { ok: true };
      },

      majConsultationDemandePrix: (id, fournisseurId, statut) => {
        const prev = (get().demandesPrix ?? []).find((d) => d.id === id);
        if (!prev) return { ok: false, reason: "Demande de prix introuvable." };
        if (dpEstVerrouillee(prev)) {
          return { ok: false, reason: "Cette demande de prix est clôturée ou annulée." };
        }
        if (!(prev.fournisseurIds ?? []).includes(fournisseurId)) {
          return { ok: false, reason: "Ce fournisseur n'est pas consulté sur cette DP." };
        }
        const maintenant = new Date().toISOString();
        const consultations = synchroniserConsultations(
          prev.fournisseurIds,
          prev.consultations,
        ).map((c) => {
          if (c.fournisseurId !== fournisseurId) return c;
          return {
            ...c,
            statut,
            dateEnvoi:
              statut === "envoyee" || statut === "en_attente" || statut === "relancee"
                ? c.dateEnvoi ?? maintenant
                : c.dateEnvoi,
            dateRelance: statut === "relancee" ? maintenant : c.dateRelance,
            dateReponse: statut === "repondue" ? c.dateReponse ?? maintenant : c.dateReponse,
          };
        });
        const passeEnCours =
          prev.statut === "brouillon" &&
          (statut === "envoyee" || statut === "relancee" || statut === "repondue")
            ? "en_cours"
            : prev.statut;
        set((s) => ({
          demandesPrix: (s.demandesPrix ?? []).map((d) =>
            d.id === id ? { ...d, consultations, statut: passeEnCours } : d,
          ),
          journalActivites: [
            entreeActivite("modification", "demande_prix", {
              entiteId: id,
              libelle: prev.numero,
              detail: `Consultation ${statut}`,
            }),
            ...s.journalActivites,
          ],
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
        if (
          (prev.statut === "cloturee" || prev.statut === "cloturee_sans_suite") &&
          statut !== "annulee"
        ) {
          return { ok: false, reason: "Document verrouillé." };
        }
        if (statut !== "annulee" && statut !== "brouillon") {
          const motifDest = motifDestinationAchatManquante(prev);
          if (motifDest) return { ok: false, reason: motifDest };
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
        if (prev.statut === "annulee" || prev.statut === "cloturee_sans_suite") {
          return { ok: false, reason: "Cette demande de prix ne peut plus être transformée." };
        }
        const consultes = new Set(prev.fournisseurIds ?? []);
        if (consultes.size === 0) {
          return { ok: false, reason: "Aucun fournisseur consulté sur cette demande." };
        }
        const siteDest = data.pointDeVenteId || prev.pointDeVenteId;
        if (!siteDest) {
          return { ok: false, reason: "Choisissez un site de destination." };
        }
        if (data.commandes.length === 0) {
          return { ok: false, reason: "Répartissez au moins un article vers un fournisseur." };
        }
        const destinationAchat =
          data.destinationAchat ?? prev.destinationAchat;
        const commandeId =
          destinationAchat === "projet_client"
            ? (data.commandeId ?? prev.commandeId)
            : undefined;
        const motifDest = motifDestinationAchatManquante({
          destinationAchat,
          commandeId,
        });
        if (motifDest) return { ok: false, reason: motifDest };
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
            repartitions: [
              { pointDeVenteId: siteDest, quantite: l.quantite },
            ],
          }));
          const motifNat = motifAchatNatureInterdite(
            produits,
            lignesAchat,
            state.categoriesProduits,
          );
          if (motifNat) return { ok: false, reason: motifNat };
          if (moduleComptabiliteActif(state.parametres)) {
            const motifCompta = motifLignesAchatInvalides(
              lignesAchat,
              state.comptesComptables,
            );
            if (motifCompta) return { ok: false, reason: motifCompta };
          }
          const achatId = uid("ach");
          const numero = nextNumeroAchat(
            achatsCourants,
            optsNum(state, data.date ?? prev.date),
          );
          const achat: Achat = {
            id: achatId,
            numero,
            fournisseurId: cmd.fournisseurId,
            pointDeVenteId: siteDest,
            date: data.date ?? prev.date,
            statut: "valide",
            dateValidation: new Date().toISOString(),
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
            destinationAchat,
            commandeId,
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
        const retenuesParLigne = [
          ...(prev.retenuesParLigne ?? []),
        ];
        set((s) =>
          avecJournal(s, {
          achats: [...nouveaux, ...s.achats],
          demandesPrix: (s.demandesPrix ?? []).map((d) =>
            d.id === id
              ? {
                  ...d,
                  achatIds,
                  fournisseurIdsRetenus: retenusMaj,
                  retenuesParLigne,
                  statut: "cloturee",
                }
              : d,
          ),
          journalActivites: [
            ...nouveaux.map((a) =>
              entreeActivite("validation", "achat", {
                entiteId: a.id,
                libelle: a.numero,
                detail: `Depuis ${prev.numero} — achat réel`,
              }),
            ),
            ...s.journalActivites,
          ],
        }),
        );
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

      ajouterRelanceImpayee: (data) => {
        const state = get();
        const facture = state.factures.find((f) => f.id === data.factureId);
        if (!facture) return { ok: false, reason: "Facture introuvable." };
        const actor = getActiviteActor();
        const id = uid("rel");
        const relance: RelanceImpayee = {
          id,
          factureId: facture.id,
          clientId: facture.clientId,
          date: new Date().toISOString(),
          canal: data.canal,
          note: data.note?.trim() || undefined,
          prochaineRelance: data.prochaineRelance?.trim() || undefined,
          userId: actor.id,
          userNom: actor.nom,
        };
        set((s) => ({
          relancesImpayes: [relance, ...(s.relancesImpayes ?? [])],
          journalActivites: [
            entreeActivite("autre", "relance_impayee", {
              entiteId: id,
              libelle: facture.numero,
              detail: data.canal,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },

      tracerEnvoiDocument: (data) => {
        set((s) => ({
          journalActivites: [
            entreeActivite("envoi", data.entite, {
              entiteId: data.entiteId,
              libelle: data.libelle,
              detail: `${data.canal} → ${data.destinataire}`,
            }),
            ...s.journalActivites,
          ],
        }));
      },

      addProduit: (produit) => {
        const state = get();
        const nature = natureStockDuProduit(produit);
        if (produitEstFabrique({ natureStock: nature })) {
          const formules = motifNomenclaturesProduit(produit.nomenclatures);
          if (formules) return { ok: false, reason: formules };
        }
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
            modeApprovisionnement: modeApprovisionnementEnregistre(
              nature,
              produit.modeApprovisionnement,
            ),
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
      importerLigneArticle: (input) => {
        if (input.mode === "fusionner") {
          const fusionId = input.fusionId;
          if (!fusionId) return { ok: false, reason: "Article à fusionner manquant." };
          const res = get().updateProduit(fusionId, input.payload);
          if (!res.ok) return { ok: false, reason: res.reason ?? "Échec de la fusion." };
          return { ok: true as const, id: fusionId };
        }
        return get().addProduit(input.payload);
      },
      importerNomenclaturesProduit: (produitId, nomenclatures) => {
        const res = get().updateProduit(produitId, { nomenclatures });
        if (!res.ok) return { ok: false, reason: res.reason ?? "Nomenclature refusée." };
        return { ok: true as const };
      },
      updateProduit: (id, data, opts) => {
        const state = get();
        const prev = state.produits.find((p) => p.id === id);
        if (!prev) return { ok: false, reason: "Produit introuvable." };
        const natureCible = data.natureStock ?? natureStockDuProduit(prev);
        if (natureCible !== natureStockDuProduit(prev)) {
          const fabrique = state.entrees.some(
            (e) => e.produitId === id && e.origine === "of_entree",
          );
          if (!produitEstFabrique({ natureStock: natureCible }) && fabrique) {
            return {
              ok: false,
              reason:
                "Ce produit a déjà été fabriqué par un OF : il ne peut pas devenir matière première ni marchandise.",
            };
          }
        }
        if (produitEstFabrique({ natureStock: natureCible })) {
          const formules = motifNomenclaturesProduit(
            data.nomenclatures !== undefined ? data.nomenclatures : prev.nomenclatures,
          );
          if (formules) return { ok: false, reason: formules };
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
          modeApprovisionnement: modeApprovisionnementEnregistre(
            natureCible,
            data.modeApprovisionnement !== undefined
              ? data.modeApprovisionnement
              : prev.modeApprovisionnement,
          ),
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
        const nomProduit = next.libelleCourt || next.libelleLong;
        for (const h of hist) {
          if (h.champ === "vente_ht" || h.champ === "gros_ht") {
            tracerAudit(get(), {
              categorie: "prix",
              action: "modification_prix_vente",
              module: "produits",
              objetType: "produit",
              objetId: id,
              objetLibelle: nomProduit,
              objetHref: "/parametres/produits",
              champ:
                h.champ === "gros_ht" ? "prix vente gros HT" : "prix vente HT",
              ancienneValeur: String(h.ancienMontant),
              nouvelleValeur: String(h.nouveauMontant),
              detail: h.motif,
            });
          }
        }
        if (
          data.prixVenteM2HT != null &&
          (prev.prixVenteM2HT ?? 0) !== (next.prixVenteM2HT ?? 0)
        ) {
          tracerAudit(get(), {
            categorie: "prix",
            action: "modification_prix_vente",
            module: "produits",
            objetType: "produit",
            objetId: id,
            objetLibelle: nomProduit,
            objetHref: "/parametres/produits",
            champ: "prix vente m² HT",
            ancienneValeur: String(prev.prixVenteM2HT ?? 0),
            nouvelleValeur: String(next.prixVenteM2HT ?? 0),
          });
        }
        const chargeAvant = libelleCompteAudit(
          seeded.comptesComptables,
          prev.compteChargeId ?? chargeEffective?.id,
        );
        const chargeApres = libelleCompteAudit(
          seeded.comptesComptables,
          next.compteChargeId,
        );
        if (chargeAvant !== chargeApres) {
          tracerAudit(get(), {
            categorie: "comptabilite",
            action: "modification_compte_charge",
            module: "comptabilite",
            objetType: "produit",
            objetId: id,
            objetLibelle: nomProduit,
            objetHref: "/parametres/produits",
            champ: "compte de charge",
            ancienneValeur: chargeAvant,
            nouvelleValeur: chargeApres,
          });
        }
        const venteAvant = libelleCompteAudit(
          seeded.comptesComptables,
          prev.compteVenteId ?? venteEffective?.id,
        );
        const venteApres = libelleCompteAudit(
          seeded.comptesComptables,
          next.compteVenteId,
        );
        if (venteAvant !== venteApres) {
          tracerAudit(get(), {
            categorie: "comptabilite",
            action: "modification_compte_vente",
            module: "comptabilite",
            objetType: "produit",
            objetId: id,
            objetLibelle: nomProduit,
            objetHref: "/parametres/produits",
            champ: "compte de vente",
            ancienneValeur: venteAvant,
            nouvelleValeur: venteApres,
          });
        }
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
            bonsDePreparation: state.bonsDePreparation,
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
        tracerAudit(get(), {
          categorie: "suppression",
          action: "suppression_produit",
          module: "produits",
          objetType: "produit",
          objetId: id,
          objetLibelle: prod?.libelleCourt || prod?.libelleLong,
          objetHref: "/parametres/produits",
          ancienneValeur: prod?.libelleCourt || prod?.libelleLong,
        });
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
      reclasseLigne471: (ecritureId, ligneId, compteId) => {
        if (!useAuthStore.getState().hasPermission("comptabilite.gerer")) {
          return {
            ok: false as const,
            reason: "Le reclassement est réservé au comptable.",
          };
        }
        const state = get();
        const ecriture = (state.ecrituresComptables ?? []).find(
          (e) => e.id === ecritureId,
        );
        if (!ecriture) {
          return { ok: false as const, reason: "Écriture introuvable." };
        }
        const ligne = ecriture.lignes.find((l) => l.id === ligneId);
        if (!ligne) {
          return { ok: false as const, reason: "Ligne d'écriture introuvable." };
        }
        if (!numeroEstCompte471(ligne.numero)) {
          return {
            ok: false as const,
            reason: "Cette ligne n'est pas imputée à un compte 471.",
          };
        }
        const compte = state.comptesComptables.find((c) => c.id === compteId);
        if (!compte) return { ok: false as const, reason: "Compte introuvable." };
        if (numeroEstCompte471(compte.numero)) {
          return {
            ok: false as const,
            reason: "Choisissez un compte définitif, autre que 471.",
          };
        }
        let missionsAchat = state.missionsAchat ?? [];
        if (ecriture.sourceType === "mission_achat_depense") {
          missionsAchat = missionsAchat.map((m) => {
            if (!m.depensesDiverses.some((d) => d.id === ecriture.sourceId)) {
              return m;
            }
            return {
              ...m,
              depensesDiverses: m.depensesDiverses.map((d) =>
                d.id === ecriture.sourceId
                  ? { ...d, compteReclasseId: compteId }
                  : d,
              ),
            };
          });
        }
        const rec: Reclassement471 = {
          id: uid("r471"),
          ecritureId,
          ligneId,
          compteDestinationId: compteId,
          date: new Date().toISOString(),
        };
        const reclassements471 = [
          ...(state.reclassements471 ?? []).filter(
            (r) => !(r.ecritureId === ecritureId && r.ligneId === ligneId),
          ),
          rec,
        ];
        set((s) =>
          avecJournal(s, {
            missionsAchat,
            reclassements471,
            journalActivites: [
              entreeActivite("modification", "compte_comptable", {
                entiteId: compteId,
                libelle: `${ligne.numero} → ${compte.numero}`,
                detail: `Reclassement 471 ${ecriture.piece}`,
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
          bonsDePreparation: state.bonsDePreparation,
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
          return { ok: false, reason: "Le tiers système « Divers / Fournitures » ne peut pas être supprimé." };
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

      addTiers: (data, opts) => {
        const roles = (data.roles ?? []).filter(
          (r) => r === "client" || r === "fournisseur",
        );
        if (roles.length === 0) {
          return { ok: false, reason: "Cochez au moins un rôle : Client ou Fournisseur." };
        }
        if (!data.nom.trim()) {
          return { ok: false, reason: "Le nom du tiers est obligatoire." };
        }
        const exigerComptes = opts?.exigerComptes !== false;
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
          if (!auto.ok) {
            if (exigerComptes) return auto;
            compteClientId = undefined;
          } else {
            comptes = auto.comptes;
            compteClientId = auto.compteId;
          }
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
          if (!auto.ok) {
            if (exigerComptes) return auto;
            compteFournisseurId = undefined;
          } else {
            comptes = auto.comptes;
            compteFournisseurId = auto.compteId;
          }
        }
        const motifComptes = motifComptesTiersInvalides(
          { roles, compteClientId, compteFournisseurId },
          comptes,
          state.tiers ?? [],
          undefined,
          {
            exigerClient: exigerComptes && roles.includes("client"),
            exigerFournisseur: exigerComptes && roles.includes("fournisseur"),
          },
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
          dateCreation: data.dateCreation ?? new Date().toISOString(),
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

      updateTiers: (id, data, opts) => {
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
            bonsDePreparation: state.bonsDePreparation,
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
          if (!auto.ok) {
            if (opts?.exigerComptes !== false) return auto;
            compteClientId = prev.compteClientId;
          } else {
            comptes = auto.comptes;
            compteClientId = auto.compteId;
          }
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
          if (!auto.ok) {
            if (opts?.exigerComptes !== false) return auto;
            compteFournisseurId = prev.compteFournisseurId;
          } else {
            comptes = auto.comptes;
            compteFournisseurId = auto.compteId;
          }
        }

        const motifComptes = motifComptesTiersInvalides(
          { roles, compteClientId, compteFournisseurId },
          comptes,
          state.tiers ?? [],
          id,
          {
            exigerClient:
              opts?.exigerComptes === false
                ? false
                : roles.includes("client") &&
                  (!prev.roles.includes("client") ||
                    data.compteClientId !== undefined ||
                    Boolean(prev.compteClientId)),
            exigerFournisseur:
              opts?.exigerComptes === false
                ? false
                : roles.includes("fournisseur") &&
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
          dateCreation: data.dateCreation ?? prev.dateCreation,
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

      importerLigneTiers: (input) => {
        const state = get();
        const canAuto = longueurNumeroCompteEffective(state.parametres) != null;
        const roles = (input.payload.roles ?? []).filter(
          (r) => r === "client" || r === "fournisseur",
        );
        if (input.mode === "fusionner") {
          const fusionId = input.fusionId;
          if (!fusionId) return { ok: false, reason: "Fiche à fusionner manquante." };
          const prev = (state.tiers ?? []).find((t) => t.id === fusionId);
          if (!prev) return { ok: false, reason: "Tiers introuvable." };
          const patch = appliquerFusionTiers(
            prev,
            input.payload,
            input.champsFusion ?? [],
          );
          const nextRoles = patch.roles ?? prev.roles;
          if (
            nextRoles.includes("client") &&
            !prev.compteClientId &&
            canAuto &&
            patch.compteClientId === undefined
          ) {
            patch.compteClientId = VALEUR_COMPTE_TIERS_AUTO;
          }
          if (
            nextRoles.includes("fournisseur") &&
            !prev.compteFournisseurId &&
            canAuto &&
            patch.compteFournisseurId === undefined
          ) {
            patch.compteFournisseurId = VALEUR_COMPTE_TIERS_AUTO;
          }
          const res = get().updateTiers(fusionId, patch, { exigerComptes: false });
          if (!res.ok) {
            return { ok: false, reason: res.reason ?? "Échec de la fusion." };
          }
          const apres = (get().tiers ?? []).find((t) => t.id === fusionId);
          const compteManquant = Boolean(
            apres &&
              ((apres.roles.includes("client") && !apres.compteClientId) ||
                (apres.roles.includes("fournisseur") && !apres.compteFournisseurId)),
          );
          return { ok: true, id: fusionId, compteManquant };
        }
        const res = get().addTiers(
          {
            ...input.payload,
            roles,
            compteClientId:
              roles.includes("client") && canAuto
                ? VALEUR_COMPTE_TIERS_AUTO
                : undefined,
            compteFournisseurId:
              roles.includes("fournisseur") && canAuto
                ? VALEUR_COMPTE_TIERS_AUTO
                : undefined,
          },
          { exigerComptes: false },
        );
        if (!res.ok) return res;
        const apres = (get().tiers ?? []).find((t) => t.id === res.id);
        const compteManquant = Boolean(
          apres &&
            ((apres.roles.includes("client") && !apres.compteClientId) ||
              (apres.roles.includes("fournisseur") && !apres.compteFournisseurId)),
        );
        return { ok: true, id: res.id, compteManquant };
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
            bonsDePreparation: state.bonsDePreparation,
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
        tracerAudit(get(), {
          categorie: "suppression",
          action: "suppression_tiers",
          module: "tiers",
          objetType: "tiers",
          objetId: id,
          objetLibelle: prev.nom,
          objetHref: "/tiers",
          ancienneValeur: prev.nom,
        });
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
        tracerRemiseDocument(get(), {
          objetType: "devis",
          objetId: id,
          objetLibelle: devis.numero,
          objetHref: "/devis/liste",
          siteId: devis.pointDeVenteId,
          apres: resumeRemisesDocument(devis),
        });
        return id;
      },
      updateDevis: (id, data) => {
        const prev = get().devis.find((d) => d.id === id);
        set((state) => {
          const courant = state.devis.find((d) => d.id === id);
          if (courant && verrouTransformationActif(courant.verrouTransformation)) {
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
                { entiteId: id, libelle: courant?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        });
        const next = get().devis.find((d) => d.id === id);
        if (prev && next && !verrouTransformationActif(prev.verrouTransformation)) {
          tracerRemiseDocument(get(), {
            objetType: "devis",
            objetId: id,
            objetLibelle: next.numero,
            objetHref: "/devis/liste",
            siteId: next.pointDeVenteId,
            avant: resumeRemisesDocument(prev),
            apres: resumeRemisesDocument(next),
          });
        }
      },
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
        tracerRemiseDocument(get(), {
          objetType: "commande",
          objetId: id,
          objetLibelle: cmd.numero,
          objetHref: "/commandes/liste",
          siteId: cmd.pointDeVenteId,
          apres: resumeRemisesDocument(cmd),
        });
        return id;
      },
      updateCommande: (id, data) => {
        const prev = get().commandes.find((c) => c.id === id);
        set((state) => {
          const courant = state.commandes.find((c) => c.id === id);
          if (courant && verrouTransformationActif(courant.verrouTransformation)) {
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
                { entiteId: id, libelle: courant?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        });
        const next = get().commandes.find((c) => c.id === id);
        if (prev && next && !verrouTransformationActif(prev.verrouTransformation)) {
          tracerRemiseDocument(get(), {
            objetType: "commande",
            objetId: id,
            objetLibelle: next.numero,
            objetHref: "/commandes/liste",
            siteId: next.pointDeVenteId,
            avant: resumeRemisesDocument(prev),
            apres: resumeRemisesDocument(next),
          });
        }
      },
      deleteCommande: (id) => {
        const state = get();
        const prev = state.commandes.find((c) => c.id === id);
        set((s) => ({
          commandes: s.commandes.filter((c) => c.id !== id),
          bonsATirer: (s.bonsATirer ?? []).filter((b) => b.commandeId !== id),
          journalActivites: [
            entreeActivite("suppression", "commande", {
              entiteId: id,
              libelle: prev?.numero,
            }),
            ...s.journalActivites,
          ],
        }));
        if (prev) {
          tracerAudit(get(), {
            categorie: "suppression",
            action: "suppression_commande",
            module: "commercial",
            objetType: "commande",
            objetId: id,
            objetLibelle: prev.numero,
            objetHref: "/commandes/liste",
            ancienneValeur: prev.numero,
            siteId: prev.pointDeVenteId,
          });
        }
      },

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

      addBonDePreparation: (bp) => {
        const id = uid("bp");
        const actor = getActiviteActor();
        const doc: BonDePreparation = {
          ...bp,
          id,
          versions: bp.versions?.length
            ? bp.versions
            : [
                snapshotVersionBp({
                  ...bp,
                  id,
                  versions: [],
                }),
              ],
        };
        set((state) => ({
          bonsDePreparation: [doc, ...(state.bonsDePreparation ?? [])],
          journalActivites: [
            entreeActivite("creation", "bon_de_preparation", {
              entiteId: id,
              libelle: bp.numero,
              detail: actor.nom ? `créé par ${actor.nom}` : undefined,
            }),
            ...state.journalActivites,
          ],
        }));
        return id;
      },
      updateBonDePreparation: (id, data) =>
        set((state) => {
          const prev = (state.bonsDePreparation ?? []).find((b) => b.id === id);
          if (prev && verrouTransformationActif(prev.verrouTransformation)) {
            return state;
          }
          return {
            bonsDePreparation: (state.bonsDePreparation ?? []).map((b) => {
              if (b.id !== id) return b;
              const next = { ...b, ...data };
              return avecVersionSiStatutChange(b, next);
            }),
            journalActivites: [
              entreeActivite(
                data.statut === "annule" ? "annulation" : "modification",
                "bon_de_preparation",
                { entiteId: id, libelle: prev?.numero },
              ),
              ...state.journalActivites,
            ],
          };
        }),
      deleteBonDePreparation: (id) =>
        set((state) => {
          const prev = (state.bonsDePreparation ?? []).find((b) => b.id === id);
          return {
            bonsDePreparation: (state.bonsDePreparation ?? []).filter(
              (b) => b.id !== id,
            ),
            journalActivites: [
              entreeActivite("suppression", "bon_de_preparation", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          };
        }),
      sauvegarderVersionBonDePreparation: (id) =>
        set((state) => ({
          bonsDePreparation: (state.bonsDePreparation ?? []).map((b) =>
            b.id === id
              ? { ...b, versions: [...(b.versions ?? []), snapshotVersionBp(b)] }
              : b,
          ),
        })),

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
              : kind === "bon_de_preparation"
                ? ("en_transformation" as BonDePreparationStatut)
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
          bonsDePreparation: (state.bonsDePreparation ?? []).map(libererSiExpire),
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
        const apresRemise = resumeRemisesDocument(facture);
        tracerRemiseDocument(get(), {
          objetType: "facture",
          objetId: id,
          objetLibelle: facture.numero,
          objetHref: "/factures/liste",
          siteId: facture.pointDeVenteId,
          apres: apresRemise,
        });
        if (facture.derogationCredit) {
          tracerAudit(get(), {
            categorie: "statut_critique",
            action: "deblocage_plafond_credit",
            module: "commercial",
            objetType: "facture",
            objetId: id,
            objetLibelle: facture.numero,
            objetHref: "/factures/liste",
            detail: "Dérogation au plafond de crédit à l'émission",
            siteId: facture.pointDeVenteId,
          });
        }
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
          const nextFac = factures.find((f) => f.id === id);
          if (nextFac) {
            tracerRemiseDocument(state, {
              objetType: "facture",
              objetId: id,
              objetLibelle: nextFac.numero,
              objetHref: "/factures/liste",
              siteId: nextFac.pointDeVenteId,
              avant: resumeRemisesDocument(prev),
              apres: resumeRemisesDocument(nextFac),
            });
          }
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
        set((state) =>
          avecJournal(state, {
            acomptes: [{ ...acompte, id }, ...state.acomptes],
            journalActivites: [
              entreeActivite("creation", "acompte", {
                entiteId: id,
                libelle: acompte.numero,
              }),
              ...state.journalActivites,
            ],
          }),
        );
        return id;
      },
      updateAcompte: (id, data) =>
        set((state) => {
          const prev = state.acomptes.find((a) => a.id === id);
          return avecJournal(state, {
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
          });
        }),
      deleteAcompte: (id) =>
        set((state) => {
          const prev = state.acomptes.find((a) => a.id === id);
          return avecJournal(state, {
            acomptes: state.acomptes.filter((a) => a.id !== id),
            journalActivites: [
              entreeActivite("suppression", "acompte", {
                entiteId: id,
                libelle: prev?.numero,
              }),
              ...state.journalActivites,
            ],
          });
        }),
      encaisserAcompte: (data) => {
        const montantTTC = Math.round(Number(data.montantTTC) || 0);
        if (!data.clientId || montantTTC <= 0) {
          return { ok: false, reason: "Montant d'acompte invalide." };
        }
        const state = get();
        const motifCompte = motifModeCompteTresorerie(
          data.modePaiement,
          data.compteTresorerieId,
          state.modesPaiement ?? [],
          state.comptesTresorerie ?? [],
        );
        if (motifCompte) return { ok: false, reason: motifCompte };
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
          compteTresorerieId: data.compteTresorerieId,
          reference: data.reference,
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

      ajouterPaiementsFacture: (factureId, lignes) => {
        const state = get();
        const prev = state.factures.find((f) => f.id === factureId);
        if (!prev) return { ok: false, reason: "Facture introuvable." };
        if (prev.type === "proforma" || prev.statut === "brouillon") {
          return { ok: false, reason: "Encaissement réservé aux factures fiscales." };
        }
        const modes = state.modesPaiement ?? [];
        const comptes = state.comptesTresorerie ?? [];
        const creees: LignePaiement[] = [];
        let cumul = 0;
        for (const data of lignes) {
          const motif = motifSaisieLignePaiement(data, modes, comptes);
          if (motif) return { ok: false, reason: motif };
          cumul += data.montant;
          creees.push(completerLignePaiement(data, uid("pay"), modes));
        }
        let existants = prev.paiements ?? [];
        if (existants.length === 0 && prev.montantPaye > 0) {
          existants = [
            {
              id: uid("pay"),
              date: prev.date,
              montant: prev.montantPaye,
              modePaiement: "autre",
              note: "Encaissement déjà saisi",
            },
          ];
        }
        const reste = resteAPayer(prev, state.parametres, state.acomptes, state.factures);
        if (cumul - reste > 0.5) {
          return {
            ok: false,
            reason: `Le paiement dépasse le reste à encaisser (${Math.round(reste)} Ar).`,
          };
        }
        const paiements = [...creees, ...existants];
        const paye = montantLignesPaiement(paiements);
        const avoirs = totalAvoirsSurFacture(prev.id, state.factures, state.parametres);
        const t = totauxFacture(prev, state.parametres, state.acomptes);
        const netTTC = Math.max(0, t.totalTTC - avoirs);
        const statut =
          paye >= netTTC - 1 ? "payee" : paye > 0 ? "partiellement_payee" : prev.statut;
        set((s) =>
          avecJournal(s, {
            factures: s.factures.map((f) =>
              f.id === factureId ? { ...f, paiements, montantPaye: paye, statut } : f,
            ),
            journalAudit: [
              {
                id: uid("aud"),
                date: new Date().toISOString(),
                action: "facture_paiement",
                entite: "facture",
                entiteId: factureId,
                numero: prev.numero,
                detail: `+${cumul} Ar`,
              },
              ...s.journalAudit,
            ],
            journalActivites: [
              entreeActivite("creation", "facture", {
                entiteId: factureId,
                libelle: prev.numero,
                detail: "Encaissement",
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true };
      },
      supprimerPaiementFacture: (factureId, paiementId) => {
        const state = get();
        const prev = state.factures.find((f) => f.id === factureId);
        if (!prev) return { ok: false, reason: "Facture introuvable." };
        const paiements = (prev.paiements ?? []).filter((p) => p.id !== paiementId);
        const paye = montantLignesPaiement(paiements);
        const avoirs = totalAvoirsSurFacture(prev.id, state.factures, state.parametres);
        const t = totauxFacture(prev, state.parametres, state.acomptes);
        const netTTC = Math.max(0, t.totalTTC - avoirs);
        const statut =
          paye >= netTTC - 1
            ? "payee"
            : paye > 0
              ? "partiellement_payee"
              : prev.dateEnvoi
                ? "envoyee"
                : prev.statut === "payee" || prev.statut === "partiellement_payee"
                  ? "validee"
                  : prev.statut;
        set((s) =>
          avecJournal(s, {
            factures: s.factures.map((f) =>
              f.id === factureId ? { ...f, paiements, montantPaye: paye, statut } : f,
            ),
          }),
        );
        return { ok: true };
      },
      changerStatutChequeFacture: (factureId, paiementId, statutCheque) => {
        const state = get();
        const prev = state.factures.find((f) => f.id === factureId);
        if (!prev) return { ok: false, reason: "Facture introuvable." };
        const prevLigne = prev.paiements?.find((p) => p.id === paiementId);
        const paiements = (prev.paiements ?? []).map((p) =>
          p.id === paiementId ? { ...p, statutCheque } : p,
        );
        const paye = montantLignesPaiement(paiements);
        const avoirs = totalAvoirsSurFacture(prev.id, state.factures, state.parametres);
        const t = totauxFacture(prev, state.parametres, state.acomptes);
        const netTTC = Math.max(0, t.totalTTC - avoirs);
        const statut =
          paye >= netTTC - 1 ? "payee" : paye > 0 ? "partiellement_payee" : prev.statut;
        set((s) =>
          avecJournal(s, {
            factures: s.factures.map((f) =>
              f.id === factureId ? { ...f, paiements, montantPaye: paye, statut } : f,
            ),
          }),
        );
        if (statutCheque === "rejete" && prevLigne?.statutCheque !== "rejete") {
          tracerAudit(get(), {
            categorie: "statut_critique",
            action: "rejet_cheque_differe",
            module: "tresorerie",
            objetType: "facture",
            objetId: factureId,
            objetLibelle: prev.numero,
            objetHref: "/factures/liste",
            champ: "chèque différé",
            ancienneValeur: prevLigne?.statutCheque ?? "en_attente",
            nouvelleValeur: "rejete",
            siteId: prev.pointDeVenteId,
          });
        }
        return { ok: true };
      },

      importerReleveBancaire: ({ compteTresorerieId, texte, fichierNom }) => {
        const compte = (get().comptesTresorerie ?? []).find(
          (c) => c.id === compteTresorerieId,
        );
        if (!compte) {
          return { ok: false as const, reason: "Compte de trésorerie introuvable." };
        }
        const parsed = parserReleveBancaireCsv(texte);
        if (!parsed.ok) return parsed;
        const dateImport = new Date().toISOString();
        const nouvelles: LigneReleveBancaire[] = parsed.lignes.map((l) => ({
          ...l,
          id: uid("rel"),
          compteTresorerieId,
          dateImport,
          fichierNom,
        }));
        set((s) => ({
          lignesReleveBancaire: [
            ...nouvelles,
            ...(s.lignesReleveBancaire ?? []),
          ],
        }));
        return { ok: true as const, imported: nouvelles.length };
      },
      pointerLigneReleve: (ligneId, mouvementId) => {
        const lignes = get().lignesReleveBancaire ?? [];
        const ligne = lignes.find((l) => l.id === ligneId);
        if (!ligne) {
          return { ok: false as const, reason: "Ligne de relevé introuvable." };
        }
        if (mouvementId) {
          const deja = lignes.find(
            (l) => l.mouvementId === mouvementId && l.id !== ligneId,
          );
          if (deja) {
            return {
              ok: false as const,
              reason: "Ce mouvement est déjà pointé sur une autre ligne.",
            };
          }
        }
        set((s) => ({
          lignesReleveBancaire: (s.lignesReleveBancaire ?? []).map((l) =>
            l.id === ligneId
              ? { ...l, mouvementId: mouvementId || undefined }
              : l,
          ),
        }));
        return { ok: true as const };
      },
      supprimerLigneReleve: (ligneId) => {
        set((s) => ({
          lignesReleveBancaire: (s.lignesReleveBancaire ?? []).filter(
            (l) => l.id !== ligneId,
          ),
        }));
        return { ok: true as const };
      },

      addOperationTresorerie: (data) => {
        const state = get();
        const montant = Math.round(Math.abs(Number(data.montant) || 0));
        const motif = motifOperationTresorerieInvalide(
          {
            montant,
            compteTresorerieId: data.compteTresorerieId,
            compteLieId: data.compteLieId || undefined,
          },
          state.comptesTresorerie ?? [],
        );
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("otr");
        const operation: OperationTresorerie = {
          id,
          type: data.type,
          date: data.date,
          montant,
          compteTresorerieId: data.compteTresorerieId,
          compteLieId: data.compteLieId || undefined,
          libelle: (data.libelle ?? "").trim(),
          reference: (data.reference ?? "").trim() || undefined,
        };
        set((s) =>
          avecJournal(s, {
            operationsTresorerie: [operation, ...(s.operationsTresorerie ?? [])],
            journalActivites: [
              entreeActivite("creation", "operation_tresorerie", {
                entiteId: id,
                libelle:
                  operation.libelle ||
                  (operation.type === "approvisionnement"
                    ? "Approvisionnement"
                    : "Retrait"),
                detail: `${montant} Ar`,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true as const, id };
      },
      deleteOperationTresorerie: (id) => {
        const prev = (get().operationsTresorerie ?? []).find((o) => o.id === id);
        if (!prev) return { ok: false as const, reason: "Opération introuvable." };
        set((s) =>
          avecJournal(s, {
            operationsTresorerie: (s.operationsTresorerie ?? []).filter(
              (o) => o.id !== id,
            ),
            journalActivites: [
              entreeActivite("suppression", "operation_tresorerie", {
                entiteId: id,
                libelle: prev.libelle || (prev.type === "approvisionnement" ? "Approvisionnement" : "Retrait"),
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true as const };
      },

      addCompteTresorerie: (data) => {
        const state = get();
        const motif = motifCompteTresorerieInvalide(
          data.libelle,
          state.comptesTresorerie ?? [],
        );
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("ctr");
        const ordre =
          (state.comptesTresorerie ?? []).reduce((m, c) => Math.max(m, c.ordre), 0) + 1;
        const ouverture = normaliserSoldeInitial(data);
        set((s) =>
          avecJournal(s, {
            comptesTresorerie: [
              ...(s.comptesTresorerie ?? []),
              {
                id,
                libelle: data.libelle.trim(),
                type: data.type,
                siteId: data.siteId || undefined,
                compteComptableId: data.compteComptableId || undefined,
                ...ouverture,
                actif: true,
                ordre,
              },
            ],
            journalActivites: [
              entreeActivite("creation", "compte_tresorerie", {
                entiteId: id,
                libelle: data.libelle.trim(),
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true as const, id };
      },
      updateCompteTresorerie: (id, data) => {
        const state = get();
        const prev = (state.comptesTresorerie ?? []).find((c) => c.id === id);
        if (!prev) return { ok: false as const, reason: "Compte introuvable." };
        const libelle = (data.libelle ?? prev.libelle).trim();
        const motif = motifCompteTresorerieInvalide(
          libelle,
          state.comptesTresorerie ?? [],
          id,
        );
        if (motif) return { ok: false as const, reason: motif };
        const ouverture =
          data.soldeInitial !== undefined ||
          data.soldeInitialSens !== undefined ||
          data.soldeInitialDate !== undefined
            ? normaliserSoldeInitial({
                soldeInitial: data.soldeInitial ?? prev.soldeInitial,
                soldeInitialSens: data.soldeInitialSens ?? prev.soldeInitialSens,
                soldeInitialDate:
                  data.soldeInitialDate !== undefined
                    ? data.soldeInitialDate
                    : prev.soldeInitialDate,
              })
            : null;
        set((s) =>
          avecJournal(s, {
            comptesTresorerie: (s.comptesTresorerie ?? []).map((c) =>
              c.id === id
                ? {
                    ...c,
                    libelle,
                    type: data.type ?? c.type,
                    siteId:
                      data.siteId !== undefined ? data.siteId || undefined : c.siteId,
                    compteComptableId:
                      data.compteComptableId !== undefined
                        ? data.compteComptableId || undefined
                        : c.compteComptableId,
                    ...(ouverture ?? {}),
                    actif: data.actif ?? c.actif,
                    ordre: data.ordre ?? c.ordre,
                  }
                : c,
            ),
            journalActivites: [
              entreeActivite("modification", "compte_tresorerie", {
                entiteId: id,
                libelle,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true as const };
      },
      deleteCompteTresorerie: (id) => {
        const state = get();
        const prev = (state.comptesTresorerie ?? []).find((c) => c.id === id);
        if (!prev) return { ok: false as const, reason: "Compte introuvable." };
        if (
          compteTresorerieUtilise(id, {
            achats: state.achats,
            factures: state.factures,
            acomptes: state.acomptes,
            missions: state.missionsAchat,
            operations: state.operationsTresorerie ?? [],
          })
        ) {
          return {
            ok: false as const,
            reason: "Ce compte est déjà utilisé : suppression impossible.",
          };
        }
        set((s) => ({
          comptesTresorerie: (s.comptesTresorerie ?? []).filter((c) => c.id !== id),
          journauxTresorerie: (s.journauxTresorerie ?? []).filter(
            (j) => j.compteTresorerieId !== id && j.id !== prev.journalTresorerieId,
          ),
          journalActivites: [
            entreeActivite("suppression", "compte_tresorerie", {
              entiteId: id,
              libelle: prev.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },

      addJournalTresorerie: (data) => {
        const state = get();
        const motif = motifJournalTresorerieInvalide(
          data,
          state.journauxTresorerie ?? [],
        );
        if (motif) return { ok: false as const, reason: motif };
        const libelle = data.libelle.trim();
        const code = normaliserCodeJournal(
          data.code || codeJournalDepuisLibelle(libelle),
        );
        const id = uid("jtr");
        const ordre =
          (state.journauxTresorerie ?? []).reduce((m, j) => Math.max(m, j.ordre), 0) +
          1;
        set((s) => ({
          journauxTresorerie: [
            ...(s.journauxTresorerie ?? []),
            {
              id,
              code,
              libelle,
              type: data.type,
              actif: true,
              ordre,
            },
          ],
          journalActivites: [
            entreeActivite("creation", "journal_tresorerie", {
              entiteId: id,
              libelle: `${code} ${libelle}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updateJournalTresorerie: (id, data) => {
        const state = get();
        const prev = (state.journauxTresorerie ?? []).find((j) => j.id === id);
        if (!prev) return { ok: false as const, reason: "Journal introuvable." };
        const libelle = (data.libelle ?? prev.libelle).trim();
        const code = normaliserCodeJournal(data.code ?? prev.code);
        const motif = motifJournalTresorerieInvalide(
          { code, libelle },
          state.journauxTresorerie ?? [],
          id,
        );
        if (motif) return { ok: false as const, reason: motif };
        set((s) =>
          avecJournal(s, {
            journauxTresorerie: (s.journauxTresorerie ?? []).map((j) =>
              j.id === id
                ? {
                    ...j,
                    code,
                    libelle,
                    type: data.type ?? j.type,
                    actif: data.actif ?? j.actif,
                    ordre: data.ordre ?? j.ordre,
                  }
                : j,
            ),
            journalActivites: [
              entreeActivite("modification", "journal_tresorerie", {
                entiteId: id,
                libelle: `${code} ${libelle}`,
              }),
              ...s.journalActivites,
            ],
          }),
        );
        return { ok: true as const };
      },
      deleteJournalTresorerie: (id) => {
        const state = get();
        const prev = (state.journauxTresorerie ?? []).find((j) => j.id === id);
        if (!prev) return { ok: false as const, reason: "Journal introuvable." };
        if (prev.systeme || prev.compteTresorerieId) {
          return {
            ok: false as const,
            reason: prev.compteTresorerieId
              ? "Ce journal est lié à un compte de trésorerie. Supprimez le compte si besoin."
              : "Ce journal d'origine ne peut pas être supprimé. Désactivez-le si besoin.",
          };
        }
        if (
          journalTresorerieUtilise(id, {
            comptes: state.comptesTresorerie ?? [],
            ecritures: state.ecrituresComptables ?? [],
          })
        ) {
          return {
            ok: false as const,
            reason: "Ce journal est déjà utilisé : suppression impossible.",
          };
        }
        set((s) => ({
          journauxTresorerie: (s.journauxTresorerie ?? []).filter((j) => j.id !== id),
          journalActivites: [
            entreeActivite("suppression", "journal_tresorerie", {
              entiteId: id,
              libelle: `${prev.code} ${prev.libelle}`,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },

      addModePaiement: (data) => {
        const state = get();
        const motif = motifModePaiementInvalide(
          data.libelle,
          state.modesPaiement ?? [],
        );
        if (motif) return { ok: false as const, reason: motif };
        const id = uid("mdp");
        const ordre =
          (state.modesPaiement ?? []).reduce((m, x) => Math.max(m, x.ordre), 0) + 1;
        const libelle = data.libelle.trim();
        set((s) => ({
          modesPaiement: [
            ...(s.modesPaiement ?? []),
            {
              id,
              libelle,
              necessiteEcheance: Boolean(data.necessiteEcheance),
              typeCompteTresorerie:
                data.typeCompteTresorerie ??
                infererTypeComptePourMode(id, libelle),
              actif: true,
              ordre,
            },
          ],
          journalActivites: [
            entreeActivite("creation", "mode_paiement", {
              entiteId: id,
              libelle: data.libelle.trim(),
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const, id };
      },
      updateModePaiement: (id, data) => {
        const state = get();
        const prev = (state.modesPaiement ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false as const, reason: "Mode introuvable." };
        const libelle = (data.libelle ?? prev.libelle).trim();
        const motif = motifModePaiementInvalide(libelle, state.modesPaiement ?? [], id);
        if (motif) return { ok: false as const, reason: motif };
        set((s) => ({
          modesPaiement: (s.modesPaiement ?? []).map((m) =>
            m.id === id
              ? {
                  ...m,
                  libelle,
                  necessiteEcheance: data.necessiteEcheance ?? m.necessiteEcheance,
                  typeCompteTresorerie:
                    data.typeCompteTresorerie ?? m.typeCompteTresorerie,
                  actif: data.actif ?? m.actif,
                  ordre: data.ordre ?? m.ordre,
                }
              : m,
          ),
          journalActivites: [
            entreeActivite("modification", "mode_paiement", {
              entiteId: id,
              libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
      },
      deleteModePaiement: (id) => {
        const state = get();
        const prev = (state.modesPaiement ?? []).find((m) => m.id === id);
        if (!prev) return { ok: false as const, reason: "Mode introuvable." };
        if (
          modePaiementUtilise(id, {
            achats: state.achats,
            factures: state.factures,
            acomptes: state.acomptes,
            missions: state.missionsAchat,
          })
        ) {
          return {
            ok: false as const,
            reason: "Ce mode est déjà utilisé : suppression impossible.",
          };
        }
        set((s) => ({
          modesPaiement: (s.modesPaiement ?? []).filter((m) => m.id !== id),
          journalActivites: [
            entreeActivite("suppression", "mode_paiement", {
              entiteId: id,
              libelle: prev.libelle,
            }),
            ...s.journalActivites,
          ],
        }));
        return { ok: true as const };
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
