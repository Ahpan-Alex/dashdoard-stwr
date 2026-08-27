import type { ModeleDocument, PreferencesModeles } from "./document-templates";

export type PointDeVente = {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
  actif: boolean;
  /** Objectif de CA mensuel (Ar) */
  objectifCAMensuel: number;
  /** Objectif de CA annuel (Ar) */
  objectifCAAnnuel: number;
  /** Objectif de marge brute mensuelle (CA − CMV) en Ar */
  objectifMargeMensuel: number;
  /** Objectif de marge brute annuelle (CA − CMV) en Ar */
  objectifMargeAnnuel: number;
};

export type CategorieProduit = {
  id: string;
  code: string;
  libelle: string;
  parentId?: string;
  ordre: number;
  actif: boolean;
};

export type Produit = {
  id: string;
  /** Code métier unique (saisi par l'utilisateur) */
  code: string;
  libelleCourt: string;
  libelleLong: string;
  categorieId: string;
  unite: string;
  /** Prix d'achat de référence HT (Ar) */
  prixAchat: number;
  /** Prix de vente détail HT (Ar) */
  prixVenteHT: number;
  /** Prix de vente gros HT (Ar) */
  prixVenteGrosHT?: number;
  /** Quantité mini pour appliquer le tarif gros */
  seuilGros?: number;
  /** Taux TVA applicable au produit (0 = exonéré / export) */
  tauxTVA: number;
  actif: boolean;
};

export type TarifClient = {
  id: string;
  clientId: string;
  produitId: string;
  /** Prix HT fixe, ou base si type = remise_pct */
  prixHT: number;
  typeTarif: "fixe" | "remise_pct";
  remisePercent?: number;
  actif: boolean;
};

export type HistoriquePrixChamp =
  | "achat"
  | "vente_ht"
  | "gros_ht"
  | "tarif_client";

export type HistoriquePrix = {
  id: string;
  produitId: string;
  champ: HistoriquePrixChamp;
  ancienMontant: number;
  nouveauMontant: number;
  clientId?: string;
  motif?: string;
  date: string;
};

export type EntreeStock = {
  id: string;
  pointDeVenteId: string;
  produitId: string;
  quantite: number;
  prixAchatUnitaire: number;
  prixVenteUnitaire: number;
  fournisseur: string;
  fournisseurId?: string;
  date: string;
  note?: string;
  /** Ouverture d'inventaire (hors achats de la période). */
  origine?: "achat" | "stock_initial";
};

export type MouvementStock = {
  id: string;
  pointDeVenteId: string;
  produitId: string;
  type: "entree" | "sortie" | "ajustement" | "perte";
  quantite: number;
  date: string;
  reference?: string;
};

export type Vente = {
  id: string;
  pointDeVenteId: string;
  produitId: string;
  quantite: number;
  prixUnitaire: number;
  date: string;
  clientId?: string;
  /** Facture d'origine (CA / stock dérivés de la facturation). */
  factureId?: string;
};

export type ChargeCategorie =
  | "loyer"
  | "salaires"
  | "charges_sociales"
  | "energie"
  | "eau"
  | "telephone"
  | "emballage"
  | "transport"
  | "entretien"
  | "frais"
  | "assurance"
  | "amortissement"
  | "interets"
  | "exceptionnel"
  | "impot_benefice"
  | "autre";

/** Nature économique pour les 2 paliers de rentabilité (PCG / SIG). */
export type ChargeNatureEconomique =
  | "variable_vente"
  | "fixe_structure"
  | "financiere"
  | "exceptionnelle"
  | "impot_benefice";

export type Charge = {
  id: string;
  pointDeVenteId: string | "tous";
  libelle: string;
  montant: number;
  categorie: ChargeCategorie;
  /** Détermine Palier 1 vs Palier 2 (défaut via catégorie si absent) */
  natureEconomique?: ChargeNatureEconomique;
  date: string;
  recurrent: boolean;
  note?: string;
};

export type RegimeFiscal = "tva" | "ei" | "ir" | "imp" | "franchise";

