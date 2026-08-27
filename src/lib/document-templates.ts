/** Rubriques disponibles pour personnaliser devis / commandes / factures (MG). */
export type DocumentRubriqueId =
  | "entete_entreprise"
  | "logo"
  | "nif"
  | "stat"
  | "rcs"
  | "coordonnees_entreprise"
  | "rib"
  | "client"
  | "client_nif"
  | "numero_date"
  | "reference_devis"
  | "reference_commande"
  | "reference_bl"
  | "lignes"
  | "totaux_ht_tva_ttc"
  | "acomptes"
  | "net_a_payer"
  | "conditions_paiement"
  | "echeance"
  | "mentions_legales"
  | "signature_cachet";

export type TypeDocumentCommercial =
  | "devis"
  | "commande"
  | "bon_de_livraison"
  | "facture";

/** Colonnes configurables du tableau des articles vendus. */
export type ColonneArticleId =
  | "code"
  | "designation"
  | "pu_ht"
  | "pu_ttc"
  | "remise_pct"
  | "remise_ht"
  | "pu_ht_remise"
  | "pu_ttc_remise"
  | "unite"
  | "quantite"
  | "total_ht"
  | "total_ht_remise"
  | "tva_pct"
  | "tva_montant"
  | "total_ttc"
  | "mesure";

export type ColonneArticleConfig = {
  id: ColonneArticleId;
  /** Libellé personnalisé de l'en-tête de colonne. */
  label: string;
  visible: boolean;
};

export type DispositionEntete =
  | "logo_only"
  | "entreprise_only"
  | "logo_gauche"
  | "logo_droite";

/** Palette de couleurs appliquée à la présentation du document. */
export type PaletteId =
  | "ocean"
  | "ardoise"
  | "emeraude"
  | "indigo"
  | "bordeaux"
  | "cuivre"
  | "prune"
  | "ambre"
  | "nuit"
  | "foret";

export type PaletteCouleur = {
  id: PaletteId;
  nom: string;
  /** Couleur forte : bandeau « net à payer », titres. */
  primary: string;
  /** Couleur d'accent : en-tête de tableau, libellés de zone. */
  accent: string;
  /** Fond doux : cadres client, encadrés. */
  soft: string;
};

export const PALETTES: PaletteCouleur[] = [
  { id: "ocean", nom: "Océan", primary: "#0f5c6b", accent: "#1b7d8f", soft: "#e6f2f4" },
  { id: "ardoise", nom: "Ardoise", primary: "#1f2937", accent: "#475569", soft: "#eef1f5" },
  { id: "emeraude", nom: "Émeraude", primary: "#065f46", accent: "#059669", soft: "#e7f5ef" },
  { id: "indigo", nom: "Indigo", primary: "#312e81", accent: "#4f46e5", soft: "#ecebfb" },
  { id: "bordeaux", nom: "Bordeaux", primary: "#7f1d1d", accent: "#b91c1c", soft: "#fbecec" },
  { id: "cuivre", nom: "Cuivre", primary: "#7c2d12", accent: "#ea580c", soft: "#fdece2" },
  { id: "prune", nom: "Prune", primary: "#581c87", accent: "#7e22ce", soft: "#f4e9fb" },
  { id: "ambre", nom: "Ambre", primary: "#78350f", accent: "#d97706", soft: "#fdf1dd" },
  { id: "nuit", nom: "Bleu nuit", primary: "#0c2340", accent: "#1d4ed8", soft: "#e7edfb" },
  { id: "foret", nom: "Forêt", primary: "#14532d", accent: "#16a34a", soft: "#e7f6ec" },
];

