"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function EntreesPage() {
  const {
    entrees,
    produits,
    pointsDeVente,
    fournisseurs,
    pointDeVenteActifId,
    addEntree,
    deleteEntree,
  } = useStore();

  const first = produits[0];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    pointDeVenteId: pointsDeVente[0]?.id ?? "",
    produitId: first?.id ?? "",
    quantite: "",
    prixAchatUnitaire: first ? String(first.prixAchat) : "",
    prixVenteUnitaire: first ? String(first.prixVenteHT) : "",
    fournisseurId: "",
    fournisseur: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const filtered = [...entrees]
    .filter(
      (e) =>
        pointDeVenteActifId === "tous" ||
        e.pointDeVenteId === pointDeVenteActifId,
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const total = filtered.reduce(
    (s, e) => s + e.quantite * e.prixAchatUnitaire,
    0,
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const quantite = Number(form.quantite);
    const prixAchat = Number(form.prixAchatUnitaire);
    const prixVente = Number(form.prixVenteUnitaire);
    if (
      !form.pointDeVenteId ||
      !form.produitId ||
      quantite <= 0 ||
      prixAchat < 0 ||
      prixVente < 0
    ) {
      return;
    }
    const frn = fournisseurs.find((f) => f.id === form.fournisseurId);
    addEntree({
      pointDeVenteId: form.pointDeVenteId,
      produitId: form.produitId,
      quantite,
      prixAchatUnitaire: prixAchat,
      prixVenteUnitaire: prixVente,
      fournisseurId: form.fournisseurId || undefined,
      fournisseur:
        frn?.nom || form.fournisseur || "Non renseigné",
      date: new Date(form.date).toISOString(),
      note: form.note || undefined,
    });
    setOpen(false);
    setForm((f) => ({
      ...f,
      quantite: "",
      fournisseur: "",
      fournisseurId: "",
      note: "",
    }));
  }

  return (
    <div>
      <PageHeader
        title="Entrées de marchandises"
        description="Chaque arrivage a son propre prix d'achat et prix de vente (en ariary)."
        actions={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle entrée
          </button>
        }
      />

      <div className="mb-4 flex items-center justify-between rounded-[var(--radius)] border border-line bg-sea-100/50 px-4 py-3 text-sm">
        <span className="text-muted">
          {filtered.length} entrée{filtered.length > 1 ? "s" : ""} affichée
          {filtered.length > 1 ? "s" : ""}
        </span>
        <span className="font-semibold text-sea-800">
          Total achats : {formatCurrency(total)}
        </span>
      </div>

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5 shadow-sm">
          <h2 className="mb-1 font-display text-lg font-semibold">
            Nouvelle entrée
          </h2>
          <p className="mb-4 text-xs text-muted">
            Les prix catalogue sont préremplis — modifiez-les librement pour
            cet arrivage.
          </p>
          <form
            onSubmit={onSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <label className="block text-xs font-semibold text-muted">
              Point de vente
              <select
                className="select mt-1"
                value={form.pointDeVenteId}
                onChange={(e) =>
                  setForm({ ...form, pointDeVenteId: e.target.value })
                }
                required
              >
                {pointsDeVente.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Produit
              <select
                className="select mt-1"
                value={form.produitId}
                onChange={(e) => {
                  const prod = produits.find((p) => p.id === e.target.value);
                  setForm({
                    ...form,
                    produitId: e.target.value,
                    prixAchatUnitaire: prod
                      ? String(prod.prixAchat)
                      : form.prixAchatUnitaire,
                    prixVenteUnitaire: prod
                      ? String(prod.prixVenteHT)
                      : form.prixVenteUnitaire,
                  });
                }}
                required
              >
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.libelleCourt}
                  </option>
                ))}
              </select>
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
              Quantité
              <input
                type="number"
                step="0.1"
                min="0"
                className="input mt-1"
                value={form.quantite}
                onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Prix d&apos;achat unitaire (Ar)
              <input
                type="number"
                step="100"
                min="0"
                className="input mt-1"
                value={form.prixAchatUnitaire}
                onChange={(e) =>
                  setForm({ ...form, prixAchatUnitaire: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Prix de vente unitaire (Ar)
              <input
                type="number"
                step="100"
                min="0"
                className="input mt-1"
                value={form.prixVenteUnitaire}
                onChange={(e) =>
                  setForm({ ...form, prixVenteUnitaire: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Fournisseur
              <select
                className="select mt-1"
                value={form.fournisseurId}
                onChange={(e) => {
                  const frn = fournisseurs.find((f) => f.id === e.target.value);
                  setForm({
                    ...form,
                    fournisseurId: e.target.value,
                    fournisseur: frn?.nom ?? "",
                  });
                }}
              >
                <option value="">— Saisie libre —</option>
                {fournisseurs
                  .filter((f) => f.actif)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
              </select>
            </label>
            {!form.fournisseurId && (
              <label className="block text-xs font-semibold text-muted">
                Nom fournisseur
                <input
                  className="input mt-1"
                  value={form.fournisseur}
                  onChange={(e) =>
                    setForm({ ...form, fournisseur: e.target.value })
                  }
                  placeholder="Mareyeur, pêcheurs…"
                />
              </label>
            )}
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
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

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Produit</th>
              <th>Point de vente</th>
              <th>Fournisseur</th>
              <th>Quantité</th>
              <th>P.U. achat</th>
              <th>P.U. vente</th>
              <th>Montant achat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const produit = produits.find((p) => p.id === e.produitId);
              const pdv = pointsDeVente.find((p) => p.id === e.pointDeVenteId);
              return (
                <tr key={e.id}>
                  <td>{formatDate(e.date)}</td>
                  <td className="font-medium">{produit ? `${produit.code} — ${produit.libelleCourt}` : undefined}</td>
                  <td>{pdv?.nom}</td>
                  <td>
                    {e.origine === "stock_initial" ? (
                      <span className="badge badge-sand">Stock initial</span>
                    ) : (
                      e.fournisseur
                    )}
                  </td>
                  <td>
                    {formatNumber(e.quantite)} {produit?.unite}
                  </td>
                  <td>{formatCurrency(e.prixAchatUnitaire)}</td>
                  <td>
                    {formatCurrency(
                      e.prixVenteUnitaire ?? produit?.prixVenteHT ?? 0,
                    )}
                  </td>
                  <td className="font-semibold">
                    {formatCurrency(e.quantite * e.prixAchatUnitaire)}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      onClick={() => deleteEntree(e.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
