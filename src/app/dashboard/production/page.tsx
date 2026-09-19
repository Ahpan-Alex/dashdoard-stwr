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
  const sortiesAtelier = useStore((s) => s.sortiesAtelier);
  const ind = indicateursProduction(ofs, sites, siteId, range, sortiesAtelier);

  return (
    <div>
      <PageHeader
        title="Dashboard — Production"
        description="OF, écarts, pertes matières, cycle, charge, coût MOD et consommables / entretien par atelier."
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
            <IndicateurInfo indicateur="production_respect_delais" />
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
                <IndicateurInfo indicateur="production_ecarts" />
              </th>
              <th>
                Perte matière{" "}
                <IndicateurInfo indicateur="production_perte_matiere" />
              </th>
              <th>
                Rendement matière{" "}
                <IndicateurInfo indicateur="production_rendement_matiere" />
              </th>
              <th>
                Cycle moyen{" "}
                <IndicateurInfo indicateur="production_cycle" />
              </th>
              <th>
                Charge{" "}
                <IndicateurInfo indicateur="production_charge" />
              </th>
              <th>Heures MOD</th>
              <th>
                Coût MOD{" "}
                <IndicateurInfo indicateur="production_cout_mod" />
              </th>
              <th>
                Consommables / entretien{" "}
                <IndicateurInfo indicateur="production_consommables" />
              </th>
            </tr>
          </thead>
          <tbody>
            {ind.parAtelier.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-muted">
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
                    {a.rendementMatiere == null
                      ? "—"
                      : formatPercent(a.rendementMatiere / 100)}
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
                  <td>{formatCurrency(a.coutConsommables)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
