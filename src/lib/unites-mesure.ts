import type { Produit, UniteMesure } from "./types";

export function normalizeSymboleUnite(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/\s+/g, "");
}

export function seedUnitesMesure(): UniteMesure[] {
  const rows: Omit<UniteMesure, "ordre" | "actif">[] = [
    { id: "um-pce", symbole: "pce", libelle: "Pièce" },
    { id: "um-rl", symbole: "rl", libelle: "Rouleau" },
    { id: "um-kg", symbole: "kg", libelle: "Kilogramme" },
    { id: "um-g", symbole: "g", libelle: "Gramme" },
    { id: "um-t", symbole: "t", libelle: "Tonne" },
    { id: "um-m", symbole: "m", libelle: "Mètre" },
    { id: "um-m2", symbole: "m²", libelle: "Mètre carré" },
    { id: "um-m3", symbole: "m³", libelle: "Mètre cube" },
    { id: "um-l", symbole: "L", libelle: "Litre" },
    { id: "um-ml", symbole: "mL", libelle: "Millilitre" },
    { id: "um-h", symbole: "h", libelle: "Heure" },
    { id: "um-sac", symbole: "sac", libelle: "Sac" },
    { id: "um-carton", symbole: "carton", libelle: "Carton" },
    { id: "um-lot", symbole: "lot", libelle: "Lot" },
    { id: "um-paire", symbole: "paire", libelle: "Paire" },
    { id: "um-boite", symbole: "boîte", libelle: "Boîte" },
    { id: "um-u", symbole: "u", libelle: "Unité" },
    { id: "um-forfait", symbole: "forfait", libelle: "Forfait" },
  ];
  return rows.map((u, i) => ({ ...u, ordre: i + 1, actif: true }));
}

export function unitesMesureTriees(unites: UniteMesure[]) {
  return [...unites].sort(
    (a, b) => a.ordre - b.ordre || a.symbole.localeCompare(b.symbole, "fr"),
  );
}

export function unitesMesureActives(unites: UniteMesure[]) {
  return unitesMesureTriees(unites).filter((u) => u.actif);
}

export function trouverUniteMesure(
  unites: UniteMesure[],
  symbole: string | undefined,
) {
  const key = normalizeSymboleUnite(symbole ?? "");
  if (!key) return undefined;
  return unites.find((u) => normalizeSymboleUnite(u.symbole) === key);
}

export function libelleUniteMesure(
  unites: UniteMesure[],
  symbole: string | undefined,
) {
  const u = trouverUniteMesure(unites, symbole);
  if (!u) return (symbole ?? "").trim() || "—";
  return u.symbole === u.libelle ? u.symbole : `${u.symbole} — ${u.libelle}`;
}

export function symboleUniteDefaut(unites: UniteMesure[]) {
  const actives = unitesMesureActives(unites);
  return (
    trouverUniteMesure(actives, "pce")?.symbole ??
    trouverUniteMesure(actives, "kg")?.symbole ??
    actives[0]?.symbole ??
    "pce"
  );
}

export function motifSymboleUniteInvalide(
  symbole: string,
  libelle: string,
  unites: UniteMesure[],
  ignoreId?: string,
) {
  const s = symbole.trim();
  const l = libelle.trim();
  if (!s) return "Indiquez le symbole (ex. kg, pce, m²).";
  if (s.length > 16) return "Le symbole est trop long (16 caractères max).";
  if (!l) return "Indiquez le libellé (ex. Kilogramme).";
  const key = normalizeSymboleUnite(s);
  const clash = unites.find(
    (u) => u.id !== ignoreId && normalizeSymboleUnite(u.symbole) === key,
  );
  if (clash) return `Le symbole « ${clash.symbole} » existe déjà.`;
  return null;
}

function uniteDepuisSymboleProduit(
  symbole: string,
  ordre: number,
): UniteMesure {
  const s = symbole.trim();
  const id = `um-h-${normalizeSymboleUnite(s) || "x"}`;
  return {
    id,
    symbole: s,
    libelle: s,
    ordre,
    actif: true,
  };
}

/** Premier chargement : catalogue par défaut. Ensuite : conserve les suppressions, ajoute les symboles déjà utilisés. */
export function fusionnerUnitesMesure(
  existantes: UniteMesure[] | undefined,
  produits: Pick<Produit, "unite">[],
): UniteMesure[] {
  const base =
    existantes && existantes.length > 0 ? [...existantes] : seedUnitesMesure();
  const known = new Set(base.map((u) => normalizeSymboleUnite(u.symbole)));
  let ordre = base.reduce((m, u) => Math.max(m, u.ordre), 0);
  for (const p of produits) {
    const raw = (p.unite ?? "").trim();
    if (!raw) continue;
    const key = normalizeSymboleUnite(raw);
    if (!key || known.has(key)) continue;
    known.add(key);
    ordre += 1;
    base.push(uniteDepuisSymboleProduit(raw, ordre));
  }
  return unitesMesureTriees(base);
}

export function nbProduitsParUnite(
  produits: Pick<Produit, "unite">[],
  symbole: string,
) {
  const key = normalizeSymboleUnite(symbole);
  return produits.filter((p) => normalizeSymboleUnite(p.unite) === key).length;
}
