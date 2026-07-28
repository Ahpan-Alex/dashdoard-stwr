"use client";

import Link from "next/link";
import { MapPin, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { chiffreAffaires } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ObjectifsRevenuPage() {
  const { pointsDeVente, ventes, updatePointDeVente } = useStore();

  const totalObjectif = pointsDeVente.reduce(
    (s, p) => s + (p.objectifCAMensuel ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Objectifs de revenu"
        description="Définissez l'objectif de chiffre d'affaires mensuel pour chaque point de vente."
        showPosSelector={false}
        actions={
          <Link
            href="/tableau-de-bord/ca-objectifs"
            className="btn btn-secondary"
          >
            <TrendingUp className="h-4 w-4" />
            Voir le suivi
          </Link>
        }
      />

      <ParametresSubnav />

      <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-sea-50/60 px-4 py-3 text-sm text-sea-900">
        <div className="flex items-start gap-2">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-sea-700" />
          <p>
            Objectif global mensuel :{" "}
            <strong>{formatCurrency(totalObjectif)}</strong>
            {pointsDeVente.length > 0 && (
              <span className="text-muted">
                {" "}
                · {pointsDeVente.length} point
                {pointsDeVente.length > 1 ? "s" : ""} de vente
              </span>
            )}
          </p>
        </div>
      </div>

      {pointsDeVente.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-line bg-card p-8 text-center">
          <p className="text-sm text-muted">
            Aucun point de vente. Créez-en un pour fixer des objectifs.
          </p>
          <Link href="/points-de-vente" className="btn btn-primary mt-4">
            <MapPin className="h-4 w-4" />
            Points de vente
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pointsDeVente.map((pdv) => {
            const objectif = pdv.objectifCAMensuel ?? 0;
            const realise = chiffreAffaires(ventes, pdv.id, "mois");
            const taux = objectif > 0 ? realise / objectif : 0;

            return (
              <article
                key={pdv.id}
                className="rounded-[var(--radius)] border border-line bg-card p-5"
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
                        {[pdv.adresse, pdv.ville].filter(Boolean).join(", ") ||
                          "—"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`badge ${pdv.actif ? "badge-success" : "badge-sand"}`}
                  >
                    {pdv.actif ? "Actif" : "Inactif"}
                  </span>
                </div>

                <label className="mt-5 block text-xs font-semibold text-muted">
                  Objectif de revenu mensuel (Ar)
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    className="input mt-1.5"
                    value={objectif}
                    onChange={(e) =>
                      updatePointDeVente(pdv.id, {
                        objectifCAMensuel: Math.max(
                          0,
                          Number(e.target.value) || 0,
                        ),
                      })
                    }
                  />
                </label>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted">CA réalisé (mois)</dt>
                    <dd className="font-semibold">{formatCurrency(realise)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Atteinte</dt>
                    <dd className="font-semibold">
                      {objectif > 0 ? formatPercent(taux) : "—"}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
