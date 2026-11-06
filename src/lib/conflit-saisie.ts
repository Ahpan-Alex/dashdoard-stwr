import type { AppState, OrdreFabrication } from "./types";

const ABSENT = Symbol("absent");

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

export type FusionEtats = {
  etat: AppState;
  /** Le résultat diffère du serveur : il faut le renvoyer. */
  aEnregistrer: boolean;
  /** Le même champ a été modifié des deux côtés. La valeur déjà en base est gardée. */
  conflit: boolean;
};

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
}

function idDe(ligne: unknown): string | null {
  if (!estObjet(ligne)) return null;
  const id = ligne.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function estListeEntites(valeur: unknown): valeur is Record<string, unknown>[] {
  return Array.isArray(valeur) && valeur.every((item) => idDe(item) != null);
}

function trier(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(trier);
  if (!estObjet(valeur)) return valeur;
  const out: Record<string, unknown> = {};
  for (const cle of Object.keys(valeur).sort()) out[cle] = trier(valeur[cle]);
  return out;
}

function canon(valeur: unknown): string {
  return JSON.stringify(trier(valeur));
}

export function etatsEquivalents(a: unknown, b: unknown): boolean {
  return canon(a) === canon(b);
}

function possede(objet: object, cle: string): boolean {
  return Object.prototype.hasOwnProperty.call(objet, cle);
}

function indexer(lignes: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const index = new Map<string, Record<string, unknown>>();
  for (const ligne of lignes) {
    const id = idDe(ligne);
    if (id) index.set(id, ligne);
  }
  return index;
}

function fusionnerValeur(
  base: unknown,
  local: unknown,
  serveur: unknown,
  avecAncetre: boolean,
): { valeur: unknown; conflit: boolean } {
  if (local === ABSENT && serveur === ABSENT) return { valeur: ABSENT, conflit: false };
  if (local === ABSENT) return { valeur: serveur, conflit: false };
  if (serveur === ABSENT) {
    if (avecAncetre && base !== ABSENT && canon(local) === canon(base)) {
      return { valeur: ABSENT, conflit: false };
    }
    return { valeur: local, conflit: avecAncetre && base !== ABSENT };
  }
  if (canon(local) === canon(serveur)) return { valeur: serveur, conflit: false };
  if (avecAncetre && base !== ABSENT && canon(local) === canon(base)) {
    return { valeur: serveur, conflit: false };
  }
  if (avecAncetre && base !== ABSENT && canon(serveur) === canon(base)) {
    return { valeur: local, conflit: false };
  }
  if (
    estListeEntites(local) &&
    estListeEntites(serveur) &&
    (base === ABSENT || estListeEntites(base))
  ) {
    const sous = fusionnerListe(
      base === ABSENT ? [] : base,
      local,
      serveur,
      avecAncetre && base !== ABSENT,
    );
    return { valeur: sous.lignes, conflit: sous.conflit };
  }
  if (estObjet(local) && estObjet(serveur) && (base === ABSENT || estObjet(base))) {
    const sous = fusionnerObjet(
      base === ABSENT ? {} : base,
      local,
      serveur,
      avecAncetre && base !== ABSENT,
    );
    return { valeur: sous.objet, conflit: sous.conflit };
  }
  return { valeur: serveur, conflit: true };
}

function fusionnerObjet(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  serveur: Record<string, unknown>,
  avecAncetre: boolean,
): { objet: Record<string, unknown>; conflit: boolean } {
  let conflit = false;
  const objet: Record<string, unknown> = {};
  const cles = new Set([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(serveur),
  ]);
  for (const cle of cles) {
    const resultat = fusionnerValeur(
      possede(base, cle) ? base[cle] : ABSENT,
      possede(local, cle) ? local[cle] : ABSENT,
      possede(serveur, cle) ? serveur[cle] : ABSENT,
      avecAncetre,
    );
    if (resultat.conflit) conflit = true;
    if (resultat.valeur !== ABSENT) objet[cle] = resultat.valeur;
  }
  return { objet, conflit };
}

function fusionnerListe(
  base: Record<string, unknown>[],
  local: Record<string, unknown>[],
  serveur: Record<string, unknown>[],
  honorDelete: boolean,
): { lignes: Record<string, unknown>[]; conflit: boolean } {
  const ancetres = indexer(base);
  const locaux = indexer(local);
  const distants = indexer(serveur);
  let conflit = false;
  const lignes: Record<string, unknown>[] = [];
  const vus = new Set<string>();

  for (const ligne of local) {
    const id = idDe(ligne);
    if (!id || distants.has(id) || ancetres.has(id)) continue;
    lignes.push(ligne);
    vus.add(id);
  }

  for (const ligne of serveur) {
    const id = idDe(ligne);
    if (!id) continue;
    vus.add(id);
    const locale = locaux.get(id);
    const ancetre = ancetres.get(id);
    if (!locale) {
      if (honorDelete && ancetre && canon(ligne) === canon(ancetre)) continue;
      if (honorDelete && ancetre) conflit = true;
      lignes.push(ligne);
      continue;
    }
    const fusion = fusionnerValeur(
      ancetre ?? ABSENT,
      locale,
      ligne,
      honorDelete && ancetre != null,
    );
    if (fusion.conflit) conflit = true;
    if (fusion.valeur !== ABSENT && estObjet(fusion.valeur)) lignes.push(fusion.valeur);
  }

  for (const ligne of local) {
    const id = idDe(ligne);
    if (!id || vus.has(id)) continue;
    const ancetre = ancetres.get(id);
    if (honorDelete && ancetre && canon(ligne) === canon(ancetre)) continue;
    if (honorDelete && ancetre) conflit = true;
    lignes.push(ligne);
  }

  return { lignes, conflit };
}

/**
 * Trois versions du même dossier : l'état commun, la saisie de ce compte,
 * l'état déjà enregistré par un autre compte. Les ajouts des deux côtés
 * sont gardés. Un champ modifié des deux côtés garde la valeur déjà en base.
 */
export function fusionnerEtatsSimultanes(
  base: AppState | null,
  local: AppState,
  serveur: AppState,
): FusionEtats {
  const avecAncetre = base != null;
  const source = (base ?? {}) as unknown as Record<string, unknown>;
  const ici = local as unknown as Record<string, unknown>;
  const distant = serveur as unknown as Record<string, unknown>;
  const { objet, conflit } = fusionnerObjet(source, ici, distant, avecAncetre);
  return {
    etat: objet as AppState,
    aEnregistrer: canon(objet) !== canon(distant),
    conflit,
  };
}
