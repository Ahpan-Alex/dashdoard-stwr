"use client";

import { useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { ComptabiliteSubnav } from "@/components/comptabilite-subnav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  JOURNAL_ECRITURE_LABELS,
  JOURNAUX_ECRITURE,
  ecritureEstEquilibree,
  ecritureEstTransferee,
  filtrerEcrituresComptables,
  totauxEcriture,
} from "@/lib/comptabilite";
import { useStore } from "@/lib/store";
import type { JournalEcriture } from "@/lib/types";

export default function JournauxPage() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <JournauxContent />
    </RequirePermission>
  );
}

function JournauxContent() {
  const ecrituresComptables = useStore((s) => s.ecrituresComptables);
  const [journal, setJournal] = useState<JournalEcriture | "tous">("tous");
  const [statut, setStatut] = useState<"tous" | "transferee" | "en_attente">(
    "tous",
  );
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");

  const filtrées = useMemo(
    () =>
      filtrerEcrituresComptables(ecrituresComptables, {
        journal,
        debut,
        fin,
        statut,
      }),
    [ecrituresComptables, journal, debut, fin, statut],
  );

  return (
    <div>
      <PageHeader
        title="Journaux"
        description="Écritures d'achat, de vente et de trésorerie. Les encaissements et décaissements alimentent les journaux banque, caisse et mobile monnaie."
        showPosSelector={false}
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
            {JOURNAUX_ECRITURE.map((j) => (
              <option key={j} value={j}>
                {JOURNAL_ECRITURE_LABELS[j]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Statut
          <select
            className="select mt-1"
            value={statut}
            onChange={(e) =>
              setStatut(e.target.value as "tous" | "transferee" | "en_attente")
            }
          >
            <option value="tous">Tous</option>
            <option value="en_attente">Non encore transférée</option>
            <option value="transferee">Transférée</option>
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
          description="Les écritures apparaissent à la validation d'une facture d'achat ou de vente, et à chaque encaissement / décaissement (journaux de trésorerie)."
        />
      ) : (
        <div className="space-y-4">
          {filtrées.map((e) => {
            const totaux = totauxEcriture(e);
            const transferee = ecritureEstTransferee(e);
            return (
              <section
                key={e.id}
                className="rounded-[var(--radius)] border border-line bg-card p-4"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-sea-700">
                      Journal {JOURNAL_ECRITURE_LABELS[e.journal]} · {e.piece}
                    </p>
                    <p className="font-display text-base font-semibold">
                      {formatDate(e.date)} — {e.libelle}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`badge ${transferee ? "badge-success" : "badge-sand"}`}
                    >
                      {transferee ? "Transférée" : "Non transférée"}
                    </span>
                    <p className="text-xs text-muted">
                      Débit {formatCurrency(totaux.debit)} · Crédit{" "}
                      {formatCurrency(totaux.credit)}
                    </p>
                  </div>
                </div>
                {!ecritureEstEquilibree(e) && (
                  <p className="mb-3 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Écriture déséquilibrée : elle n&apos;aurait pas dû
                    apparaître. Vérifiez les comptes de la pièce {e.piece}.
                  </p>
                )}
                <div className="table-shell">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Libellé</th>
                        <th>Compte</th>
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
                          <td>{e.libelle}</td>
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
