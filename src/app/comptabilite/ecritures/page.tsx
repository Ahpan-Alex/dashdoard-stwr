"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, ScrollText } from "lucide-react";
import { ComptabiliteSubnav } from "@/components/comptabilite-subnav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { downloadCsv } from "@/lib/csv";
import { formatCurrency, formatDate } from "@/lib/format";
import { lignesExportEcritures, totauxEcriture } from "@/lib/comptabilite";
import { useStore } from "@/lib/store";
import { downloadXlsx } from "@/lib/xlsx";
import type { JournalEcriture } from "@/lib/types";

export default function EcrituresPage() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <EcrituresContent />
    </RequirePermission>
  );
}

function EcrituresContent() {
  const ecrituresComptables = useStore((s) => s.ecrituresComptables);
  const [journal, setJournal] = useState<JournalEcriture | "tous">("tous");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");

  const filtrées = useMemo(() => {
    return ecrituresComptables.filter((e) => {
      if (journal !== "tous" && e.journal !== journal) return false;
      const d = e.date.slice(0, 10);
      if (debut && d < debut) return false;
      if (fin && d > fin) return false;
      return true;
    });
  }, [ecrituresComptables, journal, debut, fin]);

  function exporter(format: "csv" | "xlsx") {
    const rows = lignesExportEcritures(filtrées);
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      downloadCsv(`ecritures-${stamp}.csv`, rows);
      return;
    }
    downloadXlsx(`ecritures-${stamp}.xlsx`, rows);
  }

  return (
    <div>
      <PageHeader
        title="Écritures"
        description="Journal d'achat et de vente au format PCG 2005 (date, libellé, débit, crédit). Export CSV ou Excel uniquement."
        showPosSelector={false}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => exporter("csv")}
              disabled={filtrées.length === 0}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => exporter("xlsx")}
              disabled={filtrées.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        }
      />
      <ComptabiliteSubnav />

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-xs font-semibold text-muted">
          Journal
          <select
            className="select mt-1"
            value={journal}
            onChange={(e) =>
              setJournal(e.target.value as JournalEcriture | "tous")
            }
          >
            <option value="tous">Tous</option>
            <option value="vente">Ventes</option>
            <option value="achat">Achats</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Du
          <input
            type="date"
            className="input mt-1"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </label>
      </div>

      {filtrées.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-5 w-5" />}
          title="Aucune écriture"
          description="Les écritures sont générées automatiquement à la validation d'une facture d'achat ou de vente."
        />
      ) : (
        <div className="space-y-4">
          {filtrées.map((e) => {
            const totaux = totauxEcriture(e);
            return (
              <section
                key={e.id}
                className="rounded-[var(--radius)] border border-line bg-card p-4"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-sea-700">
                      {e.journal === "vente" ? "Vente" : "Achat"} · {e.piece}
                    </p>
                    <p className="font-display text-base font-semibold">
                      {formatDate(e.date)} — {e.libelle}
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    Débit {formatCurrency(totaux.debit)} · Crédit{" "}
                    {formatCurrency(totaux.credit)}
                  </p>
                </div>
                <div className="table-shell">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Libellé</th>
                        <th className="text-right">Débit</th>
                        <th className="text-right">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.lignes.map((l) => (
                        <tr key={l.id}>
                          <td className="whitespace-nowrap text-xs">
                            {formatDate(e.date)}
                          </td>
                          <td>
                            <span className="font-mono text-xs font-semibold">
                              {l.numero || "—"}
                            </span>{" "}
                            {l.libelle}
                          </td>
                          <td className="text-right tabular-nums">
                            {l.debit ? formatCurrency(l.debit) : ""}
                          </td>
                          <td className="text-right tabular-nums">
                            {l.credit ? formatCurrency(l.credit) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
