import type { PreferencesAffichage } from "./affichage-tableaux";
import type { AlertesSuivi, ParametresAlertes } from "./alertes";
import type { ModeleDocument, PreferencesModeles } from "./document-templates";

/** Rôle opérationnel d’un site. Un site peut cumuler entrepôt et point de vente. */
export type RoleSite =
  | "entrepot"
  | "point_de_vente"
  | "atelier"
  | "atelier_final";

export type PointDeVente = {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  telephone: string;
  actif: boolean;
  /**
   * Entrepôt, point de vente, ou les deux.
   * Absent / vide = point de vente (données historiques).
   */
  rolesSite?: RoleSite[];
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

/** Unité de mesure catalogue (article acheté / stocké / vendu). */
export type UniteMesure = {
  id: string;
  /** Symbole affiché (kg, pce, m²…). Unique. */
  symbole: string;
  libelle: string;
  ordre: number;
  actif: boolean;
};

/** Type de client paramétrable (particulier, hôtel, collectivité…). */
export type TypeClient = {
  id: string;
  code: string;
  libelle: string;
  ordre: number;
  actif: boolean;
};

/** Deuxième préfixe des n° de pièces : année 4 car., année 2 car., ou année+mois. */
export type FormatDateNumeroPiece = "annee_4" | "annee_2" | "annee_mois";

export type TypePieceNumerotee =
  | "devis"
  | "commande"
  | "livraison"
  | "facture_client";

export type FormatNumeroPiece = {
  /** Premier préfixe, texte libre (ex. DEV, FAC). */
  prefixeLibre: string;
  formatDate: FormatDateNumeroPiece;
  /** Chiffres du compteur, hors préfixes. */
  longueurNumero: number;
};

export type FormatsNumeroPieces = Partial<
  Record<TypePieceNumerotee, FormatNumeroPiece>
>;

/** Exercice comptable : année civile (01/01–31/12) ou à cheval sur deux années. */
export type ExerciceComptable = {
  id: string;
  /** Jeton de numérotation : « 2026 » ou « 2025-2026 ». */
  code: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  /** true = 1er janvier → 31 décembre. */
  calendaire: boolean;
  actif: boolean;
  cloture: boolean;
};

export type TypeAchat =
  | "marchandises"
  | "matieres_premieres"
  | "fournitures"
  | "service_produit"
  | "service_general"
  | "immobilisation";

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
  /** Seuil de réapprovisionnement (unité produit) — alerte stock, par produit. */
  seuilReappro?: number;
  /** Seuil de rupture imminente / effective (0 = rupture dès stock à 0). */
  seuilRupture?: number;
  /** Seuil de surstockage (unité produit). */
  seuilSurstock?: number;
  /** Si vrai, les lots d'entrée peuvent porter une date de péremption. */
  gerePeremption?: boolean;
  /**
   * Ancien champ unique (rétrocompat). Préférer compteChargeId / compteVenteId.
   */
  compteComptableId?: string;
  /** Compte de charge (classe 6) pour les écritures d'achat. */
  compteChargeId?: string;
  /** Compte de vente (classe 7) pour les écritures de vente. */
  compteVenteId?: string;
  /**
   * Nature d'achat catalogue. Uniquement les types qui passent par la fiche
   * produit (pas service général ni immobilisation).
   */
  typeAchat?: TypeAchat;
  /**
   * Nature de stock (indépendante du type d'achat comptable).
   * Absent = matière première / article acheté (rétrocompatibilité).
   */
  natureStock?: NatureStock;
  /**
   * Circuit commercial : acheté, vendu, ou les deux.
   * Absent = déduit de la nature (MP = achat+vente, fabriqué = vente).
   */
  usageCommercial?: UsageCommercialProduit;
  /** Jusqu’à deux nomenclatures (automatique + alternative nommée). */
  nomenclatures?: NomenclatureProduit[];
  /**
   * TVA applicable sur ce produit.
   * Absent : déduit du taux TVA catalogue (rétrocompatibilité).
   */
  taxable?: boolean;
  /**
   * Critère de rang par défaut des fournisseurs habituels (fiche produit).
   * Pas de réglage global entreprise.
   */
  criteresClassementFournisseurs?: CritereClassementFournisseur;
  /** Rangs de priorité d'approvisionnement (1 = proposé par défaut à l'achat). */
  fournisseursPriorite?: ProduitFournisseurRang[];
};

export type CritereClassementFournisseur = "prix" | "delai";

