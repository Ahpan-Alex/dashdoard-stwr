"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

type Props = {
  /** Titre affiché en haut de la fenêtre d'aide. */
  title: string;
  /** Contenu explicatif. */
  children: ReactNode;
  /** Libellé du bouton (par défaut « En savoir plus »). */
  label?: string;
  /** Rendu compact : icône seule. */
  iconOnly?: boolean;
  className?: string;
};

export function InfoButton({
  title,
  children,
  label = "En savoir plus",
  iconOnly = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`btn btn-secondary ${className}`}
        onClick={() => setOpen(true)}
        title={iconOnly ? title : undefined}
        aria-label={iconOnly ? title : undefined}
      >
        <Info className="h-4 w-4" />
        {!iconOnly && label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-8 w-full max-w-xl rounded-[var(--radius)] border border-line bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sea-100 text-sea-700">
                  <Info className="h-4 w-4" />
                </span>
                {title}
              </h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOpen(false)}
              >
                Fermer
              </button>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-ink">
              {children}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setOpen(false)}
              >
                J&apos;ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