export type Parametres = {
  nomEntreprise: string;
  formeJuridique: string;
  capital: number;
  devise: "Ar";
  /** Mentions légales Madagascar */
  nif: string;
  stat: string;
  rcs: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string;
  rib: string;
  banque: string;
  /** TVA standard MG souvent 20 % */
  tauxTVA: number;
  assujettiTVA: boolean;
  regimeFiscal: RegimeFiscal;
  conditionsPaiementDefaut: string;
  /** Logo entreprise (data URL) affiché sur devis / commandes / factures */
  logoDataUrl?: string;
  /** Signature électronique (image data URL) pour les documents */
  signatureDataUrl?: string;
  /** Nom / qualité sous la signature (ex. Le Gérant) */
  signatureNom?: string;
  /** Seuil d'alerte taux marge Palier 1 (%) */
  seuilMargePalier1Percent?: number;
  /** Seuil d'alerte taux marge Palier 2 / résultat net (%) */
  seuilMargePalier2Percent?: number;
};

export type BilanInitial = {
  date: string;
  immobilisations: number;
  stocks: number;
  creancesClients: number;
  disponibilites: number;
  capital: number;
  dettesFournisseurs: number;
  dettesSociales: number;
  emprunts: number;
  resultatReporte: number;
  /**
   * Solde d'ouverture du compte courant d'associé / exploitant (Ar).
   * Positif = crédit (l'entreprise doit à l'associé) ; négatif = débit.
   */
  compteCourantAssocie?: number;
};

export type ImmobilisationCategorie =
  | "materiel"
  | "materiel_froid"
  | "vehicule"
  | "amenagement"
  | "informatique"
  | "autre";

export type Immobilisation = {
  id: string;
  libelle: string;
  categorie: ImmobilisationCategorie;
  dateAcquisition: string;
  valeurAcquisition: number;
  dureeAmortissementAns: number;
  pointDeVenteId: string | "tous";
  note?: string;
};

/** Apport ou retrait sur le compte courant d'associé / de l'exploitant. */
export type TypeMouvementCompteCourant = "apport" | "retrait";

export type MouvementCompteCourant = {
  id: string;
  date: string;
  type: TypeMouvementCompteCourant;
  /** Montant toujours positif (le sens est porté par `type`). */
  montant: number;
  libelle: string;
  /** Auteur au moment de la saisie (traçabilité). */
  userId?: string;
  userNom?: string;
};

/** Réseaux sociaux d'un contact ou d'un client. */
export type ReseauxSociaux = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  whatsapp?: string;
  siteWeb?: string;
  autre?: string;
};

/** Contact rattaché à un client (interlocuteur). */
export type ClientContact = {
  id: string;
  nom: string;
  fonction?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  reseaux?: ReseauxSociaux;
};

export type Client = {
  id: string;
  /** Code métier unique (ex. CLI-0001) évitant les confusions d'homonymes. */
  code?: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  nif?: string;
  type: "particulier" | "restaurant" | "hotel" | "grossiste" | "autre";
  actif: boolean;
  /** Interlocuteurs rattachés au client (fiche contacts). */
  contacts?: ClientContact[];
};

export type Fournisseur = {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  specialite?: string;
  nif?: string;
  actif: boolean;
};

export type TypeLigneDocument =
  | "produit"
  | "sous_total"
  | "blanche"
  | "commentaire";

export type LigneDocument = {
  id: string;
  /** Défaut : produit */
  type?: TypeLigneDocument;
  produitId?: string;
  /** Snapshot du code catalogue à la saisie */
  codeProduit?: string;
  designation: string;
  quantite: number;
  /** Prix unitaire HT */
  prixUnitaire: number;
  unite: string;
  /** Snapshot du taux TVA ligne */
  tauxTVA?: number;
  /** Remise en % sur la ligne produit */
  remisePercent?: number;
  /** Commentaire sous la ligne produit */
  commentaire?: string;
};

export type DevisStatut =
  | "brouillon"
  | "envoye"
  | "accepte"
  | "refuse"
  | "expire";

export type Devis = {
  id: string;
  numero: string;
  clientId: string;
  pointDeVenteId: string;
  date: string;
  validiteJours: number;
  statut: DevisStatut;
  lignes: LigneDocument[];
  tauxTVA: number;
  conditionsPaiement?: string;
  note?: string;
  /** Remise globale HT (Ar) */
  remiseGlobale?: number;
};

export type CommandeStatut =
  | "brouillon"
  | "confirmee"
  | "en_cours"
  | "livree"
  | "annulee";

