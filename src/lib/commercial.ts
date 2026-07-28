import type {
  Acompte,
  AcompteDocumentLigne,
  BonDeLivraison,
  Commande,
  Devis,
  Facture,
  FactureStatut,
  LigneDocument,
  Parametres,
  TypeLigneDocument,
} from "./types";

export type TotauxDocument = {
  /** Somme des lignes produits avant remises */
  brutHT: number;
  /** Remises lignes + remise globale */
  totalRemise: number;
  totalHT: number;
  tauxTVA: number;
  montantTVA: number;
  totalTTC: number;
  acomptesTTC: number;
  netAPayer: number;
};

export function isLigneProduit(l: Pick<LigneDocument, "type"> | { type?: TypeLigneDocument }) {
  return (l.type ?? "produit") === "produit";
}

export function montantLigneBrutHT(l: LigneDocument) {
  if (!isLigneProduit(l)) return 0;
  return l.quantite * l.prixUnitaire;
}

export function montantRemiseLigne(l: LigneDocument) {
  if (!isLigneProduit(l)) return 0;
  const brut = montantLigneBrutHT(l);
  const pct = l.remisePercent ?? 0;
  if (pct <= 0) return 0;
  return Math.round(brut * (pct / 100));
}

export function montantLigneHT(l: LigneDocument) {
  return montantLigneBrutHT(l) - montantRemiseLigne(l);
}

/**
 * Numérote les sous-totaux (Sous-total 1, 2…) et calcule chaque segment :
 * le sous-total N ne cumule que les lignes produits depuis le sous-total N-1
 * (le montant du sous-total précédent n’est pas repris).
 */
export function recalculerSousTotaux<T extends Omit<LigneDocument, "id"> & { id?: string }>(
  lignes: T[],
): T[] {
  let segment = 0;
  let index = 0;
  return lignes.map((l) => {
    if (isLigneProduit(l)) {
      segment += montantLigneHT({ ...l, id: l.id ?? "tmp" });
      return l;
    }
    if (l.type === "sous_total") {
      index += 1;
      const montant = segment;
      segment = 0;
      return {
        ...l,
        designation: `Sous-total ${index}`,
        prixUnitaire: montant,
      };
    }
    return l;
  });
}

export function totalLignesHT(lignes: LigneDocument[]) {
  return lignes.reduce((s, l) => s + montantLigneHT(l), 0);
}

export function totalRemisesLignes(lignes: LigneDocument[]) {
  return lignes.reduce((s, l) => s + montantRemiseLigne(l), 0);
}

export function calculerTotaux(
  lignes: LigneDocument[],
  tauxTVA: number,
  acomptesTTC = 0,
  assujettiTVA = true,
  remiseGlobale = 0,
): TotauxDocument {
  const brutHT = lignes.reduce((s, l) => s + montantLigneBrutHT(l), 0);
  const remisesLignes = totalRemisesLignes(lignes);
  const remiseG = Math.max(0, remiseGlobale);
  const totalRemise = remisesLignes + remiseG;
  const totalHT = Math.max(0, brutHT - totalRemise);
  const taux = assujettiTVA ? tauxTVA : 0;
  const montantTVA = Math.round(totalHT * (taux / 100));
  const totalTTC = totalHT + montantTVA;
  const acomptes = Math.min(acomptesTTC, totalTTC);
  return {
    brutHT,
    totalRemise,
    totalHT,
    tauxTVA: taux,
    montantTVA,
    totalTTC,
    acomptesTTC: acomptes,
    netAPayer: Math.max(0, totalTTC - acomptes),
  };
}

export function totauxDevis(devis: Devis, parametres: Parametres) {
  return calculerTotaux(
    devis.lignes,
    devis.tauxTVA ?? parametres.tauxTVA,
    0,
    parametres.assujettiTVA && parametres.regimeFiscal === "tva",
    devis.remiseGlobale ?? 0,
  );
}

