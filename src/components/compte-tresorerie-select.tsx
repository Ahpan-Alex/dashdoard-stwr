"use client";

import {
  comptesTresoreriePourMode,
  TYPE_COMPTE_TRESORERIE_LABELS,
  typeComptePourModePaiement,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";

export function CompteTresorerieSelect({
  modePaiement,
  value,
  onChange,
  siteId,
  allowEmpty = true,
  emptyLabel = "Pas de mouvement de trésorerie",
}: {
  modePaiement?: string;
  value: string;
  onChange: (id: string) => void;
  siteId?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const modes = useStore((s) => s.modesPaiement ?? []);
  const comptes = useStore((s) => s.comptesTresorerie ?? []);
  const liste = comptesTresoreriePourMode(comptes, modePaiement, modes, siteId);
  const type = typeComptePourModePaiement(modePaiement, modes);

  return (
    <>
      <select
        className="select mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {liste.map((c) => (
          <option key={c.id} value={c.id}>
            {c.libelle}
          </option>
        ))}
      </select>
      {modePaiement && liste.length === 0 && (
        <span className="mt-1 block text-[11px] text-muted">
          Aucun compte {type ? TYPE_COMPTE_TRESORERIE_LABELS[type] : "de trésorerie"}{" "}
          pour ce mode. Créez-le dans Paramètres → Trésorerie.
        </span>
      )}
    </>
  );
}
