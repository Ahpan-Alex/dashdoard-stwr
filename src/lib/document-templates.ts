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

export type ModeleDocument = {
  id: string;
  nom: string;
  type: TypeDocumentCommercial;
  rubriques: DocumentRubriqueId[];
  mentionsLegales: string;
  piedDePage: string;
  actif: boolean;
};

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
    label: "Signature / cachet",
    description: "Zone de signature",
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
  }));
}

export function hasRubrique(
  modele: ModeleDocument | undefined,
  id: DocumentRubriqueId,
) {
  if (!modele) return true;
  return modele.rubriques.includes(id);
}
