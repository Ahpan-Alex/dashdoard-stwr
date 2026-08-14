"use client";

import { useEffect } from "react";
import {
  Banknote,
  Package,
  ShoppingBasket,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import {
  caParJour,
  caParPointDeVente,
  caParProduit,
  calculerStocks,
  caPrecedent,
  chiffreAffaires,
  totalAchats,
} from "@/lib/calculations";
import { rebuildVentesDepuisFactures } from "@/lib/commercial";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { useStore } from "@/lib/store";

function trendLabel(current: number, previous: number) {
  if (previous === 0) return { value: "—", positive: true };
  const delta = (current - previous) / previous;
  const positive = delta >= 0;
  return {
    value: `${positive ? "+" : ""}${formatPercent(delta)}`,
    positive,
  };
}

export default function DashboardPage() {
  const ventes = useStore((s) => s.ventes);
  const entrees = useStore((s) => s.entrees);
  const produits = useStore((s) => s.produits);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const pointDeVenteActifId = useStore((s) => s.pointDeVenteActifId);
  const factures = useStore((s) => s.factures);

  // Recalcule CA / stock depuis les factures validées (source de vérité).
  useEffect(() => {
    const rebuilt = rebuildVentesDepuisFactures(factures);
    const current = useStore.getState().ventes;
    if (
      rebuilt.length !== current.length ||
      rebuilt.some((v, i) => v.id !== current[i]?.id)
    ) {
      useStore.setState({ ventes: rebuilt });
    }
  }, [factures]);

  const caSemaine = chiffreAffaires(ventes, pointDeVenteActifId, "semaine");
  const caMois = chiffreAffaires(ventes, pointDeVenteActifId, "mois");
  const caAnnee = chiffreAffaires(ventes, pointDeVenteActifId, "annee");
  const prevSemaine = caPrecedent(ventes, pointDeVenteActifId, "semaine");
  const prevMois = caPrecedent(ventes, pointDeVenteActifId, "mois");

  const stocks = calculerStocks(
    produits,
    entrees,
    ventes,
    pointDeVenteActifId,
    pointsDeVente,
  );
  const valeurStock = stocks.reduce((s, l) => s + l.valeurAchat, 0);
  const unitesStock = stocks.reduce((s, l) => s + l.quantiteRestante, 0);
  const achatsSemaine = totalAchats(entrees, pointDeVenteActifId, "semaine");
  const series = caParJour(ventes, pointDeVenteActifId, 14);
  const parPdv = caParPointDeVente(ventes, pointsDeVente, "mois");
  const parProduit = caParProduit(
    ventes,
    produits,
    pointDeVenteActifId,
    "mois",
  );
  const totalCaProduit = parProduit.reduce((s, l) => s + l.montant, 0);

  const recentEntrees = [...entrees]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(
      (e) =>
        pointDeVenteActifId === "tous" ||
        e.pointDeVenteId === pointDeVenteActifId,
    )
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble des entrées, stocks et performances commerciales (CA issu des factures validées)."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          className="animate-fade-up stagger-1"
          label="CA semaine"
          value={formatCurrency(caSemaine)}
          icon={<Banknote className="h-5 w-5" />}
          trend={trendLabel(caSemaine, prevSemaine)}
          hint="vs semaine précédente"
        />
        <StatCard
          className="animate-fade-up stagger-2"
          label="CA mois"
          value={formatCurrency(caMois)}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={trendLabel(caMois, prevMois)}
          hint="vs mois précédent"
        />
        <StatCard
          className="animate-fade-up stagger-3"
          label="CA année"
          value={formatCurrency(caAnnee)}
          icon={<ShoppingBasket className="h-5 w-5" />}
          hint="cumul année en cours"
        />
        <StatCard
          className="animate-fade-up stagger-4"
          label="Valeur stock"
          value={formatCurrency(valeurStock)}
          icon={<Warehouse className="h-5 w-5" />}
          hint={`${formatNumber(unitesStock, 0)} unités en stock`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="animate-fade-up stagger-2 rounded-[var(--radius)] border border-line bg-card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">
                Évolution du CA
              </h2>
              <p className="text-xs text-muted">14 derniers jours</p>
            </div>
            <span className="badge badge-sea">
              Achats sem. {formatCurrency(achatsSemaine)}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="caFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2499a8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2499a8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4e5e9" />
                <XAxis
                  dataKey="label"
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
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "CA",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #d4e5e9",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="montant"
                  stroke="#156377"
                  strokeWidth={2}
                  fill="url(#caFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="animate-fade-up stagger-3 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            CA par point de vente
          </h2>
          <p className="mb-4 text-xs text-muted">Mois en cours</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parPdv} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#d4e5e9"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#5a7380" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                />
                <YAxis
                  type="category"
                  dataKey="nom"
                  width={100}
                  tick={{ fontSize: 11, fill: "#5a7380" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value ?? 0)),
                    "CA",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #d4e5e9",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="montant" fill="#1b7d8f" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 animate-fade-up stagger-3 rounded-[var(--radius)] border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              CA par produit
            </h2>
            <p className="text-xs text-muted">Mois en cours</p>
          </div>
          <span className="badge badge-sea">
            Total {formatCurrency(totalCaProduit)}
          </span>
        </div>
        <div className="table-shell border-0">
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
                    Aucune vente ce mois-ci.
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
                                totalCaProduit > 0
                                  ? (ligne.montant / totalCaProduit) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted">
                          {totalCaProduit > 0
                            ? formatPercent(ligne.montant / totalCaProduit)
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

      <div className="mt-6 animate-fade-up stagger-4 rounded-[var(--radius)] border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-sea-600" />
            <h2 className="font-display text-lg font-semibold text-ink">
              Dernières entrées
            </h2>
          </div>
        </div>
        <div className="table-shell border-0">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Point de vente</th>
                <th>Fournisseur</th>
                <th>Qté</th>
                <th>P.A. / P.V.</th>
                <th>Montant achat</th>
              </tr>
            </thead>
            <tbody>
              {recentEntrees.map((e) => {
                const produit = produits.find((p) => p.id === e.produitId);
                const pdv = pointsDeVente.find(
                  (p) => p.id === e.pointDeVenteId,
                );
                return (
                  <tr key={e.id}>
                    <td>
                      {new Intl.DateTimeFormat("fr-FR").format(
                        new Date(e.date),
                      )}
                    </td>
                    <td className="font-medium">{produit?.libelleCourt ?? "—"}</td>
                    <td>{pdv?.nom ?? "—"}</td>
                    <td>{e.fournisseur}</td>
                    <td>
                      {formatNumber(e.quantite)} {produit?.unite}
                    </td>
                    <td className="text-xs">
                      {formatCurrency(e.prixAchatUnitaire)}
                      {" / "}
                      {formatCurrency(
                        e.prixVenteUnitaire ?? produit?.prixVenteHT ?? 0,
                      )}
                    </td>
                    <td className="font-semibold">
                      {formatCurrency(e.quantite * e.prixAchatUnitaire)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
