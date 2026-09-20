"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, X } from "lucide-react";
import { type LigneCaYoY, type RapportCaYoY } from "@/lib/calculations";
import {
  caParProduitFactures,
  detailFacturesCaPeriode,
} from "@/lib/rentabilite";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import type { Facture, Parametres, PointDeVente, Produit } from "@/lib/types";

function fmtPct(pct: number | null) {
  if (pct === null) return "—";
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded.toLocaleString("fr-FR")} %`;
}

function CellMontant({ value }: { value: number }) {
  return <td>{formatCurrency(value)}</td>;
}

type SelectionPeriode = {
  key: string;
  label: string;
  source: "periodique" | "cumule";
  ligne: LigneCaYoY;
};

function CaReportTable({
  title,
  annee,
  anneePrec,
  lignes,
  total,
  moyenne,
  selectedKey,
  source,
  onSelect,
}: {
  title: string;
  annee: number;
  anneePrec: number;
  lignes: LigneCaYoY[];
  total: Omit<LigneCaYoY, "key" | "label" | "rangeAnnee" | "rangeAnneePrec">;
  moyenne: Omit<LigneCaYoY, "key" | "label" | "rangeAnnee" | "rangeAnneePrec">;
  selectedKey: string | null;
  source: "periodique" | "cumule";
  onSelect: (ligne: LigneCaYoY, source: "periodique" | "cumule") => void;
}) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <p className="mb-2 text-sm font-bold text-ink">{title}</p>
      <p className="mb-2 text-[11px] text-muted">
        Cliquez une période pour voir le détail des produits
      </p>
      <table className="ca-report">
        <thead>
          <tr>
            <th>Période</th>
            <th>CA HT {annee}</th>
            <th>CA HT {anneePrec}</th>
            <th>Écart</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const active = selectedKey === `${source}:${l.key}`;
            return (
              <tr
                key={l.key}
                className={`ca-report-row ${active ? "ca-report-row-active" : ""}`}
                onClick={() => onSelect(l, source)}
                title={`Voir les produits de ${l.label}`}
              >
                <td>
                  <span className="inline-flex items-center gap-1">
                    {l.label}
                    <ChevronDown
                      className={`h-3.5 w-3.5 opacity-50 ${active ? "rotate-180" : ""}`}
                    />
                  </span>
                </td>
                <CellMontant value={l.caAnnee} />
                <CellMontant value={l.caAnneePrec} />
                <CellMontant value={l.ecart} />
                <td>{fmtPct(l.pct)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td>{formatCurrency(total.caAnnee)}</td>
            <td>{formatCurrency(total.caAnneePrec)}</td>
            <td>{formatCurrency(total.ecart)}</td>
            <td>{fmtPct(total.pct)}</td>
          </tr>
          <tr>
            <td>Moyenne</td>
            <td>{formatCurrency(moyenne.caAnnee)}</td>
            <td>{formatCurrency(moyenne.caAnneePrec)}</td>
            <td>{formatCurrency(moyenne.ecart)}</td>
            <td>{fmtPct(moyenne.pct)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function libelleTypeFacture(type: Facture["type"]) {
  if (type === "avoir") return "Avoir";
  if (type === "acompte") return "Acompte";
  if (type === "proforma") return "Proforma";
  return "Facture";
}

function DetailPeriodePanel({
  selection,
  annee,
  factures,
  parametres,
  produits,
  pointsDeVente,
  pointDeVenteActifId,
  onClose,
}: {
  selection: SelectionPeriode;
  annee: number;
  factures: Facture[];
  parametres: Parametres;
  produits: Produit[];
  pointsDeVente: PointDeVente[];
  pointDeVenteActifId: string | "tous";
  onClose: () => void;
}) {
  const range = selection.ligne.rangeAnnee;
  const plageLabel = `${format(range.debut, "d MMM yyyy", { locale: fr })} → ${format(range.fin, "d MMM yyyy", { locale: fr })}`;

  const parProduit = useMemo(
    () =>
      caParProduitFactures(factures, produits, pointDeVenteActifId, range),
    [factures, produits, pointDeVenteActifId, range],
  );

  const facturesDetail = useMemo(
    () =>
      detailFacturesCaPeriode(
        factures,
        parametres,
        pointDeVenteActifId,
        range,
      ),
    [factures, parametres, pointDeVenteActifId, range],
  );

  const total = parProduit.reduce((s, l) => s + l.montant, 0);
  const sourceLabel =
    selection.source === "cumule" ? "cumulé jusqu'à" : "période";

  return (
    <div className="mt-6 rounded-[var(--radius)] border border-sea-300 bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold capitalize text-ink">
            Détail CA — {selection.label}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {sourceLabel} · {annee} · {plageLabel}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          <X className="h-4 w-4" />
          Fermer
        </button>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-line lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-5 py-3">
            <h3 className="text-sm font-semibold text-ink">
              Produits constitutifs du CA
            </h3>
            <span className="badge badge-sea">{formatCurrency(total)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Quantité</th>
                  <th>CA</th>
                  <th>Part</th>
                </tr>
              </thead>
              <tbody>
                {parProduit.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted">
                    Aucune facture validée sur cette période.
                    </td>
                  </tr>
                ) : (
                  parProduit.map((l) => (
                    <tr key={l.id}>
                      <td className="font-medium">{l.nom}</td>
                      <td>
                        {formatNumber(l.quantite)} {l.unite}
                      </td>
                      <td className="font-semibold">
                        {formatCurrency(l.montant)}
                      </td>
                      <td className="text-muted">
                        {total > 0 ? formatPercent(l.montant / total) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="px-5 py-3">
            <h3 className="text-sm font-semibold text-ink">
              Factures de la période
            </h3>
            <p className="text-xs text-muted">
              {facturesDetail.length} pièce
              {facturesDetail.length > 1 ? "s" : ""} — date de facture, hors
              paiement
            </p>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>N°</th>
                  <th>Type</th>
                  <th>Point de vente</th>
                  <th>CA HT</th>
                </tr>
              </thead>
              <tbody>
                {facturesDetail.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      Aucune facture.
                    </td>
                  </tr>
                ) : (
                  facturesDetail.map((f) => {
                    const pdv = pointsDeVente.find(
                      (p) => p.id === f.pointDeVenteId,
                    );
                    return (
                      <tr key={f.id}>
                        <td>{formatDate(f.date)}</td>
                        <td className="font-medium">{f.numero}</td>
                        <td>{libelleTypeFacture(f.type)}</td>
                        <td>{pdv?.nom ?? "—"}</td>
                        <td className="font-semibold">
                          {formatCurrency(f.totalHT)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CaComparaisonDoubleTable({
  rapport,
  factures,
  parametres,
  produits,
  pointsDeVente,
  pointDeVenteActifId,
}: {
  rapport: RapportCaYoY;
  factures: Facture[];
  parametres: Parametres;
  produits: Produit[];
  pointsDeVente: PointDeVente[];
  pointDeVenteActifId: string | "tous";
}) {
  const [selection, setSelection] = useState<SelectionPeriode | null>(null);

  function onSelect(ligne: LigneCaYoY, source: "periodique" | "cumule") {
    const key = `${source}:${ligne.key}`;
    setSelection((prev) =>
      prev && `${prev.source}:${prev.key}` === key
        ? null
        : {
            key: ligne.key,
            label: ligne.label,
            source,
            ligne,
          },
    );
  }

  const selectedKey = selection
    ? `${selection.source}:${selection.key}`
    : null;

  return (
    <div>
      <div className="grid gap-6 xl:grid-cols-2">
        <CaReportTable
          title={rapport.titrePeriodique}
          annee={rapport.annee}
          anneePrec={rapport.anneePrec}
          lignes={rapport.lignes}
          total={rapport.total}
          moyenne={rapport.moyenne}
          selectedKey={selectedKey}
          source="periodique"
          onSelect={onSelect}
        />
        <CaReportTable
          title={rapport.titreCumule}
          annee={rapport.annee}
          anneePrec={rapport.anneePrec}
          lignes={rapport.lignesCumulees}
          total={rapport.totalCumule}
          moyenne={rapport.moyenneCumule}
          selectedKey={selectedKey}
          source="cumule"
          onSelect={onSelect}
        />
      </div>

      {selection && (
        <DetailPeriodePanel
          selection={selection}
          annee={rapport.annee}
          factures={factures}
          parametres={parametres}
          produits={produits}
          pointsDeVente={pointsDeVente}
          pointDeVenteActifId={pointDeVenteActifId}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
