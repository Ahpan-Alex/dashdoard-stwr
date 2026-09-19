import type {
  Achat,
  Acompte,
  CompteTresorerie,
  Facture,
  LignePaiement,
  LotPaiementFournisseur,
  ModePaiementParam,
  MouvementTresorerie,
  Parametres,
  PointDeVente,
  StatutChequeDiffere,
  TypeCompteTresorerie,
} from "./types";
import { rolesSiteDuSite } from "./sites";

export const TYPE_COMPTE_TRESORERIE_LABELS: Record<TypeCompteTresorerie, string> = {
  caisse: "Caisse",
  banque: "Banque",
  mobile_monnaie: "Mobile monnaie",
};

export const STATUT_CHEQUE_LABELS: Record<StatutChequeDiffere, string> = {
  en_attente: "En attente",
  encaisse: "Encaissé",
  rejete: "Rejeté",
};

export const MODES_PAIEMENT_DEFAUT: Omit<ModePaiementParam, "ordre" | "actif">[] = [
  { id: "cheque_comptant", libelle: "Chèque au comptant", necessiteEcheance: false },
  { id: "cheque_differe", libelle: "Chèque à paiement différé", necessiteEcheance: true },
  { id: "prelevement", libelle: "Prélèvement bancaire", necessiteEcheance: false },
  { id: "virement", libelle: "Virement", necessiteEcheance: false },
  { id: "especes", libelle: "Espèces", necessiteEcheance: false },
  { id: "carte", libelle: "Carte bancaire", necessiteEcheance: false },
  { id: "mobile_money", libelle: "Mobile monnaie", necessiteEcheance: false },
];

/** Anciennes clés encore présentes dans les documents. */
export const MODES_PAIEMENT_LEGACY: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  cheque: "Chèque",
  cheque_comptant: "Chèque au comptant",
  cheque_differe: "Chèque à paiement différé",
  prelevement: "Prélèvement bancaire",
  carte: "Carte bancaire",
  mobile_money: "Mobile Money",
  autre: "Autre",
};

export function seedModesPaiement(): ModePaiementParam[] {
  return MODES_PAIEMENT_DEFAUT.map((m, i) => ({
    ...m,
    ordre: i + 1,
    actif: true,
  }));
}

export function fusionnerModesPaiement(existing?: ModePaiementParam[] | null) {
  if (existing == null || existing.length === 0) return seedModesPaiement();
  return existing;
}

