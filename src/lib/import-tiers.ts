import {
  adresseTiersEstVide,
  formaterAdresseTiers,
  synchroniserAdresseLegacy,
} from "./adresse-tiers";
import { downloadCsv } from "./csv";
import { createId } from "./id";
import {
  FORMES_JURIDIQUES_MG,
  PAYS_DEFAUT_TIERS,
} from "./madagascar";
import type { AdresseTiers, RoleTiers, Tiers } from "./types";
import { downloadXlsx } from "./xlsx";

export const LIMITE_LIGNES_IMPORT_TIERS = 2000;

export const COLONNES_IMPORT_TIERS = [
  {
    key: "nom",
    header: "Nom / Raison sociale",
    aliases: ["nom", "raison sociale", "nom raison sociale", "intitule"],
    comment:
      "Obligatoire. Nom ou raison sociale du tiers tel qu’il apparaîtra sur les documents.",
  },
  {
    key: "roles",
    header: "Rôles",
    aliases: ["role", "roles", "role s", "type"],
    comment:
      "Obligatoire. Au moins un rôle : Client, Fournisseur, ou Client;Fournisseur.",
  },
  {
    key: "nomCommercial",
    header: "Nom commercial",
    aliases: ["nom commercial", "enseigne", "marque"],
    comment: "Optionnel. Enseigne ou nom commercial (informatif).",
  },
  {
    key: "formeJuridique",
    header: "Forme juridique",
    aliases: ["forme juridique", "forme"],
    comment:
      "Optionnel. Ex. SARL, SA, EI, association. Identifiant ou libellé accepté.",
  },
  {
    key: "capitalSocial",
    header: "Capital social",
    aliases: ["capital social", "capital"],
    comment: "Optionnel. Montant numérique (Ariary), sans devise.",
  },
  {
    key: "nif",
    header: "NIF",
    aliases: ["nif", "numero nif"],
    comment:
      "Optionnel. NIF malgache : 13 chiffres. Format contrôlé s’il est renseigné. Sert aussi à détecter les doublons.",
  },
  {
    key: "stat",
    header: "STAT",
    aliases: ["stat", "numero stat"],
    comment:
      "Optionnel. Numéro STAT. Avec le nom, sert à détecter les doublons si le NIF est vide.",
  },
  {
    key: "rcs",
    header: "RCS",
    aliases: ["rcs", "registre commerce", "rcs rm"],
    comment: "Optionnel. Registre du commerce (informatif).",
  },
  {
    key: "adresseLigne1",
    header: "Adresse ligne 1",
    aliases: ["adresse ligne 1", "adresse", "ligne 1"],
    comment: "Adresse de base — ligne 1 (voie / lot). Avertissement si incomplète.",
  },
  {
    key: "adresseLigne2",
    header: "Adresse ligne 2",
    aliases: ["adresse ligne 2", "ligne 2"],
    comment: "Complément d’adresse (bâtiment, étage…).",
  },
  {
    key: "quartier",
    header: "Quartier",
    aliases: ["quartier", "fokontany"],
    comment: "Quartier ou fokontany.",
  },
  {
    key: "ville",
    header: "Ville",
    aliases: ["ville", "commune"],
    comment: "Ville / commune. Recommandée si une adresse est saisie.",
  },
  {
    key: "region",
    header: "Région",
    aliases: ["region"],
    comment: "Région administrative de Madagascar.",
  },
  {
    key: "codePostal",
    header: "Code postal",
    aliases: ["code postal", "cp"],
    comment: "Code postal, si connu.",
  },
  {
    key: "adressesLivraison",
    header: "Adresses de livraison",
    aliases: ["adresses de livraison", "adresse livraison", "livraison"],
    comment:
      "Plusieurs sites : Libellé | ligne 1 | ville | région séparés par || . Ex. Dépôt Tana | Lot II | Antananarivo | Analamanga || Usine | RN7 | Antsirabe | Vakinankaratra",
  },
  {
    key: "delaiPaiement",
    header: "Délai de paiement",
    aliases: ["delai de paiement", "delai paiement", "delai"],
    comment:
      "Jours. Si vide : valeur par défaut du tenant (souvent 30). Avertissement non bloquant.",
  },
  {
    key: "remiseHabituelle",
    header: "Remise habituelle",
    aliases: ["remise habituelle", "remise"],
    comment: "Pourcentage. Si vide : 0. Appliqué aux rôles cochés.",
  },
  {
    key: "plafondCredit",
    header: "Plafond de crédit",
    aliases: ["plafond de credit", "plafond credit", "plafond"],
    comment:
      "Montant (clients). Si vide : 0 (pas de plafond). Avertissement non bloquant.",
  },
] as const;

