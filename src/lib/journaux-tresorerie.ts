import type {
  CompteTresorerie,
  EcritureComptable,
  JournalTresorerie,
  TypeCompteTresorerie,
} from "./types";

const IDS_JOURNAUX_PARTAGES = new Set(["banque", "caisse", "mobile_monnaie"]);

export const JOURNAUX_TRESORERIE_DEFAUT: JournalTresorerie[] = [
  {
    id: "banque",
    code: "BQ",
    libelle: "Banque",
    type: "banque",
    actif: true,
    ordre: 1,
    systeme: true,
  },
  {
    id: "caisse",
    code: "CA",
    libelle: "Caisse",
    type: "caisse",
    actif: true,
    ordre: 2,
    systeme: true,
  },
  {
    id: "mobile_monnaie",
    code: "MM",
    libelle: "Mobile monnaie",
    type: "mobile_monnaie",
    actif: true,
    ordre: 3,
    systeme: true,
  },
];

export function seedJournauxTresorerie(): JournalTresorerie[] {
  return [];
}

export function fusionnerJournauxTresorerie(
  existing?: JournalTresorerie[] | null,
) {
  return existing ?? [];
}

export function idJournalDedieCompte(compteId: string) {
  return `jtr-${compteId}`;
}

export function journalTresorerieEstPartage(journal: JournalTresorerie) {
  if (journal.compteTresorerieId) return false;
  return journal.systeme === true || IDS_JOURNAUX_PARTAGES.has(journal.id);
}

export function journauxTresorerieTries(journaux: JournalTresorerie[]) {
  return [...journaux].sort(
    (a, b) =>
      a.ordre - b.ordre ||
      a.type.localeCompare(b.type) ||
      a.libelle.localeCompare(b.libelle, "fr"),
  );
}

export function journauxTresorerieActifs(journaux: JournalTresorerie[]) {
  return journauxTresorerieTries(journaux).filter((j) => j.actif);
}

export function journauxTresorerieDuType(
  journaux: JournalTresorerie[],
  type: TypeCompteTresorerie,
  opts?: { inclusInactifs?: boolean; inclusId?: string },
) {
  const liste = opts?.inclusInactifs
    ? journauxTresorerieTries(journaux)
    : journauxTresorerieActifs(journaux);
  return liste.filter(
    (j) => j.type === type || (opts?.inclusId && j.id === opts.inclusId),
  );
}

export function libelleJournalTresorerie(
  id: string | undefined,
  journaux: JournalTresorerie[],
) {
  if (!id) return "—";
  return journaux.find((j) => j.id === id)?.libelle ?? id;
}

export function journalParDefautPourType(
  journaux: JournalTresorerie[],
  type: TypeCompteTresorerie,
) {
  const duType = journauxTresorerieTries(journaux).filter((j) => j.type === type);
  return duType.find((j) => j.systeme && j.actif) ?? duType.find((j) => j.actif) ?? duType[0];
}

export function journalDedieDuCompte(
  compte: CompteTresorerie,
  journaux: JournalTresorerie[],
) {
  return (
    journaux.find((j) => j.compteTresorerieId === compte.id) ??
    journaux.find((j) => j.id === compte.journalTresorerieId)
  );
}

