"use client";

import { create } from "zustand";
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "date-fns";
import type { DateRange } from "./calculations";

type Preset = "mois" | "annee" | "personnalise";

type State = {
  preset: Preset;
  debut: Date;
  fin: Date;
  setPreset: (p: Exclude<Preset, "personnalise">) => void;
  setDates: (debut: Date, fin: Date) => void;
};

export const useDashboardFiltres = create<State>((set) => ({
  preset: "mois",
  debut: startOfMonth(new Date()),
  fin: endOfMonth(new Date()),
  setPreset: (p) => {
    const now = new Date();
    set({
      preset: p,
      debut: p === "mois" ? startOfMonth(now) : startOfYear(now),
      fin: p === "mois" ? endOfMonth(now) : endOfYear(now),
    });
  },
  setDates: (debut, fin) =>
    set({
      preset: "personnalise",
      debut: startOfDay(debut),
      fin: endOfDay(fin),
    }),
}));

export function rangeDepuisFiltres(debut: Date, fin: Date): DateRange {
  return { debut: startOfDay(debut), fin: endOfDay(fin) };
}
