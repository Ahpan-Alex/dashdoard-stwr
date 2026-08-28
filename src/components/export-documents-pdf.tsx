"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileDown } from "lucide-react";
import { IconButton } from "@/components/icon-button";
import {
  feuilleDepuisConteneur,
  imprimerFeuilleCommerciale,
} from "@/lib/imprimer-document";

type Props = {
  label?: string;
  children: ReactNode;
  variant?: "icon" | "button";
  className?: string;
  filename?: string;
};

/**
 * Export PDF d'un document : même feuille que l'aperçu (HTML + CSS + couleurs).
 */
export function ExportDocumentPdfButton({
  label = "Exporter PDF",
  children,
  variant = "icon",
  className = "",
  filename,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const run = async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled) return;
      const sheet = feuilleDepuisConteneur(hostRef.current);
      if (sheet) {
        await imprimerFeuilleCommerciale(sheet, {
          filename: filename ?? label,
        });
      }
      if (!cancelled) setActive(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [active, filename, label]);

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          className={`btn btn-secondary ${className}`.trim()}
          disabled={active}
          title="Enregistrer au format PDF — identique à l'aperçu, couleurs conservées"
          onClick={() => setActive(true)}
        >
          <FileDown className="h-4 w-4" />
          {active ? "Préparation…" : label}
        </button>
      ) : (
        <IconButton
          label={active ? "Préparation…" : label}
          disabled={active}
          className={className}
          title="Enregistrer au format PDF — identique à l'aperçu, couleurs conservées"
          onClick={() => setActive(true)}
        >
          <FileDown className="h-4 w-4" />
        </IconButton>
      )}

      {active && (
        <div
          ref={hostRef}
          className="document-export-host"
          aria-hidden
        >
          {children}
        </div>
      )}
    </>
  );
}
