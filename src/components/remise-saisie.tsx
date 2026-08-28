"use client";

import { useState } from "react";
import {
  bornerValeurRemise,
  convertirModeRemise,
  modeRemiseLigne,
  montantLigneBrutHT,
  montantRemiseLigne,
  prixUnitaireNetHT,
} from "@/lib/commercial";
import { formatCurrency } from "@/lib/format";
import type { LigneDocument, ModeRemise } from "@/lib/types";

function ToggleMode({
  mode,
  onChange,
}: {
  mode: ModeRemise;
  onChange: (mode: ModeRemise) => void;
}) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-line text-[10px] font-bold">
      <button
        type="button"
        className={`px-1.5 py-1 ${
          mode === "percent" ? "bg-sea-600 text-white" : "bg-card text-muted"
        }`}
        onClick={() => onChange("percent")}
        aria-pressed={mode === "percent"}
      >
        %
      </button>
      <button
        type="button"
        className={`px-1.5 py-1 ${
          mode === "montant" ? "bg-sea-600 text-white" : "bg-card text-muted"
        }`}
        onClick={() => onChange("montant")}
        aria-pressed={mode === "montant"}
      >
        Ar
      </button>
    </div>
  );
}

export function libelleRemiseLigne(
  l: Pick<
    LigneDocument,
    | "type"
    | "quantite"
    | "prixUnitaire"
    | "remiseMode"
    | "remisePercent"
    | "remiseMontant"
  >,
): string {
  const montant = montantRemiseLigne(l);
  if (montant <= 0) return "—";
  if (modeRemiseLigne(l) === "montant") return formatCurrency(montant);
  return `${l.remisePercent ?? 0} %`;
}

type PatchRemiseLigne = {
  remiseMode: ModeRemise;
  remisePercent?: number;
  remiseMontant?: number;
};

export function RemiseLigneSaisie({
  ligne,
  onChange,
}: {
  ligne: Pick<
    LigneDocument,
    | "type"
    | "quantite"
    | "prixUnitaire"
    | "remiseMode"
    | "remisePercent"
    | "remiseMontant"
  >;
  onChange: (patch: PatchRemiseLigne) => void;
}) {
  const brut = montantLigneBrutHT(ligne);
  const mode = modeRemiseLigne(ligne);
  const displayed =
    mode === "percent" ? (ligne.remisePercent ?? 0) : (ligne.remiseMontant ?? 0);
  const [hint, setHint] = useState<string | null>(null);
  const max = mode === "percent" ? 100 : brut;

  function appliquer(nextMode: ModeRemise, raw: number) {
    const { valeur, plafonnee } = bornerValeurRemise(raw, nextMode, brut);
    setHint(
      plafonnee
        ? nextMode === "percent"
          ? "Remise limitée à 100 %."
          : "Remise limitée au montant de la ligne."
        : null,
    );
    onChange({
      remiseMode: nextMode,
      remisePercent: nextMode === "percent" ? valeur || undefined : undefined,
      remiseMontant: nextMode === "montant" ? valeur || undefined : undefined,
    });
  }

  return (
    <div className="flex min-w-[10rem] flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={max}
          step={mode === "percent" ? 0.01 : 1}
          className="input w-[4.5rem]"
          value={displayed}
          onChange={(e) => appliquer(mode, Number(e.target.value) || 0)}
          aria-label="Remise de ligne"
        />
        <ToggleMode
          mode={mode}
          onChange={(next) => {
            const converted = convertirModeRemise(mode, next, displayed, brut);
            appliquer(next, converted);
          }}
        />
      </div>
      {hint && <p className="text-[10px] text-danger">{hint}</p>}
    </div>
  );
}

export function PrixUnitaireLigneSaisie({
  ligne,
  onChange,
}: {
  ligne: Pick<
    LigneDocument,
    | "type"
    | "quantite"
    | "prixUnitaire"
    | "remiseMode"
    | "remisePercent"
    | "remiseMontant"
  >;
  onChange: (prixUnitaire: number) => void;
}) {
  const remise = montantRemiseLigne(ligne);
  return (
    <div className="flex flex-col gap-0.5">
      <input
        type="number"
        min={0}
        className="input w-28"
        value={ligne.prixUnitaire}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        aria-label="Prix unitaire HT d'origine"
      />
      {remise > 0 && (
        <p className="text-[10px] leading-tight text-muted">
          Après remise : {formatCurrency(prixUnitaireNetHT(ligne))}
        </p>
      )}
    </div>
  );
}

export function RemiseGlobaleSaisie({
  htApresLignes,
  aDesRemisesLigne,
  mode,
  valeur,
  onChange,
}: {
  htApresLignes: number;
  aDesRemisesLigne: boolean;
  mode: ModeRemise;
  valeur: number;
  onChange: (next: { mode: ModeRemise; valeur: number }) => void;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const max = mode === "percent" ? 100 : htApresLignes;

  function appliquer(nextMode: ModeRemise, raw: number) {
    const { valeur: bornee, plafonnee } = bornerValeurRemise(
      raw,
      nextMode,
      htApresLignes,
    );
    setHint(
      plafonnee
        ? nextMode === "percent"
          ? "Remise limitée à 100 %."
          : "Remise limitée au total HT après remises de ligne."
        : null,
    );
    onChange({ mode: nextMode, valeur: bornee });
  }

  return (
    <div className="block text-xs font-semibold text-muted">
      Remise globale
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={max}
          step={mode === "percent" ? 0.01 : 1}
          className="input flex-1"
          value={valeur}
          onChange={(e) => appliquer(mode, Number(e.target.value) || 0)}
          aria-label="Remise globale"
        />
        <ToggleMode
          mode={mode}
          onChange={(next) => {
            const converted = convertirModeRemise(mode, next, valeur, htApresLignes);
            appliquer(next, converted);
          }}
        />
      </div>
      <p className="mt-1 font-normal leading-snug">
        Cumulable avec les remises de ligne. Appliquée sur{" "}
        {formatCurrency(htApresLignes)} HT
        {aDesRemisesLigne ? " (après remises de ligne)" : ""}, avant TVA.
      </p>
      {hint && <p className="mt-0.5 font-normal text-danger">{hint}</p>}
    </div>
  );
}
