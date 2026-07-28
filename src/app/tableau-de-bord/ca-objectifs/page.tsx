"use client";

import { useMemo } from "react";
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
import { StatCard } from "@/components/stat-card";
import { chiffreAffaires } from "@/lib/calculations";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/format";
import { useStore } from "@/lib/store";

export default function CaObjectifsPage() {
  const { ventes, pointsDeVente } = useStore();

  const lignes = useMemo(
    () =>
      pointsDeVente.map((pdv) => {
        const realise = chiffreAffaires(ventes, pdv.id, "mois");
        const objectif = pdv.objectifCAMensuel ?? 0;
        const taux = objectif > 0 ? realise / objectif : 0;
        const ecart = realise - objectif;
        return { ...pdv, realise, objectif, taux, ecart };
      }),
    [pointsDeVente, ventes],
  );

  const totalRealise = lignes.reduce((s, l) => s + l.realise, 0);
  const totalObjectif = lignes.reduce((s, l) => s + l.objectif, 0);
  const tauxGlobal = totalObjectif > 0 ? totalRealise / totalObjectif : 0;

  const chartData = lignes.map((l) => ({
    name: l.nom.length > 16 ? `${l.nom.slice(0, 14)}…` : l.nom,
    réalisé: l.realise,
    objectif: l.objectif,
  }));

  return (
    <div>
      <PageHeader
        title="CA objectif par point de vente"
        description="Suivi du CA mensuel réalisé face à l'objectif fixé pour chaque point de vente."
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="CA réalisé (mois)"
          value={formatCurrency(totalRealise)}
        />
        <StatCard
          label="Objectif total"
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
        <p className="mb-4 text-xs text-muted">Mois en cours (Ar)</p>
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
              <th>CA réalisé</th>
              <th>Objectif mensuel</th>
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
