"use client";

import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { FileDown } from "lucide-react";
import { IconButton } from "@/components/icon-button";

type Props = {
  /** Libellé accessibilité / tooltip. */
  label?: string;
  /** Prévisualisation PDF du document (rendue uniquement pendant l'export). */
  children: ReactNode;
  /** Bouton texte au lieu d'une icône. */
  variant?: "icon" | "button";
  className?: string;
};

/**
 * Export PDF d'un seul document via la boîte d'impression du navigateur.
 */
export function ExportDocumentPdfButton({
  label = "Exporter PDF",
  children,
  variant = "icon",
  className = "",
}: Props) {
  const [active, setActive] = useState(false);
  const rootId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!active) return;

    document.body.classList.add("print-batch-active");

    const timer = window.setTimeout(() => {
      window.print();
    }, 150);

    const finish = () => {
      setActive(false);
      document.body.classList.remove("print-batch-active");
    };

    window.addEventListener("afterprint", finish);
    const fallback = window.setTimeout(finish, 60_000);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallback);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("print-batch-active");
    };
  }, [active, rootId]);

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          className={`btn btn-secondary ${className}`.trim()}
          disabled={active}
          title="Ouvre l'impression — choisissez « Enregistrer au format PDF »"
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
          onClick={() => setActive(true)}
        >
          <FileDown className="h-4 w-4" />
        </IconButton>
      )}

      {active && (
        <div id={rootId} className="print-batch-root" aria-hidden>
          <div className="print-batch-page">{children}</div>
        </div>
      )}
    </>
  );
}