export function paletteParId(id: PaletteId | undefined): PaletteCouleur {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** Préférences de modèle par utilisateur : userId → type de doc → modeleId. */
export type PreferencesModeles = Record<
  string,
  Partial<Record<TypeDocumentCommercial, string>>
>;

/**
 * Modèle à utiliser pour un type de document : préférence de l'utilisateur si
 * définie et valide, sinon modèle marqué par défaut (actif), sinon premier.
 */
export function modelePourType(
  modeles: ModeleDocument[],
  type: TypeDocumentCommercial,
  opts?: { preferences?: PreferencesModeles; userId?: string | null },
): ModeleDocument | undefined {
  const prefId =
    opts?.userId && opts.preferences
      ? opts.preferences[opts.userId]?.[type]
      : undefined;
  if (prefId) {
    const chosen = modeles.find((m) => m.id === prefId && m.type === type);
    if (chosen) return chosen;
  }
  return (
    modeles.find((m) => m.type === type && m.actif) ??
    modeles.find((m) => m.type === type)
  );
}

/** Configuration détaillée d'un modèle, zone par zone (cf. maquette). */
export type ModeleZones = {
  /** Palette de couleurs appliquée au document. */
  couleurId: PaletteId;
  entete: {
    disposition: DispositionEntete;
    afficherInfosEntreprise: boolean;
    adresse: boolean;
    ville: boolean;
    telephone: boolean;
    email: boolean;
    reseauSocial: boolean;
    nif: boolean;
    stat: boolean;
    rcs: boolean;
  };
  document: {
    nomDocument: string;
    numero: boolean;
    date: boolean;
    delaiPaiement: boolean;
  };
  client: {
    cadreClient: boolean;
    codeClient: boolean;
    nomClient: boolean;
    emailClient: boolean;
    telClient: boolean;
    immatriculation: boolean;
    cadreAdresseEtablissement: boolean;
    adresseEtablissement: boolean;
    cadreEntrepriseFacturee: boolean;
    adresseEntrepriseFacturee: boolean;
    cadreAdresseLivraison: boolean;
    adresseLivraison: boolean;
  };
  tracabilite: {
    afficher: boolean;
    refCommandeClient: boolean;
    destinataire: boolean;
    vendeur: boolean;
    intervenant: boolean;
    dateIntervention: boolean;
  };
  articles: {
    afficherLigneTotal: boolean;
    colonnes: ColonneArticleConfig[];
  };
  totaux: {
    afficher: boolean;
    totalHT: boolean;
    totalTVA: boolean;
    totalTTC: boolean;
    tauxIMP: boolean;
    modePaiementIMP: boolean;
    montantIMP: boolean;
    taxesAdditionnelles: boolean;
    cautionConsigne: boolean;
    totalAPayer: boolean;
    paiementEffectue: boolean;
    netAPayer: boolean;
  };
  reglement: {
    afficher: boolean;
    mode: boolean;
    description: boolean;
    delai: boolean;
    compteBancaire: boolean;
  };
  montantEnLettres: {
    afficher: boolean;
    titre: string;
  };
  signataire: {
    afficher: boolean;
    nom: string;
  };
};

export type ModeleDocument = {
  id: string;
  nom: string;
  type: TypeDocumentCommercial;
  rubriques: DocumentRubriqueId[];
  mentionsLegales: string;
  piedDePage: string;
  actif: boolean;
  /** Origine du modèle : « éditeur » (fourni) ou « personnalisé ». */
  createur?: string;
  /** Utilisateur ayant créé une copie personnalisée. */
  ownerUserId?: string;
  /** Modèle de base dont il dérive (facultatif). */
  source?: string;
  /** Nom de fichier proposé à l'export PDF. */
  nomFichierExport?: string;
  /** Configuration détaillée zone par zone (facultatif : rétrocompatible). */
  zones?: ModeleZones;
};

/** Catalogue des colonnes d'articles avec leur libellé par défaut. */
export const COLONNES_ARTICLE_CATALOGUE: {
  id: ColonneArticleId;
  label: string;
}[] = [
  { id: "code", label: "Code article" },
  { id: "designation", label: "Désignation" },
  { id: "pu_ht", label: "PU HT tarif" },
  { id: "pu_ttc", label: "PU TTC tarif" },
  { id: "remise_pct", label: "Remise %" },
  { id: "remise_ht", label: "Remise HT" },
  { id: "pu_ht_remise", label: "PU HT" },
  { id: "pu_ttc_remise", label: "PU TTC" },
  { id: "unite", label: "Unité de vente" },
  { id: "quantite", label: "Qté" },
  { id: "total_ht", label: "Total HT" },
  { id: "total_ht_remise", label: "Total HT remisé" },
  { id: "tva_pct", label: "TVA en %" },
  { id: "tva_montant", label: "TVA ou taxe" },
  { id: "total_ttc", label: "Total TTC" },
  { id: "mesure", label: "Mesure" },
];

/** Nombre maximal de colonnes affichables simultanément dans le tableau. */
export const MAX_COLONNES_ARTICLE = 8;

const COLONNES_VISIBLES_DEFAUT: ColonneArticleId[] = [
  "code",
  "designation",
  "pu_ht",
  "remise_pct",
  "pu_ht_remise",
  "unite",
  "quantite",
  "total_ttc",
];

export function colonnesParDefaut(): ColonneArticleConfig[] {
  return COLONNES_ARTICLE_CATALOGUE.map((c) => ({
    id: c.id,
    label: c.label,
    visible: COLONNES_VISIBLES_DEFAUT.includes(c.id),
  }));
}

const NOM_DOCUMENT_DEFAUT: Record<TypeDocumentCommercial, string> = {
  devis: "Devis",
  commande: "Bon de commande",
  bon_de_livraison: "Bon de livraison",
  facture: "Facture",
};

/** Configuration de zones par défaut, cohérente avec le rendu actuel. */
export function zonesParDefaut(type: TypeDocumentCommercial): ModeleZones {
  const estFacture = type === "facture";
  return {
    couleurId: "ocean",
    entete: {
      disposition: "logo_gauche",
      afficherInfosEntreprise: true,
      adresse: true,
      ville: true,
      telephone: true,
      email: true,
      reseauSocial: false,
      nif: true,
      stat: true,
      rcs: true,
    },
    document: {
      nomDocument: NOM_DOCUMENT_DEFAUT[type],
      numero: true,
      date: true,
      delaiPaiement: estFacture || type === "commande",
    },
    client: {
      cadreClient: true,
      codeClient: true,
      nomClient: true,
      emailClient: true,
      telClient: true,
      immatriculation: true,
      cadreAdresseEtablissement: false,
      adresseEtablissement: false,
      cadreEntrepriseFacturee: false,
      adresseEntrepriseFacturee: false,
      cadreAdresseLivraison: type === "bon_de_livraison",
      adresseLivraison: type === "bon_de_livraison",
    },
    tracabilite: {
      afficher: false,
      refCommandeClient: false,
      destinataire: false,
      vendeur: false,
      intervenant: false,
      dateIntervention: false,
    },
    articles: {
      afficherLigneTotal: true,
      colonnes: colonnesParDefaut(),
    },
    totaux: {
      afficher: true,
      totalHT: true,
      totalTVA: true,
      totalTTC: true,
      tauxIMP: false,
      modePaiementIMP: false,
      montantIMP: false,
      taxesAdditionnelles: false,
      cautionConsigne: false,
      totalAPayer: true,
      paiementEffectue: estFacture,
      netAPayer: true,
    },
    reglement: {
      afficher: estFacture,
      mode: true,
      description: true,
      delai: true,
      compteBancaire: estFacture,
    },
    montantEnLettres: {
      afficher: estFacture,
      titre: "Montant Net à payer en lettres",
    },
    signataire: {
      afficher: true,
      nom: "",
    },
  };
}

export const RUBRIQUES_CATALOGUE: {
  id: DocumentRubriqueId;
  label: string;
  description: string;
  obligatoire?: boolean;
}[] = [
  {
    id: "entete_entreprise",
    label: "En-tête entreprise",
    description: "Raison sociale et forme",
    obligatoire: true,
  },
  {
    id: "logo",
    label: "Logo entreprise",
    description: "Affiche le logo paramétré en en-tête des documents",
  },
  {
    id: "nif",
    label: "NIF",
    description: "Numéro d'Identification Fiscale (obligatoire MG)",
    obligatoire: true,
  },
  {
    id: "stat",
    label: "STAT",
    description: "Numéro statistique",
    obligatoire: true,
  },
  {
    id: "rcs",
    label: "RCS / Registre commerce",
    description: "Référence registre du commerce",
  },
  {
    id: "coordonnees_entreprise",
    label: "Coordonnées entreprise",
    description: "Adresse, téléphone, e-mail",
  },
  {
    id: "rib",
    label: "Coordonnées bancaires (RIB)",
    description: "Pour règlement par virement",
  },
  {
    id: "client",
    label: "Identité client",
    description: "Nom et coordonnées",
    obligatoire: true,
  },
  {
    id: "client_nif",
    label: "NIF client",
    description: "Si client professionnel",
  },
  {
    id: "numero_date",
    label: "N° et date du document",
    description: "Numérotation chronologique",
    obligatoire: true,
  },
  {
    id: "reference_devis",
    label: "Réf. devis",
    description: "Lien vers le devis d'origine",
  },
  {
    id: "reference_commande",
    label: "Réf. commande / bon de commande",
    description: "Lien vers la commande",
  },
  {
    id: "reference_bl",
    label: "Réf. bon de livraison",
    description: "Lien vers le bon de livraison",
  },
  {
    id: "lignes",
    label: "Détail des lignes",
    description: "Désignation, qté, P.U., montants",
    obligatoire: true,
  },
  {
    id: "totaux_ht_tva_ttc",
    label: "Totaux HT / TVA / TTC",
    description: "Ventilation fiscale",
    obligatoire: true,
  },
  {
    id: "acomptes",
    label: "Acomptes déduits",
    description: "Acomptes déjà encaissés",
  },
  {
    id: "net_a_payer",
    label: "Net à payer",
    description: "Solde après acomptes",
    obligatoire: true,
  },
  {
    id: "conditions_paiement",
    label: "Conditions de paiement",
    description: "Modalités de règlement",
  },
  {
    id: "echeance",
    label: "Date d'échéance",
    description: "Échéance de paiement",
  },
  {
    id: "mentions_legales",
    label: "Mentions légales",
    description: "Texte légal personnalisable",
  },
  {
    id: "signature_cachet",
    label: "Signature électronique",
    description:
      "Affiche la signature paramétrée (Paramètres → Entreprise) en bas du document",
  },
];

const MENTIONS_DEFAUT =
  "Document établi conformément à la réglementation fiscale malagasy. NIF et STAT obligatoires. En cas d'acompte, une facture d'acompte est émise. TVA exigible selon le régime applicable.";

export const DEFAULT_RUBRIQUES: Record<
  TypeDocumentCommercial,
  DocumentRubriqueId[]
> = {
  devis: [
    "entete_entreprise",
    "logo",
    "nif",
    "stat",
    "rcs",
    "coordonnees_entreprise",
    "client",
    "client_nif",
    "numero_date",
    "lignes",
    "totaux_ht_tva_ttc",
    "acomptes",
    "net_a_payer",
    "conditions_paiement",
    "mentions_legales",
    "signature_cachet",
  ],
  commande: [
    "entete_entreprise",
    "logo",
    "nif",
    "stat",
    "rcs",
    "coordonnees_entreprise",
    "client",
    "client_nif",
    "numero_date",
    "reference_devis",
    "lignes",
    "totaux_ht_tva_ttc",
    "acomptes",
    "net_a_payer",
    "conditions_paiement",
    "echeance",
    "mentions_legales",
    "signature_cachet",
  ],
  bon_de_livraison: [
    "entete_entreprise",
    "logo",
    "nif",
    "stat",
    "rcs",
    "coordonnees_entreprise",
    "client",
    "client_nif",
    "numero_date",
    "reference_devis",
    "reference_commande",
    "lignes",
    "totaux_ht_tva_ttc",
    "net_a_payer",
    "conditions_paiement",
    "mentions_legales",
    "signature_cachet",
  ],
  facture: [
    "entete_entreprise",
    "logo",
    "nif",
    "stat",
    "rcs",
    "coordonnees_entreprise",
    "rib",
    "client",
    "client_nif",
    "numero_date",
    "reference_devis",
    "reference_commande",
    "reference_bl",
    "lignes",
    "totaux_ht_tva_ttc",
    "acomptes",
    "net_a_payer",
    "conditions_paiement",
    "echeance",
    "mentions_legales",
    "signature_cachet",
  ],
};

export function createDefaultModeles(): ModeleDocument[] {
  return (
    ["devis", "commande", "bon_de_livraison", "facture"] as TypeDocumentCommercial[]
  ).map((type) => ({
    id: `modele-${type}-defaut`,
    nom: `Modèle ${type.replaceAll("_", " ")} (législation MG)`,
    type,
    rubriques: [...DEFAULT_RUBRIQUES[type]],
    mentionsLegales: MENTIONS_DEFAUT,
    piedDePage: "Merci de votre confiance — STWR Poissonnerie",
    actif: true,
    createur: "éditeur",
    zones: zonesParDefaut(type),
  }));
}

export function hasRubrique(
  modele: ModeleDocument | undefined,
  id: DocumentRubriqueId,
) {
  if (!modele) return true;
  return modele.rubriques.includes(id);
}

/**
 * Configuration de zones effective d'un modèle : utilise `zones` si présent,
 * sinon dérive les principaux réglages des anciennes `rubriques`.
 */
export function zonesDuModele(modele: ModeleDocument | undefined): ModeleZones {
  if (!modele) return zonesParDefaut("facture");
  if (modele.zones) return ensureZones(modele);

  const base = zonesParDefaut(modele.type);
  const has = (id: DocumentRubriqueId) => modele.rubriques.includes(id);
  return {
    ...base,
    entete: {
      ...base.entete,
      disposition: has("logo") ? "logo_gauche" : "entreprise_only",
      afficherInfosEntreprise: has("coordonnees_entreprise"),
      adresse: has("coordonnees_entreprise"),
      ville: has("coordonnees_entreprise"),
      telephone: has("coordonnees_entreprise"),
      email: has("coordonnees_entreprise"),
      nif: has("nif"),
      stat: has("stat"),
      rcs: has("rcs"),
    },
    document: {
      ...base.document,
      numero: has("numero_date"),
      date: has("numero_date"),
    },
    client: {
      ...base.client,
      cadreClient: has("client"),
      immatriculation: has("client_nif"),
    },
    totaux: {
      ...base.totaux,
      totalHT: has("totaux_ht_tva_ttc"),
      totalTVA: has("totaux_ht_tva_ttc"),
      totalTTC: has("totaux_ht_tva_ttc"),
      netAPayer: has("net_a_payer"),
    },
    reglement: {
      ...base.reglement,
      afficher: has("conditions_paiement"),
      compteBancaire: has("rib"),
    },
    signataire: {
      ...base.signataire,
      afficher: has("signature_cachet"),
    },
  };
}

/** Retourne la configuration de zones du modèle, ou les défauts du type. */
export function ensureZones(modele: ModeleDocument | undefined): ModeleZones {
  const type = modele?.type ?? "facture";
  if (!modele?.zones) return zonesParDefaut(type);
  const base = zonesParDefaut(type);
  const z = modele.zones;
  // Fusion défensive : garantit tous les champs même si le modèle est ancien.
  return {
    couleurId: z.couleurId ?? base.couleurId,
    entete: { ...base.entete, ...z.entete },
    document: { ...base.document, ...z.document },
    client: { ...base.client, ...z.client },
    tracabilite: { ...base.tracabilite, ...z.tracabilite },
    articles: {
      afficherLigneTotal:
        z.articles?.afficherLigneTotal ?? base.articles.afficherLigneTotal,
      colonnes:
        z.articles?.colonnes && z.articles.colonnes.length
          ? z.articles.colonnes
          : base.articles.colonnes,
    },
    totaux: { ...base.totaux, ...z.totaux },
    reglement: { ...base.reglement, ...z.reglement },
    montantEnLettres: { ...base.montantEnLettres, ...z.montantEnLettres },
    signataire: { ...base.signataire, ...z.signataire },
  };
}

const UNITES = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const DIZAINES = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

function centaineEnLettres(n: number): string {
  let out = "";
  const cent = Math.floor(n / 100);
  const reste = n % 100;
  if (cent > 0) {
    out += cent > 1 ? `${UNITES[cent]} cent` : "cent";
    if (cent > 1 && reste === 0) out += "s";
    if (reste > 0) out += " ";
  }
  if (reste > 0) {
    if (reste < 20) {
      out += UNITES[reste];
    } else {
      const d = Math.floor(reste / 10);
      const u = reste % 10;
      if (d === 7 || d === 9) {
        out += DIZAINES[d];
        const r2 = 10 + u;
        out += (d === 7 ? "-" : "-") + UNITES[r2];
      } else {
        out += DIZAINES[d];
        if (u === 1 && d !== 8) out += " et un";
        else if (u > 0) out += `-${UNITES[u]}`;
        else if (d === 8) out += "s";
      }
    }
  }
  return out.trim();
}

/** Convertit un entier (Ariary) en toutes lettres françaises. */
export function montantEnLettres(montant: number, devise = "ariary"): string {
  const n = Math.round(Math.abs(montant));
  if (n === 0) return `zéro ${devise}`;

  const tranches: number[] = [];
  let reste = n;
  while (reste > 0) {
    tranches.push(reste % 1000);
    reste = Math.floor(reste / 1000);
  }

  const echelles = ["", "mille", "million", "milliard"];
  const parts: string[] = [];
  for (let i = tranches.length - 1; i >= 0; i--) {
    const t = tranches[i];
    if (t === 0) continue;
    if (i === 1) {
      // mille : « un mille » → « mille »
      parts.push(t === 1 ? "mille" : `${centaineEnLettres(t)} mille`);
    } else if (i >= 2) {
      const mot = echelles[i];
      const suffixe = t > 1 ? "s" : "";
      parts.push(`${centaineEnLettres(t)} ${mot}${suffixe}`);
    } else {
      parts.push(centaineEnLettres(t));
    }
  }

  const lettres = parts.join(" ").replace(/\s+/g, " ").trim();
  return `${lettres} ${devise}`;
}
