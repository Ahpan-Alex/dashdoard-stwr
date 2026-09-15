"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RowCrudActions } from "@/components/row-crud-actions";
import {
  nbTiersParTypeClient,
  typesClientsTries,
} from "@/lib/types-clients";
import { useStore } from "@/lib/store";
import type { TypeClient } from "@/lib/types";

const FORM_VIDE = { code: "", libelle: "" };

export default function ParametresTypesClientsPage() {
  const {
    typesClients,
    clients,
    tiers,
    addTypeClient,
    updateTypeClient,
    deleteTypeClient,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);

  const liste = useMemo(() => typesClientsTries(typesClients), [typesClients]);

  function fermer() {
    setOpen(false);
    setEditingId(null);
    setForm(FORM_VIDE);
    setError(null);
  }

  function ouvrirCreation() {
    setEditingId(null);
    setForm(FORM_VIDE);
    setError(null);
    setOpen(true);
  }

  function demarrerEdition(t: TypeClient) {
    setEditingId(t.id);
    setForm({ code: t.code, libelle: t.libelle });
    setError(null);
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = editingId
      ? updateTypeClient(editingId, form)
      : addTypeClient(form);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    fermer();
  }

  function supprimer(t: TypeClient) {
    const n = nbTiersParTypeClient(clients, tiers ?? [], t.code);
    if (n > 0) {
      alert(
        `${n} client(s) sont de type « ${t.libelle} ». Réassignez-les avant de supprimer.`,
      );
      return;
    }
    if (!confirm(`Supprimer le type « ${t.libelle} » ?`)) return;
    const res = deleteTypeClient(t.id);
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    if (editingId === t.id) fermer();
  }

  function basculerActif(t: TypeClient) {
    const res = updateTypeClient(t.id, { actif: !t.actif });
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title="Types de clients"
        description="Catalogue des types (particulier, hôtel, collectivité…) pour classer les fiches clients."
        showPosSelector={false}
        actions={
          <button type="button" className="btn btn-primary" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Nouveau type
          </button>
        }
      />

      <ParametresSubnav />

      <p className="mb-4 text-xs text-muted">
        Ces types apparaissent sur la fiche client / tiers.{" "}
        <Link href="/parametres/clients" className="font-semibold text-sea-700 underline">
          Catalogue clients
        </Link>
      </p>

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 rounded-[var(--radius)] border border-line bg-card p-4"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
            {editingId ? "Modifier le type" : "Nouveau type"}
          </p>
          {error && (
            <p className="mb-3 rounded-[var(--radius)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-muted">
              Code *
              <input
                className="input mt-1 font-mono"
                placeholder="ex. hotel, collectivite"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Libellé *
              <input
                className="input mt-1"
                placeholder="ex. Hôtel, Collectivité"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Enregistrer" : "Ajouter"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={fermer}>
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Libellé</th>
              <th>Clients</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((t) => {
              const n = nbTiersParTypeClient(clients, tiers ?? [], t.code);
              return (
                <tr key={t.id} className={t.actif ? undefined : "opacity-60"}>
                  <td className="font-mono text-sm font-semibold">{t.code}</td>
                  <td>{t.libelle}</td>
                  <td>{n}</td>
                  <td>
                    <span className={t.actif ? "badge-success" : "badge-muted"}>
                      {t.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => basculerActif(t)}
                      >
                        {t.actif ? "Désactiver" : "Réactiver"}
                      </button>
                      <RowCrudActions
                        onView={() => demarrerEdition(t)}
                        onEdit={() => demarrerEdition(t)}
                        onDelete={() => supprimer(t)}
                        deleteDisabled={n > 0}
                        deleteReason={
                          n > 0
                            ? `${n} client(s) utilisent ce type`
                            : undefined
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {liste.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted">
                  Aucun type. Ajoutez particulier, hôtel, collectivité…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
