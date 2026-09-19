import { batEnRetardRelance, cycleIdBat } from "./bat";
import type { ParametresAlertes, RegleAlerte } from "./alertes";
import type {
  BonATirer,
  MissionAchat,
  OrdreFabrication,
  TransfertStock,
} from "./types";

/** Types d'objets soumis à une règle de délai d'inaction. */
export const TYPES_OBJET_DELAI = [
  "bat",
  "mission_achat",
  "transfert",
  "of",
] as const;

export type TypeObjetDelai = (typeof TYPES_OBJET_DELAI)[number];

export const OBJET_DELAI_LABELS: Record<TypeObjetDelai, string> = {
  bat: "BAT en attente",
  mission_achat: "Mission d'achat ouverte",
  transfert: "Transfert inter-sites en attente",
  of: "OF non clôturé",
};

export const OBJET_DELAI_VERS_REGLE: Record<
  TypeObjetDelai,
  keyof ParametresAlertes
> = {
  bat: "batRelance",
  mission_achat: "missionOuverte",
  transfert: "transfertEnAttente",
  of: "ofNonCloture",
};

export const OBJET_DELAI_HREF_PARAMETRES: Record<TypeObjetDelai, string> = {
  bat: "/parametres/bat",
  mission_achat: "/parametres/achats",
  transfert: "/parametres/stock",
  of: "/parametres/fabrication",
};

export type EtatDelai = {
  type: TypeObjetDelai;
  enRetard: boolean;
  joursAttente: number;
  delaiJours: number;
  dateDerniereAction: string;
  actif: boolean;
};

function jourISO(value: Date | string = new Date()): string {
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function joursDepuisIso(debut: string, fin: string): number {
  const a = new Date(`${debut.slice(0, 10)}T12:00:00`).getTime();
  const b = new Date(`${fin.slice(0, 10)}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function delaiRegle(regle: RegleAlerte | undefined, fallback: number): number {
  const n = Number(regle?.delaiJours);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function plusRecenteDate(...dates: (string | undefined)[]): string {
  const ok = dates
    .filter((d): d is string => Boolean(d && d.slice(0, 10)))
    .map((d) => d.slice(0, 10))
    .sort();
  return ok.at(-1) ?? jourISO();
}

export function evaluerDelai(
  type: TypeObjetDelai,
  dateDerniereAction: string | undefined,
  cfg: ParametresAlertes,
  aujourdHui?: string,
): EtatDelai | null {
  if (!dateDerniereAction) return null;
  const cle = OBJET_DELAI_VERS_REGLE[type];
  const regle = cfg[cle];
  const fallback = type === "of" ? 7 : 7;
  const delaiJours = delaiRegle(regle, fallback);
  const today = jourISO(aujourdHui);
  const depuis = jourISO(dateDerniereAction);
  const joursAttente = joursDepuisIso(depuis, today);
  const actif = regle?.actif !== false;
  return {
    type,
    actif,
    delaiJours,
    dateDerniereAction: depuis,
    joursAttente,
    enRetard: actif && joursAttente >= delaiJours,
  };
}

export function missionOuverteSansJustificatif(m: MissionAchat): boolean {
  if (
    m.statut === "cloture" ||
    m.statut === "cloture_annule" ||
    m.statut === "annule" ||
    m.statut === "rejetee"
  ) {
    return false;
  }
  if (m.clotureExceptionJustificatifs) return false;
  return !(m.justificatifs && m.justificatifs.length > 0);
}

export function dateDerniereActionMission(m: MissionAchat): string {
  return plusRecenteDate(
    m.date,
    m.datePrevue,
    ...(m.validations ?? []).map((v) => v.date),
    ...(m.mouvementsFonds ?? []).map((x) => x.date),
  );
}

export function transfertEnAttenteValidation(t: TransfertStock): boolean {
  return t.statut === "demande" || t.statut === "expedie";
}

export function dateDerniereActionTransfert(t: TransfertStock): string {
  if (t.statut === "expedie") {
    return plusRecenteDate(t.dateExpedition, t.dateDemande);
  }
  return jourISO(t.dateDemande);
}

export function ofNonCloture(o: OrdreFabrication): boolean {
  return o.statut === "brouillon" || o.statut === "en_cours";
}

export function dateDerniereActionOf(o: OrdreFabrication): string {
  return plusRecenteDate(
    o.dateCreation,
    ...(o.validations ?? []).map((v) => v.date),
  );
}

export function etatDelaiMission(
  m: MissionAchat,
  cfg: ParametresAlertes,
  aujourdHui?: string,
): EtatDelai | null {
  if (!missionOuverteSansJustificatif(m)) return null;
  return evaluerDelai(
    "mission_achat",
    dateDerniereActionMission(m),
    cfg,
    aujourdHui,
  );
}

export function etatDelaiTransfert(
  t: TransfertStock,
  cfg: ParametresAlertes,
  aujourdHui?: string,
): EtatDelai | null {
  if (!transfertEnAttenteValidation(t)) return null;
  return evaluerDelai(
    "transfert",
    dateDerniereActionTransfert(t),
    cfg,
    aujourdHui,
  );
}

export function etatDelaiOf(
  o: OrdreFabrication,
  cfg: ParametresAlertes,
  aujourdHui?: string,
): EtatDelai | null {
  if (!ofNonCloture(o)) return null;
  return evaluerDelai("of", dateDerniereActionOf(o), cfg, aujourdHui);
}

export function etatDelaiBat(
  bat: BonATirer,
  cfg: ParametresAlertes,
  aujourdHui?: string,
): EtatDelai | null {
  const delai = delaiRegle(cfg.batRelance, 7);
  const today = aujourdHui
    ? new Date(`${aujourdHui.slice(0, 10)}T12:00:00`)
    : new Date();
  const enRetard = batEnRetardRelance(bat, delai, today);
  const dateDerniereAction = jourISO(bat.dateEnvoi);
  const joursAttente = joursDepuisIso(dateDerniereAction, jourISO(today));
  return {
    type: "bat",
    actif: cfg.batRelance?.actif !== false,
    delaiJours: delai,
    dateDerniereAction,
    joursAttente,
    enRetard: Boolean(cfg.batRelance?.actif !== false && enRetard),
  };
}

export function cycleBatId(bat: BonATirer): string {
  return cycleIdBat(bat);
}
