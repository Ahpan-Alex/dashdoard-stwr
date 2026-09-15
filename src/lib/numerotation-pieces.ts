import type {
  FormatDateNumeroPiece,
  FormatNumeroPiece,
  Parametres,
  TypePieceNumerotee,
} from "./types";

export const FORMATS_DATE_NUMERO: {
  id: FormatDateNumeroPiece;
  label: string;
  exemple: string;
}[] = [
  { id: "annee_4", label: "Année sur 4 caractères", exemple: "2026" },
  { id: "annee_2", label: "Année sur 2 caractères", exemple: "26" },
  { id: "annee_mois", label: "Année et mois", exemple: "2026-09" },
];

export const FORMATS_NUMERO_DEFAUT: Record<
  TypePieceNumerotee,
  FormatNumeroPiece
> = {
  devis: { prefixeLibre: "DEV", formatDate: "annee_4", longueurNumero: 4 },
  commande: { prefixeLibre: "CMD", formatDate: "annee_4", longueurNumero: 4 },
  livraison: { prefixeLibre: "BL", formatDate: "annee_4", longueurNumero: 4 },
  facture_client: {
    prefixeLibre: "FAC",
    formatDate: "annee_4",
    longueurNumero: 6,
  },
};

export const PIECES_NUMEROTEES: {
  type: TypePieceNumerotee;
  slug: string;
  label: string;
  description: string;
}[] = [
  {
    type: "devis",
    slug: "devis",
    label: "Devis",
    description: "Numérotation automatique des devis clients.",
  },
  {
    type: "commande",
    slug: "commande",
    label: "Commande client",
    description: "Numérotation automatique des commandes clients.",
  },
  {
    type: "livraison",
    slug: "livraison",
    label: "Bon de livraison",
    description: "Numérotation automatique des bons de livraison.",
  },
  {
    type: "facture_client",
    slug: "facture-client",
    label: "Facture client",
    description: "Numérotation automatique des factures clients.",
  },
];

export const LONGUEUR_NUMERO_PIECE_MIN = 1;
export const LONGUEUR_NUMERO_PIECE_MAX = 9;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitiserPrefixeNumero(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
}

export function estFormatDateNumero(
  value: string | undefined,
): value is FormatDateNumeroPiece {
  return (
    value === "annee_4" || value === "annee_2" || value === "annee_mois"
  );
}

export function clampLongueurNumeroPiece(value: number) {
  const n = Math.round(value);
  if (!Number.isFinite(n)) return FORMATS_NUMERO_DEFAUT.devis.longueurNumero;
  return Math.min(
    LONGUEUR_NUMERO_PIECE_MAX,
    Math.max(LONGUEUR_NUMERO_PIECE_MIN, n),
  );
}

const PROCHAIN_NUMERO_MAX = 10 ** LONGUEUR_NUMERO_PIECE_MAX - 1;

export function clampProchainNumeroPiece(value: unknown) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(PROCHAIN_NUMERO_MAX, n);
}

export function prochainNumeroPieceEffectif(
  parametres: Parametres | undefined,
  type: TypePieceNumerotee,
) {
  return clampProchainNumeroPiece(
    parametres?.prochainsNumerosPieces?.[type],
  );
}

export function normaliserFormatNumeroPiece(
  type: TypePieceNumerotee,
  raw?: Partial<FormatNumeroPiece> | null,
): FormatNumeroPiece {
  const def = FORMATS_NUMERO_DEFAUT[type];
  return {
    prefixeLibre: sanitiserPrefixeNumero(
      raw?.prefixeLibre ?? def.prefixeLibre,
    ),
    formatDate: estFormatDateNumero(raw?.formatDate)
      ? raw.formatDate
      : def.formatDate,
    longueurNumero: clampLongueurNumeroPiece(
      Number(raw?.longueurNumero ?? def.longueurNumero),
    ),
  };
}

export function formatNumeroPieceEffectif(
  parametres: Parametres | undefined,
  type: TypePieceNumerotee,
) {
  return normaliserFormatNumeroPiece(
    type,
    parametres?.formatsNumeroPieces?.[type],
  );
}

export function jetonDateNumero(
  format: FormatDateNumeroPiece,
  dateIso?: string,
) {
  const source = datePourNumero(dateIso);
  const y = source.getFullYear();
  const m = String(source.getMonth() + 1).padStart(2, "0");
  if (format === "annee_2") return String(y).slice(-2);
  if (format === "annee_mois") return `${y}-${m}`;
  return String(y);
}

function datePourNumero(dateIso?: string) {
  if (!dateIso) return new Date();
  const jour = dateIso.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(jour)) {
    return new Date(`${jour}T12:00:00`);
  }
  const d = new Date(dateIso);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

export function racineNumeroPiece(
  format: FormatNumeroPiece,
  dateIso?: string,
) {
  const token = jetonDateNumero(format.formatDate, dateIso);
  const prefixe = format.prefixeLibre.trim();
  return prefixe ? `${prefixe}-${token}` : token;
}

export function composerNumeroPiece(
  format: FormatNumeroPiece,
  sequence: number,
  dateIso?: string,
) {
  const seq = Math.max(1, Math.round(sequence));
  return `${racineNumeroPiece(format, dateIso)}-${String(seq).padStart(format.longueurNumero, "0")}`;
}

export function apercuNumeroPiece(
  format: FormatNumeroPiece,
  dateIso?: string,
) {
  return composerNumeroPiece(format, 1, dateIso);
}

export function nextNumeroSelonFormat(
  format: FormatNumeroPiece,
  existing: string[],
  dateIso?: string,
  prochain = 1,
) {
  const racine = racineNumeroPiece(format, dateIso);
  const re = new RegExp(`^${escapeRegex(racine)}-(\\d+)$`);
  let max = 0;
  for (const n of existing) {
    if (typeof n !== "string") continue;
    const m = n.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const sequence = Math.max(max + 1, clampProchainNumeroPiece(prochain));
  return composerNumeroPiece(format, sequence, dateIso);
}

export function numeroPieceSuivant(
  type: TypePieceNumerotee,
  existing: string[],
  parametres: Parametres | undefined,
  dateIso?: string,
) {
  return nextNumeroSelonFormat(
    formatNumeroPieceEffectif(parametres, type),
    existing,
    dateIso,
    prochainNumeroPieceEffectif(parametres, type),
  );
}

export function pieceNumeroteeDepuisSlug(slug: string) {
  return PIECES_NUMEROTEES.find((p) => p.slug === slug);
}