export type ProduitFournisseurRang = {
  fournisseurId: string;
  rang: number;
  /** Rang saisi à la main, conservé si le critère automatique change. */
  manuel?: boolean;
};

/** Classification logistique du produit — distincte du type d'achat (classe 6). */
export type NatureStock = "matiere_premiere" | "semi_fini" | "fini";

/** Circuit commercial de la fiche article. */
export type UsageCommercialProduit = "achat" | "vente" | "achat_vente";

export type TypeNomenclature = "automatique" | "alternative";

export type NomenclatureLigne = {
  id: string;
  composantId: string;
  /** Quantité de composant pour 1 unité du produit fabriqué. */
  quantite: number;
};

export type NomenclatureProduit = {
  id: string;
  type: TypeNomenclature;
  /** « Nomenclature standard » ou nom libre pour l’alternative. */
  nom: string;
  lignes: NomenclatureLigne[];
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
  origine?:
    | "achat"
    | "stock_initial"
    | "livraison_achat"
    | "retour_fournisseur"
    | "transfert_sortie"
    | "transfert_entree"
    | "of_sortie"
    | "of_entree"
    | "of_retour"
    | "of_annulation"
    | "mission_achat"
    | "mission_achat_annulation";
  /** Achat fournisseur d'origine (livraison ou retour). */
  achatId?: string;
  livraisonId?: string;
  avoirAchatId?: string;
  /** Transfert inter-sites d'origine. */
  transfertId?: string;
  /** Ordre de fabrication d'origine. */
  ofId?: string;
  /** Mission d'achat (avance de caisse) d'origine. */
  missionAchatId?: string;
  /** Date limite de consommation du lot (si le produit gère la péremption). */
  datePeremption?: string;
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
  /**
   * PU HT. Pour une vente dérivée d'une facture : net après remises
   * de ligne et quote-part de remise globale.
   */
  prixUnitaire: number;
  date: string;
  clientId?: string;
  /** Facture d'origine (CA / stock dérivés de la facturation). */
  factureId?: string;
  /**
   * CUMP figé à la validation / clôture de la facture.
   * Les livraisons ultérieures ne recalculent pas ce coût (intégrité des rapports).
   */
  cumpFigee?: number;
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
  /**
   * Bornes de la balance âgée (jours), entreprise entière.
   * Ex. [30, 60, 90] → 0-30, 31-60, 61-90, plus de 90.
   */
  tranchesBalanceAgeeJours?: number[];
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
  /**
   * Longueur unique des numéros de compte (6 à 9 chiffres).
   * Fixée pour toute l'entreprise ; ne peut qu'augmenter ensuite.
   */
  longueurNumeroCompte?: number;
  /**
   * Module Comptabilité (plan, écritures, comptes produit).
   * Absent = activé (rétrocompatibilité des entreprises déjà paramétrées).
   */
  moduleComptabilite?: boolean;
  /** Formats de n° pour devis, commande, BL et facture client. */
  formatsNumeroPieces?: FormatsNumeroPieces;
};

/**
 * Identité affichée en tête de la colonne des menus.
 * Indépendante de nomEntreprise / logoDataUrl (documents commerciaux).
 * Stockée dans l'état métier du tenant — isolation totale entre comptes.
 */
export type IdentiteNavigation = {
  nom: string;
  logoDataUrl?: string;
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
  stat?: string;
  type: string;
  actif: boolean;
  /** Interlocuteurs rattachés au client (fiche contacts). */
  contacts?: ClientContact[];
  /** Délai de règlement négocié (jours). */
  delaiPaiementJours?: number;
  /** Remise habituelle (%). */
  remiseHabituellePercent?: number;
  /** Encours / plafond de crédit autorisé (Ar). 0 ou absent = pas de plafond. */
  plafondCredit?: number;
  /** Compte 411 (ou sous-compte) rattaché à ce client. Unique parmi les tiers. */
  compteClientId?: string;
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
  stat?: string;
  actif: boolean;
  delaiPaiementJours?: number;
  remiseHabituellePercent?: number;
  /** Compte 401 (ou sous-compte) rattaché à ce fournisseur. Unique parmi les tiers. */
  compteFournisseurId?: string;
};

export type RoleTiers = "client" | "fournisseur";

/** Fiche unique : identité partagée, rôles Client et/ou Fournisseur. */
/** Adresse Madagascar (fiche Tiers — usages distincts). */
export type AdresseTiers = {
  id?: string;
  /** Libellé d'un site / dépôt de livraison. */
  libelle?: string;
  ligne1?: string;
  ligne2?: string;
  quartier?: string;
  ville?: string;
  region?: string;
  codePostal?: string;
  pays?: string;
};

