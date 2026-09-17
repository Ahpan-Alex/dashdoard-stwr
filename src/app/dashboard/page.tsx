"use client";

import Link from "next/link";
import { DashboardSubnav } from "@/components/dashboard-subnav";
import { IndicateurInfo } from "@/components/indicateur-info";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useAuthStore } from "@/lib/auth-store";
import { rangeDepuisFiltres, useDashboardFiltres } from "@/lib/dashboard-filtres";
import {
  achatsHtPeriode,
  balanceAgeeGlobale,
  caMoisEtAnnee,
  delaiMoyenPaiementClient,
} from "@/lib/dashboard-indicateurs";
import { formatCurrency, formatPercent } from "@/lib/format";
import { syntheseRentabiliteDeuxPaliers } from "@/lib/rentabilite";
import { useStore } from "@/lib/store";

export default function DashboardGeneralPage() {
  const debut = useDashboardFiltres((s) => s.debut);
  const fin = useDashboardFiltres((s) => s.fin);
  const range = rangeDepuisFiltres(debut, fin);
  const peutRentab = useAuthStore((s) => s.hasPermission("rentabilite.lire"));
  const {
    factures,
    achats,
    produits,
    entrees,
    inventaires,
    parametres,
    pointDeVenteActifId,
    clients,
    acomptes,
    journalAudit,
  } = useStore();

  const { mois, annee } = caMoisEtAnnee(
    factures,
    parametres,
    pointDeVenteActifId,
    fin,
  );
  const syn = syntheseRentabiliteDeuxPaliers({
    factures,
    achats,
    produits,
    entrees,
    inventaires,
    parametres,
    pointDeVenteId: pointDeVenteActifId,
    range,
  });
  const agee = balanceAgeeGlobale(clients, { factures, acomptes, parametres });
  const dso = delaiMoyenPaiementClient(
    factures,
    parametres,
    acomptes,
    journalAudit,
    pointDeVenteActifId,
    range,
  );
  const achatsHt = achatsHtPeriode(achats, pointDeVenteActifId, range);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble : CA facturé, rentabilité, créances. Filtre site en en-tête, période ci-dessous."
      />
      <DashboardSubnav />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="CA du mois"
          value={formatCurrency(mois.actuel)}
          hint={
            mois.pct == null
              ? "Pas de N-1 comparable"
              : `${mois.pct >= 0 ? "+" : ""}${formatPercent(mois.pct / 100)} vs N-1`
          }
          trend={
            mois.pct == null
              ? undefined
              : {
                  value: `${mois.ecart >= 0 ? "+" : ""}${formatCurrency(mois.ecart)}`,
                  positive: mois.ecart >= 0,
                }
          }
          info={
            <IndicateurInfo>
              Factures fiscales validées (hors brouillon, proforma, acompte),
              CA HT du mois civil de la date de fin de filtre. N-1 = même mois
              de l&apos;année précédente. Courbes détaillées :{" "}
              <Link href="/tableau-de-bord/ca-mensuel" className="underline">
                CA mensuel
              </Link>{" "}
              (ventes caisse, autre source).
            </IndicateurInfo>
          }
        />
        <StatCard
          label="CA annuel"
          value={formatCurrency(annee.actuel)}
          hint={
            annee.pct == null
              ? "Pas de N-1 comparable"
              : `${annee.pct >= 0 ? "+" : ""}${formatPercent(annee.pct / 100)} vs N-1`
          }
          trend={
            annee.pct == null
              ? undefined
              : {
                  value: `${annee.ecart >= 0 ? "+" : ""}${formatCurrency(annee.ecart)}`,
                  positive: annee.ecart >= 0,
                }
          }
          info={
            <IndicateurInfo>
              Même base que le CA du mois, cumulé sur l&apos;année civile de la
              date de fin de filtre, comparé à N-1.
            </IndicateurInfo>
          }
        />
        {peutRentab ? (
          <>
            <StatCard
              label="Rentabilité globale"
              value={formatCurrency(syn.resultat)}
              hint={`${formatPercent(syn.tauxPalier2 / 100)} du CA — factures − achats`}
              info={
                <IndicateurInfo>
                  Factures validées HT moins achats validés HT (tous types :
                  marchandises, matières, services, immobilisations) sur la
                  période filtrée. Même formule que{" "}
                  <Link href="/tableau-de-bord/rentabilite" className="underline">
                    Rentabilité palier 2
                  </Link>
                  .
                </IndicateurInfo>
              }
            />
            <StatCard
              label="Marge brute"
              value={formatCurrency(syn.margeBrute)}
              hint={`${formatPercent(syn.tauxPalier1 / 100)} du CA — CA − CMV`}
              info={
                <IndicateurInfo>
                  CA HT facturé moins coût des marchandises vendues (CUMP).
                  Palier 1 de rentabilité.
                </IndicateurInfo>
              }
            />
          </>
        ) : (
          <>
            <StatCard
              label="Délai moyen de paiement"
              value={dso == null ? "—" : `${dso} j`}
              hint="Factures soldées de la période"
              info={
                <IndicateurInfo>
                  Moyenne des jours entre la date de facture et le dernier
                  règlement (journal d&apos;audit), factures soldées uniquement.
                </IndicateurInfo>
              }
            />
            <StatCard
              label="Achats HT (période)"
              value={formatCurrency(achatsHt)}
              info={
                <IndicateurInfo>
                  Achats fournisseur validés, toutes natures de ligne, nets
                  d&apos;avoirs.
                </IndicateurInfo>
              }
            />
          </>
        )}
      </div>

      {peutRentab && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Délai moyen de paiement"
            value={dso == null ? "—" : `${dso} j`}
            hint="Factures soldées de la période"
            info={
              <IndicateurInfo>
                Moyenne des jours entre la date de facture et le dernier
                règlement enregistré (journal d&apos;audit), uniquement pour les
                factures dont le reste à payer est nul.
              </IndicateurInfo>
            }
          />
          <StatCard
            label="Achats HT (période)"
            value={formatCurrency(achatsHt)}
            hint="Tous types, statut validé"
            info={
              <IndicateurInfo>
                Achats fournisseur au statut validé, toutes natures de ligne,
                nets d&apos;avoirs, sur la période et le site.
              </IndicateurInfo>
            }
          />
        </div>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
            Balance âgée clients
            <IndicateurInfo>
              Somme des restes à payer clients, ventilés selon les tranches
              Paramètres → Tiers → Balance âgée. Créances actuelles (non
              filtrées par la période).
            </IndicateurInfo>
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {agee.map((t) => (
              <li key={t.label} className="flex justify-between">
                <span>{t.label}</span>
                <span className="font-semibold">{formatCurrency(t.montant)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">Liens</h2>
          <p className="mt-1 text-sm text-muted">
            Rapports déjà existants, non dupliqués ici.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/tableau-de-bord/ca-objectifs" className="text-sea-800 underline">
              Objectifs de CA
            </Link>
            <Link href="/tableau-de-bord/rapport-journalier" className="text-sea-800 underline">
              Rapport de fin de journée
            </Link>
            <Link href="/dashboard/ventes" className="text-sea-800 underline">
              Ventes &amp; rentabilité
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
