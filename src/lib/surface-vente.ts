import type { LigneDocument, Produit } from "./types";

/** Facteur surface : largeur (m) × hauteur (m) si les deux dimensions sont saisies. */
export function facteurSurfaceLigne(
  l: Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM">,
) {
  if (!l.venduAuM2) return 1;
  const largeur = Number(l.largeurM);
  const hauteur = Number(l.hauteurM);
  if (!(largeur > 0) || !(hauteur > 0)) return 1;
  return largeur * hauteur;
}

export function surfaceUnitaireM2(
  l: Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM">,
) {
  if (!l.venduAuM2) return 0;
  const largeur = Number(l.largeurM);
  const hauteur = Number(l.hauteurM);
  if (!(largeur > 0) || !(hauteur > 0)) return 0;
  return largeur * hauteur;
}

export function surfaceTotaleM2(
  l: Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM" | "quantite">,
) {
  return Math.max(0, Number(l.quantite) || 0) * surfaceUnitaireM2(l);
}

export function ligneEstSurface(
  l: Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM">,
) {
  return surfaceUnitaireM2(l) > 0;
}

export function produitVenduAuM2(p: Pick<Produit, "venduAuM2"> | undefined) {
  return Boolean(p?.venduAuM2);
}

export function prixVenteSurfaceHT(p: Produit) {
  if (!p.venduAuM2) return p.prixVenteHT;
  const m2 = Number(p.prixVenteM2HT);
  return Number.isFinite(m2) && m2 >= 0 ? m2 : p.prixVenteHT;
}

export function libelleDimensionsLigne(
  l: Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM" | "quantite">,
) {
  const unit = surfaceUnitaireM2(l);
  if (unit <= 0) return "";
  const lrg = Number(l.largeurM);
  const h = Number(l.hauteurM);
  const qte = Math.max(0, Number(l.quantite) || 0);
  const total = qte * unit;
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
  return `${fmt(lrg)} × ${fmt(h)} m (${fmt(unit)} m²${
    qte !== 1 ? ` × ${fmt(qte)} = ${fmt(total)} m²` : ""
  })`;
}

export function champsSurfaceLigne(
  l: Partial<
    Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM">
  >,
): Pick<LigneDocument, "venduAuM2" | "largeurM" | "hauteurM"> {
  return {
    venduAuM2: l.venduAuM2 || undefined,
    largeurM:
      l.largeurM != null && Number(l.largeurM) > 0
        ? Number(l.largeurM)
        : undefined,
    hauteurM:
      l.hauteurM != null && Number(l.hauteurM) > 0
        ? Number(l.hauteurM)
        : undefined,
  };
}