export function modesPaiementTries(modes: ModePaiementParam[]) {
  return [...modes].sort(
    (a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr"),
  );
}

export function modesPaiementActifs(modes: ModePaiementParam[]) {
  return modesPaiementTries(modes).filter((m) => m.actif);
}

export function trouverModePaiement(
  modes: ModePaiementParam[] | undefined,
  id: string | undefined,
) {
  const key = (id ?? "").trim();
  if (!key) return undefined;
  return (modes ?? []).find((m) => m.id === key);
}

export function modeNecessiteEcheance(
  modes: ModePaiementParam[] | undefined,
  id: string | undefined,
) {
  const m = trouverModePaiement(modes, id);
  if (m) return m.necessiteEcheance;
  return id === "cheque_differe";
}

export function libelleModePaiement(
  id: string | undefined,
  modes?: ModePaiementParam[],
) {
  const key = (id ?? "").trim();
  if (!key) return "—";
  const m = trouverModePaiement(modes, key);
  if (m) return m.libelle;
  return MODES_PAIEMENT_LEGACY[key] ?? key;
}

export function normalizeLibelleModePaiement(raw: string) {
  return raw.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
}

export function motifModePaiementInvalide(
  libelle: string,
  modes: ModePaiementParam[],
  ignoreId?: string,
) {
  const l = libelle.trim();
  if (!l) return "Indiquez un libellé.";
  const norm = normalizeLibelleModePaiement(l);
  const doublon = modes.find(
    (m) => m.id !== ignoreId && normalizeLibelleModePaiement(m.libelle) === norm,
  );
  if (doublon) return `Le mode « ${doublon.libelle} » existe déjà.`;
  return null;
}

export function seedComptesTresorerie(): CompteTresorerie[] {
  return [];
}

export function fusionnerComptesTresorerie(existing?: CompteTresorerie[] | null) {
  return existing ?? [];
}

export function comptesTresorerieTries(comptes: CompteTresorerie[]) {
  return [...comptes].sort(
    (a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr"),
  );
}

export function comptesTresorerieActifs(comptes: CompteTresorerie[]) {
  return comptesTresorerieTries(comptes).filter((c) => c.actif);
}

export function comptesPourSite(
  comptes: CompteTresorerie[],
  siteId?: string,
) {
  const actifs = comptesTresorerieActifs(comptes);
  if (!siteId) return actifs;
  return actifs.filter((c) => !c.siteId || c.siteId === siteId);
}

export function libelleCompteTresorerie(
  id: string | undefined,
  comptes: CompteTresorerie[],
) {
  if (!id) return "—";
  return comptes.find((c) => c.id === id)?.libelle ?? id;
}

export function motifCompteTresorerieInvalide(
  libelle: string,
  comptes: CompteTresorerie[],
  ignoreId?: string,
) {
  const l = libelle.trim();
  if (!l) return "Indiquez un libellé.";
  const norm = l.toLocaleLowerCase("fr");
  const doublon = comptes.find(
    (c) =>
      c.id !== ignoreId && c.libelle.trim().toLocaleLowerCase("fr") === norm,
  );
  if (doublon) return `Le compte « ${doublon.libelle} » existe déjà.`;
  return null;
}

export function siteExigeCompteTresorerie(site: Pick<PointDeVente, "rolesSite">) {
  return rolesSiteDuSite(site).includes("point_de_vente");
}

export function comptesCouvrantSite(
  comptes: CompteTresorerie[],
  siteId: string,
) {
  return comptesTresorerieActifs(comptes).filter(
    (c) => !c.siteId || c.siteId === siteId,
  );
}

export function motifSiteSansTresorerie(
  site: Pick<PointDeVente, "id" | "rolesSite">,
  comptes: CompteTresorerie[],
) {
  if (!siteExigeCompteTresorerie(site)) return null;
  if (comptesCouvrantSite(comptes, site.id).length > 0) return null;
  return "Un point de vente doit avoir au moins un compte de trésorerie (global ou rattaché à ce site). Créez-le dans Paramètres → Trésorerie.";
}

export function paiementComptePourSolde(p: Pick<LignePaiement, "statutCheque">) {
  return p.statutCheque !== "rejete";
}

export function montantLignesPaiement(lignes: LignePaiement[] | undefined) {
  return (lignes ?? [])
    .filter(paiementComptePourSolde)
    .reduce((s, p) => s + (Number(p.montant) || 0), 0);
}

export function ligneGenereMouvement(
  ligne: LignePaiement,
  modes?: ModePaiementParam[],
) {
  if (!ligne.compteTresorerieId) return false;
  if (ligne.statutCheque === "rejete") return false;
  if (modeNecessiteEcheance(modes, ligne.modePaiement)) {
    return ligne.statutCheque === "encaisse";
  }
  return true;
}

export function dateMouvementLigne(ligne: LignePaiement) {
  if (ligne.statutCheque === "encaisse" && ligne.dateEffet) return ligne.dateEffet;
  return ligne.dateEffet || ligne.date;
}

export type SaisieLignePaiement = {
  date: string;
  montant: number;
  modePaiement: string;
  compteTresorerieId?: string;
  reference?: string;
  dateEffet?: string;
  note?: string;
};

export function motifSaisieLignePaiement(
  ligne: SaisieLignePaiement,
  modes: ModePaiementParam[],
  comptes: CompteTresorerie[],
  opts?: { compteObligatoire?: boolean },
) {
  if (!(ligne.montant > 0)) return "Montant de paiement invalide.";
  if (!ligne.modePaiement) return "Choisissez un mode de paiement.";
  if (modeNecessiteEcheance(modes, ligne.modePaiement) && !ligne.dateEffet) {
    return "Indiquez la date d'échéance du chèque à paiement différé.";
  }
  const actifs = comptesTresorerieActifs(comptes);
  if ((opts?.compteObligatoire || actifs.length > 0) && !ligne.compteTresorerieId) {
    return "Choisissez un compte de trésorerie.";
  }
  if (
    ligne.compteTresorerieId &&
    !comptes.some((c) => c.id === ligne.compteTresorerieId)
  ) {
    return "Compte de trésorerie introuvable.";
  }
  return null;
}

export function completerLignePaiement(
  data: SaisieLignePaiement,
  id: string,
  modes: ModePaiementParam[],
): LignePaiement {
  const echeance = modeNecessiteEcheance(modes, data.modePaiement);
  return {
    id,
    date: data.date,
    montant: data.montant,
    modePaiement: data.modePaiement,
    compteTresorerieId: data.compteTresorerieId || undefined,
    reference: data.reference?.trim() || undefined,
    dateEffet: echeance ? data.dateEffet : data.dateEffet || undefined,
    statutCheque: echeance ? "en_attente" : undefined,
    note: data.note?.trim() || undefined,
  };
}

function mvId(source: string, ligneId: string) {
  return `mvt:${source}:${ligneId}`;
}

export function mouvementsDepuisAchats(
  achats: Achat[],
  modes: ModePaiementParam[],
): MouvementTresorerie[] {
  const out: MouvementTresorerie[] = [];
  for (const a of achats) {
    for (const p of a.paiements ?? []) {
      if (p.lotId) continue;
      if (!ligneGenereMouvement(p, modes)) continue;
      out.push({
        id: mvId("achat", p.id),
        date: dateMouvementLigne(p),
        compteTresorerieId: p.compteTresorerieId!,
        montant: -Math.abs(p.montant),
        sens: "sortie",
        modePaiementId: p.modePaiement,
        reference: p.reference,
        libelle: `Paiement ${a.numero}`,
        source: "achat",
        sourceId: a.id,
        lignePaiementId: p.id,
      });
    }
    for (const av of a.avoirs ?? []) {
      for (const p of av.paiements ?? []) {
        if (!ligneGenereMouvement(p, modes)) continue;
        out.push({
          id: mvId("avoir_achat", p.id),
          date: dateMouvementLigne(p),
          compteTresorerieId: p.compteTresorerieId!,
          montant: Math.abs(p.montant),
          sens: "entree",
          modePaiementId: p.modePaiement,
          reference: p.reference,
          libelle: `Remboursement ${av.numero}`,
          source: "avoir_achat",
          sourceId: av.id,
          lignePaiementId: p.id,
        });
      }
    }
  }
  return out;
}

export function mouvementsDepuisLots(
  lots: LotPaiementFournisseur[] | undefined,
  modes: ModePaiementParam[],
): MouvementTresorerie[] {
  const out: MouvementTresorerie[] = [];
  for (const lot of lots ?? []) {
    if (lot.statut !== "actif") continue;
    for (const p of lot.lignes ?? []) {
      if (!ligneGenereMouvement(p, modes)) continue;
      out.push({
        id: mvId("lot_paiement", p.id),
        date: dateMouvementLigne(p),
        compteTresorerieId: p.compteTresorerieId!,
        montant: -Math.abs(p.montant),
        sens: "sortie",
        modePaiementId: p.modePaiement,
        reference: p.reference || lot.numero,
        libelle: `Paiement groupé ${lot.numero}`,
        source: "lot_paiement",
        sourceId: lot.id,
        lignePaiementId: p.id,
      });
    }
  }
  return out;
}

export function mouvementsDepuisFactures(
  factures: Facture[],
  modes: ModePaiementParam[],
): MouvementTresorerie[] {
  const out: MouvementTresorerie[] = [];
  for (const f of factures) {
    const avoir = f.type === "avoir";
    for (const p of f.paiements ?? []) {
      if (!ligneGenereMouvement(p, modes)) continue;
      const montant = Math.abs(p.montant);
      out.push({
        id: mvId("facture", p.id),
        date: dateMouvementLigne(p),
        compteTresorerieId: p.compteTresorerieId!,
        montant: avoir ? -montant : montant,
        sens: avoir ? "sortie" : "entree",
        modePaiementId: p.modePaiement,
        reference: p.reference,
        libelle: `${avoir ? "Remboursement" : "Encaissement"} ${f.numero}`,
        source: "facture",
        sourceId: f.id,
        lignePaiementId: p.id,
      });
    }
  }
  return out;
}

export function mouvementsDepuisAcomptes(
  acomptes: Acompte[],
  modes: ModePaiementParam[],
): MouvementTresorerie[] {
  const out: MouvementTresorerie[] = [];
  for (const a of acomptes) {
    if (a.statut === "annule") continue;
    if (!a.compteTresorerieId) continue;
    const ligne: LignePaiement = {
      id: a.id,
      date: a.date,
      montant: a.montantTTC,
      modePaiement: a.modePaiement,
      compteTresorerieId: a.compteTresorerieId,
      reference: a.reference,
    };
    if (!ligneGenereMouvement(ligne, modes)) continue;
    out.push({
      id: mvId("acompte", a.id),
      date: dateMouvementLigne(ligne),
      compteTresorerieId: a.compteTresorerieId,
      montant: Math.abs(a.montantTTC),
      sens: "entree",
      modePaiementId: a.modePaiement,
      reference: a.reference,
      libelle: `Acompte ${a.numero}`,
      source: "acompte",
      sourceId: a.id,
      lignePaiementId: a.id,
    });
  }
  return out;
}

export type MissionFondsTreso = {
  id: string;
  numero?: string;
  mouvementsFonds?: {
    id: string;
    type: string;
    montant: number;
    date: string;
    modePaiement?: string;
    compteTresorerieId?: string;
    reference?: string;
  }[];
};

export function mouvementsDepuisMissions(
  missions: MissionFondsTreso[],
  modes: ModePaiementParam[],
): MouvementTresorerie[] {
  const out: MouvementTresorerie[] = [];
  for (const m of missions) {
    for (const mv of m.mouvementsFonds ?? []) {
      if (!mv.compteTresorerieId) continue;
      const sortie = mv.type === "remise" || mv.type === "remboursement";
      const entree = mv.type === "restitution";
      if (!sortie && !entree) continue;
      const ligne: LignePaiement = {
        id: mv.id,
        date: mv.date,
        montant: mv.montant,
        modePaiement: mv.modePaiement ?? "especes",
        compteTresorerieId: mv.compteTresorerieId,
        reference: mv.reference,
      };
      if (!ligneGenereMouvement(ligne, modes)) continue;
      const signed = sortie ? -Math.abs(mv.montant) : Math.abs(mv.montant);
      out.push({
        id: mvId("mission", mv.id),
        date: dateMouvementLigne(ligne),
        compteTresorerieId: mv.compteTresorerieId,
        montant: signed,
        sens: signed < 0 ? "sortie" : "entree",
        modePaiementId: ligne.modePaiement,
        reference: mv.reference,
        libelle: `Mission ${m.numero ?? m.id} · ${mv.type}`,
        source: "mission",
        sourceId: m.id,
        lignePaiementId: mv.id,
      });
    }
  }
  return out;
}

export function tousMouvementsTresorerie(opts: {
  achats: Achat[];
  factures: Facture[];
  acomptes: Acompte[];
  missions?: MissionFondsTreso[];
  lotsPaiement?: LotPaiementFournisseur[];
  modes: ModePaiementParam[];
}): MouvementTresorerie[] {
  return [
    ...mouvementsDepuisAchats(opts.achats, opts.modes),
    ...mouvementsDepuisLots(opts.lotsPaiement, opts.modes),
    ...mouvementsDepuisFactures(opts.factures, opts.modes),
    ...mouvementsDepuisAcomptes(opts.acomptes, opts.modes),
    ...mouvementsDepuisMissions(opts.missions ?? [], opts.modes),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function soldeCompteTresorerie(
  compteId: string,
  mouvements: MouvementTresorerie[],
) {
  return mouvements
    .filter((m) => m.compteTresorerieId === compteId)
    .reduce((s, m) => s + m.montant, 0);
}

export type ChequeEcheancier = {
  ligne: LignePaiement;
  source: "achat" | "facture" | "avoir_achat" | "lot_paiement";
  sourceId: string;
  sourceLibelle: string;
  sens: "entree" | "sortie";
};

export function chequesDifferes(opts: {
  achats: Achat[];
  factures: Facture[];
  modes: ModePaiementParam[];
  lotsPaiement?: LotPaiementFournisseur[];
}): ChequeEcheancier[] {
  const out: ChequeEcheancier[] = [];
  for (const a of opts.achats) {
    for (const p of a.paiements ?? []) {
      if (p.lotId) continue;
      if (!modeNecessiteEcheance(opts.modes, p.modePaiement)) continue;
      out.push({
        ligne: p,
        source: "achat",
        sourceId: a.id,
        sourceLibelle: a.numero,
        sens: "sortie",
      });
    }
    for (const av of a.avoirs ?? []) {
      for (const p of av.paiements ?? []) {
        if (!modeNecessiteEcheance(opts.modes, p.modePaiement)) continue;
        out.push({
          ligne: p,
          source: "avoir_achat",
          sourceId: a.id,
          sourceLibelle: av.numero,
          sens: "entree",
        });
      }
    }
  }
  for (const f of opts.factures) {
    for (const p of f.paiements ?? []) {
      if (!modeNecessiteEcheance(opts.modes, p.modePaiement)) continue;
      out.push({
        ligne: p,
        source: "facture",
        sourceId: f.id,
        sourceLibelle: f.numero,
        sens: f.type === "avoir" ? "sortie" : "entree",
      });
    }
  }
  for (const lot of opts.lotsPaiement ?? []) {
    if (lot.statut !== "actif") continue;
    for (const p of lot.lignes ?? []) {
      if (!modeNecessiteEcheance(opts.modes, p.modePaiement)) continue;
      out.push({
        ligne: p,
        source: "lot_paiement",
        sourceId: lot.id,
        sourceLibelle: lot.numero,
        sens: "sortie",
      });
    }
  }
  return out.sort((a, b) =>
    (a.ligne.dateEffet ?? a.ligne.date).localeCompare(
      b.ligne.dateEffet ?? b.ligne.date,
    ),
  );
}

export function fenetreChequesProchesJours(
  p: Pick<Parametres, "fenetreChequesProchesJours">,
) {
  const n = Number(p.fenetreChequesProchesJours);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 15;
}

export function chequesDifferesProches(
  liste: ChequeEcheancier[],
  fenetreJours: number,
  aujourdhui = new Date(),
) {
  const y = aujourdhui.getFullYear();
  const m = String(aujourdhui.getMonth() + 1).padStart(2, "0");
  const d = String(aujourdhui.getDate()).padStart(2, "0");
  const today = `${y}-${m}-${d}`;
  const limite = new Date(`${today}T12:00:00`);
  limite.setDate(limite.getDate() + Math.max(0, fenetreJours));
  const fin = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;
  return liste.filter((item) => {
    const statut = item.ligne.statutCheque ?? "en_attente";
    if (statut !== "en_attente") return false;
    const echeance = (item.ligne.dateEffet ?? item.ligne.date).slice(0, 10);
    return echeance >= today && echeance <= fin;
  });
}

export function modePaiementUtilise(
  id: string,
  ctx: {
    achats: Achat[];
    factures: Facture[];
    acomptes: Acompte[];
    missions?: MissionFondsTreso[];
  },
) {
  for (const a of ctx.achats) {
    if (a.modePaiement === id) return true;
    if (a.paiements.some((p) => p.modePaiement === id)) return true;
    for (const av of a.avoirs ?? []) {
      if ((av.paiements ?? []).some((p) => p.modePaiement === id)) return true;
    }
  }
  for (const f of ctx.factures) {
    if ((f.paiements ?? []).some((p) => p.modePaiement === id)) return true;
  }
  for (const a of ctx.acomptes) {
    if (a.modePaiement === id) return true;
  }
  for (const m of ctx.missions ?? []) {
    if ((m.mouvementsFonds ?? []).some((mv) => mv.modePaiement === id)) return true;
  }
  return false;
}

export function compteTresorerieUtilise(
  id: string,
  ctx: {
    achats: Achat[];
    factures: Facture[];
    acomptes: Acompte[];
    missions?: MissionFondsTreso[];
  },
) {
  for (const a of ctx.achats) {
    if (a.paiements.some((p) => p.compteTresorerieId === id)) return true;
    for (const av of a.avoirs ?? []) {
      if ((av.paiements ?? []).some((p) => p.compteTresorerieId === id)) return true;
    }
  }
  for (const f of ctx.factures) {
    if ((f.paiements ?? []).some((p) => p.compteTresorerieId === id)) return true;
  }
  for (const a of ctx.acomptes) {
    if (a.compteTresorerieId === id) return true;
  }
  for (const m of ctx.missions ?? []) {
    if ((m.mouvementsFonds ?? []).some((mv) => mv.compteTresorerieId === id)) {
      return true;
    }
  }
  return false;
}
