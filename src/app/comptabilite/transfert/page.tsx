"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Send } from "lucide-react";
import { ComptabiliteSubnav } from "@/components/comptabilite-subnav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import {
  JOURNAL_ECRITURE_LABELS,
  filtrerEcrituresComptables,
} from "@/lib/comptabilite";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { downloadXlsx } from "@/lib/xlsx";
import type { JournalEcriture, TransfertComptable } from "@/lib/types";

export default function TransfertPage() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <TransfertContent />
    </RequirePermission>
  );
}

function telecharger(t: TransfertComptable, format: "csv" | "xlsx") {
  if (format === "csv") {
    downloadCsv(`${t.nomFichier}.csv`, t.lignes);
    return;
  }
  downloadXlsx(`${t.nomFichier}.xlsx`, t.lignes);
}

function TransfertContent() {
  const ecrituresComptables = useStore((s) => s.ecrituresComptables);
  const transfertsComptables = useStore((s) => s.transfertsComptables ?? []);
  const creerTransfertComptable = useStore((s) => s.creerTransfertComptable);
  const peutGerer = useAuthStore((s) => s.hasPermission("comptabilite.gerer"));
  const [journal, setJournal] = useState<JournalEcriture | "tous">("tous");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const enAttente = useMemo(
    () =>
      filtrerEcrituresComptables(ecrituresComptables, {
        journal,
        debut,
        fin,
        statut: "en_attente",
      }),
    [ecrituresComptables, journal, debut, fin],
  );

  function generer(format: "csv" | "xlsx" | "les_deux") {
    const res = creerTransfertComptable({
      journal,
      debut: debut || undefined,
      fin: fin || undefined,
    });
    if (!res.ok) {
      setMessage(res.reason);
      return;
    }
    const t = useStore
      .getState()
      .transfertsComptables.find((x) => x.id === res.id);
    if (t) {
      if (format === "csv" || format === "les_deux") telecharger(t, "csv");
      if (format === "xlsx" || format === "les_deux") telecharger(t, "xlsx");
    }
    setMessage(`${res.count} écriture(s) transférée(s).`);
  }

  return (
    <div>
      <PageHeader
        title="Transfert"
        description="Exportez les écritures non encore transférées (CSV et/ou Excel). Une fois le fichier généré, ces écritures sont figées et n'apparaissent plus dans les prochains exports."
        showPosSelector={false}
      />
      <ComptabiliteSubnav />

      {peutGerer && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="font-display text-lg font-semibold">
            Nouvel export
          </h2>
          <p className="mt-2 text-sm text-muted">
            Seules les écritures en attente sont proposées. Affinez par journal
            et par période, ou laissez vide pour tout transférer.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
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
                <option value="vente">Vente</option>
                <option value="achat">Achat</option>
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
          <p className="mt-3 text-sm text-muted">
            {enAttente.length} écriture(s) en attente avec ces filtres.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={enAttente.length === 0}
              onClick={() => generer("csv")}
            >
              Générer CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={enAttente.length === 0}
              onClick={() => generer("xlsx")}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Générer Excel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={enAttente.length === 0}
              onClick={() => generer("les_deux")}
            >
              <Send className="h-4 w-4" />
              CSV et Excel
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-muted">{message}</p>}
        </section>
      )}

      <h2 className="mb-3 font-display text-lg font-semibold">
        Historique des exports
      </h2>
      {transfertsComptables.length === 0 ? (
        <EmptyState
          icon={<Send className="h-5 w-5" />}
          title="Aucun transfert"
          description="Les fichiers générés restent disponibles ici pour un nouveau téléchargement."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Journal</th>
                <th>Période</th>
                <th>Écritures</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transfertsComptables.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap">{formatDate(t.date)}</td>
                  <td>
                    {t.journal === "tous"
                      ? "Tous"
                      : JOURNAL_ECRITURE_LABELS[t.journal]}
                  </td>
                  <td className="text-xs text-muted">
                    {t.debut || t.fin
                      ? `${t.debut || "…"} → ${t.fin || "…"}`
                      : "Toutes dates"}
                  </td>
                  <td>{t.ecritureIds.length}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => telecharger(t, "csv")}
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </button>{" "}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => telecharger(t, "xlsx")}
                    >
                      <Download className="h-4 w-4" />
                      Excel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
