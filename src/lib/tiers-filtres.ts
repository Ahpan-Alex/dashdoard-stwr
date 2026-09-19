import { parseISO } from "date-fns";
import { soldeAchat } from "./achats";
import { adressePrincipaleEffective } from "./adresse-tiers";
import { resteAPayer } from "./commercial";
import {
  balanceAgeeClient,
  balanceAgeeFournisseur,
  estClient,
  estFournisseur,
  soldeClientTiers,
  tauxUtilisationPlafond,
  avertissementPlafond,
} from "./tiers";
import type {
  Achat,
  Acompte,
  Facture,
  JournalActivite,
  Parametres,
  Tiers,
} from "./types";

export type FiltreRoleTiers = "tous" | "client" | "fournisseur" | "les_deux";
export type FiltreStatutSolde = "tous" | "paye" | "impaye" | "en_retard";
export type FiltreTrancheAgee = "tous" | "0-30" | "31-60" | "61-90" | "90+";
export type FiltreOuiNon = "tous" | "oui" | "non";
export type FiltreActif = "tous" | "actif" | "inactif";

export type FiltresListeTiers = {
  role: FiltreRoleTiers;
  nom: string;
  immatriculation: string;
  statutSolde: FiltreStatutSolde;
  trancheAgee: FiltreTrancheAgee;
  depassePlafond: FiltreOuiNon;
  prochePlafond: FiltreOuiNon;
  siteId: string;
  ville: string;
  region: string;
  actif: FiltreActif;
  dateCreationDebut: string;
  dateCreationFin: string;
};

export const FILTRES_LISTE_TIERS_VIDE: FiltresListeTiers = {
  role: "tous",
  nom: "",
  immatriculation: "",
  statutSolde: "tous",
  trancheAgee: "tous",
  depassePlafond: "tous",
  prochePlafond: "tous",
  siteId: "",
  ville: "",
  region: "",
  actif: "tous",
  dateCreationDebut: "",
  dateCreationFin: "",
};

