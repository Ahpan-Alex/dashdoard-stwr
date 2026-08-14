"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import {
  CHARGE_CATEGORIES,
  CATEGORIE_LABELS,
  totalCharges,
} from "@/lib/calculations";
import {
  NATURE_ECONOMIQUE_LABELS,
  natureEffective,
  natureParDefautCategorie,
} from "@/lib/rentabilite";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ChargeCategorie, ChargeNatureEconomique } from "@/lib/types";

export default function ChargesPage() {
  const {
    charges,
    pointsDeVente,
    pointDeVenteActifId,
    addCharge,
    deleteCharge,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState<string>("toutes");
  const [filtreNature, setFiltreNature] = useState<string>("toutes");
  const [form, setForm] = useState({
    libelle: "",
    categorie: "loyer" as ChargeCategorie,
    natureEconomique: "fixe_structure" as ChargeNatureEconomique,
    montant: "",
    date: new Date().toISOString().slice(0, 10),
    pointDeVenteId: "tous" as string,
    recurrent: true,
    note: "",
  });

  const filtered = useMemo(() => {
    return [...charges]
      .filter((c) => {
        if (pointDeVenteActifId === "tous") return true;
        return (
          c.pointDeVenteId === pointDeVenteActifId ||
          c.pointDeVenteId === "tous"
        );
      })
      .filter(
        (c) =>
          filtreCategorie === "toutes" || c.categorie === filtreCategorie,
      )
      .filter(
        (c) =>
          filtreNature === "toutes" ||
          natureEffective(c) === filtreNature,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [charges, pointDeVenteActifId, filtreCategorie, filtreNature]);

  const totalMois = totalCharges(charges, pointDeVenteActifId, "mois");
  const totalAnnee = totalCharges(charges, pointDeVenteActifId, "annee");

  const parCategorie = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      map.set(c.categorie, (map.get(c.categorie) ?? 0) + c.montant);
    }
    return [...map.entries()]
      .map(([cat, montant]) => ({
        cat,
        label: CATEGORIE_LABELS[cat] ?? cat,
        montant,
      }))
      .sort((a, b) => b.montant - a.montant);
  }, [filtered]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const montant = Number(form.montant);
    if (!form.libelle.trim() || montant <= 0) return;

    addCharge({
      libelle: form.libelle.trim(),
      categorie: form.categorie,
      natureEconomique: form.natureEconomique,
      montant,
      date: new Date(`${form.date}T12:00:00`).toISOString(),
      pointDeVenteId: form.pointDeVenteId,
      recurrent: form.recurrent,
      note: form.note.trim() || undefined,
    });

    setOpen(false);
    setForm((f) => ({
      ...f,
      libelle: "",
      montant: "",
      note: "",
    }));
  }

  return (
    <div>
      <PageHeader
        title="Charges"
        description="Charges classées par nature économique (variable de vente vs structure / financier / exceptionnel / impôts) pour le tableau de rentabilité à 2 paliers."
        actions={
          <div className="flex gap-2">
            <Link href="/tableau-de-bord/rentabilite" className="btn btn-secondary">
              <FileSpreadsheet className="h-4 w-4" />
              Voir la rentabilité
            </Link>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle charge
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Charges du mois
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(totalMois)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Charges de l&apos;année
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(totalAnnee)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Lignes affichées
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {filtered.length}
          </p>
        </div>
      </div>

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">
            Nouvelle charge
          </h2>
          <p className="mb-4 text-xs text-muted">
            La charge sera prise en compte immédiatement dans le compte de
            résultat (selon sa date et sa catégorie).
          </p>
          <form
            onSubmit={onSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Libellé
              <input
                className="input mt-1"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                required
                placeholder="Ex. Loyer Analakely, Cartons emballage…"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Catégorie
              <select
                className="select mt-1"
                value={form.categorie}
                onChange={(e) => {
                  const categorie = e.target.value as ChargeCategorie;
                  setForm({
                    ...form,
                    categorie,
                    natureEconomique: natureParDefautCategorie(categorie),
                  });
                }}
              >
                {CHARGE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Nature économique
              <select
                className="select mt-1"
                value={form.natureEconomique}
                onChange={(e) =>
                  setForm({
                    ...form,
                    natureEconomique: e.target
                      .value as ChargeNatureEconomique,
                  })
                }
              >
                {(
                  Object.entries(NATURE_ECONOMIQUE_LABELS) as [
                    ChargeNatureEconomique,
                    string,
                  ][]
                ).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Montant (Ar)
              <input
                type="number"
                min="0"
                step="100"
                className="input mt-1"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Date
              <input
                type="date"
                className="input mt-1"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Point de vente
              <select
                className="select mt-1"
                value={form.pointDeVenteId}
                onChange={(e) =>
                  setForm({ ...form, pointDeVenteId: e.target.value })
                }
              >
                <option value="tous">Tous / siège</option>
                {pointsDeVente.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink lg:mt-6">
              <input
                type="checkbox"
                checked={form.recurrent}
                onChange={(e) =>
                  setForm({ ...form, recurrent: e.target.checked })
                }
              />
              Charge récurrente
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2 lg:col-span-3">
              Note
              <input
                className="input mt-1"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Optionnel"
              />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">Nature :</span>
        <button
          className={`btn ${filtreNature === "toutes" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFiltreNature("toutes")}
        >
          Toutes
        </button>
        {(
          Object.entries(NATURE_ECONOMIQUE_LABELS) as [
            ChargeNatureEconomique,
            string,
          ][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={`btn ${filtreNature === id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltreNature(id)}
          >
            {label.split(" (")[0]}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">Catégorie :</span>
        <button
          className={`btn ${filtreCategorie === "toutes" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFiltreCategorie("toutes")}
        >
          Toutes
        </button>
        {CHARGE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`btn ${filtreCategorie === c.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltreCategorie(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {parCategorie.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {parCategorie.map((c) => (
            <span key={c.cat} className="badge badge-sea">
              {c.label} : {formatCurrency(c.montant)}
            </span>
          ))}
        </div>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Catégorie</th>
              <th>Nature</th>
              <th>Point de vente</th>
              <th>Type</th>
              <th>Montant</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted">
                  Aucune charge. Ajoutez loyer, salaires, emballage…
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const pdv =
                  c.pointDeVenteId === "tous"
                    ? "Tous / siège"
                    : (pointsDeVente.find((p) => p.id === c.pointDeVenteId)
                        ?.nom ?? "—");
                const nature = natureEffective(c);
                return (
                  <tr key={c.id}>
                    <td>{formatDate(c.date)}</td>
                    <td className="font-medium">
                      {c.libelle}
                      {c.note && (
                        <span className="mt-0.5 block text-xs font-normal text-muted">
                          {c.note}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-sea">
                        {CATEGORIE_LABELS[c.categorie] ?? c.categorie}
                      </span>
                    </td>
                    <td className="text-xs text-muted">
                      {NATURE_ECONOMIQUE_LABELS[nature].split(" (")[0]}
                    </td>
                    <td>{pdv}</td>
                    <td>
                      {c.recurrent ? (
                        <span className="badge badge-sand">Récurrente</span>
                      ) : (
                        <span className="badge badge-coral">Ponctuelle</span>
                      )}
                    </td>
                    <td className="font-semibold">
                      {formatCurrency(c.montant)}
                    </td>
                    <td>
                      <IconButton
                        label="Supprimer cette charge"
                        onClick={() => {
                          if (confirm(`Supprimer « ${c.libelle} » ?`)) {
                            deleteCharge(c.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </IconButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        Salaires et charges sociales → charges de personnel du compte de
        résultat. Les autres catégories → charges externes. La période du
        compte de résultat filtre selon la date de chaque ligne.
      </p>
    </div>
  );
}
