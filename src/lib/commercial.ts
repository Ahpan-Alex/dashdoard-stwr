import type {
  Acompte,
  AcompteDocumentLigne,
  BonDeLivraison,
  Charge,
  Client,
  Commande,
  Devis,
  EntreeStock,
  Facture,
  FactureStatut,
  Immobilisation,
  LigneDocument,
  Parametres,
  RapportFinJournee,
  RegimeFiscal,
  TarifClient,
  TypeLigneDocument,
  Vente,
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

export function totauxDevis(
  devis: Devis,
  parametres: Parametres,
  acomptes: Acompte[] = [],
) {
  const acomptesTTC = acomptesPourDocument(acomptes, {
    devisId: devis.id,
  }).reduce((s, a) => s + a.montantTTC, 0);
  return calculerTotaux(
    devis.lignes,
    devis.tauxTVA ?? parametres.tauxTVA,
    acomptesTTC,
    appliqueTVA(parametres),
    devis.remiseGlobale ?? 0,
  );
}

export function totauxCommande(
  commande: Commande,
  parametres: Parametres,
  acomptes: Acompte[] = [],
) {
  const acomptesTTC = acomptesPourDocument(acomptes, {
    commandeId: commande.id,
    devisId: commande.devisId,
  }).reduce((s, a) => s + a.montantTTC, 0);
  return calculerTotaux(
    commande.lignes,
    commande.tauxTVA ?? parametres.tauxTVA,
    acomptesTTC,
    appliqueTVA(parametres),
    commande.remiseGlobale ?? 0,
  );
}

export function totauxBonDeLivraison(
  bl: BonDeLivraison,
  parametres: Parametres,
  acomptes: Acompte[] = [],
) {
  const acomptesTTC = acomptesPourDocument(acomptes, {
    commandeId: bl.commandeId,
    devisId: bl.devisId,
  }).reduce((s, a) => s + a.montantTTC, 0);
  return calculerTotaux(
    bl.lignes,
    bl.tauxTVA ?? parametres.tauxTVA,
    acomptesTTC,
    appliqueTVA(parametres),
    bl.remiseGlobale ?? 0,
  );
}

export function totauxFacture(
  facture: Facture,
  parametres: Parametres,
  acomptes: Acompte[] = [],
) {
  const assujetti = appliqueTVA(parametres);

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

export function lignesAcomptesPourDocument(
  acomptes: Acompte[],
  opts: { devisId?: string; commandeId?: string; factureId?: string },
): AcompteDocumentLigne[] {
  return acomptesPourDocument(acomptes, opts).map((a) => ({
    numero: a.numero,
    date: a.date,
    montant: a.montantTTC,
    mode: a.modePaiement,
  }));
}

export function creancesDunClient(
  clientId: string,
  factures: Facture[],
  parametres?: Parametres,
  acomptes: Acompte[] = [],
) {
  return facturesActives(factures)
    .filter((f) => f.clientId === clientId)
    .reduce(
      (s, f) => s + resteAPayer(f, parametres, acomptes, factures),
      0,
    );
}

export function totalAcomptesClient(clientId: string, acomptes: Acompte[]) {
  return acomptes
    .filter((a) => a.clientId === clientId && a.statut !== "annule")
    .reduce((s, a) => s + a.montantTTC, 0);
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

/** Préfixe des codes clients générés automatiquement. */
export const CODE_CLIENT_PREFIX = "CLI";

/** Normalise un code client (majuscules, tirets, sans caractères parasites). */
export function normalizeCodeClient(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}

/** Un code client est valide s'il fait 2 à 32 caractères alphanumériques / tirets. */
export function isCodeClientValide(code: string) {
  const c = normalizeCodeClient(code);
  return c.length >= 2 && c.length <= 32;
}

/** Indique si un code est déjà attribué à un autre client. */
export function codeClientDejaUtilise(
  code: string,
  clients: Pick<Client, "id" | "code">[],
  exceptId?: string,
) {
  const n = normalizeCodeClient(code);
  if (!n) return false;
  return clients.some(
    (c) => c.id !== exceptId && c.code && normalizeCodeClient(c.code) === n,
  );
}

/** Prochain code séquentiel disponible (ex. CLI-0001, CLI-0002…). */
export function nextCodeClient(
  clients: Pick<Client, "code">[],
  prefix = CODE_CLIENT_PREFIX,
) {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const c of clients) {
    if (!c.code) continue;
    const m = normalizeCodeClient(c.code).match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Attribue un code unique aux clients qui n'en ont pas encore.
 * Retourne le tableau d'origine si aucun changement n'est nécessaire.
 */
export function ensureCodesClients(clients: Client[]): Client[] {
  const used = new Set(
    clients
      .filter((c) => c.code && c.code.trim())
      .map((c) => normalizeCodeClient(c.code as string)),
  );
  let compteur = 0;
  const genererCode = () => {
    let code: string;
    do {
      compteur += 1;
      code = `${CODE_CLIENT_PREFIX}-${String(compteur).padStart(4, "0")}`;
    } while (used.has(code));
    used.add(code);
    return code;
  };
  let changed = false;
  const out = clients.map((c) => {
    if (c.code && c.code.trim()) return c;
    changed = true;
    return { ...c, code: genererCode() };
  });
  return changed ? out : clients;
}

/** Libellé d'un client avec son code (ex. « CLI-0001 — Restaurant Le Récif »). */
export function libelleClient(c: Pick<Client, "code" | "nom">) {
  return c.code ? `${c.code} — ${c.nom}` : c.nom;
}

export function motifLienClient(
  clientId: string,
  ctx: {
    factures: Facture[];
    devis: Devis[];
    commandes: Commande[];
    bonsDeLivraison: BonDeLivraison[];
    acomptes: Acompte[];
    tarifsClients: Pick<TarifClient, "clientId">[];
  },
): string | null {
  if (ctx.factures.some((f) => f.clientId === clientId)) {
    return "Ce client est lié à une facture ou une proforma. Suppression impossible.";
  }
  if (ctx.devis.some((d) => d.clientId === clientId)) {
    return "Ce client est lié à un devis. Suppression impossible.";
  }
  if (ctx.commandes.some((c) => c.clientId === clientId)) {
    return "Ce client est lié à une commande. Suppression impossible.";
  }
  if (ctx.bonsDeLivraison.some((b) => b.clientId === clientId)) {
    return "Ce client est lié à un bon de livraison. Suppression impossible.";
  }
  if (ctx.acomptes.some((a) => a.clientId === clientId)) {
    return "Ce client est lié à un acompte. Suppression impossible.";
  }
  if (ctx.tarifsClients.some((t) => t.clientId === clientId)) {
    return "Ce client a un tarif spécifique. Désactivez-le pour conserver l'historique.";
  }
  return null;
}

export function clientEstReference(
  clientId: string,
  ctx: Parameters<typeof motifLienClient>[1],
) {
  return motifLienClient(clientId, ctx) !== null;
}

export function fournisseurEstReference(
  fournisseurId: string,
  nom: string,
  entrees: EntreeStock[],
) {
  const n = nom.trim().toLowerCase();
  return entrees.some(
    (e) =>
      e.fournisseurId === fournisseurId ||
      (n.length > 0 && e.fournisseur.toLowerCase() === n),
  );
}

export function motifLienFournisseur(
  fournisseurId: string,
  nom: string,
  entrees: EntreeStock[],
) {
  if (fournisseurEstReference(fournisseurId, nom, entrees)) {
    return "Fournisseur déjà utilisé sur des entrées de stock. Désactivez-le pour préserver l'historique.";
  }
  return null;
}

export function motifLienPointDeVente(
  pdvId: string,
  ctx: {
    factures: Facture[];
    devis: Devis[];
    commandes: Commande[];
    bonsDeLivraison: BonDeLivraison[];
    entrees: EntreeStock[];
    ventes: Vente[];
    charges: Pick<Charge, "pointDeVenteId">[];
    immobilisations: Pick<Immobilisation, "pointDeVenteId">[];
    rapportsFinJournee: Pick<RapportFinJournee, "pointDeVenteId">[];
  },
): string | null {
  if (ctx.factures.some((f) => f.pointDeVenteId === pdvId)) {
    return "Ce point de vente est lié à une facture. Suppression impossible.";
  }
  if (ctx.devis.some((d) => d.pointDeVenteId === pdvId)) {
    return "Ce point de vente est lié à un devis. Suppression impossible.";
  }
  if (ctx.commandes.some((c) => c.pointDeVenteId === pdvId)) {
    return "Ce point de vente est lié à une commande. Suppression impossible.";
  }
  if (ctx.bonsDeLivraison.some((b) => b.pointDeVenteId === pdvId)) {
    return "Ce point de vente est lié à un bon de livraison. Suppression impossible.";
  }
  if (ctx.entrees.some((e) => e.pointDeVenteId === pdvId)) {
    return "Ce point de vente a des entrées de stock. Suppression impossible.";
  }
  if (ctx.ventes.some((v) => v.pointDeVenteId === pdvId)) {
    return "Ce point de vente a des ventes. Suppression impossible.";
  }
  if (ctx.charges.some((c) => c.pointDeVenteId === pdvId)) {
    return "Ce point de vente a des charges. Suppression impossible.";
  }
  if (ctx.immobilisations.some((i) => i.pointDeVenteId === pdvId)) {
    return "Ce point de vente a des immobilisations. Suppression impossible.";
  }
  if (ctx.rapportsFinJournee.some((r) => r.pointDeVenteId === pdvId)) {
    return "Ce point de vente a des rapports de clôture. Suppression impossible.";
  }
  return null;
}

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

export const ACOMPTE_STATUTS: Record<string, string> = {
  enregistre: "Enregistré",
  impute: "Imputé",
  annule: "Annulé",
};

export type CouleurStatutDoc =
  | "sand"
  | "sea"
  | "success"
  | "coral"
  | "danger"
  | "warning";

/** Couleur de pastille selon le statut d'un document commercial. */
export function couleurStatutDocument(statut: string): CouleurStatutDoc {
  switch (statut) {
    case "brouillon":
    case "enregistre":
      return "sand";
    case "envoye":
    case "proforma":
    case "en_cours":
    case "prepare":
    case "expedie":
    case "partiellement_payee":
    case "emise":
      return "warning";
    case "accepte":
    case "confirmee":
    case "livree":
    case "livre":
    case "validee":
    case "envoyee":
    case "payee":
    case "impute":
      return "success";
    case "refuse":
    case "expire":
    case "annulee":
    case "annule":
    case "en_retard":
      return "danger";
    default:
      return "sea";
  }
}

export function compterDocumentsParStatut(
  docs: { statut: string }[],
): { statut: string; count: number }[] {
  const map = new Map<string, number>();
  for (const d of docs) {
    const key = d.statut || "inconnu";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([statut, count]) => ({ statut, count }))
    .sort((a, b) => b.count - a.count);
}

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
  ei: "EI — Entrepreneur individuel (sans TVA)",
  ir: "IR — Impôt sur les revenus (sans TVA)",
  franchise: "Franchise de TVA / non assujetti",
  imp: "IMP (marchés publics)",
};

/** TVA collectée uniquement en régime « Assujetti TVA ». */
export function appliqueTVA(parametres: Pick<Parametres, "assujettiTVA" | "regimeFiscal">) {
  return parametres.assujettiTVA && parametres.regimeFiscal === "tva";
}

/** Régimes sans TVA (EI, IR, franchise…). */
export function regimeSansTVA(regime: RegimeFiscal) {
  return regime === "ei" || regime === "ir" || regime === "franchise";
}

/**
 * Une facture fiscale validée (ou un avoir) alimente CA + stock.
 * Exclus : brouillon, proforma, acompte, annulée.
 */
export function factureImpacteExploitation(f: Pick<Facture, "type" | "statut">) {
  if (f.type === "acompte" || f.type === "proforma") return false;
  if (
    f.statut === "brouillon" ||
    f.statut === "proforma" ||
    f.statut === "annulee"
  ) {
    return false;
  }
  return true;
}

/** Convertit les lignes produits d'une facture en mouvements de vente. */
export function ventesDepuisFacture(
  facture: Facture,
): Omit<Vente, "id">[] {
  if (!factureImpacteExploitation(facture)) return [];
  const signe = facture.type === "avoir" ? -1 : 1;
  return facture.lignes
    .filter((l) => isLigneProduit(l) && l.produitId && l.quantite)
    .map((l) => ({
      pointDeVenteId: facture.pointDeVenteId,
      produitId: l.produitId!,
      quantite: signe * Math.abs(l.quantite),
      prixUnitaire: l.prixUnitaire,
      date: facture.date,
      clientId: facture.clientId,
      factureId: facture.id,
    }));
}

/** Reconstruit toutes les ventes dérivées des factures (source de vérité). */
export function rebuildVentesDepuisFactures(factures: Facture[]): Vente[] {
  const out: Vente[] = [];
  for (const f of factures) {
    ventesDepuisFacture(f).forEach((v, i) => {
      out.push({
        ...v,
        id: `v-${f.id}-${v.produitId}-${i}`,
      });
    });
  }
  return out;
}
