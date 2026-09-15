"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RowCrudActions } from "@/components/row-crud-actions";
import {
  libelleUniteMesure,
  nbProduitsParUnite,
  unitesMesureTriees,
} from "@/lib/unites-mesure";
import { useStore } from "@/lib/store";
import type { UniteMesure } from "@/lib/types";

const FORM_VIDE = { symbole: "", libelle: "" };

export default function ParametresUnitesPage() {
  const {
    unitesMesure,
    produits,
    addUniteMesure,
    updateUniteMesure,
    deleteUniteMesure,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);

  const liste = useMemo(() => unitesMesureTriees(unitesMesure), [unitesMesure]);

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

  function demarrerEdition(u: UniteMesure) {
    setEditingId(u.id);
    setForm({ symbole: u.symbole, libelle: u.libelle });
    setError(null);
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = editingId
      ? updateUniteMesure(editingId, form)
      : addUniteMesure(form);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    fermer();
  }

  function supprimer(u: UniteMesure) {
    const n = nbProduitsParUnite(produits, u.symbole);
    if (n > 0) {
      alert(
        `${n} article(s) utilisent « ${u.symbole} ». Réassignez-les avant de supprimer.`,
      );
      return;
    }
    if (!confirm(`Supprimer l'unité « ${libelleUniteMesure([u], u.symbole)} » ?`)) {
      return;
    }
    const res = deleteUniteMesure(u.id);
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    if (editingId === u.id) fermer();
  }

  function basculerActif(u: UniteMesure) {
    const res = updateUniteMesure(u.id, { actif: !u.actif });
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title="Unités de mesure"
        description="Catalogue des unités pour les articles achetés, stockés et vendus (pièce, kg, m², litre…)."
        showPosSelector={false}
        actions={
          <button type="button" className="btn btn-primary" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Nouvelle unité
          </button>
        }
      />

      <ParametresSubnav />

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 rounded-[var(--radius)] border border-line bg-card p-4"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
            {editingId ? "Modifier l'unité" : "Nouvelle unité"}
          </p>
          {error && (
            <p className="mb-3 rounded-[var(--radius)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-muted">
              Symbole *
              <input
                className="input mt-1 font-mono"
                placeholder="ex. kg, pce, m²"
                value={form.symbole}
                onChange={(e) => setForm({ ...form, symbole: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Libellé *
              <input
                className="input mt-1"
                placeholder="ex. Kilogramme, Pièce, Mètre carré"
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
              <th>Symbole</th>
              <th>Libellé</th>
              <th>Articles</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((u) => {
              const n = nbProduitsParUnite(produits, u.symbole);
              return (
                <tr key={u.id} className={u.actif ? undefined : "opacity-60"}>
                  <td className="font-mono text-sm font-semibold">{u.symbole}</td>
                  <td>{u.libelle}</td>
                  <td>{n}</td>
                  <td>
                    <span className={u.actif ? "badge-success" : "badge-muted"}>
                      {u.actif ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => basculerActif(u)}
                      >
                        {u.actif ? "Désactiver" : "Réactiver"}
                      </button>
                      <RowCrudActions
                        onView={() => demarrerEdition(u)}
                        onEdit={() => demarrerEdition(u)}
                        onDelete={() => supprimer(u)}
                        deleteDisabled={n > 0}
                        deleteReason={
                          n > 0
                            ? `${n} article(s) utilisent cette unité`
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
                  Aucune unité. Ajoutez pièce, kg, m², litre…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
