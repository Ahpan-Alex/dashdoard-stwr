"use client";

import Link from "next/link";
import { DashboardSubnav } from "@/components/dashboard-subnav";
import { IndicateurInfo } from "@/components/indicateur-info";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import { rangeDepuisFiltres, useDashboardFiltres } from "@/lib/dashboard-filtres";
import {
  ecartsMoyensParAcheteur,
  historiquePrixFournisseurArticle,
  indicateursMissionsDashboard,
  performanceFournisseurs,
} from "@/lib/dashboard-indicateurs";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

export default function DashboardAchatsPage() {
  return (
    <RequirePermission permission={["achats.lire", "missions.lire"]}>
      <DashboardAchatsContent />
    </RequirePermission>
  );
}

function DashboardAchatsContent() {
  const debut = useDashboardFiltres((s) => s.debut);
  const fin = useDashboardFiltres((s) => s.fin);
  const range = rangeDepuisFiltres(debut, fin);
  const peutMissions = useAuthStore((s) => s.hasPermission("missions.lire"));
  const {
    achats,
    produits,
    fournisseurs,
    pointDeVenteActifId,
    missionsAchat,
    naturesDepenseMission,
  } = useStore();
  const ecartsAcheteurs = ecartsMoyensParAcheteur(missionsAchat ?? []);

  const hist = historiquePrixFournisseurArticle(
    achats,
    produits,
    fournisseurs,
    pointDeVenteActifId,
    range,
  );
  const perf = performanceFournisseurs(
    achats,
    fournisseurs,
    pointDeVenteActifId,
    range,
  );
  const mis = indicateursMissionsDashboard(
    missionsAchat ?? [],
    naturesDepenseMission ?? [],
    pointDeVenteActifId,
    range,
  );

  return (
    <div>
      <PageHeader
        title="Dashboard — Achats"
        description="Prix d'achat, performance fournisseurs et missions d'achat (avances, dépenses diverses)."
      />
      <DashboardSubnav />

      <div className="mb-6 table-shell">
        <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Historique de prix par fournisseur / article
          <IndicateurInfo>
            Dernier prix unitaire HT et délai moyen de première livraison,
            calculés comme le classement fournisseurs (commandes validées).
            Articles les plus achetés sur la période.
          </IndicateurInfo>
        </p>
        <table className="data">
          <thead>
            <tr>
              <th>Article</th>
              <th>Fournisseur</th>
              <th>Dernier prix</th>
              <th>Délai moyen</th>
            </tr>
          </thead>
          <tbody>
            {hist.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  Aucun historique d&apos;achat.
                </td>
              </tr>
            ) : (
              hist.map((l, i) => (
                <tr key={`${l.produitId}-${l.fournisseur}-${i}`}>
                  <td>{l.article}</td>
                  <td>{l.fournisseur}</td>
                  <td>
                    {l.dernierPrix == null ? "—" : formatCurrency(l.dernierPrix)}
                  </td>
                  <td>
                    {l.delaiMoyenJours == null
                      ? "—"
                      : `${l.delaiMoyenJours} j`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-8 table-shell">
        <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Performance fournisseurs
          <IndicateurInfo>
            Délai = jours entre commande et première livraison. Litiges /
            retours = avoirs d&apos;achat validés sur la période.
          </IndicateurInfo>
        </p>
        <table className="data">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Commandes</th>
              <th>Délai moyen</th>
              <th>Avoirs / retours</th>
            </tr>
          </thead>
          <tbody>
            {perf.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  Aucune commande sur la période.
                </td>
              </tr>
            ) : (
              perf.map((l) => (
                <tr key={l.fournisseurId}>
                  <td>{l.nom}</td>
                  <td>{l.nbAchats}</td>
                  <td>
                    {l.delaiMoyenJours == null
                      ? "—"
                      : `${l.delaiMoyenJours} j`}
                  </td>
                  <td>{l.nbAvoirs}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {peutMissions && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">
            Missions d&apos;achat
          </h2>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Avances de caisse en cours"
              value={formatCurrency(mis.avancesEnCours)}
              hint="Toutes missions non clôturées"
              info={
                <IndicateurInfo indicateur="missions_avances">
                  Le suivi par acheteur reste dans{" "}
                  <Link href="/missions/suivi" className="underline">
                    Missions → Suivi des avances
                  </Link>
                  .
                </IndicateurInfo>
              }
            />
            <StatCard
              label="Dépenses diverses"
              value={formatCurrency(mis.totalDivers)}
              hint="Période filtrée"
              info={
                <IndicateurInfo indicateur="missions_divers" />
              }
            />
            <StatCard
              label="Écart moyen avance / réel"
              value={
                mis.ecartMoyen == null ? "—" : formatCurrency(mis.ecartMoyen)
              }
              hint="Fonds validés − dépenses"
              info={
                <IndicateurInfo indicateur="missions_ecart_moyen" />
              }
            />
          </div>
          <div className="table-shell">
            <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Répartition par nature
              <IndicateurInfo>
                Nature catalogue = compte de charge associé. Nature libre =
                imputée au compte 471 (en attente de reclassement en
                Comptabilité).
              </IndicateurInfo>
            </p>
            <table className="data">
              <thead>
                <tr>
                  <th>Nature</th>
                  <th>Montant</th>
                  <th>Imputation</th>
                </tr>
              </thead>
              <tbody>
                {mis.parNature.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-muted">
                      Aucune dépense diverse sur la période.
                    </td>
                  </tr>
                ) : (
                  mis.parNature.map((l) => (
                    <tr key={l.libelle}>
                      <td>{l.libelle}</td>
                      <td>{formatCurrency(l.montant)}</td>
                      <td>
                        {l.attente471
                          ? "En attente de reclassement (471)"
                          : "Compte de la nature"}
                      </td>
                    </tr>
                  ))
                )}
                {mis.attente471 > 0 && (
                  <tr className="font-semibold">
                    <td>Dont compte 471</td>
                    <td>{formatCurrency(mis.attente471)}</td>
                    <td>
                      <Link
                        href="/comptabilite/reclassement"
                        className="text-sea-800 underline"
                      >
                        Reclasser
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Part imputée au compte 471 : {formatCurrency(mis.attente471)} en
            attente de reclassement.
          </p>
          <div className="mt-6 table-shell">
            <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Écart moyen par acheteur
              <IndicateurInfo indicateur="missions_ecart_acheteur" />
            </p>
            <table className="data">
              <thead>
                <tr>
                  <th>Acheteur</th>
                  <th>Missions</th>
                  <th>Écart moyen</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {ecartsAcheteurs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted">
                      Aucune mission clôturée avec avance.
                    </td>
                  </tr>
                ) : (
                  ecartsAcheteurs.map((e) => (
                    <tr key={e.acheteurUserId}>
                      <td>{e.acheteurNom}</td>
                      <td>{e.nbMissions}</td>
                      <td>{formatCurrency(e.ecartMoyenMontant)}</td>
                      <td>
                        {e.ecartMoyenPercent == null
                          ? "—"
                          : formatPercent(e.ecartMoyenPercent / 100)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
