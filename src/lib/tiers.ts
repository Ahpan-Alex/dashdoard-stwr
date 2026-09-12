import { differenceInCalendarDays, parseISO } from "date-fns";
import { soldeAchat, totauxAchat, totauxAvoir } from "./achats";
import {
  ACOMPTE_STATUTS,
  BL_STATUTS,
  COMMANDE_STATUTS,
  DEVIS_STATUTS,
  FACTURE_STATUTS,
  creancesDunClient,
  etatPaiementFacture,
  resteAPayer,
  totalAvoirsSurFacture,
  totauxBonDeLivraison,
  totauxCommande,
  totauxDevis,
  totauxFacture,
} from "./commercial";
import type {
  Achat,
  Acompte,
  BonDeLivraison,
  Client,
  Commande,
  Devis,
  Facture,
  Fournisseur,
  Parametres,
  RoleTiers,
  Tiers,
} from "./types";

export const TRANCHES_BALANCE_AGEE_DEFAUT = [30, 60, 90];

export const ROLE_TIERS_LABELS: Record<RoleTiers, string> = {
  client: "Client",
  fournisseur: "Fournisseur",
};

export function normaliserTranchesBalanceAgee(raw?: number[] | null): number[] {
  const nums = (raw ?? [])
    .map((n) => Math.floor(Number(n)))
    .filter((n) => Number.isFinite(n) && n > 0);
  const unique = [...new Set(nums)].sort((a, b) => a - b);
  return unique.length > 0 ? unique.slice(0, 6) : [...TRANCHES_BALANCE_AGEE_DEFAUT];
}

export function labelsTranchesBalanceAgee(tranches: number[]): string[] {
  const t = normaliserTranchesBalanceAgee(tranches);
  const labels: string[] = [];
  let prev = 0;
  for (const borne of t) {
    labels.push(prev === 0 ? `0–${borne} j` : `${prev + 1}–${borne} j`);
    prev = borne;
  }
  labels.push(`Plus de ${t[t.length - 1]} j`);
  return labels;
}

export function rolesDuTiers(t: Pick<Tiers, "roles">): RoleTiers[] {
  const r = t.roles?.filter((x) => x === "client" || x === "fournisseur") ?? [];
  return r.length ? [...new Set(r)] : [];
}

export function libelleRolesTiers(t: Pick<Tiers, "roles">): string {
  const r = rolesDuTiers(t);
  if (r.includes("client") && r.includes("fournisseur")) {
    return "Client et fournisseur";
  }
  if (r.includes("fournisseur")) return "Fournisseur";
  if (r.includes("client")) return "Client";
  return "Sans rôle";
}

export function estClient(t: Pick<Tiers, "roles">) {
  return rolesDuTiers(t).includes("client");
}

export function estFournisseur(t: Pick<Tiers, "roles">) {
  return rolesDuTiers(t).includes("fournisseur");
}

export function clientDepuisTiers(t: Tiers): Client {
  return {
    id: t.id,
    code: t.code,
    nom: t.nom,
    telephone: t.telephone,
    email: t.email,
    adresse: t.adresse,
    ville: t.ville,
    nif: t.nif,
    stat: t.stat,
    type: t.type ?? "autre",
    actif: t.actif,
    contacts: t.contacts,
    delaiPaiementJours: t.delaiPaiementClientJours,
    remiseHabituellePercent: t.remiseHabituelleClientPercent,
    plafondCredit: t.plafondCredit,
  };
}

export function fournisseurDepuisTiers(t: Tiers): Fournisseur {
  return {
    id: t.id,
    nom: t.nom,
    telephone: t.telephone,
    email: t.email,
    adresse: t.adresse,
    ville: t.ville,
    specialite: t.specialite,
    nif: t.nif,
    stat: t.stat,
    actif: t.actif,
    delaiPaiementJours: t.delaiPaiementFournisseurJours,
    remiseHabituellePercent: t.remiseHabituelleFournisseurPercent,
  };
}

export function tiersDepuisClient(c: Client): Tiers {
  return {
    id: c.id,
    code: c.code,
    nom: c.nom,
    telephone: c.telephone,
    email: c.email,
    adresse: c.adresse,
    ville: c.ville,
    nif: c.nif,
    stat: c.stat,
    type: c.type,
    actif: c.actif,
    contacts: c.contacts,
    roles: ["client"],
    delaiPaiementClientJours: c.delaiPaiementJours,
    remiseHabituelleClientPercent: c.remiseHabituellePercent,
    plafondCredit: c.plafondCredit,
  };
}

