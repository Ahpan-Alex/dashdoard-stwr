/**
 * Auteur courant des actions métier, partagé entre le store d'auth
 * (qui le renseigne) et le store métier (qui l'attache au journal
 * d'historique). Volontairement hors zustand pour éviter les cycles.
 */
export type ActiviteActor = { id?: string; nom?: string };

let actor: ActiviteActor = {};

export function setActiviteActor(next: ActiviteActor | null) {
  actor = next ?? {};
}

export function getActiviteActor(): ActiviteActor {
  return actor;
}
