import type { EmplacementStock, LigneDocument } from "./types";

export function libelleEmplacement(e: Pick<EmplacementStock, "allee" | "casier">) {
  const allee = e.allee.trim();
  const casier = e.casier.trim();
  if (allee && casier) return `Allée ${allee} · casier ${casier}`;
  if (allee) return `Allée ${allee}`;
  if (casier) return `Casier ${casier}`;
  return "Emplacement";
}

export function codeEmplacement(e: Pick<EmplacementStock, "allee" | "casier">) {
  const allee = e.allee.trim();
  const casier = e.casier.trim();
  if (allee && casier) return `${allee} / ${casier}`;
  return allee || casier || "—";
}

export function emplacementsDuSite(
  liste: EmplacementStock[] | undefined,
  siteId: string | undefined,
  opts?: { actifsSeulement?: boolean },
) {
  if (!siteId) return [];
  return (liste ?? [])
    .filter((e) => e.siteId === siteId && (!opts?.actifsSeulement || e.actif))
    .sort((a, b) =>
      a.allee.localeCompare(b.allee, "fr", { numeric: true }) ||
      a.casier.localeCompare(b.casier, "fr", { numeric: true }),
    );
}

export function emplacementParId(
  liste: EmplacementStock[] | undefined,
  id: string | undefined,
) {
  if (!id) return undefined;
  return (liste ?? []).find((e) => e.id === id);
}

/** Un seul casier actif sur le site → on le propose par défaut au picking. */
export function emplacementParDefautDuSite(
  liste: EmplacementStock[] | undefined,
  siteId: string | undefined,
) {
  const actifs = emplacementsDuSite(liste, siteId, { actifsSeulement: true });
  return actifs.length === 1 ? actifs[0] : undefined;
}

export function libelleEmplacementLigne(
  ligne: Pick<LigneDocument, "emplacementId">,
  liste: EmplacementStock[] | undefined,
  repliSite?: string,
) {
  const e = emplacementParId(liste, ligne.emplacementId);
  if (e) return codeEmplacement(e);
  return repliSite || "—";
}

export function motifEmplacementInvalide(
  data: { siteId: string; allee: string; casier: string },
  liste: EmplacementStock[],
  exclureId?: string,
): string | null {
  const siteId = data.siteId.trim();
  const allee = data.allee.trim();
  const casier = data.casier.trim();
  if (!siteId) return "Choisissez un site.";
  if (!allee) return "Indiquez l'allée.";
  if (!casier) return "Indiquez le casier.";
  const doublon = liste.some(
    (e) =>
      e.id !== exclureId &&
      e.siteId === siteId &&
      e.allee.trim().toLowerCase() === allee.toLowerCase() &&
      e.casier.trim().toLowerCase() === casier.toLowerCase(),
  );
  if (doublon) return "Cet allée / casier existe déjà sur ce site.";
  return null;
}

export function nbLignesBpSurEmplacement(
  bps: Array<{ lignes: Pick<LigneDocument, "emplacementId">[] }>,
  emplacementId: string,
) {
  return bps.reduce(
    (n, b) => n + b.lignes.filter((l) => l.emplacementId === emplacementId).length,
    0,
  );
}
