import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { inDateRange, type DateRange } from "./calculations";
import { lignesMainOeuvre } from "./fabrication";
import type { OrdreFabrication, PointDeVente } from "./types";

export function ofEstOuvert(of: Pick<OrdreFabrication, "statut">) {
  return of.statut === "brouillon" || of.statut === "en_cours";
}

export function jourIso(isoOuDate: string | Date) {
  if (typeof isoOuDate === "string") return isoOuDate.slice(0, 10);
  return format(isoOuDate, "yyyy-MM-dd");
}

export function heuresModOf(of: OrdreFabrication, atelierId?: string) {
  return lignesMainOeuvre(of)
    .filter((m) => !atelierId || m.atelierId === atelierId)
    .reduce((s, m) => s + (Number(m.heures) || 0), 0);
}

/** Fenêtre calendaire de l'OF (dates civiles). Ouvert sans date prévue → jusqu'à aujourd'hui. */
export function fenetreOf(
  of: OrdreFabrication,
  aujourdHui = jourIso(new Date()),
): { debut: string; fin: string } {
  const debut = jourIso(of.dateCreation);
  if (of.statut === "cloture" || of.statut === "cloture_annule") {
    const fin = of.dateClotureReelle ? jourIso(of.dateClotureReelle) : debut;
    return { debut, fin: fin < debut ? debut : fin };
  }
  if (of.statut === "annule") {
    const fin = of.dateAnnulation ? jourIso(of.dateAnnulation) : debut;
    return { debut, fin: fin < debut ? debut : fin };
  }
  const prevue = of.dateCloturePrevue
    ? jourIso(of.dateCloturePrevue)
    : aujourdHui;
  let fin = prevue < debut ? debut : prevue;
  if (ofEstOuvert(of) && fin < aujourdHui) fin = aujourdHui;
  return { debut, fin };
}

export function ofCouvreJour(of: OrdreFabrication, jour: string) {
  const { debut, fin } = fenetreOf(of, jour);
  return jour >= debut && jour <= fin;
}

export function nbJoursFenetre(debut: string, fin: string) {
  return Math.max(
    1,
    differenceInCalendarDays(parseISO(fin), parseISO(debut)) + 1,
  );
}

/** Heures MOD réparties à parts égales sur les jours de la fenêtre. */
export function heuresOfSurJour(of: OrdreFabrication, jour: string, atelierId: string) {
  if (!ofCouvreJour(of, jour)) return 0;
  const { debut, fin } = fenetreOf(of, jour);
  return heuresModOf(of, atelierId) / nbJoursFenetre(debut, fin);
}

export function debutSemaineLundi(reference = new Date()) {
  return startOfWeek(reference, { weekStartsOn: 1 });
}

export function joursDeLaSemaine(lundi: Date) {
  return eachDayOfInterval({
    start: startOfDay(lundi),
    end: endOfDay(addDays(lundi, 6)),
  });
}

export function capaciteHeuresJourAtelier(atelier: Pick<PointDeVente, "capaciteHeuresJour">) {
  return Math.max(0, atelier.capaciteHeuresJour ?? 0);
}

export function nbJoursOuvresDans(range: DateRange) {
  const jours = eachDayOfInterval({
    start: startOfDay(range.debut),
    end: endOfDay(range.fin),
  });
  return jours.filter((d) => d.getDay() !== 0).length;
}

export type CasePlanningOf = {
  of: OrdreFabrication;
  heures: number;
};

export type JourPlanningAtelier = {
  jour: string;
  date: Date;
  label: string;
  ofs: CasePlanningOf[];
  heures: number;
  capacite: number;
  surcharge: boolean;
  nOf: number;
};

export function planningAtelierSemaine(opts: {
  atelier: PointDeVente;
  ofs: OrdreFabrication[];
  lundi: Date;
}): JourPlanningAtelier[] {
  const { atelier, ofs, lundi } = opts;
  const capa = capaciteHeuresJourAtelier(atelier);
  const duSite = ofs.filter((o) => o.atelierId === atelier.id);
  return joursDeLaSemaine(lundi).map((date) => {
    const jour = jourIso(date);
    const cases: CasePlanningOf[] = duSite
      .filter((o) => ofCouvreJour(o, jour))
      .map((o) => ({ of: o, heures: heuresOfSurJour(o, jour, atelier.id) }))
      .sort((a, b) => a.of.numero.localeCompare(b.of.numero, "fr"));
    const heures = cases.reduce((s, c) => s + c.heures, 0);
    return {
      jour,
      date,
      label: format(date, "EEE d", { locale: fr }),
      ofs: cases,
      heures,
      capacite: capa,
      surcharge: capa > 0 && heures > capa + 1e-6,
      nOf: cases.length,
    };
  });
}

export function chargeHeuresAujourdhui(
  atelier: PointDeVente,
  ofs: OrdreFabrication[],
  aujourdHui = jourIso(new Date()),
) {
  return ofs
    .filter((o) => o.atelierId === atelier.id)
    .reduce((s, o) => s + heuresOfSurJour(o, aujourdHui, atelier.id), 0);
}

export function capaciteHeuresPeriode(
  atelier: Pick<PointDeVente, "capaciteHeuresJour">,
  range: DateRange,
) {
  const jour = capaciteHeuresJourAtelier(atelier);
  if (jour <= 0) return 0;
  return jour * Math.max(1, nbJoursOuvresDans(range));
}

export function ofsDansPeriodePlanning(
  ofs: OrdreFabrication[],
  atelierId: string,
  range: DateRange,
) {
  return ofs.filter((o) => {
    if (o.atelierId !== atelierId) return false;
    const { debut, fin } = fenetreOf(o);
    return inDateRange(debut, range) || inDateRange(fin, range) ||
      (debut <= jourIso(range.debut) && fin >= jourIso(range.fin));
  });
}