export type CleColonneImportTiers = (typeof COLONNES_IMPORT_TIERS)[number]["key"];

export type ChampsImportTiers = Record<CleColonneImportTiers, string>;

export type StatutLigneImportTiers =
  | "ok"
  | "erreur"
  | "avertissement"
  | "doublon";

export type ChoixDoublonTiers = "ignorer" | "fusionner" | "creer";

export type SourceDoublonTiers = "nif" | "nom_stat" | "fichier";

export const CHAMPS_FUSION_TIERS = [
  { key: "nom", label: "Nom / Raison sociale" },
  { key: "roles", label: "Rôles" },
  { key: "nomCommercial", label: "Nom commercial" },
  { key: "formeJuridique", label: "Forme juridique" },
  { key: "capitalSocial", label: "Capital social" },
  { key: "nif", label: "NIF" },
  { key: "stat", label: "STAT" },
  { key: "rcs", label: "RCS" },
  { key: "adressePrincipale", label: "Adresse principale" },
  { key: "adressesLivraison", label: "Adresses de livraison" },
  { key: "delaiPaiement", label: "Délai de paiement" },
  { key: "remiseHabituelle", label: "Remise habituelle" },
  { key: "plafondCredit", label: "Plafond de crédit" },
] as const;

export type ChampFusionTiers = (typeof CHAMPS_FUSION_TIERS)[number]["key"];

export type DefautsImportTiers = {
  delaiPaiementJours: number;
  remiseHabituellePercent: number;
  plafondCredit: number;
};

export type LigneImportTiers = {
  id: string;
  numeroLigne: number;
  champs: ChampsImportTiers;
  erreurs: string[];
  avertissements: string[];
  statut: StatutLigneImportTiers;
  doublonTiersId?: string;
  doublonLigneId?: string;
  doublonNom?: string;
  doublonSource?: SourceDoublonTiers;
  choixDoublon?: ChoixDoublonTiers;
  champsFusion: ChampFusionTiers[];
  compteManquant: boolean;
};

export type PayloadImportTiers = Omit<Tiers, "id">;

export type RapportLigneImportTiers = {
  numeroLigne: number;
  nom: string;
  resultat: "importe" | "fusionne" | "ignore" | "rejete";
  motif: string;
  compteManquant: boolean;
};

const CLES: CleColonneImportTiers[] = COLONNES_IMPORT_TIERS.map((c) => c.key);

export function champsImportVides(): ChampsImportTiers {
  return Object.fromEntries(CLES.map((k) => [k, ""])) as ChampsImportTiers;
}

export function defautsImportTiers(parametres?: {
  conditionsPaiementDefaut?: string;
}): DefautsImportTiers {
  const m = parametres?.conditionsPaiementDefaut?.match(/(\d+)\s*jour/i);
  const jours = m ? Number(m[1]) : 30;
  return {
    delaiPaiementJours: Number.isFinite(jours) && jours > 0 ? jours : 30,
    remiseHabituellePercent: 0,
    plafondCredit: 0,
  };
}

