import assert from "node:assert/strict";
import {
  afficherPrixTtc,
  chainePrixHtExact,
  htDepuisTtc,
  parserMontantPrix,
  saisiePrixHt,
  saisiePrixTtc,
  ttcAfficheDepuisHt,
  ttcDepuisHt,
} from "../src/lib/prix-ttc.ts";

function assertOk(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const taux = 20;

assertOk(parserMontantPrix("1 200,5").etat === "ok", "La virgule est acceptée.");
assertOk(
  parserMontantPrix("1 200,5").etat === "ok" &&
    parserMontantPrix("1 200,5").etat === "ok" &&
    (parserMontantPrix("1200.5") as { valeur: number }).valeur === 1200.5,
  "Le point est accepté.",
);
assertOk(
  (parserMontantPrix("1 200,5") as { valeur: number }).valeur === 1200.5,
  "La virgule vaut un séparateur décimal.",
);
assertOk(parserMontantPrix("").etat === "vide", "Un champ vide est reconnu.");
assertOk(parserMontantPrix("abc").etat === "invalide", "Un texte est invalide.");
assertOk(parserMontantPrix("-1").etat === "negatif", "Un montant négatif est refusé.");

const depuisHt = saisiePrixHt("1000", "", taux);
assertOk(depuisHt.ht === "1000" && depuisHt.ttc === "1200", "HT 1000 donne TTC 1200.");
assertOk(!depuisHt.erreur, "Un HT valide n'a pas d'erreur.");

const depuisTtc = saisiePrixTtc("1200", "", taux);
assertOk(depuisTtc.ht === "1000" && depuisTtc.ttc === "1200", "TTC 1200 donne HT 1000.");

const precis = saisiePrixTtc("1199", "0", taux);
const ressaisi = saisiePrixTtc("1199", precis.ht, taux);
assertOk(precis.ht === ressaisi.ht, "Ressaisir le même TTC ne fait pas dériver le HT.");
assertOk(
  htDepuisTtc(1199, taux) === Number(precis.ht),
  "Le HT enregistré garde la précision du calcul.",
);
assertOk(
  afficherPrixTtc(ttcDepuisHt(Number(precis.ht), taux) ?? 0) === "1199",
  "Le TTC affiché est arrondi sans modifier le HT.",
);

const htAvant = "1000";
const tauxChange = ttcAfficheDepuisHt(htAvant, 10);
assertOk(tauxChange === "1100", "Un nouveau taux recalcule le TTC.");
assertOk(htAvant === "1000", "Le HT ne change pas quand le taux change.");

const vide = saisiePrixHt("", "1200", taux);
assertOk(vide.ht === "" && vide.ttc === "", "Vider le HT vide le TTC.");
const videTtc = saisiePrixTtc("", "1000", taux);
assertOk(videTtc.ht === "" && videTtc.ttc === "", "Vider le TTC vide le HT.");

const invalide = saisiePrixTtc("abc", "1000", taux);
assertOk(invalide.ht === "1000" && invalide.erreur, "Un TTC invalide ne recalcule pas le HT.");
const negatif = saisiePrixHt("-5", "1200", taux);
assertOk(negatif.ttc === "1200" && negatif.erreur, "Un HT négatif ne recalcule pas le TTC.");

assertOk(ttcAfficheDepuisHt("", taux) === "", "Sans HT, le TTC affiché est vide.");
assertOk(
  ttcAfficheDepuisHt("2500", taux) === "3000",
  "Un article existant affiche son TTC sans nouvelle donnée.",
);
assertOk(chainePrixHtExact(1000 / 1.2) === String(1000 / 1.2), "Pas d'arrondi intermédiaire du HT.");

console.log("prix-ttc: ok");
