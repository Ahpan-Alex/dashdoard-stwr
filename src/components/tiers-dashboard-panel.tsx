"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { CaComparaisonDoubleTable } from "@/components/ca-comparaison-tables";
import { EmptyState } from "@/components/empty-state";
import { BadgeMargeTheorique } from "@/components/badge-marge-theorique";
import { IndicateurInfo } from "@/components/indicateur-info";
import { caAnnuelClient, caParFamilleClient, ventesDuClient } from "@/lib/client-fiche";
import { caRapportMensuelYoY } from "@/lib/calculations";
import { produitsEnAlerteMargeTheoriqueVendusAuClient } from "@/lib/cout-theorique";
import { formatCurrency } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import type { CategorieProduit, PointDeVente, Produit, Vente } from "@/lib/types";

function fmtPct(pct: number | null) {
  if (pct === null) return "—";
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded.toLocaleString("fr-FR")} %`;
}

type Props = {
  clientId: string;
  ventes: Vente[];
  produits: Produit[];
  categories: CategorieProduit[];
  pointsDeVente: PointDeVente[];
};

export function TiersDashboardPanel({
  clientId,
  ventes,
  produits,
  categories,
  pointsDeVente,
}: Props) {
  const annee = new Date().getFullYear();
  const ventesClient = useMemo(
    () => ventesDuClient(ventes, clientId),
    [ventes, clientId],
  );
  const annuel = useMemo(
    () => caAnnuelClient(ventes, clientId, annee),
    [ventes, clientId, annee],
  );
  const rapportMensuel = useMemo(
    () => caRapportMensuelYoY(ventesClient, "tous", annee),
    [ventesClient, annee],
  );
  const familles = useMemo(
    () => caParFamilleClient(ventes, produits, categories, clientId, annee),
    [ventes, produits, categories, clientId, annee],
  );
  const entrees = useStore((s) => s.entrees);
  const inventaires = useStore((s) => s.inventaires);
  const parametres = useStore((s) => s.parametres);
  const alertesMarge = useMemo(
    () =>
      produitsEnAlerteMargeTheoriqueVendusAuClient({
        clientId,
        ventes,
        produits,
        entrees,
        inventaires,
        ateliers: pointsDeVente,
        parametres,
      }),
    [clientId, ventes, produits, entrees, inventaires, pointsDeVente, parametres],
  );

  return (
    <div className="space-y-8">
      {alertesMarge.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold">
            Marge théorique des articles vendus
            <IndicateurInfo indicateur="marge_theorique_alerte" />
          </h2>
          <ul className="space-y-2 text-sm">
            {alertesMarge.slice(0, 6).map((a) => (
              <li key={a.produit.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href="/parametres/produits" className="text-sea-800 underline">
                  {a.produit.code} — {libelleProduit(a.produit)}
                </Link>
                <BadgeMargeTheorique niveau={a.niveau} taux={a.taux} compact />
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-muted">
        CA HT net des remises, année civile {annee} — ventes rattachées à ce
        tiers en tant que client.
      </p>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Général</h2>
        <div className="table-shell overflow-x-auto">
          <table className="ca-report">
            <thead>
              <tr>
                <th>Indicateur</th>
                <th>CA HT {annuel.annee}</th>
                <th>CA HT {annuel.anneePrec}</th>
                <th>Écart</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">CA annuel</td>
                <td>{formatCurrency(annuel.caAnnee)}</td>
                <td>{formatCurrency(annuel.caAnneePrec)}</td>
                <td>{formatCurrency(annuel.ecart)}</td>
                <td>{fmtPct(annuel.pct)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">CA mensuel</h2>
        {ventesClient.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="Aucune vente"
            description="Le CA mensuel apparaîtra dès qu'une facture de vente sera validée pour ce client."
          />
        ) : (
          <CaComparaisonDoubleTable
            rapport={rapportMensuel}
            ventes={ventesClient}
            produits={produits}
            pointsDeVente={pointsDeVente}
            pointDeVenteActifId="tous"
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">
          CA par famille de produits
        </h2>
        {familles.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="Aucune famille"
            description="Le CA par famille se calcule à partir des ventes de ce client."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_auto_1fr] xl:items-start">
            <FamilleTable
              titre={`N (${annee})`}
              lignes={familles}
              champ="caAnnee"
            />
            <div className="table-shell min-w-[12rem] overflow-x-auto">
              <p className="mb-2 text-sm font-bold text-ink">Écart</p>
              <table className="ca-report">
                <thead>
                  <tr>
                    <th>Écart</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {familles.map((l) => (
                    <tr key={l.id}>
                      <td>{formatCurrency(l.ecart)}</td>
                      <td>{fmtPct(l.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FamilleTable
              titre={`N-1 (${annee - 1})`}
              lignes={familles}
              champ="caAnneePrec"
            />
          </div>
        )}
      </section>
    </div>
  );
}

function FamilleTable({
  titre,
  lignes,
  champ,
}: {
  titre: string;
  lignes: { id: string; libelle: string; caAnnee: number; caAnneePrec: number }[];
  champ: "caAnnee" | "caAnneePrec";
}) {
  return (
    <div className="table-shell min-w-0 overflow-x-auto">
      <p className="mb-2 text-sm font-bold text-ink">{titre}</p>
      <table className="ca-report">
        <thead>
          <tr>
            <th>Famille</th>
            <th>CA HT</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id}>
              <td className="font-medium">{l.libelle}</td>
              <td>{formatCurrency(l[champ])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
