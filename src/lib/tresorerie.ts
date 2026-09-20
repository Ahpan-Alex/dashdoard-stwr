import type {
  Achat,
  Acompte,
  CompteTresorerie,
  Facture,
  LignePaiement,
  LotPaiementFournisseur,
  ModePaiementParam,
  MouvementTresorerie,
  OperationTresorerie,
  Parametres,
  PointDeVente,
  StatutChequeDiffere,
  TypeCompteTresorerie,
  TypeOperationTresorerie,
} from "./types";
import { rolesSiteDuSite } from "./sites";

export const TYPE_COMPTE_TRESORERIE_LABELS: Record<TypeCompteTresorerie, string> = {
  caisse: "Caisse",
  banque: "Banque",
  mobile_monnaie: "Mobile monnaie",
};

export const REGLE_MODE_COMPTE_TRESORERIE =
  "Caisse : espèces uniquement. Banque : chèques, virement, carte et prélèvement. Mobile monnaie : transfert uniquement.";

export const STATUT_CHEQUE_LABELS: Record<StatutChequeDiffere, string> = {
  en_attente: "En attente",
  encaisse: "Encaissé",
  rejete: "Rejeté",
};

export const MODES_PAIEMENT_DEFAUT: Omit<ModePaiementParam, "ordre" | "actif">[] = [
  { id: "cheque_comptant", libelle: "Chèque au comptant", necessiteEcheance: false, typeCompteTresorerie: "banque" },
  { id: "cheque_differe", libelle: "Chèque à paiement différé", necessiteEcheance: true, typeCompteTresorerie: "banque" },
  { id: "prelevement", libelle: "Prélèvement bancaire", necessiteEcheance: false, typeCompteTresorerie: "banque" },
  { id: "virement", libelle: "Virement", necessiteEcheance: false, typeCompteTresorerie: "banque" },
  { id: "especes", libelle: "Espèces", necessiteEcheance: false, typeCompteTresorerie: "caisse" },
  { id: "carte", libelle: "Carte bancaire", necessiteEcheance: false, typeCompteTresorerie: "banque" },
  { id: "transfert", libelle: "Transfert", necessiteEcheance: false, typeCompteTresorerie: "mobile_monnaie" },
  { id: "mobile_money", libelle: "Mobile monnaie", necessiteEcheance: false, typeCompteTresorerie: "mobile_monnaie" },
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
  transfert: "Transfert",
  mobile_money: "Mobile Money",
  autre: "Autre",
};

const TYPE_COMPTE_MODE_SYSTEME: Record<string, TypeCompteTresorerie> = {
  especes: "caisse",
  cheque: "banque",
  cheque_comptant: "banque",
  cheque_differe: "banque",
  prelevement: "banque",
  virement: "banque",
  carte: "banque",
  transfert: "mobile_monnaie",
  mobile_money: "mobile_monnaie",
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
  const stamped = existing.map((m) => ({
    ...m,
    typeCompteTresorerie:
      TYPE_COMPTE_MODE_SYSTEME[m.id] ??
      m.typeCompteTresorerie ??
      infererTypeComptePourMode(m.id, m.libelle),
  }));
  if (!stamped.some((m) => m.id === "transfert")) {
    const ordre = stamped.reduce((max, x) => Math.max(max, x.ordre), 0) + 1;
    stamped.push({
      id: "transfert",
      libelle: "Transfert",
      necessiteEcheance: false,
      typeCompteTresorerie: "mobile_monnaie",
      actif: true,
      ordre,
    });
  }
  return stamped;
}

