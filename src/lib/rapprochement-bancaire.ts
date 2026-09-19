import type { LigneReleveBancaire, MouvementTresorerie } from "./types";

export function mouvementEstRapproche(
  mouvementId: string,
  lignes: LigneReleveBancaire[],
) {
  return lignes.some((l) => l.mouvementId === mouvementId);
}

export function lignesReleveNonRapprochees(lignes: LigneReleveBancaire[]) {
  return lignes.filter((l) => !l.mouvementId);
}

function cell(raw: string) {
  return raw.replace(/^["']|["']$/g, "").trim();
}

function parseDateCell(raw: string): string | null {
  const s = cell(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (!m) return null;
  const d = m[1].padStart(2, "0");
  const mo = m[2].padStart(2, "0");
  return `${m[3]}-${mo}-${d}`;
}

function parseMontantCell(raw: string): number | null {
  const s = cell(raw).replace(/\s/g, "").replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Parse un relevé CSV (date + libellé + montant signé, ou débit/crédit). */
export function parserReleveBancaireCsv(texte: string): {
  ok: true;
  lignes: Omit<LigneReleveBancaire, "id" | "compteTresorerieId" | "dateImport" | "fichierNom">[];
} | { ok: false; reason: string } {
  const brut = texte.replace(/^\uFEFF/, "").trim();
  if (!brut) return { ok: false, reason: "Fichier vide." };
  const rows = brut.split(/\r?\n/).filter((l) => l.trim());
  if (rows.length < 2) {
    return { ok: false, reason: "Le CSV doit contenir un en-tête et au moins une ligne." };
  }
  const sep = rows[0].includes(";") && !rows[0].includes(",") ? ";" : ",";
  const header = rows[0].split(sep).map((h) => cell(h).toLowerCase());
  const idx = (names: string[]) =>
    header.findIndex((h) => names.some((n) => h === n || h.includes(n)));
  const iDate = idx(["date", "dateoperation", "date opération"]);
  const iLib = idx(["libelle", "libellé", "label", "intitule", "intitulé"]);
  const iMontant = idx(["montant", "amount", "solde"]);
  const iDebit = idx(["debit", "débit"]);
  const iCredit = idx(["credit", "crédit"]);
  if (iDate < 0 || iLib < 0) {
    return {
      ok: false,
      reason: "Colonnes requises : date, libellé, et montant ou débit/crédit.",
    };
  }
  if (iMontant < 0 && iDebit < 0 && iCredit < 0) {
    return {
      ok: false,
      reason: "Indiquez une colonne montant, ou un couple débit / crédit.",
    };
  }
  const lignes: Omit<
    LigneReleveBancaire,
    "id" | "compteTresorerieId" | "dateImport" | "fichierNom"
  >[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r].split(sep);
    const date = parseDateCell(cols[iDate] ?? "");
    if (!date) continue;
    const libelle = cell(cols[iLib] ?? "") || "Mouvement bancaire";
    let montant = 0;
    if (iMontant >= 0) {
      const n = parseMontantCell(cols[iMontant] ?? "");
      if (n == null) continue;
      montant = n;
    } else {
      const debit = parseMontantCell(cols[iDebit] ?? "") ?? 0;
      const credit = parseMontantCell(cols[iCredit] ?? "") ?? 0;
      montant = credit - debit;
    }
    if (montant === 0 && !libelle) continue;
    lignes.push({ date, libelle, montant });
  }
  if (lignes.length === 0) {
    return { ok: false, reason: "Aucune ligne exploitable dans le fichier." };
  }
  return { ok: true, lignes };
}

export function mouvementsCandidatsPourLigne(
  ligne: LigneReleveBancaire,
  mouvements: MouvementTresorerie[],
  rapprocheIds: Set<string>,
) {
  return mouvements.filter((m) => {
    if (rapprocheIds.has(m.id) && ligne.mouvementId !== m.id) return false;
    if (m.compteTresorerieId !== ligne.compteTresorerieId) return false;
    return true;
  });
}
