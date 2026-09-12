import { ligneAchatStockee } from "./type-achat";
import type { Achat, AchatLigne, AchatLigneRepartition, PointDeVente, RoleSite } from "./types";

export const ROLE_SITE_LABELS: Record<RoleSite, string> = {
  entrepot: "Entrepôt",
  point_de_vente: "Point de vente",
};

export function rolesSiteDuSite(site: Pick<PointDeVente, "rolesSite">): RoleSite[] {
  return site.rolesSite?.length ? site.rolesSite : ["point_de_vente"];
}

export function libelleRolesSite(site: Pick<PointDeVente, "rolesSite">): string {
  const r = rolesSiteDuSite(site);
  const hasE = r.includes("entrepot");
  const hasP = r.includes("point_de_vente");
  if (hasE && hasP) return "Entrepôt et point de vente";
  if (hasE) return "Entrepôt";
  return "Point de vente";
}

/**
 * Vue consolidée « Tous les sites » : uniquement via RBAC (`sites.vue_globale`).
 * Un rattachement vide reste interprété comme « tous les sites listés »
 * (rétrocompat), mais sans agrégat global.
 */
export function peutVoirTousLesSites(
  _pointDeVenteIds: string[] | undefined,
  vueGlobale: boolean,
): boolean {
  return vueGlobale;
}

export function utilisateurRattacheAuSite(
  siteId: string,
  pointDeVenteIds: string[] | undefined,
  vueGlobale: boolean,
): boolean {
  if (vueGlobale) return true;
  if (!pointDeVenteIds || pointDeVenteIds.length === 0) return true;
  return pointDeVenteIds.includes(siteId);
}

export function sitesVisiblesPourUtilisateur(
  sites: PointDeVente[],
  pointDeVenteIds: string[] | undefined,
  vueGlobale: boolean,
): PointDeVente[] {
  if (vueGlobale || !pointDeVenteIds || pointDeVenteIds.length === 0) {
    return sites;
  }
  const set = new Set(pointDeVenteIds);
  return sites.filter((s) => set.has(s.id));
}

const EPS = 1e-6;

export function repartitionsEffectives(
  ligne: AchatLigne,
  siteDefaut: string,
): AchatLigneRepartition[] {
  const raw = (ligne.repartitions ?? []).filter(
    (r) => r.pointDeVenteId && r.quantite > 0,
  );
  if (raw.length === 0) {
    return [{ pointDeVenteId: siteDefaut, quantite: ligne.quantite }];
  }
  return raw;
}

export function sommeRepartitions(ligne: AchatLigne): number {
  return (ligne.repartitions ?? []).reduce((s, r) => s + (Number(r.quantite) || 0), 0);
}

export function repartitionLigneValide(ligne: AchatLigne): boolean {
  const parts = ligne.repartitions ?? [];
  if (parts.length === 0) return ligne.quantite >= 0;
  return Math.abs(sommeRepartitions(ligne) - ligne.quantite) < EPS;
}

export function motifRepartitionInvalide(lignes: AchatLigne[]): string | null {
  for (const l of lignes) {
    if (!ligneAchatStockee(l)) continue;
    if (!repartitionLigneValide(l)) {
      return "La répartition par site d'une ligne ne correspond pas à la quantité commandée.";
    }
  }
  return null;
}

export function sitesAchat(achat: Achat): string[] {
  const ids = new Set<string>();
  ids.add(achat.pointDeVenteId);
  for (const l of achat.lignes) {
    for (const r of l.repartitions ?? []) {
      if (r.quantite > 0) ids.add(r.pointDeVenteId);
    }
  }
  return [...ids];
}

export function achatConcerneSite(achat: Achat, siteId: string | "tous"): boolean {
  if (siteId === "tous") return true;
  return sitesAchat(achat).includes(siteId);
}

/** Répartit une quantité livrée (ou retournée) au prorata des affectations de la ligne. */
export function repartirQuantiteLivree(
  ligne: AchatLigne,
  quantite: number,
  siteDefaut: string,
): AchatLigneRepartition[] {
  const parts = repartitionsEffectives(ligne, siteDefaut);
  const total = parts.reduce((s, p) => s + p.quantite, 0);
  if (total <= EPS || quantite <= 0) {
    return quantite > 0 ? [{ pointDeVenteId: siteDefaut, quantite }] : [];
  }
  const raw = parts.map((p) => ({
    pointDeVenteId: p.pointDeVenteId,
    quantite: (p.quantite / total) * quantite,
  }));
  const somme = raw.reduce((s, p) => s + p.quantite, 0);
  const delta = quantite - somme;
  if (Math.abs(delta) > 1e-12 && raw.length > 0) {
    raw[raw.length - 1] = {
      ...raw[raw.length - 1],
      quantite: raw[raw.length - 1].quantite + delta,
    };
  }
  return raw.filter((p) => p.quantite > EPS);
}

export function htAchatPourSite(achat: Achat, siteId: string | "tous"): number {
  if (siteId === "tous") {
    return achat.lignes.reduce((s, l) => s + l.quantite * l.prixAchatUnitaire, 0);
  }
  let ht = 0;
  for (const l of achat.lignes) {
    const parts = repartitionsEffectives(l, achat.pointDeVenteId);
    for (const p of parts) {
      if (p.pointDeVenteId === siteId) {
        ht += p.quantite * l.prixAchatUnitaire;
      }
    }
  }
  return ht;
}
