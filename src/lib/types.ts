import type { ModeleDocument } from "./document-templates";

export type PointDeVente = {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
  actif: boolean;
  /** Objectif de CA mensuel (Ar) */
  objectifCAMensuel: number;
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

export type RegimeFiscal = "tva" | "imp" | "franchise";

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

export type Client = {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  nif?: string;
  type: "particulier" | "restaurant" | "hotel" | "grossiste" | "autre";
  actif: boolean;
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
};

export type JournalAuditAction =
  | "facture_brouillon"
  | "facture_proforma"
  | "facture_validee"
  | "facture_envoyee"
  | "facture_paiement"
  | "facture_avoir"
  | "facture_annulee"
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

export type AppState = {
  parametres: Parametres;
  modelesDocuments: ModeleDocument[];
  bilanInitial: BilanInitial;
  immobilisations: Immobilisation[];
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
  pointDeVenteActifId: string | "tous";
};
