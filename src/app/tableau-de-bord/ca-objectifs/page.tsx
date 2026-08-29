"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import { StatCard } from "@/components/stat-card";
import { chiffreAffaires } from "@/lib/calculations";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/format";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";

type Horizon = "mois" | "annee";

export default function CaObjectifsPage() {
  const ventes = useStore((s) => s.ventes);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const pointDeVenteActifId = useStore((s) => s.pointDeVenteActifId);
  const [horizon, setHorizon] = useState<Horizon>("mois");
  const { visible, colSpan } = useAffichageTable("ca_objectifs");

  const pdvVisibles = useMemo(
    () =>
      pointDeVenteActifId === "tous"
        ? pointsDeVente
        : pointsDeVente.filter((p) => p.id === pointDeVenteActifId),
    [pointsDeVente, pointDeVenteActifId],
  );

  const lignes = useMemo(
    () =>
      pdvVisibles.map((pdv) => {
        const realise = chiffreAffaires(ventes, pdv.id, horizon);
        const objectif =
          horizon === "mois"
            ? (pdv.objectifCAMensuel ?? 0)
            : (pdv.objectifCAAnnuel ?? 0);
        const taux = objectif > 0 ? realise / objectif : 0;
        const ecart = realise - objectif;
        return { ...pdv, realise, objectif, taux, ecart };
      }),
    [pdvVisibles, ventes, horizon],
  );

  const totalRealise = lignes.reduce((s, l) => s + l.realise, 0);
  const totalObjectif = lignes.reduce((s, l) => s + l.objectif, 0);
  const tauxGlobal = totalObjectif > 0 ? totalRealise / totalObjectif : 0;

  const chartData = lignes.map((l) => ({
    name: l.nom.length > 16 ? `${l.nom.slice(0, 14)}…` : l.nom,
    réalisé: l.realise,
    objectif: l.objectif,
  }));

  const horizonLabel = horizon === "mois" ? "mensuel" : "annuel";

  return (
    <div>
      <PageHeader
        title="CA objectif par point de vente"
        description="Suivi du CA réalisé face aux objectifs mensuels et annuels fixés pour chaque point de vente."
        actions={
          <Link
            href="/parametres/objectifs-revenu"
            className="btn btn-primary"
          >
            <Settings className="h-4 w-4" />
            Modifier les objectifs
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-[var(--radius)] border border-line bg-card p-1 w-fit">
        {(
          [
            ["mois", "Mois"],
            ["annee", "Année"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              horizon === key
                ? "bg-sea-700 text-white"
                : "text-muted hover:bg-sea-50 hover:text-ink"
            }`}
            onClick={() => setHorizon(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={`CA réalisé (${horizon === "mois" ? "mois" : "année"})`}
          value={formatCurrency(totalRealise)}
        />
        <StatCard
          label={`Objectif ${horizonLabel}`}
          value={formatCurrency(totalObjectif)}
        />
        <StatCard
          label="Taux d'atteinte"
          value={totalObjectif > 0 ? formatPercent(tauxGlobal) : "—"}
          hint={
            totalObjectif > 0
              ? totalRealise >= totalObjectif
                ? "Objectif atteint"
                : "En cours"
              : "Définir les objectifs"
          }
        />
      </div>

      <div className="mt-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">
          Réalisé vs objectif
        </h2>
        <p className="mb-4 text-xs text-muted">
          Horizon {horizonLabel} (Ar)
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d4e5e9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#5a7380" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#5a7380" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompactCurrency(Number(v))}
                width={72}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #d4e5e9",
                  fontSize: 12,
                }}
              />
              <Legend />
              <Bar
                dataKey="réalisé"
                name="Réalisé"
                fill="#156377"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="objectif"
                name="Objectif"
                fill="#7dd3db"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <TableAffichageBarre
        tableId="ca_objectifs"
        lignes={lignes.map((l) => ({
          pdv: l.nom,
          realise: formatCurrency(l.realise),
          objectif: formatCurrency(l.objectif),
          ecart: formatCurrency(l.ecart),
          atteinte: l.objectif > 0 ? formatPercent(l.taux) : "—",
        }))}
        fichier="ca-objectifs"
        titre="CA objectif par point de vente"
      />

      <div className="mt-6 table-shell">
        <table className="data">
          <thead>
            <tr>
              <ThCol id="pdv" show={visible}>Point de vente</ThCol>
              <ThCol id="realise" show={visible}>CA réalisé</ThCol>
              <ThCol id="objectif" show={visible}>Objectif {horizonLabel}</ThCol>
              <ThCol id="ecart" show={visible}>Écart</ThCol>
              <ThCol id="atteinte" show={visible}>Atteinte</ThCol>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={colSpan(false)} className="text-muted">
                  Aucun point de vente pour ce filtre.
                </td>
              </tr>
            ) : (
              lignes.map((l) => (
              <tr key={l.id}>
                <TdCol id="pdv" show={visible} className="font-medium">
                  {l.nom}
                  {!l.actif && (
                    <span className="ml-2 badge badge-sand">Inactif</span>
                  )}
                </TdCol>
                <TdCol id="realise" show={visible} className="font-semibold">{formatCurrency(l.realise)}</TdCol>
                <TdCol id="objectif" show={visible}>{formatCurrency(l.objectif)}</TdCol>
                <TdCol
                  id="ecart"
                  show={visible}
                  className={
                    l.ecart >= 0
                      ? "font-semibold text-success"
                      : "font-semibold text-danger"
                  }
                >
                  {l.ecart >= 0 ? "+" : ""}
                  {formatCurrency(l.ecart)}
                </TdCol>
                <TdCol id="atteinte" show={visible}>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-sea-100">
                      <div
                        className={`h-full rounded-full ${
                          l.taux >= 1 ? "bg-success" : "bg-sea-600"
                        }`}
                        style={{
                          width: `${Math.min(100, l.taux * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted">
                      {l.objectif > 0 ? formatPercent(l.taux) : "—"}
                    </span>
                  </div>
                </TdCol>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
