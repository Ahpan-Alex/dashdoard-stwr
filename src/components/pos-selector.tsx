"use client";

import { Store } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSitesVisibles } from "@/lib/use-sites-visibles";

export function PosSelector() {
  const setActif = useStore((s) => s.setPointDeVenteActif);
  const { visibles, peutTous, actif } = useSitesVisibles();

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-sea-600" />
      <select
        className="select max-w-[240px] border-sea-200 bg-sea-100/60 font-medium text-sea-900"
        value={actif}
        onChange={(e) => setActif(e.target.value)}
        aria-label="Site"
      >
        {peutTous && <option value="tous">Tous les sites</option>}
        {visibles.map((pdv) => (
          <option key={pdv.id} value={pdv.id}>
            {pdv.nom}
          </option>
        ))}
      </select>
    </div>
  );
}
