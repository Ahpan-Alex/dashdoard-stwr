"use client";

import { DashboardSubnav } from "@/components/dashboard-subnav";
import { IndicateurInfo } from "@/components/indicateur-info";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import { rangeDepuisFiltres, useDashboardFiltres } from "@/lib/dashboard-filtres";
import { indicateursProduction } from "@/lib/dashboard-indicateurs";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function DashboardProductionPage() {
  return (
    <RequirePermission permission="produits.lire">
      <DashboardProductionContent />
    </RequirePermission>
  );
}

function DashboardProductionContent() {
  const debut = useDashboardFiltres((s) => s.debut);
  const fin = useDashboardFiltres((s) => s.fin);
  const range = rangeDepuisFiltres(debut, fin);
  const ofs = useStore((s) => s.ordresFabrication);
  const sites = useStore((s) => s.pointsDeVente);
  const siteId = useStore((s) => s.pointDeVenteActifId);
  const ind = indicateursProduction(ofs, sites, siteId, range);

  return (
    <div>
      <PageHeader
        title="Dashboard — Production"
        description="OF, écarts, pertes matières, cycle, charge et coût MOD par atelier."
      />
      <DashboardSubnav />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Respect des délais OF"
          value={
            ind.tauxRespect == null
              ? "—"
              : formatPercent(ind.tauxRespect / 100)
          }
          hint={
            ind.nbAvecDelai
              ? `${ind.nbRespect} / ${ind.nbAvecDelai} OF clôturés avec date prévue`
              : "Aucun OF clôturé avec date prévue"
          }
          info={
            <IndicateurInfo>
              OF clôturés (ou clôturés-annulés) de la période dont la date de
              clôture réelle est ≤ date de clôture prévue. Les OF sans date
              prévue sont exclus.
            </IndicateurInfo>
          }
        />
      </div>

      <div className="table-shell">
        <p className="border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Par atelier
        </p>
        <table className="data">
          <thead>
            <tr>
              <th>Atelier</th>
              <th>OF</th>
              <th>
                Écarts{" "}
                <IndicateurInfo>
                  Somme des montants d&apos;écart de clôture OF de l&apos;atelier
                  sur la période.
                </IndicateurInfo>
              </th>
              <th>
                Perte matière{" "}
                <IndicateurInfo>
                  Reliquat non retourné ÷ quantités sorties de l&apos;atelier.
                </IndicateurInfo>
              </th>
              <th>
                Cycle moyen{" "}
                <IndicateurInfo>
                  Jours entre création et clôture réelle des OF de l&apos;atelier.
                </IndicateurInfo>
              </th>
              <th>
                Charge{" "}
                <IndicateurInfo>
                  Part des heures MOD de l&apos;atelier dans le total (aucune
                  capacité nominale n&apos;est paramétrée).
                </IndicateurInfo>
              </th>
              <th>Heures MOD</th>
              <th>
                Coût MOD{" "}
                <IndicateurInfo>
                  Lignes MOD saisies sur les OF, taux horaire figé à la saisie.
                </IndicateurInfo>
              </th>
            </tr>
          </thead>
          <tbody>
            {ind.parAtelier.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted">
                  Aucun atelier / OF sur la période.
                </td>
              </tr>
            ) : (
              ind.parAtelier.map((a) => (
                <tr key={a.atelierId}>
                  <td className="font-medium">{a.nom}</td>
                  <td>{a.nbOf}</td>
                  <td>{formatCurrency(a.ecarts)}</td>
                  <td>
                    {a.tauxPerte == null
                      ? "—"
                      : formatPercent(a.tauxPerte / 100)}
                  </td>
                  <td>
                    {a.cycleMoyenJours == null
                      ? "—"
                      : `${formatNumber(a.cycleMoyenJours, 1)} j`}
                  </td>
                  <td>
                    {a.tauxCharge == null
                      ? "—"
                      : formatPercent(a.tauxCharge / 100)}
                  </td>
                  <td>{formatNumber(a.heuresMod, 1)} h</td>
                  <td>{formatCurrency(a.coutMod)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
