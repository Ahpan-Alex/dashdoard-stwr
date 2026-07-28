"use client";

import { Store } from "lucide-react";
import { useStore } from "@/lib/store";

export function PosSelector() {
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const actif = useStore((s) => s.pointDeVenteActifId);
  const setActif = useStore((s) => s.setPointDeVenteActif);

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-sea-600" />
      <select
        className="select max-w-[240px] border-sea-200 bg-sea-100/60 font-medium text-sea-900"
        value={actif}
        onChange={(e) => setActif(e.target.value)}
        aria-label="Point de vente"
      >
        <option value="tous">Tous les points de vente</option>
        {pointsDeVente.map((pdv) => (
          <option key={pdv.id} value={pdv.id}>
            {pdv.nom}
          </option>
        ))}
      </select>
    </div>
  );
}
