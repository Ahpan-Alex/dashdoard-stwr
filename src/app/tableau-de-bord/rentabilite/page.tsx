"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import type { DateRange } from "@/lib/calculations";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import {
  serieRentabiliteMensuelle,
  syntheseRentabiliteDeuxPaliers,
} from "@/lib/rentabilite";
import { useStore } from "@/lib/store";

type Preset = "jour" | "mois" | "annee" | "personnalise";

function toInputDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function RentabilitePage() {
  const {
    factures,
    achats,
    produits,
    entrees,
    inventaires,
    parametres,
    pointDeVenteActifId,
  } = useStore();

  const moisEnCours = {
    debut: startOfMonth(new Date()),
    fin: endOfMonth(new Date()),
  };
  const [preset, setPreset] = useState<Preset>("mois");
  const [debut, setDebut] = useState(toInputDate(moisEnCours.debut));
  const [fin, setFin] = useState(toInputDate(moisEnCours.fin));

  function applyPreset(p: Preset) {
    setPreset(p);
    const now = new Date();
    if (p === "jour") {
      setDebut(toInputDate(startOfDay(now)));
      setFin(toInputDate(endOfDay(now)));
    } else if (p === "mois") {
      setDebut(toInputDate(startOfMonth(now)));
      setFin(toInputDate(endOfMonth(now)));
    } else if (p === "annee") {
      setDebut(toInputDate(startOfYear(now)));
      setFin(toInputDate(endOfYear(now)));
    }
  }

  const range: DateRange = useMemo(() => {
    const d = parseISO(debut);
    const f = parseISO(fin);
    return { debut: startOfDay(d), fin: endOfDay(f) };
  }, [debut, fin]);

  const synthese = useMemo(
    () =>
      syntheseRentabiliteDeuxPaliers({
        factures,
        achats,
        produits,
        entrees,
        inventaires,
        parametres,
        pointDeVenteId: pointDeVenteActifId,
        range,
      }),
    [
      factures,
      achats,
      produits,
      entrees,
      inventaires,
      parametres,
      pointDeVenteActifId,
      range,
    ],
  );

  const serie = useMemo(
    () =>
      serieRentabiliteMensuelle({
        factures,
        achats,
        produits,
        entrees,
        inventaires,
        parametres,
        pointDeVenteId: pointDeVenteActifId,
        annee: range.debut.getFullYear(),
      }),
    [
      factures,
      achats,
      produits,
      entrees,
      inventaires,
      parametres,
      pointDeVenteActifId,
      range.debut,
    ],
  );

  const waterfall = [
    { name: "CA HT", montant: synthese.caHt },
    { name: "− CMV", montant: -synthese.cmv },
    { name: "Marge brute", montant: synthese.margeBrute },
    { name: "− Achats HT", montant: -synthese.achatsHt },
    { name: "Résultat", montant: synthese.resultat },
  ].filter(
    (r) =>
      r.montant !== 0 ||
      r.name === "CA HT" ||
      r.name === "Marge brute" ||
      r.name === "Résultat",
  );

  const seuil1 = parametres.seuilMargePalier1Percent ?? 25;
  const seuil2 = parametres.seuilMargePalier2Percent ?? 5;

  return (
    <div>
      <PageHeader
        title="Rentabilité — 2 paliers"
        description="Palier 1 : marge brute (CA HT facturé − CMV). Palier 2 : résultat (CA HT facturé − achats validés, tous types)."
        actions={
          <Link href="/parametres/pilotage?onglet=objectifs" className="btn btn-secondary">
            <Settings className="h-4 w-4" />
            Seuils d&apos;alerte
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["jour", "Jour"],
            ["mois", "Mois"],
            ["annee", "Année"],
            ["personnalise", "Personnalisé"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={`btn ${preset === id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => applyPreset(id)}
          >
            {label}
          </button>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="input"
            value={debut}
            onChange={(e) => {
              setPreset("personnalise");
              setDebut(e.target.value);
            }}
          />
          <span className="text-muted">→</span>
          <input
            type="date"
            className="input"
            value={fin}
            onChange={(e) => {
              setPreset("personnalise");
              setFin(e.target.value);
            }}
          />
        </div>
      </div>

      {(synthese.alertePalier2Negatif ||
        synthese.alertePalier1 ||
        synthese.alertePalier2) && (
        <div className="mb-4 space-y-2">
          {synthese.alertePalier2Negatif && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              Alerte : résultat négatif ({formatCurrency(synthese.resultat)}).
            </p>
          )}
          {synthese.alertePalier1 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Taux Palier 1 ({formatPercent(synthese.tauxPalier1 / 100)}) sous
              le seuil ({seuil1} %).
            </p>
          )}
          {synthese.alertePalier2 && !synthese.alertePalier2Negatif && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Taux Palier 2 ({formatPercent(synthese.tauxPalier2 / 100)}) sous
              le seuil ({seuil2} %).
            </p>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="CA HT facturé"
          value={formatCurrency(synthese.caHt)}
          hint="Factures fiscales validées (hors acompte / proforma)"
        />
        <StatCard
          label="Coût des ventes (CMV)"
          value={formatCurrency(synthese.cmv)}
          hint="Coût d’achat des produits facturés"
        />
        <StatCard
          label="Marge brute"
          value={formatCurrency(synthese.margeBrute)}
          hint={`Taux ${formatPercent(synthese.tauxPalier1 / 100)} · Palier 1`}
        />
        <StatCard
          label="Achats HT (tous types)"
          value={formatCurrency(synthese.achatsHt)}
          hint="Achats validés : marchandises, matières, services, immobilisations…"
        />
        <StatCard
          label="Résultat"
          value={formatCurrency(synthese.resultat)}
          hint={`Taux ${formatPercent(synthese.tauxPalier2 / 100)} · Palier 2`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <h2 className="mb-1 font-display text-base font-semibold">
            Cascade CA → Résultat
          </h2>
          <p className="mb-4 text-xs text-muted">
            Factures validées moins achats effectués (tous types)
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfall}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                  width={70}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Bar dataKey="montant" name="Montant" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <h2 className="mb-1 font-display text-base font-semibold">
            Évolution mensuelle {range.debut.getFullYear()}
          </h2>
          <p className="mb-4 text-xs text-muted">
            CA HT, marge brute (Palier 1) et résultat (Palier 2)
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => formatCompactCurrency(Number(v))}
                  width={70}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="caHt"
                  name="CA HT"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="palier1"
                  name="Marge brute"
                  stroke="#0369a1"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="palier2"
                  name="Résultat"
                  stroke="#b45309"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="table-shell">
          <p className="border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Synthèse de la période
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Indicateur</th>
                <th className="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CA HT facturé</td>
                <td className="text-right font-semibold">
                  {formatCurrency(synthese.caHt)}
                </td>
              </tr>
              <tr>
                <td>CMV</td>
                <td className="text-right font-semibold">
                  {formatCurrency(synthese.cmv)}
                </td>
              </tr>
              <tr>
                <td>Marge brute (CA − CMV)</td>
                <td className="text-right font-semibold">
                  {formatCurrency(synthese.margeBrute)}
                </td>
              </tr>
              <tr>
                <td>Achats HT (tous types)</td>
                <td className="text-right font-semibold">
                  {formatCurrency(synthese.achatsHt)}
                </td>
              </tr>
              <tr>
                <td>Résultat (CA − achats)</td>
                <td className="text-right font-semibold">
                  {formatCurrency(synthese.resultat)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="table-shell">
          <p className="border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Marge par produit (CA facturé − CMV)
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Qté</th>
                <th>CA HT</th>
                <th>CMV</th>
                <th>Marge</th>
              </tr>
            </thead>
            <tbody>
              {synthese.parProduit.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Aucune ligne facturée sur la période.
                  </td>
                </tr>
              ) : (
                synthese.parProduit.slice(0, 12).map((l) => (
                  <tr key={l.produitId}>
                    <td className="font-medium">{l.nom}</td>
                    <td>
                      {formatNumber(l.quantite, 1)} {l.unite}
                    </td>
                    <td>{formatCurrency(l.ca)}</td>
                    <td>{formatCurrency(l.cmv)}</td>
                    <td
                      className={
                        l.marge >= 0
                          ? "font-semibold text-success"
                          : "font-semibold text-coral"
                      }
                    >
                      {formatCurrency(l.marge)}
                    </td>
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