export function normaliserCodeJournal(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

export function codeJournalDepuisLibelle(libelle: string) {
  const compact = normaliserCodeJournal(libelle);
  return compact.slice(0, 8);
}

export function codeJournalUnique(
  libelle: string,
  journaux: JournalTresorerie[],
  ignoreId?: string,
) {
  const base = codeJournalDepuisLibelle(libelle) || "JTR";
  const padded = base.length < 2 ? `${base}X`.slice(0, 8) : base;
  const pris = (code: string) =>
    journaux.some(
      (j) => j.id !== ignoreId && normaliserCodeJournal(j.code) === code,
    );
  if (!pris(padded)) return padded;
  for (let n = 2; n < 1000; n++) {
    const suffix = String(n);
    const candidate = `${padded.slice(0, Math.max(2, 10 - suffix.length))}${suffix}`.slice(
      0,
      10,
    );
    if (!pris(candidate)) return candidate;
  }
  return padded;
}

export function motifJournalTresorerieInvalide(
  data: { code: string; libelle: string },
  journaux: JournalTresorerie[],
  ignoreId?: string,
) {
  const libelle = data.libelle.trim();
  if (!libelle) return "Indiquez un libellé.";
  const code = normaliserCodeJournal(data.code || codeJournalDepuisLibelle(libelle));
  if (!code) return "Indiquez un code (ex. BQ1, OM).";
  if (code.length < 2) return "Le code doit avoir au moins 2 caractères.";
  const doublonCode = journaux.find(
    (j) => j.id !== ignoreId && normaliserCodeJournal(j.code) === code,
  );
  if (doublonCode) return `Le code « ${doublonCode.code} » existe déjà.`;
  const normLib = libelle.toLocaleLowerCase("fr");
  const doublonLib = journaux.find(
    (j) =>
      j.id !== ignoreId && j.libelle.trim().toLocaleLowerCase("fr") === normLib,
  );
  if (doublonLib) return `Le journal « ${doublonLib.libelle} » existe déjà.`;
  return null;
}

export function journalTresorerieUtilise(
  id: string,
  opts: {
    comptes: CompteTresorerie[];
    ecritures: EcritureComptable[];
  },
) {
  if (opts.comptes.some((c) => c.journalTresorerieId === id)) return true;
  if (opts.ecritures.some((e) => e.journal === id)) return true;
  return false;
}

function journalEstPartagePourCompte(
  journal: JournalTresorerie | undefined,
  comptes: CompteTresorerie[],
  compteId: string,
) {
  if (!journal) return true;
  if (journal.compteTresorerieId && journal.compteTresorerieId !== compteId) {
    return true;
  }
  if (journalTresorerieEstPartage(journal)) return true;
  return comptes.some(
    (c) => c.id !== compteId && c.journalTresorerieId === journal.id,
  );
}

/**
 * Un journal de trésorerie par compte (Caisse 1, BNI…).
 * Les journaux génériques Banque / Caisse / Mobile monnaie ne sont plus partagés.
 */
export function assurerJournauxParCompteTresorerie(
  comptes: CompteTresorerie[],
  journaux: JournalTresorerie[],
): { comptes: CompteTresorerie[]; journaux: JournalTresorerie[] } {
  const nextJournaux = [...journaux];
  const nextComptes = comptes.map((c) => ({ ...c }));
  let changed = false;

  function upsert(journal: JournalTresorerie) {
    const i = nextJournaux.findIndex((j) => j.id === journal.id);
    if (i === -1) {
      nextJournaux.push(journal);
      changed = true;
      return;
    }
    const prev = nextJournaux[i];
    if (
      prev.code === journal.code &&
      prev.libelle === journal.libelle &&
      prev.type === journal.type &&
      prev.actif === journal.actif &&
      prev.ordre === journal.ordre &&
      prev.compteTresorerieId === journal.compteTresorerieId
    ) {
      return;
    }
    nextJournaux[i] = { ...prev, ...journal };
    changed = true;
  }

  for (const compte of nextComptes) {
    const parOwner = nextJournaux.find((j) => j.compteTresorerieId === compte.id);
    const parLien = nextJournaux.find((j) => j.id === compte.journalTresorerieId);
    let journal =
      parOwner && !journalEstPartagePourCompte(parOwner, nextComptes, compte.id)
        ? parOwner
        : undefined;
    if (
      !journal &&
      parLien &&
      !journalEstPartagePourCompte(parLien, nextComptes, compte.id)
    ) {
      journal = parLien;
    }
    if (!journal) {
      const id = idJournalDedieCompte(compte.id);
      const existant = nextJournaux.find((j) => j.id === id);
      if (
        existant &&
        !journalEstPartagePourCompte(existant, nextComptes, compte.id)
      ) {
        journal = existant;
      } else {
        const ordre =
          nextJournaux.reduce((m, j) => Math.max(m, j.ordre), 0) + 1;
        journal = {
          id,
          code: codeJournalUnique(compte.libelle, nextJournaux),
          libelle: compte.libelle,
          type: compte.type,
          actif: compte.actif,
          ordre,
          compteTresorerieId: compte.id,
        };
      }
    }
    upsert({
      ...journal,
      libelle: compte.libelle,
      type: compte.type,
      actif: compte.actif,
      compteTresorerieId: compte.id,
    });
    if (compte.journalTresorerieId !== journal.id) {
      compte.journalTresorerieId = journal.id;
      changed = true;
    }
  }

  if (!changed) return { comptes, journaux };
  return { comptes: nextComptes, journaux: nextJournaux };
}
