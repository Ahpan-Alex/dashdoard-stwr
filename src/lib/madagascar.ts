/** 23 régions administratives de Madagascar. */
export const REGIONS_MADAGASCAR = [
  "Alaotra-Mangoro",
  "Amoron'i Mania",
  "Analamanga",
  "Analanjirofo",
  "Androy",
  "Anosy",
  "Atsimo-Andrefana",
  "Atsimo-Atsinanana",
  "Atsinanana",
  "Betsiboka",
  "Boeny",
  "Bongolava",
  "Diana",
  "Fitovinany",
  "Haute Matsiatra",
  "Ihorombe",
  "Itasy",
  "Melaky",
  "Menabe",
  "Sava",
  "Sofia",
  "Vakinankaratra",
  "Vatovavy",
] as const;

export type RegionMadagascar = (typeof REGIONS_MADAGASCAR)[number];

export const FORMES_JURIDIQUES_MG = [
  { id: "EI", label: "Entreprise individuelle" },
  { id: "SARL", label: "SARL" },
  { id: "SARLU", label: "SARLU" },
  { id: "SA", label: "SA" },
  { id: "SAS", label: "SAS" },
  { id: "SNC", label: "SNC" },
  { id: "SCS", label: "SCS" },
  { id: "GIE", label: "GIE" },
  { id: "association", label: "Association" },
  { id: "ong", label: "ONG" },
  { id: "etablissement_public", label: "Établissement public" },
  { id: "autre", label: "Autre" },
] as const;

export const PAYS_DEFAUT_TIERS = "Madagascar";
