import type { ExerciceComptable } from "./types";

export function jourIso(raw: string | undefined) {
  if (!raw) return "";
  return raw.slice(0, 10);
}

export function exercicesTries(exercices: ExerciceComptable[] | undefined) {
  return [...(exercices ?? [])].sort((a, b) =>
    jourIso(b.dateDebut).localeCompare(jourIso(a.dateDebut)),
  );
}

export function dateDansExercice(ex: Pick<ExerciceComptable, "dateDebut" | "dateFin">, dateIso: string) {
  const j = jourIso(dateIso);
  if (!j) return false;
  return j >= jourIso(ex.dateDebut) && j <= jourIso(ex.dateFin);
}

export function exercicePourDate(
  exercices: ExerciceComptable[] | undefined,
  dateIso?: string,
) {
  const j = jourIso(dateIso) || jourIso(new Date().toISOString());
  const covers = (exercices ?? []).filter((ex) => dateDansExercice(ex, j));
  return covers.find((ex) => ex.actif && !ex.cloture) ?? covers[0];
}

/** Jeton inséré dans les numéros (ex. 2026 ou 2025-2026). */
export function jetonNumeroExercice(
  exercices: ExerciceComptable[] | undefined,
  dateIso?: string,
) {
  const ex = exercicePourDate(exercices, dateIso);
  if (ex?.code) return ex.code;
  const d = dateIso ? new Date(dateIso) : new Date();
  const y = Number.isFinite(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
  return String(y);
}

export function libelleExercice(ex: Pick<ExerciceComptable, "libelle" | "code">) {
  return ex.libelle?.trim() || `Exercice ${ex.code}`;
}

export function exercicesSeChevauchent(
  a: Pick<ExerciceComptable, "dateDebut" | "dateFin">,
  b: Pick<ExerciceComptable, "dateDebut" | "dateFin">,
) {
  return jourIso(a.dateDebut) <= jourIso(b.dateFin) && jourIso(b.dateDebut) <= jourIso(a.dateFin);
}

export function codeExerciceCalendaire(annee: number) {
  return String(annee);
}

export function bornesExerciceCalendaire(annee: number) {
  return {
    dateDebut: `${annee}-01-01`,
    dateFin: `${annee}-12-31`,
    code: codeExerciceCalendaire(annee),
    libelle: `Exercice ${annee}`,
  };
}

export function codeExerciceCheval(dateDebut: string, dateFin: string) {
  const y1 = Number(jourIso(dateDebut).slice(0, 4));
  const y2 = Number(jourIso(dateFin).slice(0, 4));
  if (!y1 || !y2) return "";
  return y1 === y2 ? String(y1) : `${y1}-${y2}`;
}

export function motifExerciceInvalide(
  data: Pick<ExerciceComptable, "code" | "libelle" | "dateDebut" | "dateFin">,
  existants: ExerciceComptable[],
  ignoreId?: string,
) {
  const debut = jourIso(data.dateDebut);
  const fin = jourIso(data.dateFin);
  if (!debut || !fin) return "Indiquez les dates de début et de fin.";
  if (fin < debut) return "La date de fin doit être postérieure au début.";
  const code = data.code.trim();
  if (!code) return "Le code de l’exercice est obligatoire.";
  const libelle = data.libelle.trim();
  if (!libelle) return "Le libellé est obligatoire.";
  const autres = existants.filter((e) => e.id !== ignoreId);
  if (autres.some((e) => e.code === code)) {
    return "Ce code d’exercice existe déjà.";
  }
  const chevauche = autres.find((e) =>
    exercicesSeChevauchent({ dateDebut: debut, dateFin: fin }, e),
  );
  if (chevauche) {
    return `Cette période chevauche l’exercice ${libelleExercice(chevauche)}.`;
  }
  return null;
}

export type OptsNumeroDocument = {
  date?: string;
  exercices?: ExerciceComptable[];
};
