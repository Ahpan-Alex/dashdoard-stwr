"use client";

import { FormEvent, useMemo, useState } from "react";
import { Factory, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  ateliersVisibles,
  OF_STATUT_LABELS,
  quantiteProduite,
} from "@/lib/fabrication";
import { formatDate, formatNumber } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import { produitEstFabrique } from "@/lib/nature-stock";
import { nomenclatureParType } from "@/lib/nomenclature";
import { libelleProduit } from "@/lib/produits";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import type { OrdreFabricationStatut, TypeNomenclature } from "@/lib/types";

function badgeOf(statut: OrdreFabricationStatut) {
  if (statut === "cloture") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  if (statut === "annule" || statut === "cloture_annule") return "badge-danger";
  return "badge-sea";
}

export default function FabricationPage() {
  const router = useRouter();
  const { ordresFabrication, produits, commandes, creerOrdreFabrication } = useStore();
  const { visibles, rattache, actif } = useSitesVisibles();
  const ateliers = ateliersVisibles(visibles, rattache);
  const [creer, setCreer] = useState(false);

  const liste = useMemo(
    () =>
      [...ordresFabrication]
        .filter(
          (o) =>
            rattache(o.atelierId) &&
            (actif === "tous" || o.atelierId === actif),
        )
        .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)),
    [ordresFabrication, rattache, actif],
  );

  const nomAtelier = (id: string) =>
    visibles.find((s) => s.id === id)?.nom ??
    useStore.getState().pointsDeVente.find((s) => s.id === id)?.nom ??
    "Atelier";

  return (
    <div>
      <PageHeader
        title="Ordres de fabrication"
        description="Consommation de matières et semi-finis, production valorisée au pot de coûts, sans écriture comptable. Les mouvements entre ateliers passent par les transferts de stock."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreer(true)}>
            <Plus className="h-4 w-4" />
            Nouvel OF
          </button>
        }
      />

      {creer && (
        <FormulaireOf
          ateliers={ateliers}
          defautAtelier={actif !== "tous" ? actif : ateliers[0]?.id ?? ""}
          onClose={() => setCreer(false)}
          onSubmit={(payload) => {
            const res = creerOrdreFabrication(payload);
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setCreer(false);
            router.push(`/fabrication/${res.id}`);
          }}
        />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Brouillons" value={String(liste.filter((o) => o.statut === "brouillon").length)} />
        <StatCard label="En cours" value={String(liste.filter((o) => o.statut === "en_cours").length)} />
        <StatCard label="Clôturés" value={String(liste.filter((o) => o.statut === "cloture").length)} />
        <StatCard
          label="Annulés"
          value={String(liste.filter((o) => o.statut === "annule" || o.statut === "cloture_annule").length)}
        />
      </div>

      {liste.length === 0 ? (
        <EmptyState
          icon={<Factory className="h-5 w-5" />}
          title="Aucun ordre de fabrication"
          description="Déclarez d'abord des sites atelier, des nomenclatures sur les semi-finis / finis, puis créez un OF."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>N°</th>
                <th>Atelier</th>
                <th>Produit</th>
                <th>Qté prévue</th>
                <th>Produite</th>
                <th>Commande</th>
                <th>Statut</th>
                <th>Créé</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((o) => {
                const p = produits.find((x) => x.id === o.produitId);
                const cmd = commandes.find((c) => c.id === o.commandeId);
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/fabrication/${o.id}`} className="font-semibold text-sea-800">
                        {o.numero}
                      </Link>
                    </td>
                    <td>{nomAtelier(o.atelierId)}</td>
                    <td>{p ? `${p.code} — ${libelleProduit(p)}` : "—"}</td>
                    <td>{formatNumber(o.quantitePrevue)}</td>
                    <td>{formatNumber(quantiteProduite(o))}</td>
                    <td>{cmd?.numero ?? "—"}</td>
                    <td>
                      <span className={`badge ${badgeOf(o.statut)}`}>
                        {OF_STATUT_LABELS[o.statut]}
                      </span>
                    </td>
                    <td>{formatDate(o.dateCreation)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormulaireOf({
  ateliers,
  defautAtelier,
  onClose,
  onSubmit,
}: {
  ateliers: { id: string; nom: string }[];
  defautAtelier: string;
  onClose: () => void;
  onSubmit: (data: {
    atelierId: string;
    produitId: string;
    quantitePrevue: number;
    nomenclatureSource?: TypeNomenclature;
    commandeId?: string;
    dateCloturePrevue?: string;
  }) => void;
}) {
  const produits = useStore((s) => s.produits.filter((p) => p.actif && produitEstFabrique(p)));
  const commandes = useStore((s) =>
    s.commandes.filter((c) => c.statut !== "annulee" && c.statut !== "livree"),
  );
  const [atelierId, setAtelierId] = useState(defautAtelier);
  const [produitId, setProduitId] = useState(produits[0]?.id ?? "");
  const [qte, setQte] = useState("1");
  const [source, setSource] = useState<TypeNomenclature>("automatique");
  const [commandeId, setCommandeId] = useState("");
  const [cloturePrevue, setCloturePrevue] = useState("");

  const produit = produits.find((p) => p.id === produitId);
  const alt = produit ? nomenclatureParType(produit, "alternative") : undefined;

  function onForm(e: FormEvent) {
    e.preventDefault();
    if (!atelierId || !produitId) return;
    onSubmit({
      atelierId,
      produitId,
      quantitePrevue: Number(qte) || 0,
      nomenclatureSource: source,
      commandeId: commandeId || undefined,
      dateCloturePrevue: cloturePrevue ? isoMidiDepuisJour(cloturePrevue) : undefined,
    });
  }

  return (
    <form
      onSubmit={onForm}
      className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5"
    >
      <h2 className="mb-4 font-display text-lg font-semibold">Nouvel ordre de fabrication</h2>
      {ateliers.length === 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Aucun atelier rattaché. Créez un site de type Atelier ou Atelier final dans
          Paramétrage → Sites.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-muted">
          Atelier
          <select
            className="select mt-1"
            value={atelierId}
            onChange={(e) => setAtelierId(e.target.value)}
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
        <label className="block text-xs font-semibold text-muted">
          Produit à fabriquer
          <select
            className="select mt-1"
            value={produitId}
            onChange={(e) => {
              setProduitId(e.target.value);
              setSource("automatique");
            }}
            required
          >
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {libelleProduit(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Quantité prévue
          <input
            type="number"
            min={0}
            step="any"
            className="input mt-1"
            value={qte}
            onChange={(e) => setQte(e.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Nomenclature
          <select
            className="select mt-1"
            value={source}
            onChange={(e) => setSource(e.target.value as TypeNomenclature)}
          >
            <option value="automatique">Nomenclature standard</option>
            {alt && <option value="alternative">{alt.nom}</option>}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Commande client (MTO, optionnel)
          <select
            className="select mt-1"
            value={commandeId}
            onChange={(e) => setCommandeId(e.target.value)}
          >
            <option value="">Réappro stock (MTS)</option>
            {commandes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Clôture prévue
          <input
            type="date"
            className="input mt-1"
            value={cloturePrevue}
            onChange={(e) => setCloturePrevue(e.target.value)}
            min={jourLocalISO()}
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={ateliers.length === 0}>
          Créer le brouillon
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
