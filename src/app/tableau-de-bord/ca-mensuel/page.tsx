"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CaComparaisonDoubleTable } from "@/components/ca-comparaison-tables";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  caPrecedent,
  caRapportAnnuel,
  caRapportHebdomadaireYoY,
  caRapportMensuelYoY,
  caRapportTrimestrielYoY,
  chiffreAffaires,
  labelPeriodeCourante,
  type Periode,
} from "@/lib/calculations";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";

const periodes: { id: Periode; label: string }[] = [
  { id: "semaine", label: "Hebdomadaire" },
  { id: "mois", label: "Mensuel" },
  { id: "annee", label: "Annuel" },
];

function fmtPct(pct: number | null) {
  if (pct === null) return "—";
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded.toLocaleString("fr-FR")} %`;
}

function titreEvolution(periode: Periode) {
  if (periode === "semaine") return "Évolution hebdomadaire du CA";
  if (periode === "annee") return "Évolution trimestrielle du CA";
  return "Évolution mensuelle du CA";
}

export default function CaMensuelPage() {
  const { ventes, produits, pointsDeVente, pointDeVenteActifId } = useStore();
  const [periode, setPeriode] = useState<Periode>("mois");
  const annee = new Date().getFullYear();

  const labelCourant = useMemo(
    () => labelPeriodeCourante(periode),
    [periode],
  );
  const labelSemaine = useMemo(() => labelPeriodeCourante("semaine"), []);
  const labelMois = useMemo(() => labelPeriodeCourante("mois"), []);
  const labelAnnee = useMemo(() => labelPeriodeCourante("annee"), []);

  const ca = useMemo(
    () => chiffreAffaires(ventes, pointDeVenteActifId, periode),
    [ventes, pointDeVenteActifId, periode],
  );
  const prev = useMemo(
    () => caPrecedent(ventes, pointDeVenteActifId, periode),
    [ventes, pointDeVenteActifId, periode],
  );

  const caSemaine = chiffreAffaires(ventes, pointDeVenteActifId, "semaine");
  const caMois = chiffreAffaires(ventes, pointDeVenteActifId, "mois");
  const caAnnee = chiffreAffaires(ventes, pointDeVenteActifId, "annee");

  const rapport = useMemo(() => {
    if (periode === "semaine") {
      return caRapportHebdomadaireYoY(ventes, pointDeVenteActifId, annee);
    }
    if (periode === "annee") {
      return caRapportTrimestrielYoY(ventes, pointDeVenteActifId, annee);
    }
    return caRapportMensuelYoY(ventes, pointDeVenteActifId, annee);
  }, [ventes, pointDeVenteActifId, periode, annee]);

  const rapportAnnuel3ans = useMemo(
    () =>
      periode === "annee"
        ? caRapportAnnuel(ventes, pointDeVenteActifId, annee)
        : null,
    [periode, ventes, pointDeVenteActifId, annee],
  );

  const chartEvolution = useMemo(() => {
    let source = rapport.lignes;
    if (periode === "semaine") {
      const now = new Date();
      const maxIndex = Math.min(
        rapport.lignes.length,
        Math.max(
          12,
          // semaines déjà passées dans l'année + 1
          Math.ceil(
            (now.getTime() - new Date(annee, 0, 1).getTime()) /
              (7 * 24 * 3600 * 1000),
          ) + 1,
        ),
      );
      source = rapport.lignes.slice(0, maxIndex);
    }

    return source.map((l) => ({
      name:
        periode === "mois"
          ? `${l.label.charAt(0).toUpperCase()}${l.label.slice(1, 3)}`
          : periode === "semaine"
            ? `S${l.key.replace("w-", "")}`
            : l.label,
      [String(annee)]: l.caAnnee,
      [String(annee - 1)]: l.caAnneePrec,
    }));
  }, [rapport, periode, annee]);

  const evolution = prev === 0 ? null : ((ca - prev) / prev) * 100;

  return (
    <div>
      <PageHeader
        title="Chiffre d'affaires mensuel"
        description="Analyse hebdomadaire, mensuelle et annuelle alimentée par la facturation."
        actions={
          <Link href="/factures" className="btn btn-primary">
            <ScrollText className="h-4 w-4" />
            Nouvelle facture
          </Link>
        }
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
        <StatCard
          label="CA hebdomadaire"
          value={formatCurrency(caSemaine)}
          hint={`${labelSemaine.titre} · ${labelSemaine.detail}`}
        />
        <StatCard
          label="CA mensuel"
          value={formatCurrency(caMois)}
          hint={labelMois.titre}
        />
        <StatCard
          label="CA annuel"
          value={formatCurrency(caAnnee)}
          hint={`Année ${labelAnnee.titre}`}
        />
      </div>

      <div className="mt-4 rounded-[var(--radius)] border border-line bg-sea-100/40 px-4 py-3 text-sm">
        <p>
          Période active :{" "}
          <strong className="capitalize">
            {periodes.find((p) => p.id === periode)?.label}
          </strong>
          {" — "}
          <strong className="capitalize">{labelCourant.titre}</strong>
          <span className="text-muted"> · {labelCourant.plage}</span>
        </p>
        <p className="mt-1">
          CA : <strong>{formatCurrency(ca)}</strong>
          {evolution !== null && (
            <span
              className={
                evolution >= 0
                  ? "ml-2 font-semibold text-success"
                  : "ml-2 font-semibold text-danger"
              }
            >
              ({evolution >= 0 ? "+" : ""}
              {evolution.toFixed(1)} % vs période précédente)
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted">
          Comparaison {rapport.annee} vs {rapport.anneePrec} (CA HT)
        </p>
      </div>

      <div className="mt-6">
        <CaComparaisonDoubleTable
          rapport={rapport}
          ventes={ventes}
          produits={produits}
          pointsDeVente={pointsDeVente}
          pointDeVenteActifId={pointDeVenteActifId}
        />
      </div>

      {rapportAnnuel3ans && (
        <div className="mt-8 overflow-x-auto">
          <p className="mb-2 text-sm font-bold text-ink">
            CA des 3 dernières années
          </p>
          <table className="ca-report max-w-3xl">
            <thead>
              <tr>
                <th>Période</th>
                <th>CA HT</th>
                <th>Année préc.</th>
                <th>Écart</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {rapportAnnuel3ans.lignes.map((l) => (
                <tr key={l.key}>
                  <td>
                    {l.label}
                    {l.courant ? " (en cours)" : ""}
                  </td>
                  <td>{formatCurrency(l.ca)}</td>
                  <td>{formatCurrency(l.caPrec)}</td>
                  <td>{formatCurrency(l.ecart)}</td>
                  <td>{fmtPct(l.pct)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{formatCurrency(rapportAnnuel3ans.total.ca)}</td>
                <td>{formatCurrency(rapportAnnuel3ans.total.caPrec)}</td>
                <td>{formatCurrency(rapportAnnuel3ans.total.ecart)}</td>
                <td>{fmtPct(rapportAnnuel3ans.total.pct)}</td>
              </tr>
              <tr>
                <td>Moyenne</td>
                <td>{formatCurrency(rapportAnnuel3ans.moyenne.ca)}</td>
                <td>{formatCurrency(rapportAnnuel3ans.moyenne.caPrec)}</td>
                <td>{formatCurrency(rapportAnnuel3ans.moyenne.ecart)}</td>
                <td>{fmtPct(rapportAnnuel3ans.moyenne.pct)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            {titreEvolution(periode)}
          </h2>
          <p className="text-xs text-muted">
            Comparaison {annee} vs {annee - 1}
          </p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartEvolution}>
              <defs>
                <linearGradient id="caN" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#156377" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#156377" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="caN1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3db" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7dd3db" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d4e5e9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#5a7380" }}
                axisLine={false}
                tickLine={false}
                interval={periode === "semaine" ? 3 : 0}
                className="capitalize"
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
              <Area
                type="monotone"
                dataKey={String(annee - 1)}
                name={`CA HT ${annee - 1}`}
                stroke="#7dd3db"
                fill="url(#caN1)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey={String(annee)}
                name={`CA HT ${annee}`}
                stroke="#156377"
                fill="url(#caN)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
