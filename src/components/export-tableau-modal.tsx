"use client";

import { useMemo, useState } from "react";
import {
  typeActif,
  type TableAffichageDef,
  type TypeAffichage,
} from "@/lib/affichage-tableaux";
import {
  construireCsv,
  imprimerTableauPdf,
  telechargerCsv,
  type LigneExportTableau,
} from "@/lib/export-tableau";

type Props = {
  table: TableAffichageDef;
  types: TypeAffichage[];
  typeEcranId: string;
  lignes: LigneExportTableau[];
  fichier: string;
  titre: string;
  onClose: () => void;
};

export function ExportTableauModal({
  table,
  types,
  typeEcranId,
  lignes,
  fichier,
  titre,
  onClose,
}: Props) {
  const prefs = { types, defautId: types[0]?.id ?? null, actifId: typeEcranId };
  const ecran = typeActif(prefs);
  const [typeId, setTypeId] = useState(
    () => types.find((t) => t.contraintePdf)?.id ?? ecran.id,
  );
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);

  const typeExport = useMemo(
    () => types.find((t) => t.id === typeId) ?? ecran,
    [types, typeId, ecran],
  );

  async function exporterCsv() {
    setBusy("csv");
    try {
      const csv = construireCsv(table, typeExport, lignes);
      telechargerCsv(fichier, csv);
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function exporterPdf() {
    setBusy("pdf");
    try {
      await imprimerTableauPdf(table, typeExport, lignes, {
        filename: fichier,
        titre,
      });
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export PDF impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-labelledby="export-tableau-title"
        className="w-full max-w-md rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg"
      >
        <h2
          id="export-tableau-title"
          className="font-display text-lg font-semibold"
        >
          Exporter {table.label}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choisissez un type d&apos;affichage dédié à l&apos;export — indépendant
          de celui affiché à l&apos;écran
          {ecran ? ` (« ${ecran.nom} »)` : ""}.
        </p>

        <label className="mt-4 block text-xs font-semibold text-muted">
          Type d&apos;affichage pour l&apos;export
          <select
            className="select mt-1"
            value={typeExport.id}
            onChange={(e) => setTypeId(e.target.value)}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom}
                {t.contraintePdf ? " — adapté PDF A4" : ""}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-muted">
          CSV : toutes les colonnes du type choisi. PDF : A4 portrait — les
          colonnes trop larges sont recadrées automatiquement.
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== null}
            onClick={() => void exporterCsv()}
          >
            {busy === "csv" ? "…" : "CSV"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== null}
            onClick={() => void exporterPdf()}
          >
            {busy === "pdf" ? "…" : "PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
