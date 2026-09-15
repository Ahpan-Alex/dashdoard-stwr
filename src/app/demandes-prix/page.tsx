"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Scale } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatDate } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import { DP_STATUT_LABELS } from "@/lib/demandes-prix";
import { produitEstAchetable } from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import { TIERS_DIVERS_MARCHE_ID } from "@/lib/missions";
import { useStore } from "@/lib/store";
import type { DemandePrixStatut } from "@/lib/types";

function badgeDp(statut: DemandePrixStatut) {
  if (statut === "cloturee") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  if (statut === "annulee") return "badge-danger";
  return "badge-sea";
}

export default function DemandesPrixPage() {
  const router = useRouter();
  const demandesPrix = useStore((s) => s.demandesPrix ?? []);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const creerDemandePrix = useStore((s) => s.creerDemandePrix);
  const [creer, setCreer] = useState(false);

  const liste = useMemo(
    () => [...demandesPrix].sort((a, b) => b.date.localeCompare(a.date)),
    [demandesPrix],
  );

  return (
    <div>
      <PageHeader
        title="Demandes de prix"
        description="Consultez plusieurs fournisseurs, comparez les offres ligne par ligne et classez-les par prix."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreer(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle DP
          </button>
        }
      />

      {creer && (
        <FormulaireDp
          fournisseurs={fournisseurs.filter((f) => f.actif && f.id !== TIERS_DIVERS_MARCHE_ID)}
          onClose={() => setCreer(false)}
          onSubmit={(payload) => {
            const res = creerDemandePrix(payload);
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setCreer(false);
            router.push(`/demandes-prix/${res.id}`);
          }}
        />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Brouillons" value={String(liste.filter((d) => d.statut === "brouillon").length)} />
        <StatCard label="En cours" value={String(liste.filter((d) => d.statut === "en_cours").length)} />
        <StatCard label="Clôturées" value={String(liste.filter((d) => d.statut === "cloturee").length)} />
        <StatCard label="Annulées" value={String(liste.filter((d) => d.statut === "annulee").length)} />
      </div>

      {liste.length === 0 ? (
        <EmptyState
          icon={<Scale className="h-5 w-5" />}
          title="Aucune demande de prix"
          description="Créez une DP, indiquez les articles et les fournisseurs consultés, puis saisissez les prix proposés."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Articles</th>
                <th>Fournisseurs</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/demandes-prix/${d.id}`} className="font-semibold text-sea-800">
                      {d.numero}
                    </Link>
                  </td>
                  <td>{formatDate(d.date)}</td>
                  <td>{d.lignes.length}</td>
                  <td>{d.fournisseurIds.length}</td>
                  <td>
                    <span className={`badge ${badgeDp(d.statut)}`}>{DP_STATUT_LABELS[d.statut]}</span>
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

function FormulaireDp({
  fournisseurs,
  onClose,
  onSubmit,
}: {
  fournisseurs: { id: string; nom: string }[];
  onClose: () => void;
  onSubmit: (data: {
    date: string;
    lignes: { produitId: string; quantite: number }[];
    fournisseurIds: string[];
  }) => void;
}) {
  const produits = useStore((s) => s.produits.filter((p) => p.actif && produitEstAchetable(p)));
  const [date, setDate] = useState(jourLocalISO());
  const [lignes, setLignes] = useState([{ produitId: produits[0]?.id ?? "", quantite: "1" }]);
  const [frns, setFrns] = useState<string[]>(fournisseurs.slice(0, 2).map((f) => f.id));

  function toggleFrn(id: string) {
    setFrns(frns.includes(id) ? frns.filter((x) => x !== id) : [...frns, id]);
  }

  function onForm(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      date: isoMidiDepuisJour(date),
      lignes: lignes
        .filter((l) => l.produitId)
        .map((l) => ({ produitId: l.produitId, quantite: Number(l.quantite) || 0 })),
      fournisseurIds: frns,
    });
  }

  return (
    <form onSubmit={onForm} className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Nouvelle demande de prix</h2>
      <label className="mb-4 block text-xs font-semibold text-muted">
        Date
        <input type="date" className="input mt-1 max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <h3 className="mb-2 text-sm font-semibold">Articles</h3>
      <div className="space-y-2">
        {lignes.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
            <select
              className="select"
              value={l.produitId}
              onChange={(e) => setLignes(lignes.map((x, j) => (j === i ? { ...x, produitId: e.target.value } : x)))}
            >
              <option value="">Article</option>
              {produits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {libelleProduit(p)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step="any"
              className="input"
              value={l.quantite}
              onChange={(e) => setLignes(lignes.map((x, j) => (j === i ? { ...x, quantite: e.target.value } : x)))}
            />
            <button type="button" className="btn btn-secondary" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>
              Retirer
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary mt-2"
        onClick={() => setLignes([...lignes, { produitId: produits[0]?.id ?? "", quantite: "1" }])}
      >
        Ajouter un article
      </button>
      <h3 className="mb-2 mt-5 text-sm font-semibold">Fournisseurs consultés</h3>
      <div className="flex flex-wrap gap-2">
        {fournisseurs.map((f) => (
          <label key={f.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm">
            <input type="checkbox" checked={frns.includes(f.id)} onChange={() => toggleFrn(f.id)} />
            {f.nom}
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary">
          Créer
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
