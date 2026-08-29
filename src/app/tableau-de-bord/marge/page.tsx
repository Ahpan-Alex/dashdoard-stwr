"use client";

import { useMemo, useState } from "react";
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
import { fr } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import { StatCard } from "@/components/stat-card";
import {
  beneficesSerieTemporelle,
  syntheseBenefices,
  type DateRange,
} from "@/lib/calculations";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";

type Preset = "jour" | "mois" | "annee" | "personnalise";

function toInputDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function MargePage() {
  const {
    ventes,
    entrees,
    charges,
    produits,
    pointDeVenteActifId,
    inventaires,
  } = useStore();
  const { visible, colSpan } = useAffichageTable("marge_produits");

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
    return d <= f ? { debut: d, fin: f } : { debut: f, fin: d };
  }, [debut, fin]);

  const synthese = useMemo(
    () =>
      syntheseBenefices(
        ventes,
        entrees,
        charges,
        produits,
        pointDeVenteActifId,
        range,
        inventaires,
      ),
    [ventes, entrees, charges, produits, pointDeVenteActifId, range, inventaires],
  );

  const serieMode =
    preset === "annee" ? "mois" : preset === "personnalise" ? "auto" : "jour";

  const serie = useMemo(
    () =>
      beneficesSerieTemporelle(
        ventes,
        entrees,
        produits,
        pointDeVenteActifId,
        range,
        serieMode,
        inventaires,
      ),
    [ventes, entrees, produits, pointDeVenteActifId, range, serieMode, inventaires],
  );

  const periodeLabel = useMemo(() => {
    const fmt = (d: Date) => format(d, "d MMMM yyyy", { locale: fr });
    if (preset === "jour" && debut === fin) {
      return format(range.debut, "EEEE d MMMM yyyy", { locale: fr });
    }
    return `Du ${fmt(range.debut)} au ${fmt(range.fin)}`;
  }, [range, preset, debut, fin]);

  const tauxBenefice =
    synthese.ca > 0 ? synthese.benefice / synthese.ca : 0;
  const top = synthese.lignes[0];
  const chartProduits = synthese.lignes.slice(0, 10).map((l) => ({
    name: l.nom.length > 18 ? `${l.nom.slice(0, 16)}…` : l.nom,
    benefice: l.benefice,
  }));

  const dateInvalide = parseISO(debut) > parseISO(fin);

  return (
    <div>
      <PageHeader
        title="Marge"
        description="Bénéfices réalisés sur les ventes (CA moins coût d'achat), par produit et au total."
      />

      <div className="mb-6 rounded-[var(--radius)] border border-line bg-card p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
          Période
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              { id: "jour" as const, label: "Jour" },
              { id: "mois" as const, label: "Mois" },
              { id: "annee" as const, label: "Année" },
              { id: "personnalise" as const, label: "Intervalle" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              className={`btn ${preset === p.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-semibold text-muted">
            Date de début
            <input
              type="date"
              className="input mt-1"
              value={debut}
              onChange={(e) => {
                setDebut(e.target.value);
                setPreset("personnalise");
              }}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Date de fin
            <input
              type="date"
              className="input mt-1"
              value={fin}
              onChange={(e) => {
                setFin(e.target.value);
                setPreset("personnalise");
              }}
            />
          </label>
          <div className="flex items-end">
            <p className="rounded-lg bg-sea-100/70 px-3 py-2.5 text-sm capitalize text-sea-900">
              {periodeLabel}
            </p>
          </div>
        </div>

        {dateInvalide && (
          <p className="mt-3 text-xs text-danger">
            La date de début est après la date de fin — les dates sont
            automatiquement inversées pour le calcul.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Chiffre d'affaires" value={formatCurrency(synthese.ca)} />
        <StatCard
          label="Coût d'achat"
          value={formatCurrency(synthese.coutAchat)}
        />
        <StatCard
          label="Bénéfice"
          value={formatCurrency(synthese.benefice)}
          hint={
            synthese.ca > 0
              ? `${formatPercent(tauxBenefice)} du CA`
              : undefined
          }
        />
        <StatCard
          label="Bénéfice net"
          value={formatCurrency(synthese.beneficeNet)}
          hint={`Après charges (${formatCurrency(synthese.charges)})`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">
            Évolution des bénéfices
          </h2>
          <p className="mb-4 text-xs text-muted">
            {serieMode === "mois"
              ? "Par mois"
              : serieMode === "jour"
                ? "Par jour"
                : "Automatique selon l'intervalle"}
          </p>
          <div className="h-72">
            {serie.every((p) => p.benefice === 0 && p.ca === 0) ? (
              <p className="flex h-full items-center justify-center text-sm text-muted">
                Aucune vente sur cette période.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d4e5e9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#5a7380" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
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
                    dataKey="benefice"
                    name="Bénéfice"
                    fill="#156377"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="ca"
                    name="CA"
                    fill="#7dd3db"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">
            Bénéfice par produit
          </h2>
          <p className="mb-4 text-xs text-muted">
            Top 10 —{" "}
            {top
              ? `meilleur : ${top.nom} (${formatCurrency(top.benefice)})`
              : "aucune vente"}
          </p>
          <div className="h-72">
            {chartProduits.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted">
                Aucun produit vendu sur cette période.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartProduits}
                  layout="vertical"
                  margin={{ left: 8 }}
                >
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
                  <Bar
                    dataKey="benefice"
                    name="Bénéfice"
                    fill="#1b7d8f"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <TableAffichageBarre
        tableId="marge_produits"
        lignes={synthese.lignes.map((ligne) => ({
          produit: ligne.nom,
          quantite: `${formatNumber(ligne.quantite)} ${ligne.unite}`,
          ca: formatCurrency(ligne.ca),
          cout: formatCurrency(ligne.coutAchat),
          benefice: formatCurrency(ligne.benefice),
          part:
            synthese.benefice > 0
              ? formatPercent(ligne.benefice / synthese.benefice)
              : "—",
        }))}
        fichier="marge-produits"
        titre="Marge produits"
      />

      <div className="mt-6 table-shell">
        <table className="data">
          <thead>
            <tr>
              <ThCol id="produit" show={visible}>Produit</ThCol>
              <ThCol id="quantite" show={visible}>Quantité</ThCol>
              <ThCol id="ca" show={visible}>CA</ThCol>
              <ThCol id="cout" show={visible}>Coût d&apos;achat</ThCol>
              <ThCol id="benefice" show={visible}>Bénéfice</ThCol>
              <ThCol id="part" show={visible}>Part du bénéfice</ThCol>
            </tr>
          </thead>
          <tbody>
            {synthese.lignes.length === 0 ? (
              <tr>
                <td colSpan={colSpan(false)} className="text-muted">
                  Aucune vente sur cette période.
                </td>
              </tr>
            ) : (
              <>
                {synthese.lignes.map((ligne) => (
                  <tr key={ligne.id}>
                    <TdCol id="produit" show={visible} className="font-medium">{ligne.nom}</TdCol>
                    <TdCol id="quantite" show={visible}>
                      {formatNumber(ligne.quantite)} {ligne.unite}
                    </TdCol>
                    <TdCol id="ca" show={visible}>{formatCurrency(ligne.ca)}</TdCol>
                    <TdCol id="cout" show={visible}>{formatCurrency(ligne.coutAchat)}</TdCol>
                    <TdCol
                      id="benefice"
                      show={visible}
                      className={
                        ligne.benefice >= 0
                          ? "font-semibold text-success"
                          : "font-semibold text-danger"
                      }
                    >
                      {formatCurrency(ligne.benefice)}
                    </TdCol>
                    <TdCol id="part" show={visible}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sea-100">
                          <div
                            className="h-full rounded-full bg-sea-600"
                            style={{
                              width: `${
                                synthese.benefice > 0
                                  ? Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        (ligne.benefice / synthese.benefice) *
                                          100,
                                      ),
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted">
                          {synthese.benefice > 0
                            ? formatPercent(ligne.benefice / synthese.benefice)
                            : "—"}
                        </span>
                      </div>
                    </TdCol>
                  </tr>
                ))}
                <tr className="bg-sea-50/60 font-semibold">
                  <TdCol id="produit" show={visible}>Total</TdCol>
                  <TdCol id="quantite" show={visible}>—</TdCol>
                  <TdCol id="ca" show={visible}>{formatCurrency(synthese.ca)}</TdCol>
                  <TdCol id="cout" show={visible}>{formatCurrency(synthese.coutAchat)}</TdCol>
                  <TdCol
                    id="benefice"
                    show={visible}
                    className={
                      synthese.benefice >= 0 ? "text-success" : "text-danger"
                    }
                  >
                    {formatCurrency(synthese.benefice)}
                  </TdCol>
                  <TdCol id="part" show={visible} className="text-xs font-normal text-muted">
                    Net : {formatCurrency(synthese.beneficeNet)}
                  </TdCol>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
