"use client";

import { PAYS_DEFAUT_TIERS, REGIONS_MADAGASCAR } from "@/lib/madagascar";
import type { AdresseTiers } from "@/lib/types";

type Props = {
  value: AdresseTiers;
  onChange: (next: AdresseTiers) => void;
  showLibelle?: boolean;
};

export function AdresseTiersFields({ value, onChange, showLibelle }: Props) {
  function set<K extends keyof AdresseTiers>(key: K, v: AdresseTiers[K]) {
    onChange({ ...value, pays: value.pays || PAYS_DEFAUT_TIERS, [key]: v });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {showLibelle && (
        <label className="block text-xs font-semibold text-muted sm:col-span-2 lg:col-span-3">
          Libellé du site / dépôt
          <input
            className="input mt-1"
            value={value.libelle ?? ""}
            onChange={(e) => set("libelle", e.target.value)}
            placeholder="Ex. Dépôt Tana"
          />
        </label>
      )}
      <label className="block text-xs font-semibold text-muted sm:col-span-2">
        Adresse
        <input
          className="input mt-1"
          value={value.ligne1 ?? ""}
          onChange={(e) => set("ligne1", e.target.value)}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Complément
        <input
          className="input mt-1"
          value={value.ligne2 ?? ""}
          onChange={(e) => set("ligne2", e.target.value)}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Quartier / Fokontany
        <input
          className="input mt-1"
          value={value.quartier ?? ""}
          onChange={(e) => set("quartier", e.target.value)}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Ville / Commune
        <input
          className="input mt-1"
          value={value.ville ?? ""}
          onChange={(e) => set("ville", e.target.value)}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Région
        <select
          className="select mt-1"
          value={value.region ?? ""}
          onChange={(e) => set("region", e.target.value)}
        >
          <option value="">—</option>
          {REGIONS_MADAGASCAR.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-muted">
        Code postal
        <input
          className="input mt-1"
          value={value.codePostal ?? ""}
          onChange={(e) => set("codePostal", e.target.value)}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Pays
        <input className="input mt-1" value={value.pays || PAYS_DEFAUT_TIERS} readOnly />
      </label>
    </div>
  );
}
