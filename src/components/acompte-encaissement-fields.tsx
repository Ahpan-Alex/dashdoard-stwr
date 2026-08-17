"use client";

import { MODES_PAIEMENT } from "@/lib/commercial";
import { formatCurrency } from "@/lib/format";
import type { ModePaiement } from "@/lib/types";

export type SaisieAcompteForm = {
  montant: string;
  modePaiement: ModePaiement;
  genererFacture: boolean;
};

export const SAISIE_ACOMPTE_VIDE: SaisieAcompteForm = {
  montant: "",
  modePaiement: "virement",
  genererFacture: true,
};

type AcompteExistant = {
  numero: string;
  montantTTC: number;
};

type Props = {
  value: SaisieAcompteForm;
  onChange: (next: SaisieAcompteForm) => void;
  totalTTC?: number;
  acomptesExistants?: AcompteExistant[];
  /** Libellé du champ montant (complément vs premier acompte). */
  montantLabel?: string;
};

export function AcompteEncaissementFields({
  value,
  onChange,
  totalTTC = 0,
  acomptesExistants = [],
  montantLabel = "Acompte encaissé (Ar TTC)",
}: Props) {
  const existants = acomptesExistants.reduce((s, a) => s + a.montantTTC, 0);
  const nouveau = Math.max(0, Number(value.montant) || 0);
  const totalAcomptes = existants + nouveau;
  const reste = Math.max(0, totalTTC - totalAcomptes);

  return (
    <div className="rounded-lg border border-line bg-sea-50/40 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
        Acompte / paiement à l&apos;établissement
      </p>
      {acomptesExistants.length > 0 && (
        <p className="mb-3 text-[11px] text-muted">
          Déjà encaissé : {formatCurrency(existants)} (
          {acomptesExistants.map((a) => a.numero).join(", ")})
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-semibold text-muted">
          {montantLabel}
          <input
            type="number"
            min={0}
            step={100}
            className="input mt-1"
            value={value.montant}
            onChange={(e) => onChange({ ...value, montant: e.target.value })}
            placeholder="0"
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Mode de paiement
          <select
            className="select mt-1"
            value={value.modePaiement}
            onChange={(e) =>
              onChange({
                ...value,
                modePaiement: e.target.value as ModePaiement,
              })
            }
          >
            {Object.entries(MODES_PAIEMENT).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {totalTTC > 0 && (
          <div className="rounded-lg bg-card px-3 py-2">
            <p className="text-[11px] text-muted">Reste à payer</p>
            <p
              className={`font-display text-lg font-semibold ${
                reste > 0 ? "text-coral" : "text-success"
              }`}
            >
              {formatCurrency(reste)}
            </p>
            <p className="text-[11px] text-muted">
              Total TTC {formatCurrency(totalTTC)}
            </p>
          </div>
        )}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.genererFacture}
          onChange={(e) =>
            onChange({ ...value, genererFacture: e.target.checked })
          }
        />
        Générer la facture d&apos;acompte (recommandé — législation MG)
      </label>
    </div>
  );
}
