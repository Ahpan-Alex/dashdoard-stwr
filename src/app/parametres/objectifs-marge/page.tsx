"use client";

import { useMemo } from "react";
import Link from "next/link";
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
import { MapPin, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { syntheseBenefices } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useStore } from "@/lib/store";

function parseAr(value: string) {
  return Math.max(0, Number(value) || 0);
}

export default function ObjectifsMargePage() {
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const ventes = useStore((s) => s.ventes);
  const entrees = useStore((s) => s.entrees);
  const charges = useStore((s) => s.charges);
  const produits = useStore((s) => s.produits);
  const inventaires = useStore((s) => s.inventaires);
  const updatePointDeVente = useStore((s) => s.updatePointDeVente);

  const mois = useMemo(
    () => ({
      debut: startOfMonth(new Date()),
      fin: endOfMonth(new Date()),
    }),
    [],
  );
  const annee = useMemo(
    () => ({
      debut: startOfYear(new Date()),
      fin: endOfYear(new Date()),
    }),
    [],
  );

  const totalMensuel = pointsDeVente.reduce(
    (s, p) => s + (p.objectifMargeMensuel ?? 0),
    0,
  );
  const totalAnnuel = pointsDeVente.reduce(
    (s, p) => s + (p.objectifMargeAnnuel ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Objectifs de marge"
        description="Définissez les objectifs de marge brute (CA − coût d'achat) mensuels et annuels pour chaque point de vente."
        showPosSelector={false}
        actions={
          <Link
            href="/tableau-de-bord/marge-objectifs"
            className="btn btn-secondary"
          >
            <TrendingUp className="h-4 w-4" />
            Voir le suivi
          </Link>
        }
      />

      <ParametresSubnav />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-sea-200 bg-sea-50/60 px-4 py-3 text-sm text-sea-900">
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-sea-700" />
            <p>
              Objectif global mensuel (marge) :{" "}
              <strong>{formatCurrency(totalMensuel)}</strong>
            </p>
          </div>
        </div>
        <div className="rounded-[var(--radius)] border border-sea-200 bg-sea-50/60 px-4 py-3 text-sm text-sea-900">
          <div className="flex items-start gap-2">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-sea-700" />
            <p>
              Objectif global annuel (marge) :{" "}
              <strong>{formatCurrency(totalAnnuel)}</strong>
            </p>
          </div>
        </div>
      </div>

      {pointsDeVente.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-line bg-card p-8 text-center">
          <p className="text-sm text-muted">
            Aucun point de vente. Créez-en un pour fixer des objectifs.
          </p>
          <Link href="/parametres/points-de-vente" className="btn btn-primary mt-4">
            <MapPin className="h-4 w-4" />
            Points de vente
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pointsDeVente.map((pdv) => {
            const objMois = pdv.objectifMargeMensuel ?? 0;
            const objAnnee = pdv.objectifMargeAnnuel ?? 0;
            const margeMois = syntheseBenefices(
              ventes,
              entrees,
              charges,
              produits,
              pdv.id,
              mois,
              inventaires,
            ).benefice;
            const margeAnnee = syntheseBenefices(
              ventes,
              entrees,
              charges,
              produits,
              pdv.id,
              annee,
              inventaires,
            ).benefice;
            const tauxMois = objMois > 0 ? margeMois / objMois : 0;
            const tauxAnnee = objAnnee > 0 ? margeAnnee / objAnnee : 0;

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

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-muted">
                    Objectif mensuel (Ar)
                    <input
                      type="number"
                      min={0}
                      step={100000}
                      className="input mt-1.5"
                      value={objMois}
                      onChange={(e) =>
                        updatePointDeVente(pdv.id, {
                          objectifMargeMensuel: parseAr(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs font-semibold text-muted">
                    Objectif annuel (Ar)
                    <input
                      type="number"
                      min={0}
                      step={1000000}
                      className="input mt-1.5"
                      value={objAnnee}
                      onChange={(e) =>
                        updatePointDeVente(pdv.id, {
                          objectifMargeAnnuel: parseAr(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Marge mois / atteinte</dt>
                    <dd className="font-semibold">
                      {formatCurrency(margeMois)}
                      <span className="ml-1 text-xs font-normal text-muted">
                        ({objMois > 0 ? formatPercent(tauxMois) : "—"})
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Marge année / atteinte</dt>
                    <dd className="font-semibold">
                      {formatCurrency(margeAnnee)}
                      <span className="ml-1 text-xs font-normal text-muted">
                        ({objAnnee > 0 ? formatPercent(tauxAnnee) : "—"})
                      </span>
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