export function normaliserTexteImport(s: string) {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function chiffresImport(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

export function nifMgValide(raw: string) {
  const d = chiffresImport(raw);
  return d.length === 13;
}

export function parseRolesImport(raw: string): RoleTiers[] {
  const n = normaliserTexteImport(raw);
  if (!n) return [];
  if (
    n === "les deux" ||
    n === "client fournisseur" ||
    n === "fournisseur client" ||
    n.includes("les deux")
  ) {
    return ["client", "fournisseur"];
  }
  const roles: RoleTiers[] = [];
  const tokens = n.split(/[;,/|+]/).map((t) => t.trim()).filter(Boolean);
  const parts = tokens.length ? tokens : [n];
  for (const p of parts) {
    if (
      p === "c" ||
      p === "cli" ||
      p === "client" ||
      p === "clients" ||
      p.includes("client")
    ) {
      if (!roles.includes("client")) roles.push("client");
    }
    if (
      p === "f" ||
      p === "frn" ||
      p === "fournisseur" ||
      p === "fournisseurs" ||
      p.includes("fournisseur")
    ) {
      if (!roles.includes("fournisseur")) roles.push("fournisseur");
    }
  }
  return roles;
}

export function libelleRolesImport(roles: RoleTiers[]) {
  if (roles.includes("client") && roles.includes("fournisseur")) {
    return "Client;Fournisseur";
  }
  if (roles.includes("fournisseur")) return "Fournisseur";
  if (roles.includes("client")) return "Client";
  return "";
}

function resoudreFormeJuridique(raw: string): {
  id?: string;
  avertissement?: string;
} {
  const t = raw.trim();
  if (!t) return {};
  const n = normaliserTexteImport(t);
  const found = FORMES_JURIDIQUES_MG.find(
    (f) =>
      normaliserTexteImport(f.id) === n || normaliserTexteImport(f.label) === n,
  );
  if (found) return { id: found.id };
  return {
    id: t,
    avertissement: `Forme juridique « ${t} » non reconnue : conservée telle quelle.`,
  };
}

function parseNombreImport(raw: string): number | undefined {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function parseAdressesLivraisonImport(raw: string): AdresseTiers[] {
  const t = raw.trim();
  if (!t) return [];
  return t
    .split("||")
    .map((bloc) => bloc.trim())
    .filter(Boolean)
    .map((bloc, i) => {
      const parts = bloc.split("|").map((p) => p.trim());
      const [libelle, ligne1, ville, region] = parts;
      return {
        libelle: libelle || `Livraison ${i + 1}`,
        ligne1: ligne1 || "",
        ville: ville || "",
        region: region || "",
        pays: PAYS_DEFAUT_TIERS,
      };
    });
}

export function formaterAdressesLivraisonImport(list: AdresseTiers[] | undefined) {
  if (!list?.length) return "";
  return list
    .map((a) =>
      [a.libelle, a.ligne1, a.ville, a.region].map((x) => (x ?? "").trim()).join(" | "),
    )
    .join(" || ");
}

function adresseIncomplete(a: AdresseTiers | undefined) {
  if (!a || adresseTiersEstVide(a)) return false;
  return !(a.ligne1 ?? "").trim() || !(a.ville ?? "").trim();
}

function adresseDepuisChamps(champs: ChampsImportTiers): AdresseTiers {
  return {
    ligne1: champs.adresseLigne1.trim(),
    ligne2: champs.adresseLigne2.trim(),
    quartier: champs.quartier.trim(),
    ville: champs.ville.trim(),
    region: champs.region.trim(),
    codePostal: champs.codePostal.trim(),
    pays: PAYS_DEFAUT_TIERS,
  };
}

export function parseCsvPointVirgule(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let i = 0;
  let inQuotes = false;
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ";") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function aliasVersCle(header: string): CleColonneImportTiers | undefined {
  const n = normaliserTexteImport(header);
  if (!n) return undefined;
  for (const col of COLONNES_IMPORT_TIERS) {
    if (normaliserTexteImport(col.header) === n) return col.key;
    if (col.aliases.some((a) => a === n)) return col.key;
  }
  return undefined;
}

export function detecterEntetesImportTiers(rows: string[][]): {
  indexEntete: number;
  mapping: Partial<Record<number, CleColonneImportTiers>>;
} | null {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const mapping: Partial<Record<number, CleColonneImportTiers>> = {};
    rows[i].forEach((cell, ci) => {
      const cle = aliasVersCle(cell);
      if (cle) mapping[ci] = cle;
    });
    const cles = new Set(Object.values(mapping));
    if (cles.has("nom") && cles.has("roles")) {
      return { indexEntete: i, mapping };
    }
  }
  return null;
}

export function lignesDepuisGrille(rows: string[][]): ChampsImportTiers[] {
  const detected = detecterEntetesImportTiers(rows);
  if (!detected) {
    throw new Error(
      "En-têtes introuvables. Utilisez le modèle (colonnes « Nom / Raison sociale » et « Rôles »).",
    );
  }
  const out: ChampsImportTiers[] = [];
  for (let i = detected.indexEntete + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((c) => (c ?? "").trim())) continue;
    const champs = champsImportVides();
    for (const [idx, cle] of Object.entries(detected.mapping)) {
      if (!cle) continue;
      champs[cle] = String(row[Number(idx)] ?? "").trim();
    }
    out.push(champs);
  }
  return out;
}

function ligneExempleModele(): ChampsImportTiers {
  return {
    nom: "Société Exemple SARL",
    roles: "Client;Fournisseur",
    nomCommercial: "Exemple",
    formeJuridique: "SARL",
    capitalSocial: "10000000",
    nif: "3000000000001",
    stat: "12345678901234567",
    rcs: "2018 B 00123",
    adresseLigne1: "Lot II M 12 Bis",
    adresseLigne2: "",
    quartier: "Ankorondrano",
    ville: "Antananarivo",
    region: "Analamanga",
    codePostal: "101",
    adressesLivraison:
      "Dépôt Tana | Lot II M 12 Bis | Antananarivo | Analamanga",
    delaiPaiement: "30",
    remiseHabituelle: "0",
    plafondCredit: "5000000",
  };
}

export function grilleModeleImportTiers(): (string | number)[][] {
  const commentaires = COLONNES_IMPORT_TIERS.map((c) => c.comment);
  const headers = COLONNES_IMPORT_TIERS.map((c) => c.header);
  const exemple = ligneExempleModele();
  const valeurs = COLONNES_IMPORT_TIERS.map((c) => exemple[c.key]);
  return [commentaires, headers, valeurs];
}

export function telechargerModeleImportTiers(format: "xlsx" | "csv") {
  const rows = grilleModeleImportTiers();
  if (format === "csv") {
    downloadCsv("modele-import-tiers.csv", rows);
    return;
  }
  downloadXlsx("modele-import-tiers.xlsx", rows, "Tiers");
}

export function analyserLignesImportTiers(
  brouillons: ChampsImportTiers[],
  existants: Tiers[],
  opts: {
    defauts: DefautsImportTiers;
    planComptablePret: boolean;
    conserver?: LigneImportTiers[];
  },
): LigneImportTiers[] {
  const lignes: LigneImportTiers[] = brouillons.map((champs, i) => {
    const prev = opts.conserver?.[i];
    const meme =
      prev &&
      CLES.every((k) => prev.champs[k] === champs[k])
        ? prev
        : undefined;
    return {
      id: prev?.id ?? createId("imp"),
      numeroLigne: i + 1,
      champs: { ...champs },
      erreurs: [],
      avertissements: [],
      statut: "ok",
      choixDoublon: meme?.choixDoublon,
      champsFusion: meme?.champsFusion ?? [],
      doublonTiersId: undefined,
      doublonLigneId: undefined,
      doublonNom: undefined,
      doublonSource: undefined,
      compteManquant: false,
    };
  });

  const indexNif = new Map<string, Tiers>();
  const indexNomStat = new Map<string, Tiers>();
  for (const t of existants) {
    if (t.systeme) continue;
    const nif = chiffresImport(t.nif ?? "");
    if (nif) indexNif.set(nif, t);
    const nom = normaliserTexteImport(t.nom);
    const stat = chiffresImport(t.stat ?? "");
    if (nom && stat) indexNomStat.set(`${nom}::${stat}`, t);
  }

  const nifFichier = new Map<string, string>();
  const nomStatFichier = new Map<string, string>();

  for (const ligne of lignes) {
    const { champs } = ligne;
    const nom = champs.nom.trim();
    const roles = parseRolesImport(champs.roles);
    if (!nom) ligne.erreurs.push("Nom / raison sociale manquant.");
    if (roles.length === 0) ligne.erreurs.push("Aucun rôle (Client / Fournisseur).");
    if (champs.nif.trim() && !nifMgValide(champs.nif)) {
      ligne.erreurs.push("NIF au mauvais format (13 chiffres attendus).");
    }
    const capital = parseNombreImport(champs.capitalSocial);
    if (champs.capitalSocial.trim() && !Number.isFinite(capital)) {
      ligne.avertissements.push("Capital social non numérique : ignoré.");
    }
    const forme = resoudreFormeJuridique(champs.formeJuridique);
    if (forme.avertissement) ligne.avertissements.push(forme.avertissement);

    if (!champs.delaiPaiement.trim()) {
      ligne.avertissements.push(
        `Délai de paiement absent : ${opts.defauts.delaiPaiementJours} j (défaut tenant).`,
      );
    } else {
      const n = parseNombreImport(champs.delaiPaiement);
      if (!Number.isFinite(n) || (n ?? 0) < 0) {
        ligne.erreurs.push("Délai de paiement invalide.");
      }
    }
    if (!champs.plafondCredit.trim() && roles.includes("client")) {
      ligne.avertissements.push(
        "Plafond de crédit absent : 0 (pas de plafond, défaut tenant).",
      );
    } else if (champs.plafondCredit.trim()) {
      const n = parseNombreImport(champs.plafondCredit);
      if (!Number.isFinite(n) || (n ?? 0) < 0) {
        ligne.erreurs.push("Plafond de crédit invalide.");
      }
    }
    if (champs.remiseHabituelle.trim()) {
      const n = parseNombreImport(champs.remiseHabituelle);
      if (!Number.isFinite(n) || (n ?? 0) < 0) {
        ligne.erreurs.push("Remise habituelle invalide.");
      }
    }

    const adresse = adresseDepuisChamps(champs);
    if (adresseIncomplete(adresse)) {
      ligne.avertissements.push(
        "Adresse incomplète (ligne 1 et ville recommandées).",
      );
    }
    const livraisons = parseAdressesLivraisonImport(champs.adressesLivraison);
    if (livraisons.some(adresseIncomplete)) {
      ligne.avertissements.push("Au moins une adresse de livraison est incomplète.");
    }

    if (!opts.planComptablePret && roles.length > 0) {
      ligne.compteManquant = true;
      ligne.avertissements.push(
        "Compte 401/411 non généré : plan comptable non configuré (longueur des numéros absente).",
      );
    }

    if (ligne.erreurs.length === 0) {
      const nif = chiffresImport(champs.nif);
      const nomN = normaliserTexteImport(nom);
      const stat = chiffresImport(champs.stat);
      const existNif = nif ? indexNif.get(nif) : undefined;
      const existNomStat =
        nomN && stat ? indexNomStat.get(`${nomN}::${stat}`) : undefined;
      const exist = existNif ?? existNomStat;
      if (exist) {
        ligne.statut = "doublon";
        ligne.doublonTiersId = exist.id;
        ligne.doublonNom = exist.nom;
        ligne.doublonSource = existNif ? "nif" : "nom_stat";
      } else {
        const idNif = nif ? nifFichier.get(nif) : undefined;
        const idNomStat =
          nomN && stat ? nomStatFichier.get(`${nomN}::${stat}`) : undefined;
        const idFichier = idNif ?? idNomStat;
        if (idFichier) {
          const premiere = lignes.find((l) => l.id === idFichier);
          ligne.statut = "doublon";
          ligne.doublonLigneId = idFichier;
          ligne.doublonNom = premiere?.champs.nom;
          ligne.doublonSource = idNif ? "nif" : "nom_stat";
        }
      }
      if (nif && !nifFichier.has(nif)) nifFichier.set(nif, ligne.id);
      if (nomN && stat && !nomStatFichier.has(`${nomN}::${stat}`)) {
        nomStatFichier.set(`${nomN}::${stat}`, ligne.id);
      }
    }

    if (ligne.erreurs.length) ligne.statut = "erreur";
    else if (ligne.statut !== "doublon" && ligne.avertissements.length) {
      ligne.statut = "avertissement";
    } else if (ligne.statut !== "doublon") {
      ligne.statut = "ok";
    }

    if (ligne.statut !== "doublon") {
      ligne.choixDoublon = undefined;
      ligne.champsFusion = [];
    } else if (ligne.choixDoublon === "fusionner" && !ligne.doublonTiersId) {
      ligne.choixDoublon = undefined;
      ligne.champsFusion = [];
    }
  }

  return lignes;
}

export function payloadDepuisLigneImport(
  ligne: LigneImportTiers,
  defauts: DefautsImportTiers,
): PayloadImportTiers {
  const roles = parseRolesImport(ligne.champs.roles);
  const forme = resoudreFormeJuridique(ligne.champs.formeJuridique);
  const capital = parseNombreImport(ligne.champs.capitalSocial);
  const delaiRaw = parseNombreImport(ligne.champs.delaiPaiement);
  const delai =
    Number.isFinite(delaiRaw) && delaiRaw != null
      ? Math.max(0, delaiRaw)
      : defauts.delaiPaiementJours;
  const remiseRaw = parseNombreImport(ligne.champs.remiseHabituelle);
  const remise =
    Number.isFinite(remiseRaw) && remiseRaw != null
      ? Math.max(0, remiseRaw)
      : defauts.remiseHabituellePercent;
  const plafondRaw = parseNombreImport(ligne.champs.plafondCredit);
  const plafond =
    Number.isFinite(plafondRaw) && plafondRaw != null
      ? Math.max(0, plafondRaw)
      : defauts.plafondCredit;
  const adressePrincipale = adresseDepuisChamps(ligne.champs);
  const livraisons = parseAdressesLivraisonImport(ligne.champs.adressesLivraison);
  const legacy = synchroniserAdresseLegacy({ adressePrincipale });
  return {
    nom: ligne.champs.nom.trim(),
    nomCommercial: ligne.champs.nomCommercial.trim() || undefined,
    formeJuridique: forme.id,
    capitalSocial:
      Number.isFinite(capital) && (capital ?? 0) > 0 ? capital : undefined,
    nif: ligne.champs.nif.trim() || undefined,
    stat: ligne.champs.stat.trim() || undefined,
    rcs: ligne.champs.rcs.trim() || undefined,
    adresse: legacy.adresse,
    ville: legacy.ville,
    adressePrincipale,
    adressesLivraison: livraisons.length ? livraisons : undefined,
    memeAdresseLivraison: livraisons.length ? false : true,
    roles,
    actif: true,
    type: roles.includes("client") ? "autre" : undefined,
    delaiPaiementClientJours: roles.includes("client") ? delai : undefined,
    delaiPaiementFournisseurJours: roles.includes("fournisseur")
      ? delai
      : undefined,
    remiseHabituelleClientPercent: roles.includes("client") ? remise : undefined,
    remiseHabituelleFournisseurPercent: roles.includes("fournisseur")
      ? remise
      : undefined,
    plafondCredit: roles.includes("client") ? plafond : undefined,
  };
}

function formaterRolesTiers(roles: RoleTiers[] | undefined) {
  return (roles ?? [])
    .map((r) => (r === "client" ? "Client" : "Fournisseur"))
    .join(", ");
}

function formaterDelai(t: {
  delaiPaiementClientJours?: number;
  delaiPaiementFournisseurJours?: number;
  roles?: RoleTiers[];
}) {
  const parts: string[] = [];
  if (t.roles?.includes("client") || t.delaiPaiementClientJours != null) {
    parts.push(`Client : ${t.delaiPaiementClientJours ?? "—"} j`);
  }
  if (
    t.roles?.includes("fournisseur") ||
    t.delaiPaiementFournisseurJours != null
  ) {
    parts.push(`Fournisseur : ${t.delaiPaiementFournisseurJours ?? "—"} j`);
  }
  return parts.join(" · ") || "—";
}

function formaterRemise(t: {
  remiseHabituelleClientPercent?: number;
  remiseHabituelleFournisseurPercent?: number;
  roles?: RoleTiers[];
}) {
  const parts: string[] = [];
  if (t.roles?.includes("client") || t.remiseHabituelleClientPercent != null) {
    parts.push(`Client : ${t.remiseHabituelleClientPercent ?? "—"} %`);
  }
  if (
    t.roles?.includes("fournisseur") ||
    t.remiseHabituelleFournisseurPercent != null
  ) {
    parts.push(
      `Fournisseur : ${t.remiseHabituelleFournisseurPercent ?? "—"} %`,
    );
  }
  return parts.join(" · ") || "—";
}

export function valeurFusionAffichee(
  source: Partial<Tiers> | PayloadImportTiers,
  key: ChampFusionTiers,
): string {
  switch (key) {
    case "nom":
      return source.nom?.trim() || "—";
    case "roles":
      return formaterRolesTiers(source.roles) || "—";
    case "nomCommercial":
      return source.nomCommercial?.trim() || "—";
    case "formeJuridique": {
      const id = source.formeJuridique?.trim();
      if (!id) return "—";
      const f = FORMES_JURIDIQUES_MG.find((x) => x.id === id);
      return f ? `${f.label}` : id;
    }
    case "capitalSocial":
      return source.capitalSocial != null ? String(source.capitalSocial) : "—";
    case "nif":
      return source.nif?.trim() || "—";
    case "stat":
      return source.stat?.trim() || "—";
    case "rcs":
      return source.rcs?.trim() || "—";
    case "adressePrincipale":
      return formaterAdresseTiers(source.adressePrincipale) || "—";
    case "adressesLivraison":
      return (
        (source.adressesLivraison ?? [])
          .map((a) => formaterAdresseTiers(a))
          .filter(Boolean)
          .join(" · ") || "—"
      );
    case "delaiPaiement":
      return formaterDelai(source);
    case "remiseHabituelle":
      return formaterRemise(source);
    case "plafondCredit":
      return source.plafondCredit != null ? String(source.plafondCredit) : "—";
  }
}

export function appliquerFusionTiers(
  _prev: Tiers,
  incoming: PayloadImportTiers,
  champs: ChampFusionTiers[],
): Partial<Tiers> {
  const patch: Partial<Tiers> = {};
  const set = new Set(champs);
  if (set.has("nom")) patch.nom = incoming.nom;
  if (set.has("roles")) patch.roles = incoming.roles;
  if (set.has("nomCommercial")) patch.nomCommercial = incoming.nomCommercial;
  if (set.has("formeJuridique")) patch.formeJuridique = incoming.formeJuridique;
  if (set.has("capitalSocial")) patch.capitalSocial = incoming.capitalSocial;
  if (set.has("nif")) patch.nif = incoming.nif;
  if (set.has("stat")) patch.stat = incoming.stat;
  if (set.has("rcs")) patch.rcs = incoming.rcs;
  if (set.has("adressePrincipale")) {
    patch.adressePrincipale = incoming.adressePrincipale;
    patch.adresse = incoming.adresse;
    patch.ville = incoming.ville;
  }
  if (set.has("adressesLivraison")) {
    patch.adressesLivraison = incoming.adressesLivraison;
    patch.memeAdresseLivraison = incoming.memeAdresseLivraison;
  }
  if (set.has("delaiPaiement")) {
    patch.delaiPaiementClientJours = incoming.delaiPaiementClientJours;
    patch.delaiPaiementFournisseurJours = incoming.delaiPaiementFournisseurJours;
  }
  if (set.has("remiseHabituelle")) {
    patch.remiseHabituelleClientPercent = incoming.remiseHabituelleClientPercent;
    patch.remiseHabituelleFournisseurPercent =
      incoming.remiseHabituelleFournisseurPercent;
  }
  if (set.has("plafondCredit")) patch.plafondCredit = incoming.plafondCredit;
  return patch;
}

export function ligneImportEligible(
  ligne: LigneImportTiers,
): { ok: true; mode: "creer" | "fusionner" } | { ok: false; motif: string } {
  if (ligne.statut === "erreur") {
    return { ok: false, motif: ligne.erreurs.join(" ") };
  }
  if (ligne.statut === "doublon") {
    if (!ligne.choixDoublon) {
      return { ok: false, motif: "Doublon : aucun choix (Ignorer / Fusionner / Créer)." };
    }
    if (ligne.choixDoublon === "ignorer") {
      return { ok: false, motif: "Doublon ignoré." };
    }
    if (ligne.choixDoublon === "fusionner") {
      if (!ligne.doublonTiersId) {
        return {
          ok: false,
          motif: "Fusion impossible : pas de fiche existante (doublon dans le fichier).",
        };
      }
      return { ok: true, mode: "fusionner" };
    }
    return { ok: true, mode: "creer" };
  }
  return { ok: true, mode: "creer" };
}

export function telechargerRapportImportTiers(lignes: RapportLigneImportTiers[]) {
  downloadCsv("rapport-import-tiers.csv", [
    ["Ligne", "Nom", "Résultat", "Motif", "Compte manquant"],
    ...lignes.map((l) => [
      l.numeroLigne,
      l.nom,
      l.resultat === "importe"
        ? "Importé"
        : l.resultat === "fusionne"
          ? "Fusionné"
          : l.resultat === "ignore"
            ? "Ignoré"
            : "Rejeté",
      l.motif,
      l.compteManquant ? "oui" : "",
    ]),
  ]);
}

export function libelleStatutImport(statut: StatutLigneImportTiers) {
  switch (statut) {
    case "ok":
      return "OK";
    case "erreur":
      return "Erreur";
    case "avertissement":
      return "Avertissement";
    case "doublon":
      return "Doublon détecté";
  }
}

export function lignesSimilairesDoublon(
  lignes: LigneImportTiers[],
  reference: LigneImportTiers,
) {
  if (!reference.doublonSource) return [];
  return lignes.filter(
    (l) =>
      l.id !== reference.id &&
      l.statut === "doublon" &&
      l.doublonSource === reference.doublonSource &&
      Boolean(l.doublonTiersId) === Boolean(reference.doublonTiersId),
  );
}