export type Tiers = {
  id: string;
  code?: string;
  /** Nom ou raison sociale (obligatoire). */
  nom: string;
  /** Nom commercial ou marque (informatif, hors documents). */
  nomCommercial?: string;
  /** Forme juridique (informatif, hors documents). */
  formeJuridique?: string;
  /** Capital social, montant simple (informatif, hors documents). */
  capitalSocial?: number;
  telephone?: string;
  email?: string;
  /** Ligne d'adresse héritée / dérivée de l'adresse principale. */
  adresse?: string;
  ville?: string;
  nif?: string;
  stat?: string;
  /** Registre du commerce (informatif, hors documents). */
  rcs?: string;
  type?: Client["type"];
  specialite?: string;
  actif: boolean;
  contacts?: ClientContact[];
  roles: RoleTiers[];
  /** Site (point de vente / entrepôt) de rattachement. */
  siteRattachementId?: string;
  adressePrincipale?: AdresseTiers;
  adresseCourrier?: AdresseTiers;
  adresseFacturation?: AdresseTiers;
  adressesLivraison?: AdresseTiers[];
  /** Si vrai / absent : courrier = adresse principale. */
  memeAdresseCourrier?: boolean;
  memeAdresseFacturation?: boolean;
  memeAdresseLivraison?: boolean;
  delaiPaiementClientJours?: number;
  remiseHabituelleClientPercent?: number;
  plafondCredit?: number;
  delaiPaiementFournisseurJours?: number;
  remiseHabituelleFournisseurPercent?: number;
  /** Compte 411 (ou sous-compte) si rôle Client. Unique parmi les tiers. */
  compteClientId?: string;
  /** Compte 401 (ou sous-compte) si rôle Fournisseur. Unique parmi les tiers. */
  compteFournisseurId?: string;
  /** Tiers technique (ex. Divers / Marché) : non supprimable. */
  systeme?: boolean;
};

export type AchatStatut = "brouillon" | "valide" | "annule";
export type LivraisonAchatStatut =
  | "en_attente"
  | "partielle"
  | "livree"
  | "annulee";
export type PaiementAchatStatut = "non_paye" | "partiel" | "paye";

/** Sous-quantité d’une ligne d’achat affectée à un site. */
export type AchatLigneRepartition = {
  pointDeVenteId: string;
  quantite: number;
};

export type AchatLigne = {
  id: string;
  /** Absent pour une ligne libre (service général, immobilisation). */
  produitId?: string;
  /** Libellé saisi (lignes libres). */
  designation?: string;
  typeAchat?: TypeAchat;
  /** Compte choisi à la saisie (lignes libres). */
  compteComptableId?: string;
  /** TVA sur la ligne libre. Absent = suit l'assujettissement. */
  taxable?: boolean;
  quantite: number;
  /** Prix d'achat unitaire HT (Ar) */
  prixAchatUnitaire: number;
  /**
   * Répartition de la quantité sur un ou plusieurs sites.
   * Absente = toute la quantité va sur `Achat.pointDeVenteId`.
   */
  repartitions?: AchatLigneRepartition[];
};

export type LivraisonAchatLigne = {
  produitId: string;
  quantitePrevue: number;
  quantiteLivree: number;
};

export type LivraisonAchat = {
  id: string;
  numero: string;
  date: string;
  statut: LivraisonAchatStatut;
  lignes: LivraisonAchatLigne[];
  note?: string;
  /** DLC appliquée aux lots générés par cette réception. */
  datePeremption?: string;
};

export type PaiementFournisseur = {
  id: string;
  date: string;
  /** Montant TTC versé (Ar) */
  montant: number;
  modePaiement: ModePaiement;
  note?: string;
};

export type AvoirAchatLigne = {
  produitId: string;
  quantite: number;
  /** Prix unitaire HT de l'avoir (défaut : PU de la commande) */
  prixAchatUnitaire: number;
};

export type AvoirAchat = {
  id: string;
  numero: string;
  date: string;
  statut: "brouillon" | "valide";
  lignes: AvoirAchatLigne[];
  note?: string;
};