export type CtxFiltresTiers = {
  factures: Facture[];
  acomptes: Acompte[];
  achats: Achat[];
  parametres: Parametres;
  journalActivites?: JournalActivite[];
  seuilPlafondPercent?: number;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function contient(haystack: string | undefined, needle: string) {
  if (!needle) return true;
  return norm(haystack ?? "").includes(needle);
}

function factureEnRetard(f: Facture, reste: number, au: Date) {
  if (reste <= 0 || !f.echeance) return false;
  try {
    return parseISO(f.echeance) < au;
  } catch {
    return false;
  }
}

function achatEnRetard(a: Achat, reste: number, au: Date) {
  if (reste <= 0 || !a.echeance) return false;
  try {
    return parseISO(a.echeance) < au;
  } catch {
    return false;
  }
}

export function statutSoldeTiers(
  t: Tiers,
  ctx: CtxFiltresTiers,
  au = new Date(),
): { paye: boolean; impaye: boolean; enRetard: boolean } {
  let impaye = false;
  let enRetard = false;

  if (estClient(t)) {
    const solde = soldeClientTiers(t.id, ctx).solde;
    if (solde > 1) impaye = true;
    for (const f of ctx.factures) {
      if (f.clientId !== t.id) continue;
      const reste = resteAPayer(f, ctx.parametres, ctx.acomptes, ctx.factures);
      if (reste > 0 && factureEnRetard(f, reste, au)) {
        enRetard = true;
        break;
      }
    }
  }

  if (estFournisseur(t)) {
    for (const a of ctx.achats) {
      if (a.fournisseurId !== t.id || a.statut !== "valide") continue;
      const reste = soldeAchat(a);
      if (reste > 1) impaye = true;
      if (reste > 0 && achatEnRetard(a, reste, au)) enRetard = true;
    }
  }

  return { paye: !impaye && !enRetard, impaye, enRetard };
}

function trancheChevauche(
  minJours: number,
  maxJours: number | null,
  filtre: Exclude<FiltreTrancheAgee, "tous">,
): boolean {
  const [a, b] =
    filtre === "0-30"
      ? [0, 30]
      : filtre === "31-60"
        ? [31, 60]
        : filtre === "61-90"
          ? [61, 90]
          : [91, Number.POSITIVE_INFINITY];
  const tMax = maxJours ?? Number.POSITIVE_INFINITY;
  return minJours <= b && tMax >= a;
}

function aTrancheAgee(
  t: Tiers,
  ctx: CtxFiltresTiers,
  filtre: Exclude<FiltreTrancheAgee, "tous">,
): boolean {
  const buckets = [
    ...(estClient(t) ? balanceAgeeClient(t.id, ctx) : []),
    ...(estFournisseur(t) ? balanceAgeeFournisseur(t.id, ctx.achats, ctx.parametres) : []),
  ];
  return buckets.some(
    (b) => b.montant > 0 && trancheChevauche(b.minJours, b.maxJours, filtre),
  );
}

function depassePlafondTiers(t: Tiers, ctx: CtxFiltresTiers): boolean {
  if (!estClient(t)) return false;
  const plafond = Math.max(0, t.plafondCredit ?? 0);
  if (plafond <= 0) return false;
  return soldeClientTiers(t.id, ctx).solde > plafond;
}

function jourLocal(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  try {
    const d = parseISO(iso.trim());
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

/** Date de création de la fiche : champ dédié, sinon journal. */
export function dateCreationEffectiveTiers(
  t: Tiers,
  journal?: JournalActivite[],
): string | null {
  const directe = jourLocal(t.dateCreation);
  if (directe) return directe;
  if (!journal?.length) return null;
  let plusAncienne: string | null = null;
  for (const j of journal) {
    if (j.entiteId !== t.id || j.action !== "creation") continue;
    if (j.entite !== "tiers" && j.entite !== "client" && j.entite !== "fournisseur") {
      continue;
    }
    const jour = jourLocal(j.date);
    if (jour && (!plusAncienne || jour < plusAncienne)) plusAncienne = jour;
  }
  return plusAncienne;
}

function dansPlageCreation(
  jour: string | null,
  debut: string,
  fin: string,
): boolean {
  if (!debut && !fin) return true;
  if (!jour) return false;
  if (debut && jour < debut) return false;
  if (fin && jour > fin) return false;
  return true;
}

export function filtrerListeTiers(
  liste: Tiers[],
  filtres: FiltresListeTiers,
  ctx: CtxFiltresTiers,
): Tiers[] {
  const nom = norm(filtres.nom);
  const immat = norm(filtres.immatriculation);
  const ville = norm(filtres.ville);
  const region = norm(filtres.region);

  return liste.filter((t) => {
    if (filtres.role === "client" && !estClient(t)) return false;
    if (filtres.role === "fournisseur" && !estFournisseur(t)) return false;
    if (filtres.role === "les_deux" && !(estClient(t) && estFournisseur(t))) {
      return false;
    }

    if (nom && !contient(t.nom, nom) && !contient(t.nomCommercial, nom)) {
      return false;
    }

    if (
      immat &&
      !contient(t.nif, immat) &&
      !contient(t.stat, immat) &&
      !contient(t.rcs, immat)
    ) {
      return false;
    }

    if (filtres.actif === "actif" && !t.actif) return false;
    if (filtres.actif === "inactif" && t.actif) return false;

    if (filtres.siteId && t.siteRattachementId !== filtres.siteId) return false;

    const adr = adressePrincipaleEffective(t);
    if (ville && !contient(adr.ville, ville) && !contient(t.ville, ville)) {
      return false;
    }
    if (region && !contient(adr.region, region)) return false;

    if (filtres.statutSolde !== "tous") {
      const s = statutSoldeTiers(t, ctx);
      if (filtres.statutSolde === "paye" && !s.paye) return false;
      if (filtres.statutSolde === "impaye" && !s.impaye) return false;
      if (filtres.statutSolde === "en_retard" && !s.enRetard) return false;
    }

    if (filtres.trancheAgee !== "tous" && !aTrancheAgee(t, ctx, filtres.trancheAgee)) {
      return false;
    }

    if (filtres.depassePlafond !== "tous") {
      const depasse = depassePlafondTiers(t, ctx);
      if (filtres.depassePlafond === "oui" && !depasse) return false;
      if (filtres.depassePlafond === "non" && depasse) return false;
    }

    if (filtres.prochePlafond !== "tous" && estClient(t)) {
      const { usagePercent, depasse } = tauxUtilisationPlafond(t, ctx);
      const niv = avertissementPlafond(
        usagePercent,
        ctx.seuilPlafondPercent ?? 80,
        depasse,
      );
      const proche = niv === "avertissement";
      if (filtres.prochePlafond === "oui" && !proche) return false;
      if (filtres.prochePlafond === "non" && proche) return false;
    }

    if (
      !dansPlageCreation(
        dateCreationEffectiveTiers(t, ctx.journalActivites),
        filtres.dateCreationDebut.trim(),
        filtres.dateCreationFin.trim(),
      )
    ) {
      return false;
    }

    return true;
  });
}