export function totauxCommande(
  commande: Commande,
  parametres: Parametres,
  acomptes: Acompte[] = [],
) {
  const acomptesTTC = acomptes
    .filter(
      (a) =>
        a.commandeId === commande.id &&
        a.statut !== "annule",
    )
    .reduce((s, a) => s + a.montantTTC, 0);
  return calculerTotaux(
    commande.lignes,
    commande.tauxTVA ?? parametres.tauxTVA,
    acomptesTTC,
    parametres.assujettiTVA && parametres.regimeFiscal === "tva",
    commande.remiseGlobale ?? 0,
  );
}

export function totauxBonDeLivraison(
  bl: BonDeLivraison,
  parametres: Parametres,
  acomptes: Acompte[] = [],
) {
  const acomptesTTC = acomptes
    .filter(
      (a) =>
        a.statut !== "annule" &&
        ((bl.commandeId && a.commandeId === bl.commandeId) ||
          (bl.devisId && a.devisId === bl.devisId)),
    )
    .reduce((s, a) => s + a.montantTTC, 0);
  return calculerTotaux(
    bl.lignes,
    bl.tauxTVA ?? parametres.tauxTVA,
    acomptesTTC,
    parametres.assujettiTVA && parametres.regimeFiscal === "tva",
    bl.remiseGlobale ?? 0,
  );
}

export function totauxFacture(
  facture: Facture,
  parametres: Parametres,
  acomptes: Acompte[] = [],
) {
  const assujetti =
    parametres.assujettiTVA && parametres.regimeFiscal === "tva";

  // Facture d'acompte : document de l'opération d'acompte (montant = lignes).
  // Le règlement ultérieur ne modifie pas le net imprimé.
  if (facture.type === "acompte") {
    const t = calculerTotaux(
      facture.lignes,
      facture.tauxTVA ?? parametres.tauxTVA,
      0,
      assujetti,
      facture.remiseGlobale ?? 0,
    );
    return {
      ...t,
      acomptesTTC: 0,
      netAPayer: t.totalTTC,
    };
  }

  // Avoir : crédit client (pas d'acomptes à déduire sur le document lui-même)
  if (facture.type === "avoir") {
    const t = calculerTotaux(
      facture.lignes,
      facture.tauxTVA ?? parametres.tauxTVA,
      0,
      assujetti,
      facture.remiseGlobale ?? 0,
    );
    return {
      ...t,
      acomptesTTC: 0,
      netAPayer: 0,
    };
  }

  // Document commercial figé : acomptes mentionnés à l'émission uniquement.
  const acomptesDocumentTTC = acomptesDocumentSurFacture(facture, acomptes);

  return calculerTotaux(
    facture.lignes,
    facture.tauxTVA ?? parametres.tauxTVA,
    acomptesDocumentTTC,
    assujetti,
    facture.remiseGlobale ?? 0,
  );
}

/**
 * Acomptes figés sur la facture (snapshot à l'émission).
 * Fallback legacy : acomptes liés en base si aucun snapshot.
 */
export function detailAcomptesDocument(
  facture: Facture,
  acomptes: Acompte[] = [],
): AcompteDocumentLigne[] {
  // Snapshot figé à l'émission (y compris tableau vide = aucun acompte mentionné)
  if (facture.acomptesDocument !== undefined) {
    return facture.acomptesDocument;
  }
  // Legacy : reconstituer depuis les acomptes liés (documents anciens)
  return acomptes
    .filter(
      (a) =>
        a.statut !== "annule" &&
        (a.factureId === facture.id ||
          (facture.commandeId && a.commandeId === facture.commandeId) ||
          (facture.devisId && a.devisId === facture.devisId)),
    )
    .map((a) => ({
      numero: a.numero,
      date: a.date,
      montant: a.montantTTC,
      mode: a.modePaiement,
    }));
}

export function acomptesDocumentSurFacture(
  facture: Facture,
  acomptes: Acompte[] = [],
) {
  return detailAcomptesDocument(facture, acomptes).reduce(
    (s, a) => s + a.montant,
    0,
  );
}

/** Construit le snapshot d'acomptes à figer à l'émission. */
export function creerSnapshotAcomptesDocument(
  lignes: AcompteDocumentLigne[],
): AcompteDocumentLigne[] {
  return lignes
    .filter((l) => l.montant > 0)
    .map((l) => ({
      numero: l.numero,
      date: l.date,
      montant: l.montant,
      mode: l.mode,
    }));
}

