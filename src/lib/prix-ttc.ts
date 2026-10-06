/**
 * Prix HT (référence enregistrée) et Prix TTC (affichage recalculé).
 * Le TTC suit le taux unique de l'entreprise. Aucun arrondi n'est appliqué au HT.
 */

export type LectureMontant =
  | { etat: "vide" }
  | { etat: "invalide" }
  | { etat: "negatif" }
  | { etat: "ok"; valeur: number };

export function parserMontantPrix(raw: string): LectureMontant {
  const texte = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!texte) return { etat: "vide" };
  if (!/^-?\d+(\.\d+)?$/.test(texte)) return { etat: "invalide" };
  const valeur = Number(texte);
  if (!Number.isFinite(valeur)) return { etat: "invalide" };
  if (valeur < 0) return { etat: "negatif" };
  return { etat: "ok", valeur };
}

export function messageMontantPrix(lecture: LectureMontant): string | undefined {
  if (lecture.etat === "negatif") return "Le montant ne peut pas être négatif.";
  if (lecture.etat === "invalide") return "Montant invalide.";
  return undefined;
}

/** Facteur (1 + taux). Null si le taux ne permet pas un calcul. */
export function facteurTva(tauxPourcent: number): number | null {
  if (!Number.isFinite(tauxPourcent) || tauxPourcent < 0) return null;
  const facteur = 1 + tauxPourcent / 100;
  if (!(facteur > 0)) return null;
  return facteur;
}

/** Affichage TTC : même arrondi que les prix en ariary (0 décimale). */
export function afficherPrixTtc(valeur: number): string {
  return String(Math.round(valeur));
}

/** Chaîne du HT calculé, sans arrondi. */
export function chainePrixHtExact(valeur: number): string {
  return String(valeur);
}

export function ttcDepuisHt(ht: number, tauxPourcent: number): number | null {
  const facteur = facteurTva(tauxPourcent);
  if (facteur == null) return null;
  return ht * facteur;
}

export function htDepuisTtc(ttc: number, tauxPourcent: number): number | null {
  const facteur = facteurTva(tauxPourcent);
  if (facteur == null) return null;
  return ttc / facteur;
}

/** TTC affiché à partir d'un HT saisi. Undefined si le HT n'est pas un montant exploitable. */
export function ttcAfficheDepuisHt(
  htRaw: string,
  tauxPourcent: number,
): string | undefined {
  const lecture = parserMontantPrix(htRaw);
  if (lecture.etat === "vide") return "";
  if (lecture.etat !== "ok") return undefined;
  const ttc = ttcDepuisHt(lecture.valeur, tauxPourcent);
  if (ttc == null) return undefined;
  return afficherPrixTtc(ttc);
}

export type ResultatSaisiePrix = {
  ht: string;
  ttc: string;
  erreur?: string;
};

export function saisiePrixHt(
  raw: string,
  ttcActuel: string,
  tauxPourcent: number,
): ResultatSaisiePrix {
  const lecture = parserMontantPrix(raw);
  if (lecture.etat === "vide") return { ht: "", ttc: "" };
  const erreur = messageMontantPrix(lecture);
  if (erreur || lecture.etat !== "ok") {
    return { ht: raw, ttc: ttcActuel, erreur };
  }
  const ttc = ttcDepuisHt(lecture.valeur, tauxPourcent);
  if (ttc == null) {
    return { ht: raw, ttc: ttcActuel, erreur: "Taux de TVA invalide." };
  }
  return { ht: raw, ttc: afficherPrixTtc(ttc) };
}

export function saisiePrixTtc(
  raw: string,
  htActuel: string,
  tauxPourcent: number,
): ResultatSaisiePrix {
  const lecture = parserMontantPrix(raw);
  if (lecture.etat === "vide") return { ht: "", ttc: "" };
  const erreur = messageMontantPrix(lecture);
  if (erreur || lecture.etat !== "ok") {
    return { ht: htActuel, ttc: raw, erreur };
  }
  const ht = htDepuisTtc(lecture.valeur, tauxPourcent);
  if (ht == null) {
    return { ht: htActuel, ttc: raw, erreur: "Taux de TVA invalide." };
  }
  return { ht: chainePrixHtExact(ht), ttc: raw };
}
