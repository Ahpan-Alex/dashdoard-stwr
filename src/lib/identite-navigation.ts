import { LOGO_NEGOO_NAME } from "./brand";
import type { IdentiteNavigation } from "./types";

export const IDENTITE_NAVIGATION_VIDE: IdentiteNavigation = { nom: "" };

/** Libellé affiché en tête de menu (jamais le nom des documents commerciaux). */
export function nomAfficheMenu(identite?: IdentiteNavigation | null): string {
  const nom = identite?.nom?.trim();
  return nom || LOGO_NEGOO_NAME;
}
