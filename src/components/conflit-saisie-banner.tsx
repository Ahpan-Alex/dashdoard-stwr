"use client";

import { useEffect, useState } from "react";
import {
  setBusinessConflictHandler,
  setBusinessSyncEnabled,
} from "@/lib/business-api";
import { useStore } from "@/lib/store";

/** Prévient l'opérateur si deux personnes ont enregistré en même temps. */
export function ConflitSaisieBanner() {
  const [visible, setVisible] = useState(false);
  const applyBusinessData = useStore((s) => s.applyBusinessData);

  useEffect(() => {
    setBusinessConflictHandler(({ data }) => {
      setBusinessSyncEnabled(false);
      applyBusinessData(data);
      setBusinessSyncEnabled(true);
      setVisible(true);
    });
    return () => setBusinessConflictHandler(null);
  }, [applyBusinessData]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="mb-6 rounded-[var(--radius)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="font-semibold">Enregistrement simultané</p>
      <p className="mt-1">
        Quelqu&apos;un d&apos;autre a enregistré en même temps que vous. Pour ne
        rien écraser, Négoo a gardé la version déjà sauvée. Si votre dernière
        saisie n&apos;apparaît plus, refaites-la.
      </p>
      <button
        type="button"
        className="btn btn-secondary mt-3"
        onClick={() => setVisible(false)}
      >
        J&apos;ai compris
      </button>
    </div>
  );
}
