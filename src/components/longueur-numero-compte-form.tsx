"use client";

import { useState, type FormEvent } from "react";
import { useAuthStore } from "@/lib/auth-store";
import {
  LONGUEUR_COMPTE_MAX,
  LONGUEUR_COMPTE_MIN,
  longueurNumeroCompteEffective,
} from "@/lib/comptabilite";
import { useStore } from "@/lib/store";

export function LongueurNumeroCompteForm() {
  const parametres = useStore((s) => s.parametres);
  const definirLongueurNumeroCompte = useStore(
    (s) => s.definirLongueurNumeroCompte,
  );
  const peutGerer = useAuthStore((s) => s.hasPermission("comptabilite.gerer"));
  const longueur = longueurNumeroCompteEffective(parametres);
  const [longueurSaisie, setLongueurSaisie] = useState(
    String(longueur ?? LONGUEUR_COMPTE_MIN),
  );
  const [message, setMessage] = useState<string | null>(null);

  function onFixerLongueur(e: FormEvent) {
    e.preventDefault();
    const res = definirLongueurNumeroCompte(Number(longueurSaisie));
    setMessage(res.ok ? "Longueur enregistrée." : (res.reason ?? null));
  }

  return (
    <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
      <h2 className="font-display text-lg font-semibold">
        Longueur des numéros de compte
      </h2>
      <p className="mt-2 text-sm text-muted">
        Paramètre unique pour toute l&apos;entreprise (de {LONGUEUR_COMPTE_MIN}{" "}
        à {LONGUEUR_COMPTE_MAX} chiffres). Une fois fixé, vous pouvez
        uniquement l&apos;augmenter, jamais le diminuer. En cas
        d&apos;augmentation, les comptes existants sont complétés
        automatiquement par des zéros à droite.
      </p>
      <form
        onSubmit={onFixerLongueur}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <label className="text-xs font-semibold text-muted">
          Nombre de chiffres
          <select
            className="select mt-1"
            value={longueurSaisie}
            disabled={!peutGerer}
            onChange={(e) => setLongueurSaisie(e.target.value)}
          >
            {Array.from(
              { length: LONGUEUR_COMPTE_MAX - LONGUEUR_COMPTE_MIN + 1 },
              (_, i) => LONGUEUR_COMPTE_MIN + i,
            ).map((n) => (
              <option
                key={n}
                value={n}
                disabled={longueur != null && n < longueur}
              >
                {n} chiffres
              </option>
            ))}
          </select>
        </label>
        {peutGerer && (
          <button type="submit" className="btn btn-primary">
            {longueur == null ? "Fixer la longueur" : "Augmenter"}
          </button>
        )}
        {longueur != null && (
          <p className="text-xs text-muted">
            Longueur actuelle : {longueur} chiffres.
          </p>
        )}
      </form>
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </section>
  );
}