/** Somme TTC des avoirs actifs rattachés à une facture. */
export function totalAvoirsSurFacture(
  factureId: string,
  factures: Facture[],
  parametres: Parametres,
) {
  return factures
    .filter(
      (f) =>
        f.type === "avoir" &&
        f.factureParenteId === factureId &&
        f.statut !== "annulee",
    )
    .reduce((s, f) => s + totauxFacture(f, parametres).totalTTC, 0);
}

/** Compat : total TTC document */
export function totalLignes(lignes: LigneDocument[]) {
  return totalLignesHT(lignes);
}

export function totalDevis(devis: Devis, parametres?: Parametres) {
  if (!parametres) return totalLignesHT(devis.lignes);
  return totauxDevis(devis, parametres).totalTTC;
}

export function totalFacture(facture: Facture, parametres?: Parametres) {
  if (!parametres) return totalLignesHT(facture.lignes);
  const t = totauxFacture(facture, parametres).totalTTC;
  return facture.type === "avoir" ? -t : t;
}

export function resteAPayer(
  facture: Facture,
  parametres?: Parametres,
  acomptes: Acompte[] = [],
  toutesFactures: Facture[] = [],
) {
  if (facture.type === "avoir") return 0;
  if (facture.statut === "annulee") return 0;
  if (!parametres) {
    return Math.max(0, totalLignesHT(facture.lignes) - facture.montantPaye);
  }
  const t = totauxFacture(facture, parametres, acomptes);
  const avoirs = totalAvoirsSurFacture(facture.id, toutesFactures, parametres);
  const netTTC = Math.max(0, t.totalTTC - avoirs);
  const paye = Math.min(facture.montantPaye, netTTC);
  return Math.max(0, netTTC - paye);
}

export type EtatPaiementFacture =
  | "payee"
  | "partiellement_payee"
  | "impayee"
  | "annulee";

export const ETATS_PAIEMENT_FACTURE: Record<EtatPaiementFacture, string> = {
  payee: "Payée",
  partiellement_payee: "Partiellement payée",
  impayee: "Impayée",
  annulee: "Annulée",
};

/** État de paiement simplifié pour la liste des factures. */
export function etatPaiementFacture(
  facture: Facture,
  parametres: Parametres,
  acomptes: Acompte[] = [],
  toutesFactures: Facture[] = [],
): EtatPaiementFacture {
  if (facture.type === "avoir") return "payee";
  if (facture.statut === "annulee") return "annulee";
  const avoirs = totalAvoirsSurFacture(facture.id, toutesFactures, parametres);
  const t = totauxFacture(facture, parametres, acomptes);
  if (avoirs >= t.totalTTC - 1) return "annulee";
  const reste = resteAPayer(facture, parametres, acomptes, toutesFactures);
  const netTTC = Math.max(0, t.totalTTC - avoirs);
  const paye = Math.min(facture.montantPaye, netTTC);
  if (reste <= 0 && paye > 0) return "payee";
  if (facture.statut === "payee" && reste <= 0) return "payee";
  if (paye > 0 || facture.statut === "partiellement_payee") {
    return "partiellement_payee";
  }
  return "impayee";
}

/** Met à jour le statut de la facture d'origine après émission d'un avoir. */
export function statutApresAvoir(
  facture: Facture,
  parametres: Parametres,
  acomptes: Acompte[],
  toutesFactures: Facture[],
): FactureStatut {
  const etat = etatPaiementFacture(
    facture,
    parametres,
    acomptes,
    toutesFactures,
  );
  if (etat === "annulee") return "annulee";
  if (etat === "payee") return "payee";
  if (etat === "partiellement_payee") return "partiellement_payee";
  return facture.statut === "brouillon" ? "brouillon" : "validee";
}

export function facturesActives(factures: Facture[]) {
  return factures.filter(
    (f) =>
      f.statut !== "annulee" &&
      f.statut !== "brouillon" &&
      f.type !== "avoir",
  );
}

