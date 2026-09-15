import type { Client, Tiers, TypeClient } from "./types";

export const CLIENT_TYPES_DEFAUT: Record<string, string> = {
  particulier: "Particulier",
  restaurant: "Restaurant",
  hotel: "Hôtel",
  grossiste: "Grossiste",
  autre: "Autre",
};

export function normalizeCodeTypeClient(raw: string | undefined) {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function seedTypesClients(): TypeClient[] {
  return Object.entries(CLIENT_TYPES_DEFAUT).map(([code, libelle], i) => ({
    id: `tc-${code}`,
    code,
    libelle,
    ordre: i + 1,
    actif: true,
  }));
}

export function typesClientsTries(types: TypeClient[]) {
  return [...types].sort(
    (a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr"),
  );
}

export function typesClientsActifs(types: TypeClient[]) {
  return typesClientsTries(types).filter((t) => t.actif);
}

export function trouverTypeClient(types: TypeClient[], code: string | undefined) {
  const key = normalizeCodeTypeClient(code ?? "");
  if (!key) return undefined;
  return types.find((t) => normalizeCodeTypeClient(t.code) === key);
}

export function libelleTypeClient(
  types: TypeClient[] | undefined,
  code: string | undefined,
) {
  const raw = (code ?? "").trim();
  if (!raw) return "—";
  const t = trouverTypeClient(types ?? [], raw);
  if (t) return t.libelle;
  return CLIENT_TYPES_DEFAUT[raw] ?? raw;
}

export function codeTypeClientDefaut(types: TypeClient[]) {
  const actives = typesClientsActifs(types);
  return (
    trouverTypeClient(actives, "particulier")?.code ??
    actives[0]?.code ??
    "particulier"
  );
}

export function motifTypeClientInvalide(
  code: string,
  libelle: string,
  types: TypeClient[],
  ignoreId?: string,
) {
  const c = normalizeCodeTypeClient(code);
  const l = libelle.trim();
  if (!c) return "Indiquez un code (ex. particulier, hotel).";
  if (c.length < 2) return "Le code doit faire au moins 2 caractères.";
  if (!l) return "Indiquez le libellé (ex. Hôtel).";
  const clash = types.find(
    (t) => t.id !== ignoreId && normalizeCodeTypeClient(t.code) === c,
  );
  if (clash) return `Le type « ${clash.code} » existe déjà.`;
  return null;
}

export function nbTiersParTypeClient(
  clients: Pick<Client, "type">[],
  tiers: Pick<Tiers, "type" | "roles">[],
  code: string,
) {
  const key = normalizeCodeTypeClient(code);
  const nClients = clients.filter(
    (c) => normalizeCodeTypeClient(c.type) === key,
  ).length;
  const nTiers = tiers.filter(
    (t) =>
      (t.roles ?? []).includes("client") &&
      normalizeCodeTypeClient(t.type) === key,
  ).length;
  return Math.max(nClients, nTiers);
}

export function fusionnerTypesClients(
  existants: TypeClient[] | undefined,
  clients: Pick<Client, "type">[],
  tiers: Pick<Tiers, "type">[],
): TypeClient[] {
  const base =
    existants && existants.length > 0 ? [...existants] : seedTypesClients();
  const known = new Set(base.map((t) => normalizeCodeTypeClient(t.code)));
  let ordre = base.reduce((m, t) => Math.max(m, t.ordre), 0);
  const codes = [
    ...clients.map((c) => c.type),
    ...tiers.map((t) => t.type).filter(Boolean),
  ];
  for (const raw of codes) {
    const code = (raw ?? "").trim();
    const key = normalizeCodeTypeClient(code);
    if (!key || known.has(key)) continue;
    known.add(key);
    ordre += 1;
    base.push({
      id: `tc-h-${key}`,
      code: key,
      libelle: CLIENT_TYPES_DEFAUT[key] ?? code,
      ordre,
      actif: true,
    });
  }
  return typesClientsTries(base);
}
