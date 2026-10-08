import type { AppState, OrdreFabrication } from "./types";

function liste<T>(valeur: T[] | undefined): T[] {
  return Array.isArray(valeur) ? valeur : [];
}

/**
 * Un navigateur en retard reçoit un 409 : sa copie entière est refusée.
 * On recolle uniquement les OF qui n'existent pas encore côté serveur,
 * avec leur journal et leurs mouvements de stock.
 */
export function fusionnerOrdresFabricationLocaux(
  serveur: AppState,
  local: Pick<AppState, "ordresFabrication" | "journalActivites" | "entrees">,
): AppState | null {
  const idsServeur = new Set(liste(serveur.ordresFabrication).map((o) => o.id));
  const nouveaux = liste(local.ordresFabrication).filter(
    (o): o is OrdreFabrication => Boolean(o?.id) && !idsServeur.has(o.id),
  );
  if (nouveaux.length === 0) return null;
  const ids = new Set(nouveaux.map((o) => o.id));
  const journalIds = new Set(liste(serveur.journalActivites).map((j) => j.id));
  const journal = liste(local.journalActivites).filter((j) => {
    if (!j?.id || journalIds.has(j.id)) return false;
    if (j.entite !== "ordre_fabrication" || !j.entiteId) return false;
    return ids.has(j.entiteId);
  });
  const entreeIds = new Set(liste(serveur.entrees).map((e) => e.id));
  const entrees = liste(local.entrees).filter((e) => {
    if (!e?.id || entreeIds.has(e.id) || !e.ofId) return false;
    return ids.has(e.ofId);
  });
  return {
    ...serveur,
    ordresFabrication: [...nouveaux, ...liste(serveur.ordresFabrication)],
    journalActivites: [...journal, ...liste(serveur.journalActivites)],
    entrees: [...entrees, ...liste(serveur.entrees)],
  };
}
