"use client";

import Link from "next/link";
import { DashboardSubnav } from "@/components/dashboard-subnav";
import { IndicateurInfo } from "@/components/indicateur-info";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import { rangeDepuisFiltres, useDashboardFiltres } from "@/lib/dashboard-filtres";
import {
  caMargeParClient,
  margeParFamille,
  margeParOfCommande,
  tauxTransformationDevisCommande,
} from "@/lib/dashboard-indicateurs";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function DashboardVentesPage() {
  return (
    <RequirePermission permission="rentabilite.lire">
      <DashboardVentesContent />
    </RequirePermission>
  );
}

function DashboardVentesContent() {
  const debut = useDashboardFiltres((s) => s.debut);
  const fin = useDashboardFiltres((s) => s.fin);
  const range = rangeDepuisFiltres(debut, fin);
  const {
    ordresFabrication,
    commandes,
    factures,
    parametres,
    pointDeVenteActifId,
    produits,
    categoriesProduits,
    entrees,
    inventaires,
    clients,
    devis,
    transformations,
  } = useStore();

  const ofs = margeParOfCommande(
    ordresFabrication,
    commandes,
    factures,
    parametres,
    pointDeVenteActifId,
    range,
  ).slice(0, 20);
  const familles = margeParFamille(
    factures,
    produits,
    categoriesProduits,
    entrees,
    inventaires,
    parametres,
    pointDeVenteActifId,
    range,
  );
  const parClient = caMargeParClient(
    factures,
    clients,
    produits,
    entrees,
    inventaires,
    parametres,
    pointDeVenteActifId,
    range,
  ).slice(0, 20);
  const tx = tauxTransformationDevisCommande(
    devis,
    transformations ?? [],
    pointDeVenteActifId,
    range,
  );

  return (
    <div>
      <PageHeader
        title="Dashboard — Ventes & Rentabilité"
        description="Marge réelle (factures validées − coûts OF / CMV), CA clients et transformation devis → commande."
        actions={
          <Link href="/parametres/pilotage?onglet=objectifs" className="btn btn-secondary">
            Objectifs
          </Link>
        }
      />
      <DashboardSubnav />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Taux devis → commande"
          value={tx.taux == null ? "—" : formatPercent(tx.taux / 100)}
          hint={tx.n ? `${tx.ok} / ${tx.n} devis (hors brouillon)` : "Aucun devis"}
          info={
            <IndicateurInfo>
              Devis de la période (site filtré) transformés en commande via le
              journal commercial. Hors brouillons.
            </IndicateurInfo>
          }
        />
      </div>
      <p className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/tableau-de-bord/rentabilite" className="text-sea-800 underline">
          Détail rentabilité (2 paliers)
        </Link>
        <Link href="/tableau-de-bord/marge" className="text-sea-800 underline">
          Marge produits
        </Link>
        <Link href="/tableau-de-bord/ca-produits" className="text-sea-800 underline">
          CA produits
        </Link>
      </p>

      <div className="mb-6 table-shell">
        <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Marge réelle par OF / commande client
          <IndicateurInfo>
            CA HT des factures rattachées à la commande de l&apos;OF, moins le
            coût de production (entrées OF). Période = date de clôture / création
            de l&apos;OF.
          </IndicateurInfo>
        </p>
        <table className="data">
          <thead>
            <tr>
              <th>OF</th>
              <th>Commande</th>
              <th>CA HT</th>
              <th>Coût OF</th>
              <th>Marge</th>
            </tr>
          </thead>
          <tbody>
            {ofs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted">
                  Aucun OF lié à une commande sur la période.
                </td>
              </tr>
            ) : (
              ofs.map((l) => (
                <tr key={l.ofId}>
                  <td>
                    <Link href={`/fabrication/${l.ofId}`} className="underline">
                      {l.numero}
                    </Link>
                  </td>
                  <td>{l.commande}</td>
                  <td>{formatCurrency(l.ca)}</td>
                  <td>{formatCurrency(l.cout)}</td>
                  <td>{formatCurrency(l.marge)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="table-shell">
          <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Marge par famille
            <IndicateurInfo>
              CA HT facturé et CMV (CUMP) regroupés par famille produit.
              Même CMV que le palier 1 de rentabilité.
            </IndicateurInfo>
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Famille</th>
                <th>CA</th>
                <th>Marge</th>
              </tr>
            </thead>
            <tbody>
              {familles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted">
                    Pas de factures sur la période.
                  </td>
                </tr>
              ) : (
                familles.map((l) => (
                  <tr key={l.nom}>
                    <td>{l.nom}</td>
                    <td>{formatCurrency(l.ca)}</td>
                    <td>{formatCurrency(l.marge)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="table-shell">
          <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            CA et marge par client
            <IndicateurInfo>
              Factures validées HT et CMV au prorata des quantités. Le
              dashboard fiche Tiers (CA client, CA par famille) est conservé
              tel quel.
            </IndicateurInfo>
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Client</th>
                <th>CA</th>
                <th>Marge</th>
              </tr>
            </thead>
            <tbody>
              {parClient.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted">
                    Pas de factures clients.
                  </td>
                </tr>
              ) : (
                parClient.map((l) => (
                  <tr key={l.nom}>
                    <td>{l.nom}</td>
                    <td>{formatCurrency(l.ca)}</td>
                    <td>{formatCurrency(l.marge)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