export type Commande = {
  id: string;
  numero: string;
  clientId: string;
  pointDeVenteId: string;
  date: string;
  dateLivraisonPrevue?: string;
  statut: CommandeStatut;
  lignes: LigneDocument[];
  tauxTVA: number;
  devisId?: string;
  conditionsPaiement?: string;
  note?: string;
  /** Remise globale HT (Ar) */
  remiseGlobale?: number;
};

export type BonDeLivraisonStatut =
  | "brouillon"
  | "prepare"
  | "expedie"
  | "livre"
  | "annule";

export type BonDeLivraison = {
  id: string;
  numero: string;
  clientId: string;
  pointDeVenteId: string;
  date: string;
  /** Date de livraison effective */
  dateLivraison?: string;
  statut: BonDeLivraisonStatut;
  lignes: LigneDocument[];
  tauxTVA: number;
  commandeId?: string;
  devisId?: string;
  conditionsPaiement?: string;
  note?: string;
  remiseGlobale?: number;
};

export type FactureType = "standard" | "acompte" | "solde" | "avoir" | "proforma";

export type FactureStatut =
  | "brouillon"
  | "proforma"
  | "validee"
  | "envoyee"
  | "partiellement_payee"
  | "payee"
  | "en_retard"
  | "annulee"
  /** @deprecated migré vers validee */
  | "emise";

export type AcompteDocumentLigne = {
  numero: string;
  date: string;
  montant: number;
  mode?: string;
};

export type SnapshotParametresDocument = Pick<
  Parametres,
  | "nomEntreprise"
  | "formeJuridique"
  | "nif"
  | "stat"
  | "rcs"
  | "adresse"
  | "ville"
  | "telephone"
  | "email"
  | "rib"
  | "banque"
  | "logoDataUrl"
  | "signatureDataUrl"
  | "signatureNom"
  | "conditionsPaiementDefaut"
  | "regimeFiscal"
  | "assujettiTVA"
  | "tauxTVA"
>;

export type SnapshotPresentationDocument = {
  parametres: SnapshotParametresDocument;
  modele?: {
    rubriques: import("./document-templates").DocumentRubriqueId[];
    mentionsLegales: string;
    piedDePage: string;
    zones?: import("./document-templates").ModeleZones;
  };
};

export type Facture = {
  id: string;
  numero: string;
  type: FactureType;
  clientId: string;
  pointDeVenteId: string;
  date: string;
  echeance: string;
  statut: FactureStatut;
  lignes: LigneDocument[];
  tauxTVA: number;
  /**
   * Suivi de trésorerie (acomptes initiaux + règlements ultérieurs).
   * N'altère pas le contenu PDF de la facture.
   */
  montantPaye: number;
  devisId?: string;
  commandeId?: string;
  bonDeLivraisonId?: string;
  /**
   * Facture d'acompte / solde : document d'origine éventuel.
   * Facture d'avoir : facture annulée (partiellement ou totalement).
   * Proforma convertie : facture résultante éventuelle.
   */
  factureParenteId?: string;
  conditionsPaiement?: string;
  note?: string;
  /** Remise globale HT (Ar) */
  remiseGlobale?: number;
  /** Date de validation (attribution n° fiscal) */
  dateValidation?: string;
  /** Date d'envoi au client / e-facture */
  dateEnvoi?: string;
  /**
   * Acomptes mentionnés sur le document à l'émission (figés).
   * La facture matérialise l'opération commerciale : les paiements
   * ultérieurs ne modifient pas ce snapshot ni le net à payer imprimé.
   */
  acomptesDocument?: AcompteDocumentLigne[];
  /**
   * Présentation figée à la validation fiscale (logo, signature, mentions…).
   * Devis / commandes / BL et brouillons / proformas suivent les paramètres
   * courants ; les factures validées ne sont plus impactées.
   */
  presentation?: SnapshotPresentationDocument;
};

export type JournalAuditAction =
  | "facture_brouillon"
  | "facture_proforma"
  | "facture_validee"
  | "facture_envoyee"
  | "facture_paiement"
  | "facture_avoir"
  | "facture_annulee"
  | "facture_modifiee"
  | "facture_supprimee"
  | "autre";

export type JournalAudit = {
  id: string;
  date: string;
  action: JournalAuditAction;
  entite: "facture";
  entiteId: string;
  numero?: string;
  detail?: string;
};

export type ModePaiement =
  | "especes"
  | "virement"
  | "cheque"
  | "mobile_money"
  | "autre";

export type AcompteStatut = "enregistre" | "impute" | "annule";