export function creancesClientsFactures(
  factures: Facture[],
  parametres?: Parametres,
  acomptes: Acompte[] = [],
) {
  return facturesActives(factures).reduce(
    (s, f) => s + resteAPayer(f, parametres, acomptes, factures),
    0,
  );
}

export function caFactures(
  factures: Facture[],
  pointDeVenteId: string | "tous",
  parametres?: Parametres,
) {
  return factures
    .filter((f) => f.statut !== "annulee" && f.statut !== "brouillon")
    .filter((f) => f.type !== "acompte")
    .filter(
      (f) =>
        pointDeVenteId === "tous" || f.pointDeVenteId === pointDeVenteId,
    )
    .reduce((s, f) => s + totalFacture(f, parametres), 0);
}

/** Montant HT max encore annulable (TTC net converti en HT). */
export function montantAvoirRestantTTC(
  facture: Facture,
  factures: Facture[],
  parametres: Parametres,
  acomptes: Acompte[] = [],
) {
  const t = totauxFacture(facture, parametres, acomptes);
  const avoirs = totalAvoirsSurFacture(facture.id, factures, parametres);
  return Math.max(0, t.totalTTC - avoirs);
}

export function htDepuisTTC(montantTTC: number, tauxTVA: number, assujetti: boolean) {
  if (!assujetti || tauxTVA <= 0) return Math.round(montantTTC);
  return Math.round(montantTTC / (1 + tauxTVA / 100));
}

export function acomptesPourDocument(
  acomptes: Acompte[],
  opts: { devisId?: string; commandeId?: string; factureId?: string },
) {
  return acomptes.filter(
    (a) =>
      a.statut !== "annule" &&
      ((opts.devisId && a.devisId === opts.devisId) ||
        (opts.commandeId && a.commandeId === opts.commandeId) ||
        (opts.factureId && a.factureId === opts.factureId)),
  );
}

export function nextNumero(prefix: string, existing: string[]) {
  const year = new Date().getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  for (const n of existing) {
    const m = n.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

/** Décompose un montant TTC en HT + TVA. */
export function splitTTC(montantTTC: number, tauxTVA: number, assujetti: boolean) {
  if (!assujetti || tauxTVA <= 0) {
    return { ht: montantTTC, tva: 0, ttc: montantTTC };
  }
  const ht = Math.round(montantTTC / (1 + tauxTVA / 100));
  const tva = montantTTC - ht;
  return { ht, tva, ttc: montantTTC };
}

export const CLIENT_TYPES: Record<string, string> = {
  particulier: "Particulier",
  restaurant: "Restaurant",
  hotel: "Hôtel",
  grossiste: "Grossiste",
  autre: "Autre",
};

export const DEVIS_STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};

export const COMMANDE_STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  confirmee: "Confirmée",
  en_cours: "En cours",
  livree: "Livrée",
  annulee: "Annulée",
};

export const BL_STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  prepare: "Préparé",
  expedie: "Expédié",
  livre: "Livré",
  annule: "Annulé",
};

export const FACTURE_STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  proforma: "Proforma",
  validee: "Validée",
  envoyee: "Envoyée",
  partiellement_payee: "Partiellement payée",
  payee: "Payée",
  en_retard: "En retard",
  annulee: "Annulée",
  emise: "Émise",
};

export const FACTURE_TYPES: Record<string, string> = {
  standard: "Facture",
  acompte: "Facture d'acompte",
  solde: "Facture de solde",
  avoir: "Facture d'avoir",
  proforma: "Proforma",
};

export const MODES_PAIEMENT: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  mobile_money: "Mobile Money",
  autre: "Autre",
};

export const IMMO_CATEGORIES: Record<string, string> = {
  materiel: "Matériel",
  materiel_froid: "Matériel froid",
  vehicule: "Véhicule",
  amenagement: "Aménagement",
  informatique: "Informatique",
  autre: "Autre",
};

export const REGIMES_FISCAUX: Record<string, string> = {
  tva: "Assujetti TVA",
  imp: "Régime IMP (marchés publics)",
  franchise: "Franchise / non assujetti",
};
