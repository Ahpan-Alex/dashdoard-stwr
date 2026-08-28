"use client";

import { FileDown, Printer } from "lucide-react";
import {
  feuilleDepuisConteneur,
  imprimerFeuilleCommerciale,
} from "@/lib/imprimer-document";

type Props = {
  sheetRef: { current: HTMLElement | null };
  filename?: string;
  className?: string;
};

async function lancer(sheetRef: { current: HTMLElement | null }, filename?: string) {
  const sheet = feuilleDepuisConteneur(sheetRef.current);
  if (!sheet) {
    alert("Aperçu indisponible — ouvrez d'abord le document.");
    return;
  }
  try {
    await imprimerFeuilleCommerciale(sheet, { filename });
  } catch (err) {
    alert(err instanceof Error ? err.message : "Impression impossible.");
  }
}

/** Deux sorties (PDF / imprimante) sur le même rendu que l'aperçu. */
export function DocumentPrintActions({ sheetRef, filename, className = "" }: Props) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      <button
        type="button"
        className="btn btn-secondary"
        title="Enregistrer au format PDF — rendu identique à l'aperçu, couleurs conservées"
        onClick={() => void lancer(sheetRef, filename)}
      >
        <FileDown className="h-4 w-4" />
        Exporter PDF
      </button>
      <button
        type="button"
        className="btn btn-primary"
        title="Impression directe — même mise en page et couleurs que l'aperçu"
        onClick={() => void lancer(sheetRef, filename)}
      >
        <Printer className="h-4 w-4" />
        Imprimer
      </button>
    </div>
  );
}