/** Acompte encaissé — génère / lie une facture d'acompte. */
export type Acompte = {
  id: string;
  numero: string;
  date: string;
  clientId: string;
  /** Montant TTC encaissé */
  montantTTC: number;
  tauxTVA: number;
  modePaiement: ModePaiement;
  devisId?: string;
  commandeId?: string;
  factureId?: string;
  factureAcompteId?: string;
  statut: AcompteStatut;
  note?: string;
};

/**
 * Saisie de clôture journalière (écarts / pertes) par point de vente.
 * Les ventes et la marge sont calculées automatiquement.
 */
export type RapportFinJournee = {
  id: string;
  /** Jour civil YYYY-MM-DD */
  dateJour: string;
  pointDeVenteId: string;
  /** Écart de stock inventaire (négatif = manque) — Ar */
  ecartStockAr: number;
  /** Vol constaté — Ar */
  volAr: number;
  /** Écart de caisse (négatif = manque) — Ar */
  ecartCaisseAr: number;
  /** Invendus / casse / pertes fraîcheur — Ar */
  invenduAr: number;
  note?: string;
  updatedAt: string;
};

/** Catégorie de justification d'un écart d'inventaire. */
export type CategorieEcartInventaire =
  | "casse"
  | "vol"
  | "perte_fraicheur"
  | "erreur_saisie"
  | "surplus_reception"
  | "difference_comptage"
  | "autre";

export type InventaireLigne = {
  produitId: string;
  /** Stock théorique (calculé CUMP : entrées − sorties) au moment de l'inventaire */
  stockTheorique: number;
  /** Stock physique compté */
  stockPhysique: number;
  /** Coût unitaire moyen pondéré (CUMP) figé à l'inventaire */
  coutUnitaire: number;
  /** Justification de l'écart (boni ou mali) */
  motif?: string;
  categorieEcart?: CategorieEcartInventaire;
};

export type InventaireStatut = "brouillon" | "valide";

/** Inventaire physique par point de vente avec justification des écarts. */
export type Inventaire = {
  id: string;
  numero: string;
  pointDeVenteId: string;
  date: string;
  statut: InventaireStatut;
  lignes: InventaireLigne[];
  note?: string;
  /** Date de validation (clôture de l'inventaire) */
  dateValidation?: string;
};

/** Entité concernée par une action tracée dans l'historique. */
export type ActiviteEntite =
  | "client"
  | "produit"
  | "categorie"
  | "fournisseur"
  | "point_de_vente"
  | "charge"
  | "tarif_client"
  | "immobilisation"
  | "devis"
  | "commande"
  | "bon_de_livraison"
  | "facture"
  | "acompte"
  | "inventaire"
  | "parametres"
  | "bilan"
  | "compte_courant"
  | "autre";

/** Nature de l'action tracée. */
export type ActiviteAction =
  | "creation"
  | "modification"
  | "suppression"
  | "annulation"
  | "validation"
  | "activation"
  | "desactivation"
  | "autre";

/** Journal d'historique des actions utilisateur (traçabilité). */
export type JournalActivite = {
  id: string;
  date: string;
  /** Auteur de l'action (au moment où elle est réalisée) */
  userId?: string;
  userNom?: string;
  action: ActiviteAction;
  entite: ActiviteEntite;
  entiteId?: string;
  /** Libellé lisible de l'entité (nom client, n° document…) */
  libelle?: string;
  detail?: string;
};

export type AppState = {
  parametres: Parametres;
  modelesDocuments: ModeleDocument[];
  /** Préférences de modèle par utilisateur (personnalisation individuelle). */
  preferencesModeles: PreferencesModeles;
  bilanInitial: BilanInitial;
  immobilisations: Immobilisation[];
  mouvementsCompteCourant: MouvementCompteCourant[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  devis: Devis[];
  commandes: Commande[];
  bonsDeLivraison: BonDeLivraison[];
  factures: Facture[];
  acomptes: Acompte[];
  pointsDeVente: PointDeVente[];
  categoriesProduits: CategorieProduit[];
  produits: Produit[];
  tarifsClients: TarifClient[];
  historiquesPrix: HistoriquePrix[];
  journalAudit: JournalAudit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  charges: Charge[];
  rapportsFinJournee: RapportFinJournee[];
  inventaires: Inventaire[];
  journalActivites: JournalActivite[];
  pointDeVenteActifId: string | "tous";
};
