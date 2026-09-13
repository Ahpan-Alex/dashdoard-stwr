"use client";

import {
  MSG_COMPTE_TIERS_AUTO,
  MSG_COMPTE_VERROUILLE,
  VALEUR_COMPTE_TIERS_AUTO,
  comptesFamilleTiers,
  tiersUtilisantCompte,
  type PrefixeCompteTiers,
} from "@/lib/comptabilite";
import type { CompteComptable, Tiers } from "@/lib/types";

type Props = {
  label: string;
  prefixe: PrefixeCompteTiers;
  value: string;
  required?: boolean;
  verrouille?: boolean;
  comptes: CompteComptable[];
  tiers: Pick<Tiers, "id" | "nom" | "compteClientId" | "compteFournisseurId">[];
  ignoreTiersId?: string;
  onChange: (value: string) => void;
};

export function CompteTiersSelect({
  label,
  prefixe,
  value,
  required,
  verrouille,
  comptes,
  tiers,
  ignoreTiersId,
  onChange,
}: Props) {
  const famille = comptesFamilleTiers(comptes, prefixe);
  const disponibles = famille.filter((c) => {
    if (c.id === value) return true;
    return !tiersUtilisantCompte(c.id, tiers, ignoreTiersId);
  });

  return (
    <label className="block text-xs font-semibold text-muted">
      {label}
      {required ? " *" : ""}
      <select
        className="select mt-1"
        value={value}
        required={required}
        disabled={verrouille}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Choisir un compte {prefixe} —</option>
        <option value={VALEUR_COMPTE_TIERS_AUTO}>{MSG_COMPTE_TIERS_AUTO}</option>
        {disponibles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.numero} — {c.libelle}
          </option>
        ))}
      </select>
      {verrouille && (
        <span className="mt-1 block text-xs font-normal text-amber-800">
          {MSG_COMPTE_VERROUILLE}
        </span>
      )}
    </label>
  );
}