/** Commande fournisseur : livraisons, paiements et retours rattachés. */
export type Achat = {
  id: string;
  numero: string;
  fournisseurId: string;
  /** Site principal / défaut de répartition (rétrocompatibilité). */
  pointDeVenteId: string;
  /** Date de commande */
  date: string;
  /** Échéance de paiement */
  echeance?: string;
  statut: AchatStatut;
  tauxTVA: number;
  lignes: AchatLigne[];
  livraisons: LivraisonAchat[];
  paiements: PaiementFournisseur[];
  avoirs: AvoirAchat[];
  note?: string;
  dateValidation?: string;
  /** Utilisateur à la saisie (colonne « Vendeur » de la fiche Tiers). */
  vendeurId?: string;
  vendeurNom?: string;
  /** Demande d'achat générée depuis un OF (composant en rupture). */
  ofId?: string;
  ofComposantId?: string;
  /** Demande de prix d'origine, si la commande en est issue. */
  demandePrixId?: string;
  /** Durée de validité du bon de commande, en jours. */
  validiteJours?: number;
  /** N° de la facture fournisseur, saisi manuellement. */
  numeroFactureFournisseur?: string;
};

export type DemandePrixStatut =
  | "brouillon"
  | "en_cours"
  | "cloturee"
  | "annulee";

export type DemandePrixLigne = {
  id: string;
  produitId: string;
  quantite: number;
};

export type DemandePrixOffre = {
  id: string;
  ligneId: string;
  fournisseurId: string;
  /** 0 = pas encore de prix proposé. */
  prixUnitaire: number;
  delaiJours?: number;
};

export type DemandePrix = {
  id: string;
  numero: string;
  date: string;
  statut: DemandePrixStatut;
  lignes: DemandePrixLigne[];
  fournisseurIds: string[];
  offres: DemandePrixOffre[];
  /** Fournisseur(s) choisis après comparatif. */
  fournisseurIdsRetenus?: string[];
  /** Commandes fournisseur générées depuis cette DP. */
  achatIds?: string[];
  note?: string;
  /** Durée de validité de la demande de prix, en jours. */
  validiteJours?: number;
};

export type TransfertStockStatut = "demande" | "expedie" | "recu" | "annule";

export type TransfertStockLigne = {
  produitId: string;
  quantite: number;
  /** CUMP du site source figé à l'expédition (achat interne). */
  cumpSource?: number;
};

/** Mouvement de stock entre sites, après réception initiale. */
export type TransfertStock = {
  id: string;
  numero: string;
  siteSourceId: string;
  siteDestinataireId: string;
  dateDemande: string;
  dateExpedition?: string;
  dateReception?: string;
  statut: TransfertStockStatut;
  lignes: TransfertStockLigne[];
  demandeParUserId?: string;
  demandeParNom?: string;
  note?: string;
};

export type TypeLigneDocument =
  | "produit"
  | "sous_total"
  | "blanche"
  | "commentaire";

/** Saisie d’une remise : pourcentage ou montant fixe (Ar). */
export type ModeRemise = "percent" | "montant";

export type LigneDocument = {
  id: string;
  /** Défaut : produit */
  type?: TypeLigneDocument;
  produitId?: string;
  /** Snapshot du code catalogue à la saisie */
  codeProduit?: string;
  designation: string;
  quantite: number;
  /** Prix unitaire HT d’origine (jamais écrasé par une remise) */
  prixUnitaire: number;
  unite: string;
  /** Snapshot du taux TVA ligne */
  tauxTVA?: number;
  /** Mode de la remise ligne. Défaut : percent (données historiques). */
  remiseMode?: ModeRemise;
  /** Remise en % sur la ligne produit (mode percent) */
  remisePercent?: number;
  /** Remise en Ar sur le montant HT de la ligne (mode montant) */
  remiseMontant?: number;
  /** Commentaire sous la ligne produit */
  commentaire?: string;
  /** CUMP unitaire figé à la validation fiscale (factures uniquement). */
  cumpFigee?: number;
};

export type DevisStatut =
  | "brouillon"
  | "envoye"
  | "accepte"
  | "en_transformation"
  | "transforme"
  | "refuse"
  | "expire";

export type CibleTransformation = "commande" | "bon_de_livraison" | "facture";
export type SourceTransformation = "devis" | "commande" | "bon_de_livraison";

/** Verrou temporaire pendant l'écran de validation d'une transformation. */
export type VerrouTransformation = {
  jusquA: string;
  userId?: string;
  userNom?: string;
  cible: CibleTransformation;
  statutPrecedent: string;
};

