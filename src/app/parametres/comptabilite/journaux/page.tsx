"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import {
  journalTresorerieEstPartage,
  journauxTresorerieTries,
} from "@/lib/journaux-tresorerie";
import { TYPE_COMPTE_TRESORERIE_LABELS } from "@/lib/tresorerie";
import { useStore } from "@/lib/store";

export default function ParametresJournauxTresoreriePage() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <JournauxTresorerieContent />
    </RequirePermission>
  );
}

function JournauxTresorerieContent() {
  const journauxTresorerie = useStore((s) => s.journauxTresorerie ?? []);
  const comptesTresorerie = useStore((s) => s.comptesTresorerie ?? []);
  const updateJournalTresorerie = useStore((s) => s.updateJournalTresorerie);
  const peutGerer = useAuthStore((s) => s.hasPermission("comptabilite.gerer"));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const liste = useMemo(
    () =>
      journauxTresorerieTries(journauxTresorerie).filter(
        (j) => !journalTresorerieEstPartage(j),
      ),
    [journauxTresorerie],
  );

  function demarrer(id: string) {
    const actuel = journauxTresorerie.find((j) => j.id === id);
    setEditingId(id);
    setCode(actuel?.code ?? "");
    setError(null);
  }

  function fermer() {
    setEditingId(null);
    setCode("");
    setError(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const res = updateJournalTresorerie(editingId, { code });
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    fermer();
  }

  const nomCompte = (id: string | undefined) =>
    comptesTresorerie.find((c) => c.id === id)?.libelle ?? "—";

  return (
    <div>
      <PageHeader
        title="Journaux de trésorerie"
        description="Un journal par compte de trésorerie. Les écritures d'encaissement et de paiement de Caisse 1, BNI, Orange Money… restent dans le journal de ce compte. Vente et Achat restent les deux journaux d'exploitation."
        showPosSelector={false}
      />
      <ParametresSubnav />

      {editingId && peutGerer && (
        <form
          onSubmit={onSubmit}
          className="mb-6 flex flex-wrap items-end gap-3 rounded-[var(--radius)] border border-line bg-card p-5"
        >
          <label className="text-xs font-semibold text-muted">
            Code
            <input
              className="input mt-1"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex. CA1, BNI"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
          <button type="button" className="btn btn-secondary" onClick={fermer}>
            Annuler
          </button>
        </form>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Journal</th>
              <th>Compte</th>
              <th>Type</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-sm text-muted">
                  Aucun journal. Créez un compte dans Paramètres → Trésorerie :
                  son journal est créé automatiquement.
                </td>
              </tr>
            ) : (
              liste.map((j) => (
                <tr key={j.id} className={j.actif ? "" : "opacity-50"}>
                  <td className="font-mono text-xs font-semibold">{j.code}</td>
                  <td>{j.libelle}</td>
                  <td>{nomCompte(j.compteTresorerieId)}</td>
                  <td>{TYPE_COMPTE_TRESORERIE_LABELS[j.type]}</td>
                  <td>
                    {peutGerer && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => demarrer(j.id)}
                      >
                        Code
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
