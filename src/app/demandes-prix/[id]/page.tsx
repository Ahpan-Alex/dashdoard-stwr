"use client";

import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  DP_STATUT_LABELS,
  dpEstVerrouillee,
  offreLigneFournisseur,
  prixMiniLigne,
  rangsPrixParFournisseur,
  trierOffresParPrix,
} from "@/lib/demandes-prix";
import { libelleProduit } from "@/lib/produits";
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
  const produits = useStore((s) => s.produits);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const { modifierDemandePrix, changerStatutDemandePrix } = useStore();
  const [triPrix, setTriPrix] = useState<"asc" | "desc">("asc");

  const nomFrn = (fid: string) => fournisseurs.find((f) => f.id === fid)?.nom ?? "Fournisseur";

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

  function majOffre(ligneId: string, fournisseurId: string, patch: Partial<DemandePrixOffre>) {
    const exist = offreLigneFournisseur(dp!, ligneId, fournisseurId);
    const offres = exist
      ? dp!.offres.map((o) => (o.id === exist.id ? { ...o, ...patch } : o))
      : [
          ...dp!.offres,
          {
            id: `dpo-${ligneId}-${fournisseurId}`,
            ligneId,
            fournisseurId,
            prixUnitaire: 0,
            ...patch,
          },
        ];
    const res = modifierDemandePrix(dp!.id, { offres });
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title={dp.numero}
        description="Tableau comparatif ligne par ligne : rang automatique selon le prix proposé, mise en évidence du plus bas."
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

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Comparatif ligne par ligne</h2>
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

        <div className="space-y-6">
          {dp.lignes.map((ligne) => {
            const p = produits.find((x) => x.id === ligne.produitId);
            const offresLigne = dp.offres.filter((o) => o.ligneId === ligne.id);
            const triées = trierOffresParPrix(offresLigne, triPrix);
            const rangs = rangsPrixParFournisseur(offresLigne);
            const mini = prixMiniLigne(dp.offres, ligne.id);
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
                          <tr key={o.id} className={bas ? "bg-emerald-50" : undefined}>
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
                                      delaiJours: e.target.value === "" ? undefined : Number(e.target.value),
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
      </section>
    </div>
  );
}
