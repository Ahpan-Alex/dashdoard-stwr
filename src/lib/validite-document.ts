import { formatDate } from "./format";

export const VALIDITE_JOURS_DEFAUT = 15;

export function normaliserValiditeJours(
  raw: unknown,
  defaut = VALIDITE_JOURS_DEFAUT,
) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return defaut;
  return Math.min(3650, Math.floor(n));
}

export function dateFinValidite(dateIso: string, jours: number) {
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return "";
  d.setDate(d.getDate() + jours);
  return d.toISOString();
}

export function libelleValiditeDocument(dateIso: string, jours: unknown) {
  const j = normaliserValiditeJours(jours);
  const fin = dateFinValidite(dateIso, j);
  const duree = `${j} jour${j > 1 ? "s" : ""}`;
  return fin ? `${duree} (jusqu’au ${formatDate(fin)})` : duree;
}
