import type {
  MissionAchat,
  MissionDepenseDiverse,
  NatureDepenseMission,
} from "./types";

export const NATURES_DEPENSE_MISSION_DEFAUT: { id: string; libelle: string }[] =
  [
    { id: "ndm-transport", libelle: "Transport" },
    { id: "ndm-carburant", libelle: "Carburant" },
    { id: "ndm-repas", libelle: "Repas" },
    { id: "ndm-hebergement", libelle: "Hébergement" },
    { id: "ndm-divers", libelle: "Divers" },
  ];

export function seedNaturesDepenseMission(): NatureDepenseMission[] {
  return NATURES_DEPENSE_MISSION_DEFAUT.map((n, i) => ({
    id: n.id,
    libelle: n.libelle,
    ordre: i + 1,
    actif: true,
  }));
}

export function fusionnerNaturesDepenseMission(
  existing?: NatureDepenseMission[] | null,
) {
  if (existing == null) return seedNaturesDepenseMission();
  return existing;
}

export function naturesDepenseTriees(natures: NatureDepenseMission[]) {
  return [...(natures ?? []).filter((n) => n?.id)].sort(
    (a, b) =>
      (Number(a.ordre) || 0) - (Number(b.ordre) || 0) ||
      String(a.libelle ?? "").localeCompare(String(b.libelle ?? ""), "fr"),
  );
}

export function naturesDepenseActives(natures: NatureDepenseMission[]) {
  return naturesDepenseTriees(natures).filter((n) => n.actif);
}

export function normalizeLibelleNatureDepense(raw: string) {
  return raw.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
}

export function trouverNatureDepense(
  natures: NatureDepenseMission[],
  idOuLibelle: string | undefined,
) {
  const key = (idOuLibelle ?? "").trim();
  if (!key) return undefined;
  const byId = natures.find((n) => n.id === key);
  if (byId) return byId;
  const norm = normalizeLibelleNatureDepense(key);
  return natures.find((n) => normalizeLibelleNatureDepense(n.libelle) === norm);
}

export function motifNatureDepenseInvalide(
  libelle: string,
  natures: NatureDepenseMission[],
  ignoreId?: string,
) {
  const l = libelle.trim();
  if (!l) return "Indiquez un libellé.";
  const norm = normalizeLibelleNatureDepense(l);
  const doublon = natures.find(
    (n) => n.id !== ignoreId && normalizeLibelleNatureDepense(n.libelle) === norm,
  );
  if (doublon) return `La nature « ${doublon.libelle} » existe déjà.`;
  return null;
}

export function nbDepensesParNature(
  missions: MissionAchat[],
  natureId: string,
) {
  let n = 0;
  for (const m of missions) {
    for (const d of m.depensesDiverses ?? []) {
      if (d.natureId === natureId) n += 1;
    }
  }
  return n;
}

/** Nature catalogue rattachée, ou null si saisie libre. */
export function natureCatalogueDepense(
  d: Pick<MissionDepenseDiverse, "natureId" | "nature">,
  natures: NatureDepenseMission[],
) {
  if (d.natureId) {
    return natures.find((n) => n.id === d.natureId);
  }
  return trouverNatureDepense(natures, d.nature);
}

export function depenseEstNatureLibre(
  d: Pick<MissionDepenseDiverse, "natureId" | "nature">,
  natures: NatureDepenseMission[],
) {
  return !natureCatalogueDepense(d, natures);
}

export function libelleNatureDepense(
  d: Pick<MissionDepenseDiverse, "natureId" | "nature">,
  natures: NatureDepenseMission[],
) {
  return natureCatalogueDepense(d, natures)?.libelle ?? d.nature.trim();
}
