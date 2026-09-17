"use client";

import { IndicateurInfo } from "@/components/indicateur-info";
import {
  libelleDimensionsLigne,
  ligneEstSurface,
  surfaceTotaleM2,
} from "@/lib/surface-vente";
import { formatNumber } from "@/lib/format";
import type { LigneDocument } from "@/lib/types";

export function LigneDimensionsSaisie({
  ligne,
  onChange,
}: {
  ligne: Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM" | "quantite">;
  onChange: (patch: { largeurM?: number; hauteurM?: number }) => void;
}) {
  if (!ligne.venduAuM2) return null;
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="block text-[10px] font-semibold text-muted">
        Largeur (m)
        <input
          type="number"
          min={0}
          step="0.01"
          className="input mt-0.5 w-24"
          value={ligne.largeurM ?? ""}
          onChange={(e) =>
            onChange({
              largeurM: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
        />
      </label>
      <label className="block text-[10px] font-semibold text-muted">
        Hauteur (m)
        <input
          type="number"
          min={0}
          step="0.01"
          className="input mt-0.5 w-24"
          value={ligne.hauteurM ?? ""}
          onChange={(e) =>
            onChange({
              hauteurM: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
        />
      </label>
      <p className="pb-2 text-[10px] text-muted">
        {ligneEstSurface(ligne)
          ? `Surface : ${formatNumber(surfaceTotaleM2(ligne))} m² — ${libelleDimensionsLigne(ligne)}`
          : "Saisissez L et H pour calculer la surface (qté × L × H)."}
      </p>
    </div>
  );
}

export function ResumeSurfaceLigne({
  ligne,
}: {
  ligne: Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM" | "quantite">;
}) {
  if (!ligneEstSurface(ligne)) return null;
  return (
    <span className="mt-0.5 block text-[10px] text-muted">
      {libelleDimensionsLigne(ligne)}
    </span>
  );
}

export function AideSurfaceProduit() {
  return (
    <IndicateurInfo titre="Vendu à la surface">
      Active le calcul automatique : surface = largeur × hauteur (en mètres),
      montant HT = quantité × surface × prix au m². Sans dimensions, le calcul
      classique (prix × quantité) reste utilisé. Le prix au m² est indépendant
      du prix unitaire habituel.
    </IndicateurInfo>
  );
}
