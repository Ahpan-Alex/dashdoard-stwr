"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
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
import { StatCard } from "@/components/stat-card";
import { syntheseBenefices } from "@/lib/calculations";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/format";
import { useStore } from "@/lib/store";

type Horizon = "mois" | "annee";

export default function MargeObjectifsPage() {
  const ventes = useStore((s) => s.ventes);
  const entrees = useStore((s) => s.entrees);
  const charges = useStore((s) => s.charges);
  const produits = useStore((s) => s.produits);
  const inventaires = useStore((s) => s.inventaires);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const [horizon, setHorizon] = useState<Horizon>("mois");

  const range = useMemo(() => {
    const now = new Date();
    return horizon === "mois"
      ? { debut: startOfMonth(now), fin: endOfMonth(now) }
      : { debut: startOfYear(now), fin: endOfYear(now) };
  }, [horizon]);

  const lignes = useMemo(
    () =>
      pointsDeVente.map((pdv) => {
        const realise = syntheseBenefices(
          ventes,
          entrees,
          charges,
          produits,
          pdv.id,
          range,
          inventaires,
        ).benefice;
        const objectif =
          horizon === "mois"
            ? (pdv.objectifMargeMensuel ?? 0)
            : (pdv.objectifMargeAnnuel ?? 0);
        const taux = objectif > 0 ? realise / objectif : 0;
        const ecart = realise - objectif;
        return { ...pdv, realise, objectif, taux, ecart };
      }),
    [pointsDeVente, ventes, entrees, charges, produits, inventaires, range, horizon],
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
        title="Marge objectif par point de vente"
        description="Suivi de la marge brute (CA − coût d'achat) face aux objectifs mensuels et annuels."
        actions={
          <Link
            href="/parametres/objectifs-marge"
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
          label={`Marge réalisée (${horizon === "mois" ? "mois" : "année"})`}
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
          Horizon {horizonLabel} (Ar) — marge brute
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

      <div className="mt-6 table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Point de vente</th>
              <th>Marge réalisée</th>
              <th>Objectif {horizonLabel}</th>
              <th>Écart</th>
              <th>Atteinte</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="font-medium">
                  {l.nom}
                  {!l.actif && (
                    <span className="ml-2 badge badge-sand">Inactif</span>
                  )}
                </td>
                <td className="font-semibold">{formatCurrency(l.realise)}</td>
                <td>{formatCurrency(l.objectif)}</td>
                <td
                  className={
                    l.ecart >= 0
                      ? "font-semibold text-success"
                      : "font-semibold text-danger"
                  }
                >
                  {l.ecart >= 0 ? "+" : ""}
                  {formatCurrency(l.ecart)}
                </td>
                <td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
