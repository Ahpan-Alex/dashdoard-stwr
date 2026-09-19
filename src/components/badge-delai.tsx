"use client";

import type { EtatDelai } from "@/lib/delais-alerte";

export function BadgeDelai({ etat }: { etat: EtatDelai | null | undefined }) {
  if (!etat?.enRetard) return null;
  return (
    <span className="badge badge-danger" title={`Dernière action : ${etat.dateDerniereAction}`}>
      Délai dépassé ({etat.joursAttente} j)
    </span>
  );
}
