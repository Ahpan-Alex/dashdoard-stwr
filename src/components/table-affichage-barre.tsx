"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, SlidersHorizontal } from "lucide-react";
import type { TableAffichageId } from "@/lib/affichage-tableaux";
import type { LigneExportTableau } from "@/lib/export-tableau";
import { useAffichageTable } from "@/lib/use-affichage-table";
import { ExportTableauModal } from "./export-tableau-modal";

type Props = {
  tableId: TableAffichageId;
  lignes: LigneExportTableau[];
  fichier: string;
  titre?: string;
};

export function TableAffichageBarre({ tableId, lignes, fichier, titre }: Props) {
  const { types, actif, setActif, table } = useAffichageTable(tableId);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <label className="block text-xs font-semibold text-muted">
        Type d&apos;affichage
        <select
          className="select mt-1 min-w-[200px]"
          value={actif.id}
          onChange={(e) => setActif(e.target.value)}
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
              {t.contraintePdf ? " (PDF A4)" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setExportOpen(true)}
        >
          <Download className="h-4 w-4" />
          Exporter
        </button>
        <Link
          href={`/reglages/affichage?table=${tableId}`}
          className="btn btn-secondary"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Réglages
        </Link>
      </div>
      {exportOpen && (
        <ExportTableauModal
          table={table}
          types={types}
          typeEcranId={actif.id}
          lignes={lignes}
          fichier={fichier}
          titre={titre ?? table.label}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
