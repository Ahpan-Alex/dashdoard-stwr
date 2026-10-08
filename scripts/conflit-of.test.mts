/**
 * OF incomplet + conflit de sauvegarde entre deux navigateurs.
 * Exécuter : npx tsx scripts/conflit-of.test.mts
 */
import assert from "node:assert/strict";
import { fusionnerOrdresFabricationLocaux } from "../src/lib/conflit-saisie.ts";
import {
  copierNomenclatureVersOf,
  coutsNonAffectes,
  ofAvecTableaux,
} from "../src/lib/fabrication.ts";
import { dimensionDepuisCommande } from "../src/lib/nomenclature-formules.ts";
import type { AppState, OrdreFabrication } from "../src/lib/types.ts";

const serveur = {
  ordresFabrication: [{ id: "deja" } as OrdreFabrication],
  journalActivites: [],
  entrees: [],
} as AppState;

const local = {
  ordresFabrication: [
    { id: "deja", numero: "ancien" } as OrdreFabrication,
    { id: "nouveau", numero: "OF-2026-0001" } as OrdreFabrication,
  ],
  journalActivites: [
    {
      id: "j-nouveau",
      date: "2026-10-08T10:00:00.000Z",
      action: "creation" as const,
      entite: "ordre_fabrication" as const,
      entiteId: "nouveau",
    },
    {
      id: "j-autre",
      date: "2026-10-08T10:00:00.000Z",
      action: "creation" as const,
      entite: "produit" as const,
      entiteId: "p",
    },
  ],
  entrees: [{ id: "e-nouveau", ofId: "nouveau" } as AppState["entrees"][number]],
};

const merged = fusionnerOrdresFabricationLocaux(serveur, local);
assert.ok(merged);
assert.deepEqual(
  merged.ordresFabrication.map((o) => o.id),
  ["nouveau", "deja"],
);
assert.equal(merged.ordresFabrication[0]?.numero, "OF-2026-0001");
assert.deepEqual(
  merged.journalActivites.map((j) => j.id),
  ["j-nouveau"],
);
assert.deepEqual(
  merged.entrees.map((e) => e.id),
  ["e-nouveau"],
);
assert.equal(
  fusionnerOrdresFabricationLocaux(serveur, {
    ordresFabrication: serveur.ordresFabrication,
    journalActivites: [],
    entrees: [],
  }),
  null,
);

const incomplet = ofAvecTableaux({
  id: "of",
  statut: "en_cours",
} as OrdreFabrication);
assert.deepEqual(incomplet.sorties, []);
assert.deepEqual(incomplet.entreesProduction, []);
assert.equal(coutsNonAffectes(incomplet).total, 0);
assert.equal(
  dimensionDepuisCommande({ lignes: undefined } as never, "p"),
  null,
);
const copie = copierNomenclatureVersOf(
  { nomenclatures: { type: "automatique" } } as never,
  "automatique",
);
assert.deepEqual(copie.lignes, []);

console.log("conflit of: ok");