export function modesPaiementTries(modes: ModePaiementParam[]) {
  return [...(modes ?? []).filter((m) => m?.id)].sort(
    (a, b) =>
      (Number(a.ordre) || 0) - (Number(b.ordre) || 0) ||
      String(a.libelle ?? "").localeCompare(String(b.libelle ?? ""), "fr"),
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
  return [...(comptes ?? []).filter((c) => c?.id)].sort(
    (a, b) =>
      (Number(a.ordre) || 0) - (Number(b.ordre) || 0) ||
      String(a.libelle ?? "").localeCompare(String(b.libelle ?? ""), "fr"),
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

export function infererTypeComptePourMode(
  modeId: string | undefined,
  libelle?: string,
): TypeCompteTresorerie {
  const id = (modeId ?? "").toLocaleLowerCase("fr");
  if (TYPE_COMPTE_MODE_SYSTEME[id]) return TYPE_COMPTE_MODE_SYSTEME[id];
  if (id.includes("espece")) return "caisse";
  if (id.includes("cheque") || id.includes("chèque")) return "banque";
  if (id.includes("transfert")) return "mobile_monnaie";
  if (id.includes("mobile") || id.includes("mvola") || id.includes("orange") || id.includes("airtel")) {
    return "mobile_monnaie";
  }
  if (id.includes("virement")) return "banque";
  if (id.includes("prelev") || id.includes("carte")) return "banque";
  const l = (libelle ?? "").toLocaleLowerCase("fr");
  if (/esp[eè]ce|liquide|cash/.test(l)) return "caisse";
  if (/ch[eè]que/.test(l)) return "banque";
  if (/transfert/.test(l)) return "mobile_monnaie";
  if (/mobile|orange|mvola|airtel/.test(l)) return "mobile_monnaie";
  if (/virement/.test(l)) return "banque";
  if (/carte|pr[eé]l[eè]v/.test(l)) return "banque";
  return "banque";
}

export function typeComptePourModePaiement(
  modeId: string | undefined,
  modes?: ModePaiementParam[],
): TypeCompteTresorerie | undefined {
  const key = (modeId ?? "").trim();
  if (!key) return undefined;
  const m = trouverModePaiement(modes, key);
  if (m?.typeCompteTresorerie) return m.typeCompteTresorerie;
  return infererTypeComptePourMode(key, m?.libelle);
}

export function comptesTresoreriePourMode(
  comptes: CompteTresorerie[],
  modeId: string | undefined,
  modes?: ModePaiementParam[],
  siteId?: string,
) {
  const base = siteId ? comptesPourSite(comptes, siteId) : comptesTresorerieActifs(comptes);
  const type = typeComptePourModePaiement(modeId, modes);
  if (!type) return base;
  return base.filter((c) => c.type === type);
}

export function motifModeCompteTresorerie(
  modeId: string | undefined,
  compteId: string | undefined,
  modes: ModePaiementParam[],
  comptes: CompteTresorerie[],
) {
  if (!compteId) return null;
  const compte = comptes.find((c) => c.id === compteId);
  if (!compte) return "Compte de trésorerie introuvable.";
  const type = typeComptePourModePaiement(modeId, modes);
  if (type && compte.type !== type) {
    return `Le paiement « ${libelleModePaiement(modeId, modes)} » s'enregistre uniquement sur un compte ${TYPE_COMPTE_TRESORERIE_LABELS[type]}.`;
  }
  return null;
}

export function compteCompatibleOuVide(
  compteId: string | undefined,
  modeId: string | undefined,
  comptes: CompteTresorerie[],
  modes: ModePaiementParam[],
) {
  if (!compteId) return "";
  return motifModeCompteTresorerie(modeId, compteId, modes, comptes)
    ? ""
    : compteId;
}

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
  const compatibles = comptesTresoreriePourMode(
    comptes,
    ligne.modePaiement,
    modes,
  );
  if ((opts?.compteObligatoire || actifs.length > 0) && !ligne.compteTresorerieId) {
    const type = typeComptePourModePaiement(ligne.modePaiement, modes);
    if (actifs.length > 0 && compatibles.length === 0) {
      return `Créez un compte ${type ? TYPE_COMPTE_TRESORERIE_LABELS[type] : "de trésorerie"} pour enregistrer ce mode.`;
    }
    return "Choisissez un compte de trésorerie.";
  }
  if (
    ligne.compteTresorerieId &&
    !comptes.some((c) => c.id === ligne.compteTresorerieId)
  ) {
    return "Compte de trésorerie introuvable.";
  }
  return motifModeCompteTresorerie(
    ligne.modePaiement,
    ligne.compteTresorerieId,
    modes,
    comptes,
  );
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
  achatsRealises?: {
    id: string;
    quantite: number;
    prixUnitaire: number;
    dateAchat?: string;
    modePaiement?: string;
    compteTresorerieId?: string;
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
      const signed = sortie ? -Math.abs(mv.montant) : Math.abs(mv.montant);
      const libelleType =
        mv.type === "remise"
          ? "Décaissement"
          : mv.type === "restitution"
            ? "Restitution de solde"
            : mv.type === "remboursement"
              ? "Remboursement à l'acheteur"
              : mv.type;
      out.push({
        id: mvId("mission", mv.id),
        date: dateMouvementLigne(ligne),
        compteTresorerieId: mv.compteTresorerieId,
        montant: signed,
        sens: signed < 0 ? "sortie" : "entree",
        modePaiementId: ligne.modePaiement,
        reference: mv.reference,
        libelle: `Mission ${m.numero ?? m.id} · ${libelleType}`,
        source: "mission",
        sourceId: m.id,
        lignePaiementId: mv.id,
      });
    }
    for (const l of m.achatsRealises ?? []) {
      if (!l.compteTresorerieId || !l.modePaiement) continue;
      const montant = Math.round(
        Math.max(0, l.quantite) * Math.max(0, l.prixUnitaire),
      );
      if (montant <= 0) continue;
      const ligne: LignePaiement = {
        id: l.id,
        date: l.dateAchat || new Date().toISOString(),
        montant,
        modePaiement: l.modePaiement,
        compteTresorerieId: l.compteTresorerieId,
      };
      if (!ligneGenereMouvement(ligne, modes)) continue;
      out.push({
        id: mvId("mission", `achat-${l.id}`),
        date: dateMouvementLigne(ligne),
        compteTresorerieId: l.compteTresorerieId,
        montant: -montant,
        sens: "sortie",
        modePaiementId: l.modePaiement,
        libelle: `Mission ${m.numero ?? m.id} · Paiement achat`,
        source: "mission",
        sourceId: m.id,
        lignePaiementId: l.id,
      });
    }
  }
  return out;
}

export const TYPE_OPERATION_TRESORERIE_LABELS: Record<
  TypeOperationTresorerie,
  string
> = {
  approvisionnement: "Approvisionnement",
  retrait: "Retrait",
};

export function motifOperationTresorerieInvalide(
  data: {
    montant: number;
    compteTresorerieId: string;
    compteLieId?: string;
  },
  comptes: CompteTresorerie[],
) {
  if (!(data.montant > 0)) return "Indiquez un montant positif.";
  const compte = comptes.find((c) => c.id === data.compteTresorerieId);
  if (!compte) return "Choisissez un compte de trésorerie.";
  if (!compte.actif) return "Ce compte de trésorerie est inactif.";
  if (!data.compteLieId) return null;
  if (data.compteLieId === data.compteTresorerieId) {
    return "Choisissez un autre compte en contrepartie.";
  }
  const lie = comptes.find((c) => c.id === data.compteLieId);
  if (!lie) return "Compte de contrepartie introuvable.";
  if (!lie.actif) return "Le compte de contrepartie est inactif.";
  return null;
}

export function libelleOperationTresorerie(
  op: Pick<
    OperationTresorerie,
    "type" | "libelle" | "compteTresorerieId" | "compteLieId"
  >,
  comptes: CompteTresorerie[],
) {
  const saisi = (op.libelle ?? "").trim();
  if (saisi) return saisi;
  const nom = libelleCompteTresorerie(op.compteTresorerieId, comptes);
  const lie = op.compteLieId
    ? libelleCompteTresorerie(op.compteLieId, comptes)
    : "";
  if (op.type === "approvisionnement") {
    return lie ? `Approvisionnement depuis ${lie}` : `Approvisionnement — ${nom}`;
  }
  return lie ? `Retrait vers ${lie}` : `Retrait — ${nom}`;
}

export function mouvementsDepuisOperations(
  operations: OperationTresorerie[],
  comptes: CompteTresorerie[],
): MouvementTresorerie[] {
  const out: MouvementTresorerie[] = [];
  for (const op of operations) {
    const montant = Math.round(Math.abs(op.montant) || 0);
    if (montant <= 0) continue;
    const libelle = libelleOperationTresorerie(op, comptes);
    const signed = op.type === "approvisionnement" ? montant : -montant;
    out.push({
      id: `op-${op.id}`,
      date: op.date,
      compteTresorerieId: op.compteTresorerieId,
      montant: signed,
      sens: signed < 0 ? "sortie" : "entree",
      modePaiementId: "autre",
      reference: op.reference,
      libelle,
      source: "operation",
      sourceId: op.id,
      lignePaiementId: op.id,
    });
    if (!op.compteLieId) continue;
    out.push({
      id: `op-${op.id}-lie`,
      date: op.date,
      compteTresorerieId: op.compteLieId,
      montant: -signed,
      sens: signed < 0 ? "entree" : "sortie",
      modePaiementId: "autre",
      reference: op.reference,
      libelle,
      source: "operation",
      sourceId: op.id,
      lignePaiementId: `${op.id}-lie`,
    });
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
  operations?: OperationTresorerie[];
  comptesTresorerie?: CompteTresorerie[];
}): MouvementTresorerie[] {
  return [
    ...mouvementsDepuisAchats(opts.achats, opts.modes),
    ...mouvementsDepuisLots(opts.lotsPaiement, opts.modes),
    ...mouvementsDepuisFactures(opts.factures, opts.modes),
    ...mouvementsDepuisAcomptes(opts.acomptes, opts.modes),
    ...mouvementsDepuisMissions(opts.missions ?? [], opts.modes),
    ...mouvementsDepuisOperations(
      opts.operations ?? [],
      opts.comptesTresorerie ?? [],
    ),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function normaliserSoldeInitial(data: {
  soldeInitial?: number;
  soldeInitialSens?: "debit" | "credit";
  soldeInitialDate?: string;
}) {
  const soldeInitial = Math.round(Math.abs(Number(data.soldeInitial) || 0));
  return {
    soldeInitial,
    soldeInitialSens:
      data.soldeInitialSens === "credit" ? ("credit" as const) : ("debit" as const),
    soldeInitialDate:
      soldeInitial > 0
        ? data.soldeInitialDate || new Date().toISOString().slice(0, 10)
        : undefined,
  };
}

export function soldeInitialSigne(
  compte: Pick<CompteTresorerie, "soldeInitial" | "soldeInitialSens"> | undefined,
) {
  const montant = Math.round(Math.abs(Number(compte?.soldeInitial) || 0));
  if (montant <= 0) return 0;
  return compte?.soldeInitialSens === "credit" ? -montant : montant;
}

export function soldeCompteTresorerie(
  compteId: string,
  mouvements: MouvementTresorerie[],
  compte?: Pick<CompteTresorerie, "soldeInitial" | "soldeInitialSens">,
) {
  const flux = mouvements
    .filter((m) => m.compteTresorerieId === compteId)
    .reduce((s, m) => s + m.montant, 0);
  return soldeInitialSigne(compte) + flux;
}

export type LigneSuiviTresorerie = {
  id: string;
  date: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  nature: "ouverture" | "reporte" | "operation";
};

type EvtSuiviTresorerie = {
  id: string;
  date: string;
  libelle: string;
  debit: number;
  credit: number;
  delta: number;
  nature: "ouverture" | "operation";
};

function jourMouvement(date: string) {
  return date.slice(0, 10);
}

/** Relevé d'un compte : solde initial, puis débit / crédit et solde après chaque opération. */
export function lignesSuiviCompteTresorerie(
  compte: Pick<
    CompteTresorerie,
    "id" | "soldeInitial" | "soldeInitialSens" | "soldeInitialDate"
  >,
  mouvements: MouvementTresorerie[],
  opts?: { du?: string; au?: string; modePaiementId?: string },
): LigneSuiviTresorerie[] {
  const du = (opts?.du ?? "").slice(0, 10);
  const au = (opts?.au ?? "").slice(0, 10);
  const ops = mouvements
    .filter((m) => m.compteTresorerieId === compte.id)
    .filter((m) =>
      opts?.modePaiementId ? m.modePaiementId === opts.modePaiementId : true,
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    );

  const montantOuverture = Math.round(Math.abs(Number(compte.soldeInitial) || 0));
  const dateOuverture =
    compte.soldeInitialDate?.slice(0, 10) ||
    ops[0]?.date.slice(0, 10) ||
    new Date().toISOString().slice(0, 10);
  const debitOuverture =
    compte.soldeInitialSens === "credit" ? 0 : montantOuverture;
  const creditOuverture =
    compte.soldeInitialSens === "credit" ? montantOuverture : 0;

  const evts: EvtSuiviTresorerie[] = [
    {
      id: `si-${compte.id}`,
      date: dateOuverture,
      libelle: "Solde initial",
      debit: debitOuverture,
      credit: creditOuverture,
      delta: debitOuverture - creditOuverture,
      nature: "ouverture",
    },
  ];
  for (const m of ops) {
    const debit = m.montant > 0 ? Math.round(m.montant) : 0;
    const credit = m.montant < 0 ? Math.round(-m.montant) : 0;
    evts.push({
      id: m.id,
      date: m.date,
      libelle: m.reference ? `${m.libelle} (${m.reference})` : m.libelle,
      debit,
      credit,
      delta: Math.round(m.montant),
      nature: "operation",
    });
  }
  evts.sort((a, b) => {
    const ja = jourMouvement(a.date);
    const jb = jourMouvement(b.date);
    if (ja !== jb) return ja.localeCompare(jb);
    if (a.nature === "ouverture" && b.nature !== "ouverture") return -1;
    if (b.nature === "ouverture" && a.nature !== "ouverture") return 1;
    return a.id.localeCompare(b.id);
  });

  const out: LigneSuiviTresorerie[] = [];
  let solde = 0;
  let ignorees = false;
  let reporteEmis = false;

  function pousserReporte() {
    if (reporteEmis || !du || !ignorees) return;
    reporteEmis = true;
    out.push({
      id: `rep-${compte.id}`,
      date: du,
      libelle: "Solde reporté",
      debit: solde > 0 ? solde : 0,
      credit: solde < 0 ? -solde : 0,
      solde,
      nature: "reporte",
    });
  }

  for (const e of evts) {
    const jour = jourMouvement(e.date);
    if (du && jour < du) {
      solde += e.delta;
      ignorees = true;
      continue;
    }
    if (au && jour > au) break;
    pousserReporte();
    solde += e.delta;
    out.push({
      id: e.id,
      date: e.date,
      libelle: e.libelle,
      debit: e.debit,
      credit: e.credit,
      solde,
      nature: e.nature,
    });
  }
  pousserReporte();
  return out;
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
    if ((m.achatsRealises ?? []).some((l) => l.modePaiement === id)) return true;
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
    operations?: OperationTresorerie[];
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
    if ((m.achatsRealises ?? []).some((l) => l.compteTresorerieId === id)) {
      return true;
    }
  }
  for (const op of ctx.operations ?? []) {
    if (op.compteTresorerieId === id || op.compteLieId === id) return true;
  }
  return false;
}
