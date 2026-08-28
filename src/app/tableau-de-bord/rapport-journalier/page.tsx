"use client";

import { useMemo, useState, type FormEvent } from "react";
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
import { ClipboardList, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import type { DateRange } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { construireRapportsJournaliers } from "@/lib/rapport-journalier";
import { useStore } from "@/lib/store";

type Preset = "jour" | "mois" | "annee" | "personnalise";

function toInputDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function moneyClass(n: number) {
  if (n < 0) return "text-rose-700";
  if (n > 0) return "text-sea-800";
  return "text-ink";
}

export default function RapportJournalierPage() {
  const ventes = useStore((s) => s.ventes);
  const entrees = useStore((s) => s.entrees);
  const charges = useStore((s) => s.charges);
  const produits = useStore((s) => s.produits);
  const inventaires = useStore((s) => s.inventaires);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const pointDeVenteActifId = useStore((s) => s.pointDeVenteActifId);
  const rapportsFinJournee = useStore((s) => s.rapportsFinJournee);
  const upsertRapportFinJournee = useStore((s) => s.upsertRapportFinJournee);
  const deleteRapportFinJournee = useStore((s) => s.deleteRapportFinJournee);

  const moisEnCours = {
    debut: startOfMonth(new Date()),
    fin: endOfMonth(new Date()),
  };
  const [preset, setPreset] = useState<Preset>("mois");
  const [debut, setDebut] = useState(toInputDate(moisEnCours.debut));
  const [fin, setFin] = useState(toInputDate(moisEnCours.fin));

  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    dateJour: toInputDate(new Date()),
    pointDeVenteId: "",
    ecartStockAr: "0",
    volAr: "0",
    ecartCaisseAr: "0",
    invenduAr: "0",
    note: "",
  });

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

  const lignes = useMemo(
    () =>
      construireRapportsJournaliers({
        ventes,
        entrees,
        charges,
        produits,
        inventaires,
        pointDeVenteId: pointDeVenteActifId,
        range,
        rapports: rapportsFinJournee ?? [],
      }),
    [
      ventes,
      entrees,
      charges,
      produits,
      inventaires,
      pointDeVenteActifId,
      range,
      rapportsFinJournee,
    ],
  );

  const totaux = useMemo(() => {
    return lignes.reduce(
      (acc, l) => ({
        ventes: acc.ventes + l.totalVentes,
        marge: acc.marge + l.margeRealisee,
        ecartStock: acc.ecartStock + l.ecartStockAr,
        vol: acc.vol + l.volAr,
        caisse: acc.caisse + l.ecartCaisseAr,
        invendu: acc.invendu + l.invenduAr,
        pertes: acc.pertes + l.totalPertesSaisies,
      }),
      {
        ventes: 0,
        marge: 0,
        ecartStock: 0,
        vol: 0,
        caisse: 0,
        invendu: 0,
        pertes: 0,
      },
    );
  }, [lignes]);

  const periodeLabel = useMemo(() => {
    const fmt = (d: Date) => format(d, "d MMMM yyyy", { locale: fr });
    if (preset === "jour" && debut === fin) {
      return format(range.debut, "EEEE d MMMM yyyy", { locale: fr });
    }
    return `Du ${fmt(range.debut)} au ${fmt(range.fin)}`;
  }, [range, preset, debut, fin]);

  const pdvSaisieDefaut =
    pointDeVenteActifId !== "tous"
      ? pointDeVenteActifId
      : (pointsDeVente[0]?.id ?? "");

  function openNouveau(dateJour?: string) {
    setForm({
      id: undefined,
      dateJour: dateJour ?? toInputDate(new Date()),
      pointDeVenteId: pdvSaisieDefaut,
      ecartStockAr: "0",
      volAr: "0",
      ecartCaisseAr: "0",
      invenduAr: "0",
      note: "",
    });
    setPanelOpen(true);
  }

  function openEdit(ligne: (typeof lignes)[number]) {
    if (pointDeVenteActifId === "tous") {
      openNouveau(ligne.dateJour);
      return;
    }
    const existing = (rapportsFinJournee ?? []).find(
      (r) =>
        r.dateJour === ligne.dateJour &&
        r.pointDeVenteId === pointDeVenteActifId,
    );
    setForm({
      id: existing?.id,
      dateJour: ligne.dateJour,
      pointDeVenteId: pointDeVenteActifId,
      ecartStockAr: String(existing?.ecartStockAr ?? 0),
      volAr: String(existing?.volAr ?? 0),
      ecartCaisseAr: String(existing?.ecartCaisseAr ?? 0),
      invenduAr: String(existing?.invenduAr ?? 0),
      note: existing?.note ?? "",
    });
    setPanelOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.pointDeVenteId || form.pointDeVenteId === "tous") return;
    upsertRapportFinJournee({
      id: form.id,
      dateJour: form.dateJour,
      pointDeVenteId: form.pointDeVenteId,
      ecartStockAr: Number(form.ecartStockAr) || 0,
      volAr: Number(form.volAr) || 0,
      ecartCaisseAr: Number(form.ecartCaisseAr) || 0,
      invenduAr: Number(form.invenduAr) || 0,
      note: form.note.trim() || undefined,
    });
    setPanelOpen(false);
  }

  function onDelete() {
    if (!form.id) return;
    deleteRapportFinJournee(form.id);
    setPanelOpen(false);
  }

  const pdvLabel =
    pointDeVenteActifId === "tous"
      ? "Tous les points de vente"
      : (pointsDeVente.find((p) => p.id === pointDeVenteActifId)?.nom ??
        "Point de vente");

  return (
    <div>
      <PageHeader
        title="Rapport de fin de journée"
        description={`Clôture journalière — ${pdvLabel}. Ventes et marge calculées automatiquement ; écarts stock, vol, caisse et invendus en saisie.`}
        actions={
          <button className="btn btn-primary" onClick={() => openNouveau()}>
            <Plus className="h-4 w-4" />
            Saisir la clôture
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1 rounded-[var(--radius)] border border-line bg-card p-1">
          {(
            [
              ["jour", "Jour"],
              ["mois", "Mois"],
              ["annee", "Année"],
              ["personnalise", "Perso."],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                preset === key
                  ? "bg-sea-700 text-white"
                  : "text-muted hover:bg-sea-50 hover:text-ink"
              }`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted">Du</span>
          <input
            type="date"
            className="input"
            value={debut}
            onChange={(e) => {
              setPreset("personnalise");
              setDebut(e.target.value);
            }}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted">Au</span>
          <input
            type="date"
            className="input"
            value={fin}
            onChange={(e) => {
              setPreset("personnalise");
              setFin(e.target.value);
            }}
          />
        </label>
        <p className="pb-2 text-sm text-muted">{periodeLabel}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total ventes"
          value={formatCurrency(totaux.ventes)}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="Marge réalisée"
          value={formatCurrency(totaux.marge)}
          hint="CA − coût d'achat"
        />
        <StatCard
          label="Pertes saisies"
          value={formatCurrency(totaux.pertes)}
          hint="Vol + invendu + manques"
        />
        <StatCard
          label="Écart de stock"
          value={formatCurrency(totaux.ecartStock)}
        />
        <StatCard label="Vol" value={formatCurrency(totaux.vol)} />
        <StatCard
          label="Écart de caisse"
          value={formatCurrency(totaux.caisse)}
        />
        <StatCard
          label="Invendu / casse"
          value={formatCurrency(totaux.invendu)}
        />
      </div>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-card">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="border-b border-line bg-sea-50/60 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Jour</th>
              <th className="px-4 py-3 text-right font-semibold">Ventes</th>
              <th className="px-4 py-3 text-right font-semibold">Marge</th>
              <th className="px-4 py-3 text-right font-semibold">Écart stock</th>
              <th className="px-4 py-3 text-right font-semibold">Vol</th>
              <th className="px-4 py-3 text-right font-semibold">Caisse</th>
              <th className="px-4 py-3 text-right font-semibold">Invendu</th>
              <th className="px-4 py-3 text-right font-semibold">Pertes</th>
              <th className="px-4 py-3 font-semibold">Clôture</th>
              <th className="px-4 py-3 text-right font-semibold" />
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr
                key={l.dateJour}
                className="border-b border-line/70 last:border-0 hover:bg-sea-50/40"
              >
                <td className="px-4 py-3">
                  <span className="font-medium capitalize text-ink">
                    {l.label}
                  </span>
                  {l.note ? (
                    <p className="mt-0.5 max-w-[220px] truncate text-xs text-muted">
                      {l.note}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(l.totalVentes)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums font-medium ${moneyClass(l.margeRealisee)}`}
                >
                  {formatCurrency(l.margeRealisee)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${moneyClass(l.ecartStockAr)}`}
                >
                  {formatCurrency(l.ecartStockAr)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-rose-700">
                  {formatCurrency(l.volAr)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${moneyClass(l.ecartCaisseAr)}`}
                >
                  {formatCurrency(l.ecartCaisseAr)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-rose-700">
                  {formatCurrency(l.invenduAr)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-rose-800">
                  {formatCurrency(l.totalPertesSaisies)}
                </td>
                <td className="px-4 py-3">
                  {l.saisi ? (
                    <span className="inline-flex rounded-full bg-sea-100 px-2 py-0.5 text-xs font-medium text-sea-800">
                      Saisie
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      À saisir
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="btn btn-secondary !px-2 !py-1.5"
                    onClick={() => openEdit(l)}
                    title="Saisir / modifier la clôture"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {lignes.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-muted"
                >
                  Aucun jour sur cette période.
                </td>
              </tr>
            ) : null}
          </tbody>
          {lignes.length > 0 ? (
            <tfoot className="border-t border-line bg-sea-50/50 font-medium">
              <tr>
                <td className="px-4 py-3">Total période</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(totaux.ventes)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${moneyClass(totaux.marge)}`}
                >
                  {formatCurrency(totaux.marge)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${moneyClass(totaux.ecartStock)}`}
                >
                  {formatCurrency(totaux.ecartStock)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(totaux.vol)}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${moneyClass(totaux.caisse)}`}
                >
                  {formatCurrency(totaux.caisse)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(totaux.invendu)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-rose-800">
                  {formatCurrency(totaux.pertes)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Écart stock / caisse : négatif = manque, positif = surplus. Vol et
        invendu sont des montants de perte. En vue « Tous les PDV », les saisies
        sont agrégées ; la clôture se fait PDV par PDV.
      </p>

      {panelOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <form
            onSubmit={onSubmit}
            className="mt-10 w-full max-w-lg rounded-[var(--radius)] border border-line bg-card p-6 shadow-lg"
          >
            <h2 className="font-display text-xl font-semibold text-ink">
              {form.id ? "Modifier la clôture" : "Saisir la clôture"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Montants en Ariary. Les ventes et la marge du jour restent
              calculées depuis les factures.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Jour
                </span>
                <input
                  type="date"
                  className="input w-full"
                  required
                  value={form.dateJour}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateJour: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Point de vente
                </span>
                <select
                  className="input w-full"
                  required
                  value={form.pointDeVenteId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pointDeVenteId: e.target.value }))
                  }
                >
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {pointsDeVente.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Écart de stock
                </span>
                <input
                  type="number"
                  className="input w-full"
                  step="1"
                  value={form.ecartStockAr}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ecartStockAr: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Vol
                </span>
                <input
                  type="number"
                  className="input w-full"
                  min="0"
                  step="1"
                  value={form.volAr}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, volAr: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Écart de caisse
                </span>
                <input
                  type="number"
                  className="input w-full"
                  step="1"
                  value={form.ecartCaisseAr}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ecartCaisseAr: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Invendu / casse
                </span>
                <input
                  type="number"
                  className="input w-full"
                  min="0"
                  step="1"
                  value={form.invenduAr}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invenduAr: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">
                  Note (optionnel)
                </span>
                <textarea
                  className="input w-full min-h-[72px]"
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <div>
                {form.id ? (
                  <button
                    type="button"
                    className="btn btn-secondary text-rose-700"
                    onClick={onDelete}
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPanelOpen(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
