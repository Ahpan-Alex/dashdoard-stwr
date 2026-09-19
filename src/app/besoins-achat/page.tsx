"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CouvertureBarre } from "@/components/couverture-besoin";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RepartitionOfLigne } from "@/components/repartition-of-ligne";
import { SelecteurArticle } from "@/components/selecteur-article";
import { StatCard } from "@/components/stat-card";
import {
  badgeClasseBesoin,
  BESOIN_ACHAT_STATUT_LABELS,
  couvertureBesoin,
  statutBesoinAchat,
} from "@/lib/besoins-achat";
import { formatDate } from "@/lib/format";
import { produitEstAchetable } from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import type { AchatRepartitionOf, Produit } from "@/lib/types";

export default function BesoinsAchatPage() {
  const router = useRouter();
  const besoins = useStore((s) => s.besoinsAchat ?? []);
  const achats = useStore((s) => s.achats);
  const produits = useStore((s) => s.produits);
  const categoriesProduits = useStore((s) => s.categoriesProduits);
  const creerBesoinAchat = useStore((s) => s.creerBesoinAchat);
  const { visibles, actif } = useSitesVisibles();
  const [creer, setCreer] = useState(false);
  const [filtre, setFiltre] = useState<"actifs" | "tous">("actifs");

  const liste = useMemo(() => {
    return [...besoins]
      .filter((b) => actif === "tous" || b.pointDeVenteId === actif)
      .filter((b) => {
        const st = statutBesoinAchat(b, achats);
        if (filtre === "actifs") return st === "ouvert" || st === "partiel";
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [besoins, achats, actif, filtre]);

  return (
    <div>
      <PageHeader
        title="Besoins d'achat"
        description="Un même besoin matière peut être couvert par plusieurs commandes fournisseurs indépendantes (prix, paiement, facture propres à chacune)."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreer(true)}>
            <Plus className="h-4 w-4" />
            Nouveau besoin
          </button>
        }
      />

      {creer && (
        <FormulaireBesoin
          produits={produits.filter(
            (p) => p.actif && produitEstAchetable(p, categoriesProduits),
          )}
          siteDefaut={actif !== "tous" ? actif : visibles.find((s) => s.actif)?.id ?? ""}
          sites={visibles.filter((s) => s.actif)}
          onClose={() => setCreer(false)}
          onSubmit={(payload) => {
            const res = creerBesoinAchat(payload);
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setCreer(false);
            router.push(`/besoins-achat/${res.id}`);
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`btn ${filtre === "actifs" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFiltre("actifs")}
        >
          Ouverts / partiels
        </button>
        <button
          type="button"
          className={`btn ${filtre === "tous" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFiltre("tous")}
        >
          Tous
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Ouverts"
          value={String(
            besoins.filter((b) => statutBesoinAchat(b, achats) === "ouvert").length,
          )}
        />
        <StatCard
          label="Partiels"
          value={String(
            besoins.filter((b) => statutBesoinAchat(b, achats) === "partiel").length,
          )}
        />
        <StatCard
          label="Couverts"
          value={String(
            besoins.filter((b) => statutBesoinAchat(b, achats) === "couvert").length,
          )}
        />
      </div>

      {liste.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-5 w-5" />}
          title="Aucun besoin"
          description="Créez un besoin (article + quantité), puis ajoutez autant de commandes fournisseurs que nécessaire pour le couvrir."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Article</th>
                <th>Couverture</th>
                <th>Fournisseurs</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((b) => {
                const p = produits.find((x) => x.id === b.produitId);
                const cov = couvertureBesoin(b, achats);
                const st = statutBesoinAchat(b, achats);
                return (
                  <tr key={b.id}>
                    <td>
                      <Link
                        href={`/besoins-achat/${b.id}`}
                        className="font-semibold text-sea-800 hover:underline"
                      >
                        {b.numero}
                      </Link>
                    </td>
                    <td>{formatDate(b.date)}</td>
                    <td>{p ? `${p.code} — ${libelleProduit(p)}` : "Article"}</td>
                    <td>
                      <CouvertureBarre
                        commandee={cov.commandee}
                        necessaire={cov.necessaire}
                        unite={p?.unite ?? ""}
                      />
                    </td>
                    <td>{cov.nbFournisseurs || "—"}</td>
                    <td>
                      <span className={`badge ${badgeClasseBesoin(st)}`}>
                        {BESOIN_ACHAT_STATUT_LABELS[st]}
                      </span>
                    </td>
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

function FormulaireBesoin({
  produits,
  siteDefaut,
  sites,
  onClose,
  onSubmit,
}: {
  produits: Produit[];
  siteDefaut: string;
  sites: { id: string; nom: string }[];
  onClose: () => void;
  onSubmit: (data: {
    produitId: string;
    quantiteNecessaire: number;
    pointDeVenteId: string;
    repartitionsOf?: AchatRepartitionOf[];
    note?: string;
  }) => void;
}) {
  const [produitId, setProduitId] = useState(produits[0]?.id ?? "");
  const [quantite, setQuantite] = useState("100");
  const [siteId, setSiteId] = useState(siteDefaut || sites[0]?.id || "");
  const [repartitionsOf, setRepartitionsOf] = useState<AchatRepartitionOf[]>([]);
  const [note, setNote] = useState("");
  const qte = Number(quantite) || 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!produitId || !siteId) return;
    onSubmit({
      produitId,
      quantiteNecessaire: qte,
      pointDeVenteId: siteId,
      repartitionsOf,
      note: note.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5"
    >
      <h2 className="mb-3 font-display text-lg font-semibold">Nouveau besoin</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SelecteurArticle
            produits={produits}
            value={produitId}
            onChange={(id) => {
              setProduitId(id);
              setRepartitionsOf([]);
            }}
          />
        </div>
        <label className="text-xs font-semibold text-muted">
          Quantité nécessaire
          <input
            type="number"
            min={0}
            step="any"
            className="input mt-1"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Site de réception
          <select
            className="select mt-1"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            required
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted sm:col-span-2">
          Note
          <input
            className="input mt-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optionnel"
          />
        </label>
      </div>
      {produitId && qte > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-muted">
            Répartition vers les OF (optionnel — le reliquat reste en stock libre)
          </p>
          <RepartitionOfLigne
            ligne={{
              id: "besoin-tmp",
              produitId,
              quantite: qte,
              prixAchatUnitaire: 0,
              repartitionsOf,
            }}
            siteDefaut={siteId}
            onChange={setRepartitionsOf}
          />
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary">
          Créer le besoin
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
