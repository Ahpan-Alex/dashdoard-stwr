"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Landmark, Printer, RefreshCw } from "lucide-react";
import {
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import {
  bilanInstantane,
  compteDeResultat,
  periodToRange,
  type DateRange,
  type Periode,
} from "@/lib/calculations";
import { formatCurrencyPrecise } from "@/lib/format";
import { useStore } from "@/lib/store";

type Preset = Periode | "personnalise" | "mois_precedent";

function Ligne({
  label,
  value,
  bold,
  indent,
  highlight,
}: {
  label: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
  highlight?: "positive" | "negative" | "total";
}) {
  const color =
    highlight === "positive"
      ? "text-success"
      : highlight === "negative"
        ? "text-danger"
        : highlight === "total"
          ? "text-sea-800"
          : "text-ink";

  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-line/70 py-2.5 ${
        bold ? "font-semibold" : ""
      } ${indent ? "pl-4 text-sm" : "text-sm"}`}
    >
      <span className={indent ? "text-muted" : ""}>{label}</span>
      <span className={`tabular-nums ${color}`}>
        {formatCurrencyPrecise(value)}
      </span>
    </div>
  );
}

function toInputDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function BilanPage() {
  const {
    ventes,
    entrees,
    charges,
    produits,
    pointsDeVente,
    pointDeVenteActifId,
    parametres,
    bilanInitial,
    immobilisations,
    factures,
    resetDemo,
  } = useStore();

  const anneeEnCours = periodToRange("annee");
  const [preset, setPreset] = useState<Preset>("annee");
  const [debut, setDebut] = useState(toInputDate(anneeEnCours.debut));
  const [fin, setFin] = useState(toInputDate(anneeEnCours.fin));

  function applyPreset(p: Preset) {
    setPreset(p);
    const now = new Date();
    if (p === "mois") {
      setDebut(toInputDate(startOfMonth(now)));
      setFin(toInputDate(endOfMonth(now)));
    } else if (p === "mois_precedent") {
      const prev = subMonths(now, 1);
      setDebut(toInputDate(startOfMonth(prev)));
      setFin(toInputDate(endOfMonth(prev)));
    } else if (p === "annee") {
      setDebut(toInputDate(startOfYear(now)));
      setFin(toInputDate(endOfYear(now)));
    } else if (p === "semaine") {
      const r = periodToRange("semaine");
      setDebut(toInputDate(r.debut));
      setFin(toInputDate(r.fin));
    }
  }

  const range: DateRange = useMemo(() => {
    const d = parseISO(debut);
    const f = parseISO(fin);
    return d <= f
      ? { debut: d, fin: f }
      : { debut: f, fin: d };
  }, [debut, fin]);

  const cr = compteDeResultat(
    ventes,
    entrees,
    charges,
    produits,
    pointsDeVente,
    pointDeVenteActifId,
    range,
  );

  const bilan = bilanInstantane(
    ventes,
    entrees,
    charges,
    produits,
    pointsDeVente,
    pointDeVenteActifId,
    bilanInitial,
    immobilisations,
    factures,
    range,
  );

  const periodeLabel = useMemo(() => {
    const fmt = (d: Date) =>
      format(d, "d MMMM yyyy", { locale: fr });
    return `Du ${fmt(range.debut)} au ${fmt(range.fin)}`;
  }, [range]);

  const pdvLabel =
    pointDeVenteActifId === "tous"
      ? "Tous les points de vente"
      : (pointsDeVente.find((p) => p.id === pointDeVenteActifId)?.nom ?? "");

  const dateInvalide = parseISO(debut) > parseISO(fin);

  return (
    <div>
      <PageHeader
        title="Bilan & compte de résultat"
        description="États financiers filtrables par fourchette de dates."
        actions={
          <div className="flex gap-2">
            <Link href="/elements-bilan" className="btn btn-secondary no-print">
              <Landmark className="h-4 w-4" />
              Gérer le bilan
            </Link>
            <button
              className="btn btn-secondary no-print"
              onClick={() => resetDemo()}
              title="Réinitialiser les données de démo"
            >
              <RefreshCw className="h-4 w-4" />
              Reset démo
            </button>
            <button
              className="btn btn-primary no-print"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Imprimer / PDF
            </button>
          </div>
        }
      />

      <div className="no-print mb-6 rounded-[var(--radius)] border border-line bg-card p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
          Fourchette de dates
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              { id: "semaine" as const, label: "Cette semaine" },
              { id: "mois" as const, label: "Mois en cours" },
              { id: "mois_precedent" as const, label: "Mois précédent" },
              { id: "annee" as const, label: "Année en cours" },
              { id: "personnalise" as const, label: "Personnalisé" },
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
            Date de fin (arrêté)
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
            <p className="rounded-lg bg-sea-100/70 px-3 py-2.5 text-sm text-sea-900">
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

      <div className="print-area mb-4 rounded-[var(--radius)] border border-line bg-card px-5 py-4">
        <p className="font-display text-xl font-semibold text-ink">
          {parametres.nomEntreprise}
        </p>
        <p className="text-sm text-muted">
          {pdvLabel} — {periodeLabel}
        </p>
        <p className="mt-1 text-xs text-muted">
          Compte de résultat sur la période · Bilan arrêté au{" "}
          {format(range.fin, "d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="print-area rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="font-display text-xl font-semibold text-ink">
            Compte de résultat
          </h2>
          <p className="mb-4 text-xs text-muted">{periodeLabel}</p>

          <Ligne
            label="Produits d'exploitation (CA)"
            value={cr.produitsExploitation}
          />
          <Ligne
            label="Achats de marchandises"
            value={-cr.achatsMarchandises}
            indent
          />
          <Ligne
            label="Variation de stocks (à la date de fin)"
            value={cr.variationStocks}
            indent
          />
          <Ligne
            label="Marge commerciale"
            value={cr.margeCommerciale}
            bold
            highlight="total"
          />

          {cr.detailCharges.filter((d) => d.type === "externe").length > 0 && (
            <>
              <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-sea-700">
                Charges externes
              </p>
              {cr.detailCharges
                .filter((d) => d.type === "externe")
                .map((d) => (
                  <Ligne
                    key={d.categorie}
                    label={d.label}
                    value={-d.montant}
                    indent
                  />
                ))}
              <Ligne
                label="Total charges externes"
                value={-cr.chargesExternes}
                bold
              />
            </>
          )}

          {cr.detailCharges.filter((d) => d.type === "personnel").length >
            0 && (
            <>
              <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wider text-sea-700">
                Charges de personnel
              </p>
              {cr.detailCharges
                .filter((d) => d.type === "personnel")
                .map((d) => (
                  <Ligne
                    key={d.categorie}
                    label={d.label}
                    value={-d.montant}
                    indent
                  />
                ))}
              <Ligne
                label="Total charges de personnel"
                value={-cr.chargesPersonnel}
                bold
              />
            </>
          )}

          {cr.detailCharges.length === 0 && (
            <p className="my-3 text-xs text-muted">
              Aucune charge sur cette fourchette de dates.
            </p>
          )}

          <Ligne
            label="Résultat d'exploitation"
            value={cr.resultatExploitation}
            bold
            highlight={
              cr.resultatExploitation >= 0 ? "positive" : "negative"
            }
          />
          <div className="mt-3 rounded-lg bg-sea-100/60 px-3 py-3">
            <Ligne
              label="Résultat net"
              value={cr.resultatNet}
              bold
              highlight={cr.resultatNet >= 0 ? "positive" : "negative"}
            />
          </div>
        </section>

        <section className="print-area rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="font-display text-xl font-semibold text-ink">
            Bilan
          </h2>
          <p className="mb-4 text-xs text-muted">
            Arrêté au {format(range.fin, "d MMMM yyyy", { locale: fr })} —
            Actif = Passif
          </p>

          <div className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Actif
            </h3>
            <Ligne
              label="Immobilisations brutes"
              value={bilan.actif.immobilisationsBrutes}
            />
            <Ligne
              label="Amortissements"
              value={-bilan.actif.amortissements}
              indent
            />
            <Ligne
              label="Immobilisations nettes"
              value={bilan.actif.immobilisationsNettes}
              bold
            />
            <Ligne label="Stocks" value={bilan.actif.stocks} />
            <Ligne
              label="Créances clients"
              value={bilan.actif.creancesClients}
              indent
            />
            <Ligne
              label="Disponibilités"
              value={bilan.actif.disponibilites}
              indent
            />
            <Ligne
              label="Total actif"
              value={bilan.actif.total}
              bold
              highlight="total"
            />
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Passif
            </h3>
            <Ligne label="Capital" value={bilan.passif.capital} />
            <Ligne
              label="Résultat reporté"
              value={bilan.passif.resultatReporte}
              indent
            />
            <Ligne
              label="Résultat de la période"
              value={bilan.passif.resultat}
              indent
            />
            <Ligne label="Emprunts" value={bilan.passif.emprunts} indent />
            <Ligne
              label="Dettes fournisseurs"
              value={bilan.passif.dettesFournisseurs}
              indent
            />
            <Ligne
              label="Dettes sociales"
              value={bilan.passif.dettesSociales}
              indent
            />
            <Ligne
              label="Total passif"
              value={bilan.passif.total}
              bold
              highlight="total"
            />
          </div>
        </section>
      </div>

      <p className="mt-6 text-xs text-muted no-print">
        Le compte de résultat cumule les flux entre les deux dates. Le bilan
        est arrêté à la date de fin (stocks, immobilisations et créances à
        cette date).
      </p>
    </div>
  );
}
