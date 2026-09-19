"use client";

import { useState, type FormEvent } from "react";
import {
  OBJET_DELAI_HREF_PARAMETRES,
  OBJET_DELAI_LABELS,
  OBJET_DELAI_VERS_REGLE,
  type TypeObjetDelai,
} from "@/lib/delais-alerte";
import { useStore } from "@/lib/store";

export function RegleDelaiParametres({ type }: { type: TypeObjetDelai }) {
  const parametresAlertes = useStore((s) => s.parametresAlertes);
  const updateParametresAlertes = useStore((s) => s.updateParametresAlertes);
  const cle = OBJET_DELAI_VERS_REGLE[type];
  const regle = parametresAlertes[cle];
  const [jours, setJours] = useState(String(regle?.delaiJours ?? 7));
  const [saved, setSaved] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Math.max(0, Math.floor(Number(jours) || 0));
    updateParametresAlertes({
      [cle]: { ...regle, actif: regle?.actif !== false, delaiJours: n },
    });
    setJours(String(n));
    setSaved(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5"
    >
      <h2 className="font-display text-lg font-semibold">
        Délai + alerte — {OBJET_DELAI_LABELS[type]}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Badge et notification in-app dès dépassement du délai depuis la dernière
        action. Pas d&apos;e-mail ni SMS. Également réglable dans{" "}
        <a href={OBJET_DELAI_HREF_PARAMETRES[type]} className="underline">
          ce menu
        </a>
        .
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={regle?.actif !== false}
          onChange={(e) =>
            updateParametresAlertes({
              [cle]: { ...regle, actif: e.target.checked },
            })
          }
        />
        Activer l&apos;alerte
      </label>
      <label className="mt-3 block max-w-xs text-xs font-semibold text-muted">
        Délai (jours)
        <input
          type="number"
          min={0}
          className="input mt-1"
          value={jours}
          onChange={(e) => {
            setJours(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <button type="submit" className="btn btn-primary mt-3">
        Enregistrer
      </button>
      {saved && (
        <p className="mt-2 text-sm text-emerald-800">Délai enregistré.</p>
      )}
    </form>
  );
}
