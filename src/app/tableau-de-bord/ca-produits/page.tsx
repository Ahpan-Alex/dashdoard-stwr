"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { caParProduit, type Periode } from "@/lib/calculations";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { useStore } from "@/lib/store";

const periodes: { id: Periode; label: string }[] = [
  { id: "semaine", label: "Hebdomadaire" },
  { id: "mois", label: "Mensuel" },
  { id: "annee", label: "Annuel" },
];

export default function CaProduitsPage() {
  const { ventes, produits, pointDeVenteActifId } = useStore();
  const [periode, setPeriode] = useState<Periode>("mois");

  const parProduit = useMemo(
    () => caParProduit(ventes, produits, pointDeVenteActifId, periode),
    [ventes, produits, pointDeVenteActifId, periode],
  );
  const total = parProduit.reduce((s, l) => s + l.montant, 0);
  const top = parProduit[0];
  const chartData = parProduit.slice(0, 10).map((l) => ({
    name: l.nom.length > 18 ? `${l.nom.slice(0, 16)}…` : l.nom,
    montant: l.montant,
  }));

  return (
    <div>
      <PageHeader
        title="CA produits"
        description="Répartition du chiffre d'affaires par produit sur la période sélectionnée."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {periodes.map((p) => (
          <button
            key={p.id}
            className={`btn ${periode === p.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setPeriode(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="CA total" value={formatCurrency(total)} />
        <StatCard
          label="Produits vendus"
          value={formatNumber(parProduit.length, 0)}
        />
        <StatCard
          label="Meilleur produit"
          value={top ? top.nom : "—"}
          hint={top ? formatCurrency(top.montant) : undefined}
        />
      </div>

      <div className="mt-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">
          Top produits
        </h2>
        <p className="mb-4 text-xs text-muted">
          Classement par CA —{" "}
          {periodes.find((p) => p.id === periode)?.label.toLowerCase()}
        </p>
        <div className="h-72">
          {chartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted">
              Aucune vente sur cette période.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4e5e9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#5a7380" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11, fill: "#5a7380" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #d4e5e9",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="montant" fill="#1b7d8f" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Quantité vendue</th>
              <th>Chiffre d&apos;affaires</th>
              <th>Part</th>
            </tr>
          </thead>
          <tbody>
            {parProduit.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  Aucune vente sur cette période.
                </td>
              </tr>
            ) : (
              parProduit.map((ligne) => (
                <tr key={ligne.id}>
                  <td className="font-medium">{ligne.nom}</td>
                  <td>
                    {formatNumber(ligne.quantite)} {ligne.unite}
                  </td>
                  <td className="font-semibold">
                    {formatCurrency(ligne.montant)}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sea-100">
                        <div
                          className="h-full rounded-full bg-sea-600"
                          style={{
                            width: `${
                              total > 0 ? (ligne.montant / total) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted">
                        {total > 0
                          ? formatPercent(ligne.montant / total)
                          : "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
