"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency, formatDate } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import {
  TYPE_OPERATION_TRESORERIE_LABELS,
  comptesTresorerieTries,
  libelleCompteTresorerie,
  libelleOperationTresorerie,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";
import type { TypeOperationTresorerie } from "@/lib/types";

export default function OperationsTresoreriePage() {
  return (
    <RequirePermission
      permission={["factures.encaisser", "achats.lire", "comptabilite.lire"]}
    >
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const searchParams = useSearchParams();
  const comptes = comptesTresorerieTries(
    useStore((s) => s.comptesTresorerie ?? []),
  );
  const operations = useStore((s) => s.operationsTresorerie ?? []);
  const addOperation = useStore((s) => s.addOperationTresorerie);
  const deleteOperation = useStore((s) => s.deleteOperationTresorerie);
  const actifs = useMemo(() => comptes.filter((c) => c.actif), [comptes]);
  const compteQuery = searchParams.get("compte") ?? "";

  const [type, setType] = useState<TypeOperationTresorerie>("approvisionnement");
  const [compteId, setCompteId] = useState(
    () =>
      actifs.find((c) => c.id === compteQuery)?.id ?? actifs[0]?.id ?? "",
  );
  const [compteLieId, setCompteLieId] = useState("");
  const [date, setDate] = useState(jourLocalISO());
  const [montant, setMontant] = useState("");
  const [libelle, setLibelle] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const contreparties = actifs.filter((c) => c.id !== compteId);
  const liste = useMemo(
    () =>
      [...operations].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [operations],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = addOperation({
      type,
      date: isoMidiDepuisJour(date),
      montant: Number(montant) || 0,
      compteTresorerieId: compteId,
      compteLieId: compteLieId || undefined,
      libelle,
      reference,
    });
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    setMontant("");
    setLibelle("");
    setReference("");
    setError(null);
  }

  return (
    <div>
      <PageHeader
        title="Approvisionnement et retrait"
        description="Alimenter ou retirer un compte. Indiquez un autre compte pour un virement interne (banque → caisse, etc.)."
      />
      {actifs.length === 0 ? (
        <p className="text-sm text-muted">
          Créez d&apos;abord un compte dans Paramètres → Trésorerie.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mb-6 grid gap-3 rounded-[var(--radius)] border border-sea-200 bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-xs font-semibold text-muted">
            Nature
            <select
              className="select mt-1"
              value={type}
              onChange={(e) =>
                setType(e.target.value as TypeOperationTresorerie)
              }
            >
              {(
                Object.keys(
                  TYPE_OPERATION_TRESORERIE_LABELS,
                ) as TypeOperationTresorerie[]
              ).map((t) => (
                <option key={t} value={t}>
                  {TYPE_OPERATION_TRESORERIE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            {type === "approvisionnement" ? "Compte à alimenter" : "Compte à débiter"}
            <select
              className="select mt-1"
              value={compteId}
              onChange={(e) => {
                setCompteId(e.target.value);
                if (e.target.value === compteLieId) setCompteLieId("");
              }}
              required
            >
              {actifs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            {type === "approvisionnement"
              ? "Depuis un autre compte (optionnel)"
              : "Vers un autre compte (optionnel)"}
            <select
              className="select mt-1"
              value={compteLieId}
              onChange={(e) => setCompteLieId(e.target.value)}
            >
              <option value="">
                {type === "approvisionnement"
                  ? "Apport externe"
                  : "Sortie externe"}
              </option>
              {contreparties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Date
            <input
              type="date"
              className="input mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Montant (Ar)
            <input
              type="number"
              min={1}
              className="input mt-1"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Libellé
            <input
              className="input mt-1"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex. Appro caisse du matin"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Référence
            <input
              className="input mt-1"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="N° bordereau…"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              Enregistrer
            </button>
          </div>
          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
        </form>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Nature</th>
              <th>Compte</th>
              <th>Contrepartie</th>
              <th>Libellé</th>
              <th className="text-right">Montant</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-sm text-muted">
                  Aucun approvisionnement ni retrait saisi.
                </td>
              </tr>
            ) : (
              liste.map((op) => (
                <tr key={op.id}>
                  <td>{formatDate(op.date)}</td>
                  <td>{TYPE_OPERATION_TRESORERIE_LABELS[op.type]}</td>
                  <td>{libelleCompteTresorerie(op.compteTresorerieId, comptes)}</td>
                  <td>
                    {op.compteLieId
                      ? libelleCompteTresorerie(op.compteLieId, comptes)
                      : "—"}
                  </td>
                  <td>{libelleOperationTresorerie(op, comptes)}</td>
                  <td className="text-right tabular-nums font-semibold">
                    {formatCurrency(op.montant)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        if (!confirm("Supprimer cette opération ?")) return;
                        const res = deleteOperation(op.id);
                        if (!res.ok) alert(res.reason);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