/** Lien historisé source → document(s) généré(s) (un-vers-plusieurs). */
export type TransformationCommerciale = {
  id: string;
  date: string;
  userId?: string;
  userNom?: string;
  sourceType: SourceTransformation;
  sourceId: string;
  sourceNumero: string;
  cibleType: CibleTransformation;
  cibleId: string;
  cibleNumero: string;
};

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
  /** Remise globale : % ou Ar selon remiseGlobaleMode */
  remiseGlobale?: number;
  /** Défaut historique : montant HT (Ar). */
  remiseGlobaleMode?: ModeRemise;
  verrouTransformation?: VerrouTransformation | null;
};

export type CommandeStatut =
  | "brouillon"
  | "confirmee"
  | "en_cours"
  | "en_transformation"
  | "livree"
  | "annulee";

export type Commande = {
  id: string;
  numero: string;
  clientId: string;
  pointDeVenteId: string;
  date: string;
  dateLivraisonPrevue?: string;
  /** Durée de validité du bon de commande, en jours. */
  validiteJours?: number;
  statut: CommandeStatut;
  lignes: LigneDocument[];
  tauxTVA: number;
  devisId?: string;
  conditionsPaiement?: string;
  note?: string;
  /** Remise globale : % ou Ar selon remiseGlobaleMode */
  remiseGlobale?: number;
  remiseGlobaleMode?: ModeRemise;
  verrouTransformation?: VerrouTransformation | null;
};

export type BonDeLivraisonStatut =
  | "brouillon"
  | "prepare"
  | "expedie"
  | "en_transformation"
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
  remiseGlobaleMode?: ModeRemise;
  verrouTransformation?: VerrouTransformation | null;
};

export type FactureType =
  | "standard"
  | "acompte"
  | "solde"
  | "avoir"
  | "proforma";

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
  /** Remise globale : % ou Ar selon remiseGlobaleMode (après remises de ligne, avant TVA) */
  remiseGlobale?: number;
  remiseGlobaleMode?: ModeRemise;
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
  /** Vente émise malgré un dépassement de plafond (rôle habilité). */
  derogationCredit?: boolean;
  /** Commercial / utilisateur à l'émission. */
  vendeurId?: string;
  vendeurNom?: string;
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
  | "unite_mesure"
  | "type_client"
  | "exercice_comptable"
  | "fournisseur"
  | "achat"
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
  | "transfert"
  | "ordre_fabrication"
  | "mission_achat"
  | "demande_prix"
  | "tiers"
  | "parametres"
  | "compte_comptable"
  | "compte_courant"
  | "autre";

/** Nature de l'action tracée. */
export type ActiviteAction =
  | "creation"
  | "modification"
  | "suppression"
  | "annulation"
  | "validation"
  | "expedition"
  | "reception"
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

export type RoleCompteComptable =
  | "general"
  | "tva_deductible"
  | "tva_collectee"
  | "defaut_charge"
  | "defaut_vente";

export type CompteComptable = {
  id: string;
  numero: string;
  libelle: string;
  roleCompte?: RoleCompteComptable;
};

export type JournalEcriture = "vente" | "achat";

export type SourceEcriture =
  | "facture"
  | "achat"
  | "avoir_achat"
  | "mission_achat";

export type LigneEcritureComptable = {
  id: string;
  compteId?: string;
  numero: string;
  libelle: string;
  debit: number;
  credit: number;
};

/** Écriture générée à la validation d'une facture d'achat ou de vente. */
export type EcritureComptable = {
  id: string;
  date: string;
  libelle: string;
  piece: string;
  journal: JournalEcriture;
  sourceType: SourceEcriture;
  sourceId: string;
  lignes: LigneEcritureComptable[];
  /** Marquée après un export Transfert ; figée ensuite. */
  transferee?: boolean;
  transfertId?: string;
  transfereeAt?: string;
};

export type TransfertComptable = {
  id: string;
  date: string;
  journal: JournalEcriture | "tous";
  debut?: string;
  fin?: string;
  ecritureIds: string[];
  lignes: (string | number)[][];
  nomFichier: string;
};

export type OrdreFabricationStatut =
  | "brouillon"
  | "en_cours"
  | "cloture"
  | "annule"
  | "cloture_annule";

export type OfNomenclatureLigne = {
  id: string;
  composantId: string;
  quantiteUnitaire: number;
};

export type OfSortieMatiere = {
  id: string;
  date: string;
  composantId: string;
  siteSourceId: string;
  quantite: number;
  /** CUMP du site source figé à la sortie, non recalculable. */
  cumpSortie: number;
  valeur: number;
  /** Entrée de production qui a absorbé ce coût (pot). */
  affecteEntreeId?: string;
  achatId?: string;
};

