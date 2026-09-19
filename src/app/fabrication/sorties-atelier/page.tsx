"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import { libelleProduit } from "@/lib/produits";
import { siteEstAtelier } from "@/lib/sites";
import {
  motifsSortieAtelierActifs,
} from "@/lib/sorties-atelier";
import { TYPE_ACHAT_LABELS } from "@/lib/type-achat";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";

export default function SortiesAtelierPage() {
  return (
    <RequirePermission permission="produits.lire">
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const {
    sortiesAtelier,
    motifsSortieAtelier,
    produits,
    pointsDeVente,
    ajouterSortieAtelier,
    supprimerSortieAtelier,
  } = useStore();
  const { visibles, rattache, actif } = useSitesVisibles();
  const ateliers = visibles.filter((s) => s.actif && siteEstAtelier(s) && rattache(s.id));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: jourLocalISO(),
    atelierId: "",
    siteSourceId: "",
    produitId: "",
    quantite: "",
    motifId: "",
    motifLibre: "",
  });
  const [error, setError] = useState<string | null>(null);

  const liste = useMemo(
    () =>
      [...(sortiesAtelier ?? [])]
        .filter(
          (s) =>
            rattache(s.atelierId) &&
            (actif === "tous" || s.atelierId === actif),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sortiesAtelier, rattache, actif],
  );

  const motifs = motifsSortieAtelierActifs(motifsSortieAtelier ?? []);
  const articles = produits.filter((p) => p.actif);

  const nomSite = (id: string) =>
    pointsDeVente.find((s) => s.id === id)?.nom ?? id;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = ajouterSortieAtelier({
      date: isoMidiDepuisJour(form.date),
      atelierId: form.atelierId,
      siteSourceId: form.siteSourceId || form.atelierId,
      produitId: form.produitId,
      quantite: Number(form.quantite) || 0,
      motifId: form.motifId || undefined,
      motifLibre: form.motifLibre,
    });
    if (!res.ok) {
      setError(res.reason ?? "Enregistrement impossible.");
      return;
    }
    setOpen(false);
    setForm((f) => ({ ...f, quantite: "", motifLibre: "" }));
  }

  return (
    <div>
      <PageHeader
        title="Sorties atelier"
        description="Consommation de pièces d'usure et consommables vers un atelier, sans OF ni nomenclature. Le stock est débité au CUMP ; une écriture de charge est générée si les comptes existent."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle sortie
          </button>
        }
      />

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 grid gap-3 rounded-[var(--radius)] border border-sea-200 bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="text-xs font-semibold text-muted">
            Date
            <input
              type="date"
              className="input mt-1"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Atelier destinataire
            <select
              className="select mt-1"
              value={form.atelierId}
              onChange={(e) =>
                setForm({
                  ...form,
                  atelierId: e.target.value,
                  siteSourceId: form.siteSourceId || e.target.value,
                })
              }
              required
            >
              <option value="">—</option>
              {ateliers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Site source (stock)
            <select
              className="select mt-1"
              value={form.siteSourceId || form.atelierId}
              onChange={(e) => setForm({ ...form, siteSourceId: e.target.value })}
            >
              {visibles
                .filter((s) => s.actif && rattache(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Article
            <select
              className="select mt-1"
              value={form.produitId}
              onChange={(e) => setForm({ ...form, produitId: e.target.value })}
              required
            >
              <option value="">—</option>
              {articles.map((p) => (
                <option key={p.id} value={p.id}>
                  {libelleProduit(p)}
                  {p.typeAchat ? ` · ${TYPE_ACHAT_LABELS[p.typeAchat]}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Quantité
            <input
              type="number"
              min={0}
              step="any"
              className="input mt-1"
              value={form.quantite}
              onChange={(e) => setForm({ ...form, quantite: e.target.value })}
              required
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Motif
            <select
              className="select mt-1"
              value={form.motifId}
              onChange={(e) => setForm({ ...form, motifId: e.target.value })}
            >
              <option value="">— Texte libre —</option>
              {motifs.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted sm:col-span-2">
            Précision (facultatif)
            <input
              className="input mt-1"
              value={form.motifLibre}
              onChange={(e) => setForm({ ...form, motifLibre: e.target.value })}
              placeholder="Ex. lame scie atelier Découpe"
            />
          </label>
          {error && (
            <p className="sm:col-span-3 text-sm text-danger">{error}</p>
          )}
          <div className="flex gap-2 sm:col-span-3">
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
      )}

      {liste.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-5 w-5" />}
          title="Aucune sortie atelier"
          description="Les lames, disques et autres pièces d'usure se consomment ici, sans créer d'OF."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Atelier</th>
                <th>Article</th>
                <th>Qté</th>
                <th>CUMP</th>
                <th>Coût</th>
                <th>Motif</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liste.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.date)}</td>
                  <td>{nomSite(s.atelierId)}</td>
                  <td>
                    {(() => {
                      const p = produits.find((x) => x.id === s.produitId);
                      return p ? libelleProduit(p) : s.produitId;
                    })()}
                  </td>
                  <td>{formatNumber(s.quantite)}</td>
                  <td>{formatCurrency(s.cumpSortie)}</td>
                  <td>{formatCurrency(s.valeur)}</td>
                  <td className="text-xs">{s.motif}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary !px-2 !py-1"
                      onClick={() => {
                        if (!confirm("Supprimer cette sortie ? Le stock sera rétabli.")) return;
                        const res = supprimerSortieAtelier(s.id);
                        if (!res.ok) alert(res.reason);
                      }}
                    >
                      Annuler
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
