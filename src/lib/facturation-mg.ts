import type {
  Acompte,
  Client,
  Facture,
  FactureStatut,
  JournalAudit,
  Parametres,
  PointDeVente,
} from "./types";
import { etatPaiementFacture, resteAPayer } from "./commercial";

/** Code établissement pour la série de numérotation (max 5 car.). */
export function codeEtablissement(
  pointDeVenteId: string,
  pointsDeVente: PointDeVente[],
) {
  const pdv = pointsDeVente.find((p) => p.id === pointDeVenteId);
  const base = (pdv?.nom ?? pointDeVenteId)
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
  return (base || "GEN").padEnd(3, "X");
}

/**
 * Numérotation chronologique continue par année et établissement :
 * FAC-2026-MARCHE-000001 · PRO-… · AVO-…
 */
export function nextNumeroDocumentCommercial(opts: {
  prefix: "FAC" | "PRO" | "AVO" | "FACACO";
  pointDeVenteId: string;
  pointsDeVente: PointDeVente[];
  existing: string[];
  date?: Date;
}) {
  const year = (opts.date ?? new Date()).getFullYear();
  const etab = codeEtablissement(opts.pointDeVenteId, opts.pointsDeVente);
  const re = new RegExp(`^${opts.prefix}-${year}-${etab}-(\\d+)$`);
  let max = 0;
  for (const n of opts.existing) {
    const m = n.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  // Continuité aussi avec anciens formats PREFIX-YEAR-NNNN
  const reLegacy = new RegExp(`^${opts.prefix}-${year}-(\\d+)$`);
  for (const n of opts.existing) {
    const m = n.match(reLegacy);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${opts.prefix}-${year}-${etab}-${String(max + 1).padStart(6, "0")}`;
}

export const FACTURE_STATUTS_MG: Record<string, string> = {
  brouillon: "Brouillon",
  proforma: "Proforma",
  validee: "Validée",
  envoyee: "Envoyée",
  partiellement_payee: "Partiellement payée",
  payee: "Payée",
  en_retard: "En retard",
  annulee: "Annulée",
  emise: "Émise (ancien)",
};

export function mentionRegimeFiscal(parametres: Parametres) {
  if (
    parametres.regimeFiscal === "ei" ||
    parametres.regimeFiscal === "ir" ||
    parametres.regimeFiscal === "franchise" ||
    !parametres.assujettiTVA
  ) {
    if (parametres.regimeFiscal === "ei") {
      return "Régime EI — non assujetti à la TVA.";
    }
    if (parametres.regimeFiscal === "ir") {
      return "Régime IR — non assujetti à la TVA.";
    }
    return "Non assujetti à la TVA — document sans TVA collectée.";
  }
  if (parametres.regimeFiscal === "imp") {
    return `Régime IMP — TVA ${parametres.tauxTVA} % applicable selon opération.`;
  }
  return `Assujetti à la TVA — taux standard ${parametres.tauxTVA} %.`;
}

/** Mentions obligatoires manquantes avant validation fiscale. */
export function checklistValidationFacture(opts: {
  parametres: Parametres;
  client: Client | undefined;
  lignesProduits: number;
  date: string;
  echeance: string;
}): string[] {
  const errs: string[] = [];
  const { parametres, client } = opts;
  if (!parametres.nomEntreprise?.trim()) errs.push("Raison sociale vendeur");
  if (!parametres.nif?.trim()) errs.push("NIF vendeur");
  if (!parametres.stat?.trim()) errs.push("STAT vendeur");
  if (!parametres.adresse?.trim()) errs.push("Adresse vendeur");
  if (!client?.nom?.trim()) errs.push("Identité client");
  if (!client?.adresse?.trim() && !client?.ville?.trim()) {
    errs.push("Adresse client");
  }
  if (opts.lignesProduits <= 0) errs.push("Au moins une ligne produit");
  if (!opts.date) errs.push("Date d'émission");
  if (!opts.echeance) errs.push("Date d'échéance de règlement");
  return errs;
}

/**
 * Statut affiché (paiement + retard), sans écraser brouillon / proforma / annulée.
 */
export function statutEffectifFacture(
  facture: Facture,
  parametres: Parametres,
  acomptes: Acompte[],
  toutesFactures: Facture[],
): FactureStatut {
  let statut = facture.statut === "emise" ? ("validee" as const) : facture.statut;
  if (
    statut === "brouillon" ||
    statut === "proforma" ||
    statut === "annulee" ||
    facture.type === "proforma"
  ) {
    return statut;
  }

  const etat = etatPaiementFacture(
    facture,
    parametres,
    acomptes,
    toutesFactures,
  );
  if (etat === "annulee") return "annulee";
  if (etat === "payee") return "payee";

  const reste = resteAPayer(facture, parametres, acomptes, toutesFactures);
  const echeance = new Date(facture.echeance);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  echeance.setHours(12, 0, 0, 0);

  if (reste > 0 && echeance.getTime() < today.getTime()) {
    return "en_retard";
  }
  if (etat === "partiellement_payee") return "partiellement_payee";
  if (statut === "envoyee") return "envoyee";
  return "validee";
}

export function creerEntreeJournal(opts: {
  action: JournalAudit["action"];
  entiteId: string;
  numero?: string;
  detail?: string;
}): Omit<JournalAudit, "id"> {
  return {
    date: new Date().toISOString(),
    action: opts.action,
    entite: "facture",
    entiteId: opts.entiteId,
    numero: opts.numero,
    detail: opts.detail,
  };
}

export function factureEstFiscale(f: Facture) {
  return (
    f.type !== "proforma" &&
    f.statut !== "brouillon" &&
    f.statut !== "proforma"
  );
}
