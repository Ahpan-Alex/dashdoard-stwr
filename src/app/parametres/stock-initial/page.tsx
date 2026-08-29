"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ChevronRight, MapPin, Package, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { montantAchat } from "@/lib/calculations";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function StockInitialPage() {
  const {
    entrees,
    produits,
    pointsDeVente,
    addEntree,
    deleteEntree,
    updateBilanInitial,
    bilanInitial,
  } = useStore();

  const stocksInitiaux = useMemo(
    () =>
      [...entrees]
        .filter((e) => e.origine === "stock_initial")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entrees],
  );

  const valeurTotale = stocksInitiaux.reduce((s, e) => s + montantAchat(e), 0);

  const recapParPdv = useMemo(() => {
    return pointsDeVente.map((pdv) => {
      const lignes = stocksInitiaux.filter((e) => e.pointDeVenteId === pdv.id);
      const produitIds = new Set(lignes.map((e) => e.produitId));
      const valeurAchat = lignes.reduce((s, e) => s + montantAchat(e), 0);
      const valeurVente = lignes.reduce(
        (s, e) => s + e.quantite * e.prixVenteUnitaire,
        0,
      );
      return {
        id: pdv.id,
        nom: pdv.nom,
        ville: pdv.ville,
        actif: pdv.actif,
        nbLignes: lignes.length,
        nbProduits: produitIds.size,
        valeurAchat,
        valeurVente,
        part: valeurTotale > 0 ? valeurAchat / valeurTotale : 0,
        lignes,
      };
    });
  }, [pointsDeVente, stocksInitiaux, valeurTotale]);

  const [selectedPdvId, setSelectedPdvId] = useState<string | null>(
    pointsDeVente[0]?.id ?? null,
  );

  const selectedRecap = recapParPdv.find((r) => r.id === selectedPdvId);
  const detailLignes = selectedRecap?.lignes ?? [];
  const detailValeur = detailLignes.reduce((s, e) => s + montantAchat(e), 0);

  const firstProduit = produits[0];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    pointDeVenteId: pointsDeVente[0]?.id ?? "",
    produitId: firstProduit?.id ?? "",
    quantite: "",
    prixAchatUnitaire: firstProduit ? String(firstProduit.prixAchat) : "",
    prixVenteUnitaire: firstProduit ? String(firstProduit.prixVenteHT) : "",
    date: `${new Date().getFullYear()}-01-01`,
    note: "",
    datePeremption: "",
  });

  function selectPdv(id: string) {
    setSelectedPdvId((prev) => (prev === id ? null : id));
    setForm((f) => ({ ...f, pointDeVenteId: id }));
  }

  function openFormForSelected() {
    if (selectedPdvId) {
      setForm((f) => ({ ...f, pointDeVenteId: selectedPdvId }));
    }
    setOpen(true);
  }

  function onProduitChange(produitId: string) {
    const p = produits.find((x) => x.id === produitId);
    setForm((f) => ({
      ...f,
      produitId,
      prixAchatUnitaire: p ? String(p.prixAchat) : f.prixAchatUnitaire,
      prixVenteUnitaire: p ? String(p.prixVenteHT) : f.prixVenteUnitaire,
      datePeremption: p?.gerePeremption ? f.datePeremption : "",
    }));
  }

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

    const produitGerePeremption = produits.find(
      (p) => p.id === form.produitId,
    )?.gerePeremption;

    addEntree({
      pointDeVenteId: form.pointDeVenteId,
      produitId: form.produitId,
      quantite,
      prixAchatUnitaire: prixAchat,
      prixVenteUnitaire: prixVente,
      fournisseur: "Stock initial",
      date: new Date(form.date).toISOString(),
      note: form.note.trim() || "Ouverture d'inventaire",
      origine: "stock_initial",
      datePeremption: produitGerePeremption && form.datePeremption
        ? new Date(form.datePeremption).toISOString()
        : undefined,
    });

    const nouvelleValeur = valeurTotale + quantite * prixAchat;
    updateBilanInitial({ stocks: nouvelleValeur });
    setSelectedPdvId(form.pointDeVenteId);

    setForm((f) => ({
      ...f,
      quantite: "",
      note: "",
      datePeremption: "",
    }));
    setOpen(false);
  }

  function onDelete(id: string) {
    const ligne = stocksInitiaux.find((e) => e.id === id);
    const res = deleteEntree(id);
    if (!res.ok) {
      if (res.reason) alert(res.reason);
      return;
    }
    if (ligne) {
      updateBilanInitial({
        stocks: Math.max(0, valeurTotale - montantAchat(ligne)),
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Stock initial"
        description="Cliquez un point de vente pour afficher et gérer son inventaire d'ouverture."
        showPosSelector={false}
        actions={
          <button className="btn btn-primary" onClick={openFormForSelected}>
            <Plus className="h-4 w-4" />
            Ajouter une ligne
          </button>
        }
      />

      <ParametresSubnav />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Lignes de stock initial</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatNumber(stocksInitiaux.length, 0)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Valeur d&apos;achat totale</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(valeurTotale)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Bilan — stocks d&apos;ouverture</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(bilanInitial.stocks)}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">
          Points de vente
        </h2>
        <p className="mb-3 text-xs text-muted">
          Cliquez une carte pour afficher le détail des stocks initiaux
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recapParPdv.map((r) => {
            const active = selectedPdvId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => selectPdv(r.id)}
                className={`rounded-[var(--radius)] border p-4 text-left transition-all ${
                  active
                    ? "border-sea-500 bg-sea-50 shadow-md ring-2 ring-sea-200"
                    : "border-line bg-card hover:border-sea-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        active
                          ? "bg-sea-600 text-white"
                          : "bg-sea-100 text-sea-700"
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-ink">
                        {r.nom}
                      </p>
                      <p className="text-xs text-muted">
                        {r.ville || "—"}
                        {!r.actif && " · Inactif"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                      active ? "rotate-90 text-sea-700" : ""
                    }`}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line/80 pt-3 text-sm">
                  <div>
                    <dt className="text-[11px] text-muted">Lignes</dt>
                    <dd className="font-semibold">
                      {formatNumber(r.nbLignes, 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">Produits</dt>
                    <dd className="font-semibold">
                      {formatNumber(r.nbProduits, 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">Valeur achat</dt>
                    <dd className="font-semibold">
                      {formatCurrency(r.valeurAchat)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">Part</dt>
                    <dd className="font-semibold">
                      {valeurTotale > 0
                        ? `${(r.part * 100).toFixed(1)} %`
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>
      </div>

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Nouvelle ligne de stock initial
          </h2>
          <form
            onSubmit={onSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <label className="block text-xs font-semibold text-muted">
              Point de vente
              <select
                className="input mt-1"
                value={form.pointDeVenteId}
                onChange={(e) => {
                  setForm({ ...form, pointDeVenteId: e.target.value });
                  setSelectedPdvId(e.target.value);
                }}
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
                className="input mt-1"
                value={form.produitId}
                onChange={(e) => onProduitChange(e.target.value)}
                required
              >
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.libelleCourt} ({p.unite})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Date d&apos;ouverture
              <input
                type="date"
                className="input mt-1"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            {produits.find((p) => p.id === form.produitId)?.gerePeremption && (
              <label className="block text-xs font-semibold text-muted">
                Date de péremption (DLC)
                <input
                  type="date"
                  className="input mt-1"
                  value={form.datePeremption}
                  onChange={(e) =>
                    setForm({ ...form, datePeremption: e.target.value })
                  }
                />
              </label>
            )}
            <label className="block text-xs font-semibold text-muted">
              Quantité
              <input
                type="number"
                min={0.01}
                step="any"
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
                min={0}
                step={100}
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
                min={0}
                step={100}
                className="input mt-1"
                value={form.prixVenteUnitaire}
                onChange={(e) =>
                  setForm({ ...form, prixVenteUnitaire: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2 lg:col-span-3">
              Note (optionnel)
              <input
                className="input mt-1"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Ex. Inventaire au 1er janvier"
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

      {selectedRecap ? (
        <div className="rounded-[var(--radius)] border border-sea-300 bg-card shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                Détail — {selectedRecap.nom}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {formatNumber(detailLignes.length, 0)} ligne
                {detailLignes.length > 1 ? "s" : ""} ·{" "}
                {formatCurrency(detailValeur)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={openFormForSelected}
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedPdvId(null)}
              >
                <X className="h-4 w-4" />
                Fermer
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>P.A. unitaire</th>
                  <th>P.V. unitaire</th>
                  <th>Valeur achat</th>
                  <th>Note</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {detailLignes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted">
                      <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      Aucune ligne pour ce point de vente.
                      <br />
                      <button
                        type="button"
                        className="btn btn-primary mt-3"
                        onClick={openFormForSelected}
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter une ligne
                      </button>
                    </td>
                  </tr>
                ) : (
                  detailLignes.map((e) => {
                    const produit = produits.find((p) => p.id === e.produitId);
                    return (
                      <tr key={e.id}>
                        <td>{formatDate(e.date)}</td>
                        <td className="font-medium">{produit?.libelleCourt ?? "—"}</td>
                        <td>
                          {formatNumber(e.quantite)} {produit?.unite}
                        </td>
                        <td>{formatCurrency(e.prixAchatUnitaire)}</td>
                        <td>{formatCurrency(e.prixVenteUnitaire)}</td>
                        <td className="font-semibold">
                          {formatCurrency(montantAchat(e))}
                        </td>
                        <td className="text-muted">{e.note ?? "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary !px-2 !py-1"
                            onClick={() => onDelete(e.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {detailLignes.length > 0 && (
                <tfoot>
                  <tr className="bg-sea-50/60 font-semibold">
                    <td colSpan={5}>Total {selectedRecap.nom}</td>
                    <td>{formatCurrency(detailValeur)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius)] border border-dashed border-line bg-card px-5 py-10 text-center text-sm text-muted">
          Sélectionnez un point de vente ci-dessus pour afficher le détail des
          stocks initiaux.
        </div>
      )}
    </div>
  );
}