export function tiersDepuisFournisseur(f: Fournisseur): Tiers {
  return {
    id: f.id,
    nom: f.nom,
    telephone: f.telephone,
    email: f.email,
    adresse: f.adresse,
    ville: f.ville,
    nif: f.nif,
    stat: f.stat,
    specialite: f.specialite,
    actif: f.actif,
    roles: ["fournisseur"],
    delaiPaiementFournisseurJours: f.delaiPaiementJours,
    remiseHabituelleFournisseurPercent: f.remiseHabituellePercent,
  };
}

function fusionnerTiers(base: Tiers, extra: Partial<Tiers>): Tiers {
  const roles = [...new Set([...rolesDuTiers(base), ...rolesDuTiers({ roles: extra.roles ?? [] })])];
  return {
    ...base,
    ...extra,
    roles,
    nom: extra.nom?.trim() || base.nom,
    contacts: extra.contacts ?? base.contacts,
  };
}

/** Reconstruit le carnet Tiers à partir des tableaux historiques + `tiers`. */
export function assurerTiers(state: {
  clients: Client[];
  fournisseurs: Fournisseur[];
  tiers?: Tiers[];
}): Tiers[] {
  const byId = new Map<string, Tiers>();
  for (const t of state.tiers ?? []) {
    if (!t?.id || !t.nom) continue;
    const roles = rolesDuTiers(t);
    byId.set(t.id, { ...t, roles: roles.length ? roles : ["client"] });
  }
  for (const c of state.clients) {
    const prev = byId.get(c.id);
    const fromC = tiersDepuisClient(c);
    byId.set(c.id, prev ? fusionnerTiers(fromC, prev) : fromC);
  }
  for (const f of state.fournisseurs) {
    const prev = byId.get(f.id);
    const fromF = tiersDepuisFournisseur(f);
    byId.set(f.id, prev ? fusionnerTiers(fromF, prev) : fromF);
  }
  return [...byId.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

export function projectionsDepuisTiers(tiers: Tiers[]): {
  clients: Client[];
  fournisseurs: Fournisseur[];
} {
  return {
    clients: tiers.filter(estClient).map(clientDepuisTiers),
    fournisseurs: tiers.filter(estFournisseur).map(fournisseurDepuisTiers),
  };
}

export function synchroniserApresTiers(tiers: Tiers[]): {
  clients: Client[];
  fournisseurs: Fournisseur[];
} {
  return projectionsDepuisTiers(tiers);
}

export function upsertTiersDansListe(liste: Tiers[], next: Tiers): Tiers[] {
  const i = liste.findIndex((t) => t.id === next.id);
  if (i < 0) return [next, ...liste];
  return liste.map((t) => (t.id === next.id ? next : t));
}

export function acomptesNonImputes(clientId: string, acomptes: Acompte[]) {
  return acomptes
    .filter(
      (a) =>
        a.clientId === clientId &&
        a.statut === "enregistre",
    )
    .reduce((s, a) => s + a.montantTTC, 0);
}

export function avoirsClientNonUtilises(
  clientId: string,
  factures: Facture[],
  parametres: Parametres,
  acomptes: Acompte[],
) {
  let credit = 0;
  for (const f of factures) {
    if (f.clientId !== clientId || f.type !== "avoir") continue;
    if (f.statut === "annulee" || f.statut === "brouillon") continue;
    const ttc = totauxFacture(f, parametres, acomptes).totalTTC;
    if (!f.factureParenteId) {
      credit += ttc;
      continue;
    }
    const parent = factures.find((x) => x.id === f.factureParenteId);
    if (!parent) {
      credit += ttc;
      continue;
    }
    const applique = totalAvoirsSurFacture(parent.id, factures, parametres);
    const netParent = totauxFacture(parent, parametres, acomptes).totalTTC;
    if (applique > netParent + 1) {
      credit += applique - netParent;
    }
  }
  return credit;
}

export type SoldeRoleTiers = {
  facturesOuvertes: number;
  avoirsDisponibles: number;
  acomptesDisponibles: number;
  /** Encours : positif = le tiers nous doit (client) ou nous lui devons (fournisseur). */
  solde: number;
};

export function soldeClientTiers(
  clientId: string,
  ctx: {
    factures: Facture[];
    acomptes: Acompte[];
    parametres: Parametres;
  },
): SoldeRoleTiers {
  const facturesOuvertes = creancesDunClient(
    clientId,
    ctx.factures,
    ctx.parametres,
    ctx.acomptes,
  );
  const avoirsDisponibles = avoirsClientNonUtilises(
    clientId,
    ctx.factures,
    ctx.parametres,
    ctx.acomptes,
  );
  const acomptesDisponibles = acomptesNonImputes(clientId, ctx.acomptes);
  return {
    facturesOuvertes,
    avoirsDisponibles,
    acomptesDisponibles,
    solde: Math.max(0, facturesOuvertes - avoirsDisponibles - acomptesDisponibles),
  };
}

export function soldeFournisseurTiers(
  fournisseurId: string,
  achats: Achat[],
): SoldeRoleTiers {
  let facturesOuvertes = 0;
  let avoirsDisponibles = 0;
  for (const a of achats) {
    if (a.fournisseurId !== fournisseurId || a.statut !== "valide") continue;
    facturesOuvertes += soldeAchat(a);
    const ttc = totauxAchat(a).ttc;
    const avoirs = a.avoirs
      .filter((av) => av.statut === "valide")
      .reduce((s, av) => s + totauxAvoir(av, a.tauxTVA).ttc, 0);
    if (avoirs > ttc + 1) avoirsDisponibles += avoirs - ttc;
  }
  return {
    facturesOuvertes,
    avoirsDisponibles,
    acomptesDisponibles: 0,
    solde: Math.max(0, facturesOuvertes - avoirsDisponibles),
  };
}

export type TrancheAgee = {
  label: string;
  minJours: number;
  maxJours: number | null;
  montant: number;
};

function joursDepuis(dateIso: string, au: Date) {
  try {
    return Math.max(0, differenceInCalendarDays(au, parseISO(dateIso)));
  } catch {
    return 0;
  }
}

function ventilerMontant(
  montant: number,
  jours: number,
  tranches: number[],
  labels: string[],
  buckets: number[],
) {
  if (montant <= 0) return;
  for (let i = 0; i < tranches.length; i++) {
    const max = tranches[i];
    const min = i === 0 ? 0 : tranches[i - 1] + 1;
    if (jours >= min && jours <= max) {
      buckets[i] += montant;
      return;
    }
  }
  buckets[labels.length - 1] += montant;
}

export function balanceAgeeClient(
  clientId: string,
  ctx: {
    factures: Facture[];
    acomptes: Acompte[];
    parametres: Parametres;
  },
  au = new Date(),
): TrancheAgee[] {
  const tranches = normaliserTranchesBalanceAgee(
    ctx.parametres.tranchesBalanceAgeeJours,
  );
  const labels = labelsTranchesBalanceAgee(tranches);
  const buckets = labels.map(() => 0);
  for (const f of ctx.factures) {
    if (f.clientId !== clientId) continue;
    const reste = resteAPayer(f, ctx.parametres, ctx.acomptes, ctx.factures);
    if (reste <= 0) continue;
    const ref = f.echeance || f.date;
    ventilerMontant(reste, joursDepuis(ref, au), tranches, labels, buckets);
  }
  return labels.map((label, i) => ({
    label,
    minJours: i === 0 ? 0 : tranches[i - 1] + 1,
    maxJours: i < tranches.length ? tranches[i] : null,
    montant: buckets[i],
  }));
}

export function balanceAgeeFournisseur(
  fournisseurId: string,
  achats: Achat[],
  parametres: Parametres,
  au = new Date(),
): TrancheAgee[] {
  const tranches = normaliserTranchesBalanceAgee(parametres.tranchesBalanceAgeeJours);
  const labels = labelsTranchesBalanceAgee(tranches);
  const buckets = labels.map(() => 0);
  for (const a of achats) {
    if (a.fournisseurId !== fournisseurId || a.statut !== "valide") continue;
    const reste = soldeAchat(a);
    if (reste <= 0) continue;
    const ref = a.echeance || a.date;
    ventilerMontant(reste, joursDepuis(ref, au), tranches, labels, buckets);
  }
  return labels.map((label, i) => ({
    label,
    minJours: i === 0 ? 0 : tranches[i - 1] + 1,
    maxJours: i < tranches.length ? tranches[i] : null,
    montant: buckets[i],
  }));
}

export function factureImpacteEncours(
  f: Pick<Facture, "type" | "statut">,
): boolean {
  if (f.type === "avoir" || f.type === "proforma" || f.type === "acompte") {
    return false;
  }
  if (f.statut === "brouillon" || f.statut === "annulee") return false;
  return true;
}

export type ControlePlafond = {
  ok: boolean;
  reason?: string;
  solde: number;
  plafond: number;
  depasse: boolean;
};

export function controlerPlafondCredit(
  client: Pick<Client, "id" | "nom" | "plafondCredit"> | undefined,
  ctx: {
    factures: Facture[];
    acomptes: Acompte[];
    parametres: Parametres;
  },
  opts?: {
    montantSupplementaire?: number;
    derogation?: boolean;
  },
): ControlePlafond {
  const plafond = Math.max(0, Number(client?.plafondCredit) || 0);
  const actuel = client
    ? soldeClientTiers(client.id, ctx).solde
    : 0;
  const projete = actuel + Math.max(0, opts?.montantSupplementaire ?? 0);
  if (plafond <= 0) {
    return { ok: true, solde: actuel, plafond: 0, depasse: false };
  }
  const depasse = projete > plafond + 1e-6;
  if (!depasse) {
    return { ok: true, solde: actuel, plafond, depasse: false };
  }
  if (opts?.derogation) {
    return { ok: true, solde: actuel, plafond, depasse: true };
  }
  return {
    ok: false,
    solde: actuel,
    plafond,
    depasse: true,
    reason: `Plafond de crédit dépassé pour ${client?.nom ?? "ce client"} (encours ${Math.round(projete)} Ar / plafond ${Math.round(plafond)} Ar).`,
  };
}

export type StatutMouvementTiers = "paye" | "impaye" | "en_retard" | "autre";

export type MouvementTiers = {
  id: string;
  role: RoleTiers;
  categorie: string;
  categorieLabel: string;
  numero: string;
  date: string;
  statut: string;
  statutLabel: string;
  statutMouvement: StatutMouvementTiers;
  montant: number;
};

function statutDepuisPaiement(
  etat: ReturnType<typeof etatPaiementFacture>,
  enRetard: boolean,
): StatutMouvementTiers {
  if (etat === "payee" || etat === "annulee") return "paye";
  if (enRetard) return "en_retard";
  if (etat === "impayee" || etat === "partiellement_payee") return "impaye";
  return "autre";
}

function factureEnRetard(f: Facture, reste: number, au: Date) {
  if (reste <= 0) return false;
  if (!f.echeance) return false;
  try {
    return parseISO(f.echeance) < au;
  } catch {
    return false;
  }
}

export function historiqueTiers(
  tiersId: string,
  roles: RoleTiers[],
  ctx: {
    devis: Devis[];
    commandes: Commande[];
    bonsDeLivraison: BonDeLivraison[];
    factures: Facture[];
    acomptes: Acompte[];
    achats: Achat[];
    parametres: Parametres;
  },
  au = new Date(),
): MouvementTiers[] {
  const out: MouvementTiers[] = [];
  const { parametres, acomptes } = ctx;

  if (roles.includes("client")) {
    for (const d of ctx.devis.filter((x) => x.clientId === tiersId)) {
      out.push({
        id: d.id,
        role: "client",
        categorie: "devis",
        categorieLabel: "Devis",
        numero: d.numero,
        date: d.date,
        statut: d.statut,
        statutLabel: DEVIS_STATUTS[d.statut] ?? d.statut,
        statutMouvement: "autre",
        montant: totauxDevis(d, parametres, acomptes).totalTTC,
      });
    }
    for (const c of ctx.commandes.filter((x) => x.clientId === tiersId)) {
      out.push({
        id: c.id,
        role: "client",
        categorie: "commande",
        categorieLabel: "Bon de commande",
        numero: c.numero,
        date: c.date,
        statut: c.statut,
        statutLabel: COMMANDE_STATUTS[c.statut] ?? c.statut,
        statutMouvement: "autre",
        montant: totauxCommande(c, parametres, acomptes).totalTTC,
      });
    }
    for (const b of ctx.bonsDeLivraison.filter((x) => x.clientId === tiersId)) {
      out.push({
        id: b.id,
        role: "client",
        categorie: "bon_de_livraison",
        categorieLabel: "Bon de livraison",
        numero: b.numero,
        date: b.date,
        statut: b.statut,
        statutLabel: BL_STATUTS[b.statut] ?? b.statut,
        statutMouvement: "autre",
        montant: totauxBonDeLivraison(b, parametres, acomptes).totalTTC,
      });
    }
    for (const f of ctx.factures.filter((x) => x.clientId === tiersId)) {
      const reste = resteAPayer(f, parametres, acomptes, ctx.factures);
      const etat = etatPaiementFacture(f, parametres, acomptes, ctx.factures);
      const retard = factureEnRetard(f, reste, au);
      out.push({
        id: f.id,
        role: "client",
        categorie: f.type === "avoir" ? "avoir" : "facture",
        categorieLabel: f.type === "avoir" ? "Avoir client" : "Facture",
        numero: f.numero,
        date: f.date,
        statut: f.statut,
        statutLabel: FACTURE_STATUTS[f.statut] ?? f.statut,
        statutMouvement: statutDepuisPaiement(etat, retard),
        montant: totauxFacture(f, parametres, acomptes).totalTTC,
      });
    }
    for (const a of ctx.acomptes.filter((x) => x.clientId === tiersId)) {
      out.push({
        id: a.id,
        role: "client",
        categorie: "acompte",
        categorieLabel: "Acompte reçu",
        numero: a.numero,
        date: a.date,
        statut: a.statut,
        statutLabel: ACOMPTE_STATUTS[a.statut] ?? a.statut,
        statutMouvement: a.statut === "annule" ? "autre" : "paye",
        montant: a.montantTTC,
      });
    }
  }

  if (roles.includes("fournisseur")) {
    for (const a of ctx.achats.filter((x) => x.fournisseurId === tiersId)) {
      const reste = soldeAchat(a);
      const retard =
        reste > 0 && a.echeance
          ? (() => {
              try {
                return parseISO(a.echeance) < au;
              } catch {
                return false;
              }
            })()
          : false;
      out.push({
        id: a.id,
        role: "fournisseur",
        categorie: "achat",
        categorieLabel: "Facture d'achat",
        numero: a.numero,
        date: a.date,
        statut: a.statut,
        statutLabel:
          a.statut === "valide"
            ? reste <= 0
              ? "Payé"
              : retard
                ? "En retard"
                : "Impayé"
            : a.statut,
        statutMouvement:
          a.statut !== "valide"
            ? "autre"
            : reste <= 0
              ? "paye"
              : retard
                ? "en_retard"
                : "impaye",
        montant: totauxAchat(a).ttc,
      });
      for (const p of a.paiements) {
        out.push({
          id: p.id,
          role: "fournisseur",
          categorie: "paiement",
          categorieLabel: "Paiement fournisseur",
          numero: a.numero,
          date: p.date,
          statut: "paye",
          statutLabel: "Payé",
          statutMouvement: "paye",
          montant: p.montant,
        });
      }
      for (const av of a.avoirs) {
        out.push({
          id: av.id,
          role: "fournisseur",
          categorie: "avoir",
          categorieLabel: "Avoir fournisseur",
          numero: av.numero,
          date: av.date,
          statut: av.statut,
          statutLabel: av.statut === "valide" ? "Validé" : "Brouillon",
          statutMouvement: av.statut === "valide" ? "paye" : "autre",
          montant: totauxAvoir(av, a.tauxTVA).ttc,
        });
      }
    }
  }

  return out.sort((x, y) => y.date.localeCompare(x.date));
}

export function filtrerHistoriqueTiers(
  mouvements: MouvementTiers[],
  opts: {
    debut?: string;
    fin?: string;
    statut?: StatutMouvementTiers | "tous";
  },
) {
  return mouvements.filter((m) => {
    if (opts.debut && m.date.slice(0, 10) < opts.debut) return false;
    if (opts.fin && m.date.slice(0, 10) > opts.fin) return false;
    if (opts.statut && opts.statut !== "tous" && m.statutMouvement !== opts.statut) {
      return false;
    }
    return true;
  });
}

export function echeanceDepuisDelai(dateIso: string, delaiJours?: number) {
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return dateIso;
  const jours = Math.max(0, Math.floor(Number(delaiJours) || 0));
  d.setDate(d.getDate() + jours);
  return d.toISOString();
}
