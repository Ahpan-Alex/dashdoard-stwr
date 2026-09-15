"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SelecteurArticle } from "@/components/selecteur-article";
import { formatCurrency, formatDate } from "@/lib/format";
import { createId } from "@/lib/id";
import {
  DP_STATUT_LABELS,
  dpEstVerrouillee,
  offreLigneFournisseur,
  prixMiniLigne,
  rangsPrixParFournisseur,
  trierOffresParPrix,
} from "@/lib/demandes-prix";
import { produitEstAchetable } from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import { TIERS_DIVERS_MARCHE_ID } from "@/lib/missions";
import { assurerTiers, estFournisseur } from "@/lib/tiers";
import { useStore } from "@/lib/store";
import type { DemandePrixOffre, DemandePrixStatut } from "@/lib/types";

function badgeDp(statut: DemandePrixStatut) {
  if (statut === "cloturee") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  if (statut === "annulee") return "badge-danger";
  return "badge-sea";
}

export default function DemandePrixDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const dp = useStore((s) => (s.demandesPrix ?? []).find((d) => d.id === id));
  const produits = useStore((s) => s.produits ?? []);
  const clients = useStore((s) => s.clients);
  const fournisseursLegacy = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);
  const modifierDemandePrix = useStore((s) => s.modifierDemandePrix);
  const changerStatutDemandePrix = useStore((s) => s.changerStatutDemandePrix);
  const patchOffreDemandePrix = useStore((s) => s.patchOffreDemandePrix);
  const [triPrix, setTriPrix] = useState<"asc" | "desc">("asc");
  const [nouvelArticleId, setNouvelArticleId] = useState("");
  const [nouvelleQte, setNouvelleQte] = useState("1");

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

  const nomFrn = (fid: string) =>
    fournisseurs.find((f) => f.id === fid)?.nom ??
    fournisseursLegacy.find((f) => f.id === fid)?.nom ??
    "Fournisseur";

  const articles = useMemo(
    () => (produits ?? []).filter((p) => p?.actif && produitEstAchetable(p)),
    [produits],
  );

  if (!dp) {
    return (
      <div>
        <PageHeader title="Demande de prix introuvable" showPosSelector={false} />
        <Link href="/demandes-prix" className="text-sm text-sea-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const verrouille = dpEstVerrouillee(dp);
  const brouillon = dp.statut === "brouillon";

  function majOffre(
    ligneId: string,
    fournisseurId: string,
    patch: Partial<Pick<DemandePrixOffre, "prixUnitaire" | "delaiJours">>,
  ) {
    const res = patchOffreDemandePrix(dp!.id, ligneId, fournisseurId, patch);
    if (!res.ok) alert(res.reason);
  }

  function ajouterArticle() {
    if (!nouvelArticleId) {
      alert("Choisissez un article.");
      return;
    }
    const qte = Number(nouvelleQte);
    if (!(qte > 0)) {
      alert("Indiquez une quantité positive.");
      return;
    }
    if ((dp!.lignes ?? []).some((l) => l.produitId === nouvelArticleId)) {
      alert("Cet article est déjà dans la demande.");
      return;
    }
    const res = modifierDemandePrix(dp!.id, {
      lignes: [
        ...(dp!.lignes ?? []),
        { id: createId("dpl"), produitId: nouvelArticleId, quantite: qte },
      ],
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    setNouvelArticleId("");
    setNouvelleQte("1");
  }

  function retirerArticle(ligneId: string) {
    const res = modifierDemandePrix(dp!.id, {
      lignes: (dp!.lignes ?? []).filter((l) => l.id !== ligneId),
    });
    if (!res.ok) alert(res.reason);
  }

  function toggleFrn(fid: string) {
    const actuel = dp!.fournisseurIds ?? [];
    const next = actuel.includes(fid)
      ? actuel.filter((x) => x !== fid)
      : [...actuel, fid];
    const res = modifierDemandePrix(dp!.id, { fournisseurIds: next });
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title={dp.numero}
        description="Tableau comparatif article par article : rang automatique selon le prix proposé, mise en évidence du plus bas."
        showPosSelector={false}
        actions={
          <Link href="/demandes-prix" className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Liste
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`badge ${badgeDp(dp.statut)}`}>{DP_STATUT_LABELS[dp.statut]}</span>
        <span className="text-sm text-muted">{formatDate(dp.date)}</span>
      </div>

      {!verrouille && (
        <div className="mb-6 flex flex-wrap gap-2">
          {dp.statut === "brouillon" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const res = changerStatutDemandePrix(dp.id, "en_cours");
                if (!res.ok) alert(res.reason);
              }}
            >
              Passer en cours
            </button>
          )}
          {dp.statut === "en_cours" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const res = changerStatutDemandePrix(dp.id, "cloturee");
                if (!res.ok) alert(res.reason);
              }}
            >
              Clôturer
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (!confirm("Annuler cette demande de prix ?")) return;
              const res = changerStatutDemandePrix(dp.id, "annulee");
              if (!res.ok) alert(res.reason);
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {brouillon && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Articles et fournisseurs</h2>
          <div className="mb-4 space-y-2">
            {(dp.lignes ?? []).map((ligne) => {
              const p = produits.find((x) => x.id === ligne.produitId);
              return (
                <div key={ligne.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {p ? `${p.code} — ${libelleProduit(p)}` : "Article"} · qté {ligne.quantite}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => retirerArticle(ligne.id)}
                  >
                    Retirer
                  </button>
                </div>
              );
            })}
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_8rem_auto]">
            <SelecteurArticle
              produits={articles}
              value={nouvelArticleId}
              onChange={setNouvelArticleId}
              allowEmpty
              emptyLabel="— Ajouter un article —"
            />
            <label className="block text-xs font-semibold text-muted">
              Quantité
              <input
                type="number"
                min={0}
                step="any"
                className="input mt-1"
                value={nouvelleQte}
                onChange={(e) => setNouvelleQte(e.target.value)}
              />
            </label>
            <button type="button" className="btn btn-secondary self-end" onClick={ajouterArticle}>
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          <h3 className="mb-2 mt-5 text-sm font-semibold">Fournisseurs consultés</h3>
          <div className="flex flex-wrap gap-2">
            {fournisseurs.map((f) => (
              <label key={f.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={(dp.fournisseurIds ?? []).includes(f.id)}
                  onChange={() => toggleFrn(f.id)}
                />
                {f.nom}
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Comparatif article par article</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setTriPrix(triPrix === "asc" ? "desc" : "asc")}
          >
            {triPrix === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            Prix {triPrix === "asc" ? "croissant" : "décroissant"}
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          Le rang (1, 2, 3…) est calculé automatiquement d&apos;après le prix proposé pour chaque
          article. Le prix le plus bas est mis en évidence.
        </p>

        {(dp.lignes ?? []).length === 0 || (dp.fournisseurIds ?? []).length === 0 ? (
          <p className="text-sm text-muted">
            Ajoutez au moins un article et un fournisseur (en brouillon) pour saisir les prix.
          </p>
        ) : (
          <div className="space-y-6">
            {(dp.lignes ?? []).map((ligne) => {
              const p = produits.find((x) => x.id === ligne.produitId);
              const rows: DemandePrixOffre[] = (dp.fournisseurIds ?? []).map((fid) => {
                const exist = offreLigneFournisseur(dp, ligne.id, fid);
                return (
                  exist ?? {
                    id: `tmp-${ligne.id}-${fid}`,
                    ligneId: ligne.id,
                    fournisseurId: fid,
                    prixUnitaire: 0,
                  }
                );
              });
              const triées = trierOffresParPrix(rows, triPrix);
              const rangs = rangsPrixParFournisseur(triées);
              const mini = prixMiniLigne(triées, ligne.id);
              return (
                <div key={ligne.id}>
                  <h3 className="mb-2 text-sm font-semibold">
                    {p ? `${p.code} — ${libelleProduit(p)}` : "Article"}{" "}
                    <span className="font-normal text-muted">· qté {ligne.quantite}</span>
                  </h3>
                  <div className="table-shell">
                    <table className="data">
                      <thead>
                        <tr>
                          <th>Rang</th>
                          <th>Fournisseur</th>
                          <th>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-semibold"
                              onClick={() => setTriPrix(triPrix === "asc" ? "desc" : "asc")}
                            >
                              Prix
                              {triPrix === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </th>
                          <th>Délai (j)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {triées.map((o) => {
                          const rang = rangs.get(o.fournisseurId);
                          const bas = mini != null && o.prixUnitaire > 0 && o.prixUnitaire === mini;
                          return (
                            <tr key={`${o.ligneId}-${o.fournisseurId}`} className={bas ? "bg-emerald-50" : undefined}>
                              <td className="font-semibold">{rang ?? "—"}</td>
                              <td>{nomFrn(o.fournisseurId)}</td>
                              <td>
                                {verrouille ? (
                                  o.prixUnitaire > 0 ? (
                                    <span className={bas ? "font-semibold text-emerald-800" : undefined}>
                                      {formatCurrency(o.prixUnitaire)}
                                      {bas ? " · plus bas" : ""}
                                    </span>
                                  ) : (
                                    "—"
                                  )
                                ) : (
                                  <input
                                    type="number"
                                    min={0}
                                    className={`input w-32 ${bas ? "border-emerald-400" : ""}`}
                                    value={o.prixUnitaire || ""}
                                    onChange={(e) =>
                                      majOffre(ligne.id, o.fournisseurId, {
                                        prixUnitaire: Number(e.target.value) || 0,
                                      })
                                    }
                                  />
                                )}
                              </td>
                              <td>
                                {verrouille ? (
                                  o.delaiJours ?? "—"
                                ) : (
                                  <input
                                    type="number"
                                    min={0}
                                    className="input w-20"
                                    value={o.delaiJours ?? ""}
                                    onChange={(e) =>
                                      majOffre(ligne.id, o.fournisseurId, {
                                        delaiJours:
                                          e.target.value === "" ? undefined : Number(e.target.value),
                                      })
                                    }
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
