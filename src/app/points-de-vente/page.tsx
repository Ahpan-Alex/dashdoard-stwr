"use client";

import Link from "next/link";
import { MapPin, Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { chiffreAffaires, calculerStocks } from "@/lib/calculations";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function PointsDeVentePage() {
  const { pointsDeVente, ventes, entrees, produits, inventaires } = useStore();

  return (
    <div>
      <PageHeader
        title="Points de vente"
        description="Vue opérationnelle des emplacements. La création et le paramétrage se font dans Paramétrage."
        showPosSelector={false}
        actions={
          <Link
            href="/parametres/points-de-vente"
            className="btn btn-primary"
          >
            <Settings className="h-4 w-4" />
            Paramétrer les points de vente
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pointsDeVente.map((pdv) => {
          const caMois = chiffreAffaires(ventes, pdv.id, "mois");
          const caAnnee = chiffreAffaires(ventes, pdv.id, "annee");
          const stocks = calculerStocks(
            produits,
            entrees,
            ventes,
            pdv.id,
            pointsDeVente,
            undefined,
            inventaires,
          );
          const valeurStock = stocks.reduce((s, l) => s + l.valeurAchat, 0);

          return (
            <article
              key={pdv.id}
              className="rounded-[var(--radius)] border border-line bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-100 text-sea-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {pdv.nom}
                    </h3>
                    <p className="text-xs text-muted">
                      {pdv.adresse}
                      {pdv.ville ? `, ${pdv.ville}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`badge ${pdv.actif ? "badge-success" : "badge-sand"}`}
                >
                  {pdv.actif ? "Actif" : "Inactif"}
                </span>
              </div>

              {pdv.telephone && (
                <p className="mt-3 text-sm text-muted">{pdv.telephone}</p>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted">CA mois</dt>
                  <dd className="font-semibold">{formatCurrency(caMois)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Objectif CA mois</dt>
                  <dd className="font-semibold">
                    {formatCurrency(pdv.objectifCAMensuel ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Objectif CA année</dt>
                  <dd className="font-semibold">
                    {formatCurrency(pdv.objectifCAAnnuel ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Objectif marge mois</dt>
                  <dd className="font-semibold">
                    {formatCurrency(pdv.objectifMargeMensuel ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Objectif marge année</dt>
                  <dd className="font-semibold">
                    {formatCurrency(pdv.objectifMargeAnnuel ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">CA année</dt>
                  <dd className="font-semibold">{formatCurrency(caAnnee)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Stock</dt>
                  <dd className="font-semibold">
                    {formatCurrency(valeurStock)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Références</dt>
                  <dd className="font-semibold">
                    {formatNumber(stocks.length, 0)}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}
