"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/lib/auth-store";
import {
  prefsTableEffectives,
  tableAffichage,
  typeActif,
  type TableAffichageId,
} from "@/lib/affichage-tableaux";
import { useStore } from "@/lib/store";

export function useAffichageTable(tableId: TableAffichageId) {
  const userId = useAuthStore((s) => s.user?.id);
  const raw = useStore((s) => s.preferencesAffichage);
  const setTypeAffichageActif = useStore((s) => s.setTypeAffichageActif);
  const table = tableAffichage(tableId);

  const prefs = useMemo(
    () =>
      prefsTableEffectives(
        table,
        userId ? raw[userId]?.[tableId] : undefined,
      ),
    [table, raw, userId, tableId],
  );

  const actif = useMemo(() => typeActif(prefs), [prefs]);
  const visibles = useMemo(() => {
    const set = new Set(actif.colonnes);
    return table.colonnes.filter((c) => set.has(c.id));
  }, [table, actif]);

  const visible = useMemo(() => {
    const set = new Set(actif.colonnes);
    return (id: string) => set.has(id);
  }, [actif]);

  return {
    table,
    prefs,
    types: prefs.types,
    actif,
    visibles,
    visible,
    colSpan: (avecActions = true) => visibles.length + (avecActions ? 1 : 0),
    setActif: (typeId: string) => setTypeAffichageActif(tableId, typeId),
  };
}
