import assert from "node:assert/strict";
import { assurerTiers, clientDepuisTiers } from "../src/lib/tiers.ts";
import {
  controlerPatchTiersFiche,
  dossiersStockageTiers,
  masquerCoordonneeBancaire,
  motifFichierStockageTiers,
  normaliserComptesBancaires,
  tauxTvaAchatPropose,
  tauxTvaPourNouveauDocument,
  tiersSoumisATva,
} from "../src/lib/tiers-fiche.ts";
import type { Parametres, Tiers } from "../src/lib/types.ts";

function assertOk(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const parametres = {
  assujettiTVA: true,
  regimeFiscal: "tva",
  tauxTVA: 20,
} as Pick<Parametres, "assujettiTVA" | "regimeFiscal" | "tauxTVA">;

const base: Tiers = {
  id: "t1",
  nom: "Alpha",
  actif: true,
  roles: ["client", "fournisseur"],
};

assertOk(tiersSoumisATva(base), "Une fiche sans fiscalité reste assujettie.");
assertOk(
  tauxTvaPourNouveauDocument({ parametres, tiers: base }) === 20,
  "Le taux proposé reste le taux unique de l'entreprise.",
);
assertOk(
  tauxTvaPourNouveauDocument({
    parametres,
    tiers: { ...base, exonerationTVA: { actif: true, motif: "Export" } },
  }) === 0,
  "L'exonération propose une TVA à 0.",
);
assertOk(
  tauxTvaPourNouveauDocument({
    parametres,
    tiers: {
      ...base,
      exonerationTVA: { actif: true, motif: "Export", dateFin: "2020-01-01" },
    },
    date: new Date("2026-10-06T12:00:00Z"),
  }) === 20,
  "Une exonération échue ne change plus le taux.",
);
assertOk(
  tauxTvaPourNouveauDocument({
    parametres,
    tiers: { ...base, exonerationTVA: { actif: true, motif: "Export" } },
    tauxSource: 20,
  }) === 20,
  "Un document source conserve son taux.",
);
assertOk(
  tauxTvaAchatPropose(
    { assujettiTVA: false, tauxTVA: 20 },
    base,
  ) === 0,
  "Un achat sans assujettissement entreprise reste à 0.",
);
assertOk(
  tauxTvaAchatPropose(parametres, {
    ...base,
    assujettiTVA: false,
  }) === 0,
  "Un fournisseur non assujetti propose un achat sans TVA.",
);

const fusion = assurerTiers({
  clients: [clientDepuisTiers({ ...base, assujettiTVA: false, nif: "123" })],
  fournisseurs: [],
  tiers: [
    {
      ...base,
      assujettiTVA: false,
      nif: "123",
      notesEchanges: [
        {
          id: "n1",
          date: "2026-01-01",
          type: "appel",
          commentaire: "Rappel",
          userId: "u1",
        },
      ],
      comptesBancaires: [{ id: "b1", banque: "BOA", rib: "1234567890", parDefaut: true }],
    },
  ],
});
assertOk(fusion[0]?.assujettiTVA === false, "La fiscalité survit à la fusion client.");
assertOk(fusion[0]?.notesEchanges?.length === 1, "Les notes survivent à la fusion.");
assertOk(fusion[0]?.nif === "123", "Le NIF est conservé.");
assertOk(
  fusion[0]?.comptesBancaires?.[0]?.rib === "1234567890",
  "Le RIB est conservé.",
);

assertOk(
  masquerCoordonneeBancaire("1234567890").endsWith("7890"),
  "Les derniers caractères du RIB restent visibles.",
);
assertOk(
  !masquerCoordonneeBancaire("1234567890").includes("123456"),
  "Le début du RIB est masqué.",
);

const banques = normaliserComptesBancaires([
  { id: "a", banque: "A" },
  { id: "b", banque: "B", parDefaut: true },
]);
assertOk(banques.filter((b) => b.parDefaut).length === 1, "Un seul compte par défaut.");
assertOk(banques[1]?.parDefaut === true, "Le compte marqué reste le défaut.");

const refusBanque = controlerPatchTiersFiche({
  prev: base,
  data: { comptesBancaires: [{ id: "a", banque: "BNI", rib: "9999" }] },
  actor: { id: "u1", nom: "A" },
  peutModifierNotesAutrui: false,
  peutModifierBanques: false,
});
assertOk(!refusBanque.ok, "Un rôle non habilité ne modifie pas les banques.");

const note = {
  id: "n1",
  date: "2026-02-01T12:00:00.000Z",
  type: "mail" as const,
  commentaire: "Bonjour",
  userId: "u1",
  userNom: "A",
};
const refusNote = controlerPatchTiersFiche({
  prev: { ...base, notesEchanges: [note] },
  data: { notesEchanges: [{ ...note, commentaire: "Changé" }] },
  actor: { id: "u2", nom: "B" },
  peutModifierNotesAutrui: false,
  peutModifierBanques: false,
});
assertOk(!refusNote.ok, "Un autre utilisateur ne modifie pas la note.");

const okNote = controlerPatchTiersFiche({
  prev: { ...base, notesEchanges: [note] },
  data: { notesEchanges: [{ ...note, commentaire: "Changé" }] },
  actor: { id: "u1", nom: "A" },
  peutModifierNotesAutrui: false,
  peutModifierBanques: false,
});
assertOk(okNote.ok && okNote.data.notesEchanges?.[0]?.modifieParId === "u1", "L'auteur peut modifier et la trace est posée.");

const dossiers = dossiersStockageTiers({
  dossiersStockage: [{ id: "dos-1", nom: "Chantier" }],
});
assertOk(dossiers.some((d) => d.nom === "Contrats" && d.systeme), "Le dossier Contrats est présent.");
assertOk(dossiers.some((d) => d.nom === "Chantier" && !d.systeme), "Un dossier personnalisé est conservé.");

assertOk(
  motifFichierStockageTiers({ nom: "contrat.pdf", taille: 10 }, 100) === undefined,
  "Un PDF de taille correcte est accepté.",
);
assertOk(
  Boolean(motifFichierStockageTiers({ nom: "note.txt", taille: 10 }, 100)),
  "Un format hors liste est refusé.",
);
assertOk(
  Boolean(motifFichierStockageTiers({ nom: "gros.pdf", taille: 200 }, 100)),
  "Un fichier trop lourd est refusé.",
);

console.log("tiers-fiche: ok");
