"use client";

import { Component, FormEvent, useMemo, useState, type ReactNode } from "react";
import { Plus, Scale } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SelecteurArticle } from "@/components/selecteur-article";
import { StatCard } from "@/components/stat-card";
import { formatDate } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import { DP_STATUT_LABELS } from "@/lib/demandes-prix";
import { produitEstAchetable } from "@/lib/nature-stock";
import { TIERS_DIVERS_MARCHE_ID } from "@/lib/missions";
import { assurerTiers, estFournisseur } from "@/lib/tiers";
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
  const clients = useStore((s) => s.clients);
  const fournisseursLegacy = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);
  const creerDemandePrix = useStore((s) => s.creerDemandePrix);
  const [creer, setCreer] = useState(false);

  const fournisseurs = useMemo(
    () =>
      assurerTiers({
        clients,
        fournisseurs: fournisseursLegacy,
        tiers,
      }).filter(
        (t) =>
          t.actif !== false &&
          estFournisseur(t) &&
          t.id !== TIERS_DIVERS_MARCHE_ID &&
          !t.systeme,
      ),
    [clients, fournisseursLegacy, tiers],
  );

  const liste = useMemo(
    () => [...demandesPrix].sort((a, b) => b.date.localeCompare(a.date)),
    [demandesPrix],
  );

  return (
    <div>
      <PageHeader
        title="Demandes de prix"
        description="Consultez plusieurs fournisseurs, comparez les offres article par article et classez-les par prix."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreer(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle DP
          </button>
        }
      />

      {creer && (
        <FormulaireDpGuard onClose={() => setCreer(false)}>
          <FormulaireDp
            fournisseurs={fournisseurs.map((f) => ({ id: f.id, nom: f.nom }))}
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
        </FormulaireDpGuard>
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

function FormulaireDpGuard({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <FormulaireDpBoundary onClose={onClose}>{children}</FormulaireDpBoundary>
  );
}

class FormulaireDpBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { erreur: string | null }
> {
  state: { erreur: string | null } = { erreur: null };

  static getDerivedStateFromError(erreur: Error) {
    return { erreur: erreur.message || "Erreur d’affichage du formulaire." };
  }

  render() {
    if (this.state.erreur) {
      return (
        <div className="mb-6 rounded-[var(--radius)] border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-900">
            Impossible d’ouvrir le formulaire de nouvelle DP.
          </p>
          <p className="mt-1 text-sm text-red-800">{this.state.erreur}</p>
          <button type="button" className="btn btn-secondary mt-3" onClick={this.props.onClose}>
            Fermer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
  const produits = useStore((s) => s.produits);
  const articles = useMemo(
    () => (produits ?? []).filter((p) => p?.actif && produitEstAchetable(p)),
    [produits],
  );
  const [date, setDate] = useState(jourLocalISO());
  const [lignes, setLignes] = useState([{ produitId: "", quantite: "1" }]);
  const [frns, setFrns] = useState<string[]>([]);
  const [rechercheFrn, setRechercheFrn] = useState("");

  const frnsFiltres = useMemo(() => {
    const q = rechercheFrn.trim().toLowerCase();
    if (!q) return fournisseurs;
    return fournisseurs.filter((f) =>
      String(f.nom ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [fournisseurs, rechercheFrn]);

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
      <h3 className="mb-2 text-sm font-semibold">Articles à consulter</h3>
      {articles.length === 0 ? (
        <p className="mb-4 text-sm text-muted">
          Aucun article achetable (matière première) dans le catalogue. Créez-en un avant
          de lancer une DP.
        </p>
      ) : (
        <div className="space-y-4">
          {lignes.map((l, i) => (
            <div key={i} className="rounded-[var(--radius)] border border-line p-3">
              <SelecteurArticle
                produits={articles}
                value={l.produitId}
                onChange={(produitId) =>
                  setLignes(lignes.map((x, j) => (j === i ? { ...x, produitId } : x)))
                }
                allowEmpty
                emptyLabel="— Choisir un article —"
              />
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="block text-xs font-semibold text-muted">
                  Quantité
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="input mt-1 w-32"
                    value={l.quantite}
                    onChange={(e) =>
                      setLignes(lignes.map((x, j) => (j === i ? { ...x, quantite: e.target.value } : x)))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setLignes(lignes.filter((_, j) => j !== i))}
                >
                  Retirer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn btn-secondary mt-2"
        onClick={() => setLignes([...lignes, { produitId: "", quantite: "1" }])}
        disabled={articles.length === 0}
      >
        Ajouter un article
      </button>
      <h3 className="mb-2 mt-5 text-sm font-semibold">Fournisseurs consultés</h3>
      {fournisseurs.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun fournisseur actif. Créez-en un dans Tiers avant de lancer une DP.
        </p>
      ) : (
        <>
          <input
            className="input mb-2 max-w-md"
            placeholder="Filtrer les fournisseurs…"
            value={rechercheFrn}
            onChange={(e) => setRechercheFrn(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {frnsFiltres.map((f) => (
              <label key={f.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm">
                <input type="checkbox" checked={frns.includes(f.id)} onChange={() => toggleFrn(f.id)} />
                {f.nom}
              </label>
            ))}
          </div>
        </>
      )}
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
