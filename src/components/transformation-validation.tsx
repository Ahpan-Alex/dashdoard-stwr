"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  formatDureeRestante,
  secondesRestantesVerrou,
} from "@/lib/transformation-document";
import type { CibleTransformation, VerrouTransformation } from "@/lib/types";

const LIBELLE_CIBLE: Record<CibleTransformation, string> = {
  commande: "commande",
  bon_de_livraison: "bon de livraison",
  facture: "facture",
};

type Props = {
  open: boolean;
  titre: string;
  sourceNumero: string;
  cible: CibleTransformation;
  verrou?: VerrouTransformation | null;
  children: ReactNode;
  onConfirmer: () => void;
  onAnnuler: () => void;
  onRetourEdition: () => void;
  onExpire: () => void;
};

export function TransformationValidationModal({
  open,
  titre,
  sourceNumero,
  cible,
  verrou,
  children,
  onConfirmer,
  onAnnuler,
  onRetourEdition,
  onExpire,
}: Props) {
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  const [restant, setRestant] = useState(() =>
    secondesRestantesVerrou(verrou),
  );

  useEffect(() => {
    if (!open) return;
    setRestant(secondesRestantesVerrou(verrou));
    const id = window.setInterval(() => {
      const s = secondesRestantesVerrou(verrou);
      setRestant(s);
      if (s <= 0) {
        window.clearInterval(id);
        expireRef.current();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, verrou]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 no-print">
      <div className="my-6 w-full max-w-[220mm] rounded-[var(--radius)] border border-line bg-card p-4 shadow-lg sm:p-5">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Validation de la transformation
          </p>
          <h2 className="font-display text-lg font-semibold">{titre}</h2>
          <p className="mt-1 text-sm text-muted">
            Contrôlez les données transférées de {sourceNumero} vers{" "}
            {LIBELLE_CIBLE[cible]} avant de confirmer. Aucun document cible
            n&apos;est créé tant que vous n&apos;avez pas confirmé.
          </p>
          <p className="mt-2 text-xs text-warning">
            Document source verrouillé — {formatDureeRestante(restant)}{" "}
            restantes (libération automatique après 10 min).
          </p>
        </div>

        <div className="max-h-[62vh] overflow-y-auto rounded-[var(--radius)] border border-line bg-sand-50 p-2 sm:p-3">
          {children}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onRetourEdition}>
            Retour à l&apos;édition
          </button>
          <button type="button" className="btn btn-secondary" onClick={onAnnuler}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirmer}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