export type OfFraisAdditionnel = {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  affecteEntreeId?: string;
};

export type OfEntreeProduction = {
  id: string;
  date: string;
  quantite: number;
  coutUnitaire: number;
  coutTotal: number;
};

export type OfRetourMatiere = {
  id: string;
  sortieId: string;
  composantId: string;
  quantite: number;
  destination: "magasin" | "atelier";
  siteDestinataireId: string;
  cumpOrigine: number;
};

export type OfEcartFabrication = {
  montant: number;
  raison?: string;
};

export type OfValidationAction =
  | "demarrer"
  | "confirmer_cloture"
  | "annuler_cloture"
  | "retour_edition"
  | "annuler_document";

export type OfValidationEtape = {
  id: string;
  date: string;
  userId?: string;
  userNom?: string;
  action: OfValidationAction;
  detail?: string;
};

export type OrdreFabrication = {
  id: string;
  numero: string;
  atelierId: string;
  produitId: string;
  quantitePrevue: number;
  nomenclatureSource: TypeNomenclature;
  nomenclatureNom: string;
  nomenclatureLignes: OfNomenclatureLigne[];
  /** Fabrication sur commande (MTO). Vide = réappro stock (MTS). */
  commandeId?: string;
  statut: OrdreFabricationStatut;
  dateCreation: string;
  dateCloturePrevue?: string;
  dateClotureReelle?: string;
  dateAnnulation?: string;
  sorties: OfSortieMatiere[];
  frais: OfFraisAdditionnel[];
  entreesProduction: OfEntreeProduction[];
  retoursMatieres: OfRetourMatiere[];
  ecart?: OfEcartFabrication;
  validations: OfValidationEtape[];
  note?: string;
};

export type MissionAchatStatut =
  | "en_cours"
  | "cloture"
  | "annule"
  | "cloture_annule";

export type MissionReglementStatut = "non_regle" | "regle";

export type MissionLignePrevisionnelle = {
  id: string;
  produitId: string;
  quantiteSouhaitee: number;
};

export type MissionAchatRealise = {
  id: string;
  previsionId?: string;
  produitId: string;
  /** 0 accepté si l'article n'a pas été trouvé. */
  quantite: number;
  prixUnitaire: number;
  fournisseurId: string;
};

export type MissionDepenseDiverse = {
  id: string;
  nature: string;
  montant: number;
};

export type MissionValidationAction =
  | "confirmer_cloture"
  | "annuler_cloture"
  | "retour_edition"
  | "annuler_document"
  | "regler";

export type MissionValidationEtape = {
  id: string;
  date: string;
  userId?: string;
  userNom?: string;
  action: MissionValidationAction;
  detail?: string;
};

export type MissionAchat = {
  id: string;
  numero: string;
  acheteurUserId: string;
  acheteurNom: string;
  date: string;
  siteDestinataireId: string;
  montantAvance: number;
  statut: MissionAchatStatut;
  lignesPrevisionnelles: MissionLignePrevisionnelle[];
  achatsRealises: MissionAchatRealise[];
  depensesDiverses: MissionDepenseDiverse[];
  statutReglement: MissionReglementStatut;
  dateReglement?: string;
  dateCloture?: string;
  dateAnnulation?: string;
  validations: MissionValidationEtape[];
  note?: string;
};

export type AppState = {
  parametres: Parametres;
  identiteNavigation: IdentiteNavigation;
  modelesDocuments: ModeleDocument[];
  /** Préférences de modèle par utilisateur (personnalisation individuelle). */
  preferencesModeles: PreferencesModeles;
  /** Types d'affichage de colonnes par utilisateur et par tableau. */
  preferencesAffichage: PreferencesAffichage;
  /** Configuration des alertes (globale entreprise / tenant). */
  parametresAlertes: ParametresAlertes;
  /** Suivi lu / traité des alertes, par utilisateur. */
  alertesSuivi: AlertesSuivi;
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
  missionsAchat: MissionAchat[];
  demandesPrix: DemandePrix[];
  pointsDeVente: PointDeVente[];
  categoriesProduits: CategorieProduit[];
  unitesMesure: UniteMesure[];
  typesClients: TypeClient[];
  exercicesComptables: ExerciceComptable[];
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
  comptesComptables: CompteComptable[];
  ecrituresComptables: EcritureComptable[];
  transfertsComptables: TransfertComptable[];
  pointDeVenteActifId: string | "tous";
};
