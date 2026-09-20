"use client";

import { DashboardSubnav } from "@/components/dashboard-subnav";
import { IndicateurInfo } from "@/components/indicateur-info";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { rangeDepuisFiltres, useDashboardFiltres } from "@/lib/dashboard-filtres";
import {
  rotationMatieresPremieres,
  topMatieresRupture,
  valorisationStockParNatureEtSite,
} from "@/lib/dashboard-indicateurs";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";
import { BP_STATUTS, moduleBonDePreparationActif } from "@/lib/bon-de-preparation";
import { filterByPos } from "@/lib/calculations";
import Link from "next/link";

export default function DashboardStockPage() {
  return (
    <RequirePermission permission="produits.lire">
      <DashboardStockContent />
    </RequirePermission>
  );
}

function DashboardStockContent() {
  const debut = useDashboardFiltres((s) => s.debut);
  const fin = useDashboardFiltres((s) => s.fin);
  const range = rangeDepuisFiltres(debut, fin);
  const {
    produits,
    entrees,
    ventes,
    pointsDeVente,
    pointDeVenteActifId,
    inventaires,
    ordresFabrication,
    achats,
    transfertsMatiereOf,
    bonsDePreparation,
    parametres,
  } = useStore();

  const ctxReservation = {
    achats,
    ordresFabrication,
    transfertsMatiereOf: transfertsMatiereOf ?? [],
  };

  const valo = valorisationStockParNatureEtSite(
    produits,
    entrees,
    ventes,
    pointsDeVente,
    pointDeVenteActifId,
    inventaires,
    ctxReservation,
  );
  const rotation = rotationMatieresPremieres(
    produits,
    ordresFabrication,
    entrees,
    ventes,
    pointsDeVente,
    pointDeVenteActifId,
    range,
    inventaires,
  ).slice(0, 12);
  const top = topMatieresRupture(
    produits,
    ordresFabrication,
    achats,
    entrees,
    ventes,
    pointsDeVente,
    pointDeVenteActifId,
    inventaires,
  );

  return (
    <div>
      <PageHeader
        title="Dashboard — Stock"
        description="Valorisation, rotation des matières premières et matières qui bloquent la production."
      />
      <DashboardSubnav />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
            Valorisation par nature
            <IndicateurInfo>
              Stock actuel valorisé au CUMP, regroupé par nature d&apos;article
              (matière première, semi-fini, fini). Le disponible exclut les
              quantités réservées à un OF.
            </IndicateurInfo>
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {valo.parNature.length === 0 ? (
              <li className="text-muted">Stock vide.</li>
            ) : (
              valo.parNature.map((l) => (
                <li key={l.nom} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>{l.nom}</span>
                    <span className="font-semibold">{formatCurrency(l.valeur)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    Disponible {formatCurrency(l.valeurDisponible)} · Réservé{" "}
                    {formatCurrency(l.valeurReservee)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
            Valorisation par site
            <IndicateurInfo>
              Même valorisation CUMP, ventilée par site (filtre site en
              en-tête). Disponible = stock non affecté à un OF.
            </IndicateurInfo>
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {valo.parSite.length === 0 ? (
              <li className="text-muted">Stock vide.</li>
            ) : (
              valo.parSite.map((l) => (
                <li key={l.nom} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>{l.nom}</span>
                    <span className="font-semibold">{formatCurrency(l.valeur)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    Disponible {formatCurrency(l.valeurDisponible)} · Réservé{" "}
                    {formatCurrency(l.valeurReservee)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="table-shell">
          <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Rotation matières premières
            <IndicateurInfo>
              Sorties OF de la période ÷ stock actuel (proxy : pas d&apos;historique
              de stock moyen quotidien).
            </IndicateurInfo>
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Article</th>
                <th>Sorties</th>
                <th>Stock</th>
                <th>Rotation</th>
              </tr>
            </thead>
            <tbody>
              {rotation.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted">
                    Pas de mouvement matière.
                  </td>
                </tr>
              ) : (
                rotation.map((l) => (
                  <tr key={l.produitId}>
                    <td>{l.nom}</td>
                    <td>{formatNumber(l.sorties)}</td>
                    <td>{formatNumber(l.stock)}</td>
                    <td>
                      {l.rotation == null ? "—" : formatNumber(l.rotation, 2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="table-shell">
          <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Top matières en rupture / blocage
            <IndicateurInfo>
              Stock ≤ seuil de rupture de la fiche + demandes d&apos;achat
              générées depuis un OF (composant manquant).
            </IndicateurInfo>
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Article</th>
                <th>Ruptures</th>
                <th>DA depuis OF</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted">
                    Aucun signal de rupture.
                  </td>
                </tr>
              ) : (
                top.map((l) => (
                  <tr key={l.produitId}>
                    <td>{l.nom}</td>
                    <td>{l.ruptures}</td>
                    <td>{l.daOf}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {moduleBonDePreparationActif(parametres) && (
        <div className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
            En attente de préparation
            <IndicateurInfo indicateur="bon_de_preparation_attente" />
          </h2>
          {(() => {
            const attente = filterByPos(
              bonsDePreparation ?? [],
              pointDeVenteActifId,
            ).filter(
              (b) => b.statut === "a_preparer" || b.statut === "en_cours",
            );
            if (attente.length === 0) {
              return (
                <p className="mt-2 text-sm text-muted">
                  Aucun bon de préparation en attente.
                </p>
              );
            }
            return (
              <>
                <p className="mt-1 text-sm text-muted">
                  {attente.length} document
                  {attente.length > 1 ? "s" : ""} à rassembler.
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {attente.slice(0, 8).map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <Link
                        href="/bons-de-preparation/liste"
                        className="text-sea-800 underline"
                      >
                        {b.numero}
                      </Link>
                      <span className="text-xs text-muted">
                        {BP_STATUTS[b.statut]}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
