import type { MouvementCompteCourant } from "./types";

/** Seuil d'alerte (Ar) : solde créditeur restant avant bascule en débit. */
export const SEUIL_ALERTE_COMPTE_COURANT = 200_000;

export type NiveauAlerteCompteCourant = "seuil" | "debiteur" | null;

export function signedMontant(m: Pick<MouvementCompteCourant, "type" | "montant">) {
  return m.type === "apport" ? m.montant : -m.montant;
}

/**
 * Solde du compte courant : ouverture + apports − retraits.
 * Positif = crédit (l'entreprise doit à l'associé).
 * Négatif = débit (l'associé doit à l'entreprise).
 */
export function soldeCompteCourant(
  ouverture: number,
  mouvements: MouvementCompteCourant[],
  dateArrete?: Date,
) {
  const list = dateArrete
    ? mouvements.filter((m) => new Date(m.date).getTime() <= dateArrete.getTime())
    : mouvements;
  return list.reduce((s, m) => s + signedMontant(m), ouverture);
}

/** Flux de trésorerie lié aux mouvements (apports − retraits), hors solde d'ouverture. */
export function fluxTresorerieCompteCourant(
  mouvements: MouvementCompteCourant[],
  dateArrete?: Date,
) {
  const list = dateArrete
    ? mouvements.filter((m) => new Date(m.date).getTime() <= dateArrete.getTime())
    : mouvements;
  return list.reduce((s, m) => s + signedMontant(m), 0);
}

export function alerteCompteCourant(solde: number): NiveauAlerteCompteCourant {
  if (solde <= 0) return "debiteur";
  if (solde <= SEUIL_ALERTE_COMPTE_COURANT) return "seuil";
  return null;
}

export function libellePositionCompteCourant(solde: number) {
  if (solde > 0) return "Crédit (l'entreprise doit à l'associé)";
  if (solde < 0) return "Débit (l'associé doit à l'entreprise)";
  return "Soldé";
}

export type LigneHistoriqueCompteCourant = MouvementCompteCourant & {
  soldeApres: number;
};

/** Historique du plus récent au plus ancien, avec solde courant après chaque mouvement. */
export function historiqueCompteCourant(
  ouverture: number,
  mouvements: MouvementCompteCourant[],
): LigneHistoriqueCompteCourant[] {
  const chrono = [...mouvements].sort((a, b) => a.date.localeCompare(b.date));
  let solde = ouverture;
  const lignes: LigneHistoriqueCompteCourant[] = [];
  for (const m of chrono) {
    solde += signedMontant(m);
    lignes.push({ ...m, soldeApres: solde });
  }
  return lignes.reverse();
}

export function totauxMouvements(mouvements: MouvementCompteCourant[]) {
  let apports = 0;
  let retraits = 0;
  for (const m of mouvements) {
    if (m.type === "apport") apports += m.montant;
    else retraits += m.montant;
  }
  return { apports, retraits };
}
