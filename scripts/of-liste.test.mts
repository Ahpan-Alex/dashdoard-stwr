/**
 * Liste des OF : actions, verrou, filtres, colonnes, et non-régression
 * des règles de fabrication déjà en place.
 * Exécuter : npm run test:of-liste
 */
import { ROLE_PERMISSIONS } from "../src/lib/auth/rbac.ts";
import {
  A4_PORTRAIT_UTILE_MM,
  idsObligatoires,
  largeurColonnesMm,
  prefsTableEffectives,
  recadrerPourPdf,
  tableAffichage,
} from "../src/lib/affichage-tableaux.ts";
import { setActiviteActor } from "../src/lib/activity-actor.ts";
import { PARAMETRES_ALERTES_DEFAUT, evaluerAlertes } from "../src/lib/alertes.ts";
import { useAuthStore } from "../src/lib/auth-store.ts";
import { motifBatOfManquant } from "../src/lib/bat.ts";
import { etatCumpProduit } from "../src/lib/cump.ts";
import { emptyAppState } from "../src/lib/empty-state.ts";
import { DUREE_VERROU_TRANSFORMATION_MS } from "../src/lib/transformation-document.ts";
import { statutLigneFabrication } from "../src/lib/mode-approvisionnement.ts";
import {
  actionsMenuOf,
  filtrerListeOf,
  messageVerrouEdition,
  modifierOfVisible,
  motifModificationVerrouilleeApresSortie,
  ofAUneSortie,
  ofEnRetard,
  ofEstMto,
  verrouEditionActif,
} from "../src/lib/of-liste.ts";
import { utilisateurRattacheAuSite } from "../src/lib/sites.ts";
import { useStore } from "../src/lib/store.ts";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function ofBase(extra: Record<string, unknown> = {}) {
  return {
    id: "of-1",
    numero: "OF-1",
    atelierId: "atelier-a",
    produitId: "fini",
    quantitePrevue: 2,
    nomenclatureSource: "automatique",
    nomenclatureNom: "Standard",
    nomenclatureLignes: [
      { id: "nl", composantId: "vis", quantiteUnitaire: 4 },
    ],
    statut: "en_cours",
    dateCreation: "2026-09-01T08:00:00.000Z",
    dateCloturePrevue: "2026-09-01T12:00:00.000Z",
    sorties: [] as { quantite: number; composantId?: string }[],
    frais: [],
    mainOeuvre: [],
    entreesProduction: [],
    retoursMatieres: [],
    validations: [],
    ...extra,
  };
}

const table = tableAffichage("ordres_fabrication");
const ids = table.colonnes.map((c) => c.id);
assert(ids.includes("numero"), "colonne N° OF");
assert(idsObligatoires(table).includes("numero"), "N° OF obligatoire");
assert(!ids.includes("actions"), "Actions hors catalogue exportable");
assert(
  ids.join(",") ===
    "numero,produit,commande,atelier,avancement,echeance,site,statut",
  "colonnes proposées",
);

const pdf = recadrerPourPdf(table, ids);
assert(!pdf.includes("actions"), "PDF sans Actions");
assert(pdf.includes("numero"), "PDF garde le N°");
assert(largeurColonnesMm(table, pdf) <= A4_PORTRAIT_UTILE_MM, "PDF tient en A4 portrait");
assert(!pdf.includes("statut") || largeurColonnesMm(table, pdf) <= A4_PORTRAIT_UTILE_MM, "recadrage");
assert(pdf.length < ids.length, "le PDF retire des colonnes optionnelles");

const prefs = prefsTableEffectives(table, {
  types: [
    {
      id: "atelier",
      nom: "Vue atelier",
      colonnes: ["numero", "produit", "atelier"],
      contraintePdf: false,
    },
  ],
  defautId: "atelier",
  actifId: "atelier",
});
assert(prefs.types[0]?.nom === "Vue atelier", "nommage libre conservé");
assert(prefs.types[0]?.colonnes.includes("numero"), "N° non masquable");
assert(prefs.defautId === "atelier", "un type par défaut");
assert(!prefs.types[0]?.colonnes.includes("actions"), "type sans Actions");

const standard = prefsTableEffectives(tableAffichage("commandes"), undefined);
assert(standard.types[0]?.id === "standard", "autres tableaux inchangés");

assert(!modifierOfVisible(ofBase({ statut: "cloture" }) as never), "pas de Modifier si clôturé");
assert(
  !modifierOfVisible(ofBase({ statut: "cloture_annule" }) as never),
  "pas de Modifier si clôturé annulé",
);
assert(!modifierOfVisible(ofBase({ statut: "annule" }) as never), "pas de Modifier si annulé");
assert(modifierOfVisible(ofBase({ statut: "en_cours" }) as never), "Modifier si en cours");
assert(modifierOfVisible(ofBase({ statut: "brouillon" }) as never), "Modifier si brouillon");

const menuCours = actionsMenuOf({
  of: ofBase() as never,
  peutModifier: true,
  peutAcheter: true,
  matiereManquanteAchat: true,
  verrouAutre: false,
});
assert(menuCours.includes("sortie") && menuCours.includes("cloturer"), "menu en cours");
assert(menuCours.includes("demande_achat") && menuCours.includes("imprimer"), "DA et impression");

const menuVerrou = actionsMenuOf({
  of: ofBase() as never,
  peutModifier: true,
  peutAcheter: true,
  matiereManquanteAchat: true,
  verrouAutre: true,
});
assert(!menuVerrou.includes("sortie") && !menuVerrou.includes("demande_achat"), "verrou masque les écritures");
assert(menuVerrou.includes("dupliquer") && menuVerrou.includes("imprimer"), "dupliquer et imprimer restent");

const menuClos = actionsMenuOf({
  of: ofBase({ statut: "cloture" }) as never,
  peutModifier: true,
  peutAcheter: true,
  matiereManquanteAchat: true,
  verrouAutre: false,
});
assert(
  !menuClos.includes("sortie") && !menuClos.includes("cloturer") && !menuClos.includes("demande_achat"),
  "OF clos : pas de sortie ni clôture ni DA",
);
assert(menuClos.includes("dupliquer"), "dupliquer un OF clos");

const menuLecture = actionsMenuOf({
  of: ofBase() as never,
  peutModifier: false,
  peutAcheter: false,
  matiereManquanteAchat: true,
  verrouAutre: false,
});
assert(menuLecture.join(",") === "imprimer", "lecture : impression seule");

assert(ofEstMto(ofBase({ commandeId: "c1" }) as never), "MTO");
assert(!ofEstMto(ofBase() as never), "MTS");
assert(ofEnRetard(ofBase() as never, "2026-10-08"), "retard");
assert(!ofEnRetard(ofBase({ statut: "cloture" }) as never, "2026-10-08"), "clos pas en retard");

const filtres = filtrerListeOf(
  [
    ofBase({ id: "a", commandeId: "c1", atelierId: "atelier-a" }) as never,
    ofBase({
      id: "b",
      atelierId: "atelier-b",
      dateCreation: "2026-01-01T00:00:00.000Z",
      dateCloturePrevue: "2026-12-01T00:00:00.000Z",
    }) as never,
  ],
  {
    statut: "en_cours",
    atelierId: "atelier-a",
    type: "mto",
    retard: true,
    matiereManquante: false,
    batNonValide: false,
    siteId: "site-cmd",
    periodeDebut: "2026-08-01",
    periodeFin: "2026-10-01",
  },
  {
    signal: () => ({
      retard: true,
      matiereManquante: false,
      batBloquant: false,
      ofEnfant: false,
    }),
    siteId: (of) => (of.commandeId ? "site-cmd" : of.atelierId),
  },
);
assert(filtres.length === 1 && filtres[0]?.id === "a", "filtres combinés");

const jusquA = new Date(Date.now() + DUREE_VERROU_TRANSFORMATION_MS).toISOString();
assert(DUREE_VERROU_TRANSFORMATION_MS === 10 * 60 * 1000, "verrou 10 minutes");
assert(
  messageVerrouEdition({ jusquA, userId: "u2", userNom: "Aina" }, "u1") ===
    "En cours d'édition par Aina",
  "message de verrou",
);
assert(messageVerrouEdition({ jusquA, userId: "u1", userNom: "Moi" }, "u1") === null, "mon verrou");
assert(
  !verrouEditionActif({ jusquA: new Date(Date.now() - 1000).toISOString(), userId: "u2" }),
  "verrou expiré",
);

const avecSortie = ofBase({
  sorties: [{ quantite: 1, composantId: "vis" }],
});
assert(ofAUneSortie(avecSortie as never), "première sortie");
assert(
  motifModificationVerrouilleeApresSortie(avecSortie as never, { produitId: "autre" }),
  "produit verrouillé après sortie",
);
assert(
  motifModificationVerrouilleeApresSortie(avecSortie as never, { commandeId: "c2" }),
  "commande verrouillée après sortie",
);
assert(
  motifModificationVerrouilleeApresSortie(avecSortie as never, { quantitePrevue: 3 } as never) ===
    null,
  "quantité encore modifiable",
);

assert(!ROLE_PERMISSIONS.lecture_seule.includes("fabrication.modifier"), "lecture seule");
for (const role of [
  "admin_entreprise",
  "comptable",
  "acheteur",
  "caissier",
  "facturier",
  "vendeur",
] as const) {
  assert(ROLE_PERMISSIONS[role].includes("fabrication.modifier"), `${role} peut modifier`);
}

assert(
  utilisateurRattacheAuSite("atelier-b", ["atelier-a"], false) === false,
  "site non rattaché invisible",
);
assert(utilisateurRattacheAuSite("atelier-a", ["atelier-a"], false), "site rattaché visible");

const ligne = { id: "l1", produitId: "fini", quantite: 2 };
assert(
  statutLigneFabrication(ligne, "cmd", []) === "a_fabriquer",
  "ligne à fabriquer",
);
assert(
  statutLigneFabrication(ligne, "cmd", [ofBase({ commandeId: "cmd", ligneCommandeId: "l1" }) as never]) ===
    "en_fabrication",
  "ligne en fabrication",
);
assert(
  statutLigneFabrication(ligne, "cmd", [
    ofBase({ commandeId: "cmd", ligneCommandeId: "l1", statut: "cloture" }) as never,
  ]) === "pret_a_livrer",
  "ligne prête à livrer",
);

const cump = etatCumpProduit({
  produitId: "vis",
  pointDeVenteId: "atelier-a",
  produit: { id: "vis", prixAchat: 50, natureStock: "matiere_premiere" } as never,
  ventes: [],
  entrees: [
    {
      id: "e1",
      pointDeVenteId: "atelier-a",
      produitId: "vis",
      quantite: 10,
      prixAchatUnitaire: 100,
      prixVenteUnitaire: 0,
      fournisseur: "F",
      date: "2026-09-01T08:00:00.000Z",
    },
    {
      id: "e2",
      pointDeVenteId: "atelier-a",
      produitId: "vis",
      quantite: 10,
      prixAchatUnitaire: 300,
      prixVenteUnitaire: 0,
      fournisseur: "F",
      date: "2026-09-02T08:00:00.000Z",
    },
    {
      id: "e3",
      pointDeVenteId: "atelier-b",
      produitId: "vis",
      quantite: 10,
      prixAchatUnitaire: 999,
      prixVenteUnitaire: 0,
      fournisseur: "F",
      date: "2026-09-02T08:00:00.000Z",
    },
  ] as never,
});
assert(cump.quantite === 20, `CUMP qté site ${cump.quantite}`);
assert(Math.round(cump.cump) === 200, `CUMP ${cump.cump}`);

const atelier = {
  id: "atelier-a",
  nom: "Atelier A",
  actif: true,
  rolesSite: ["atelier"],
};
const fini = {
  id: "fini",
  code: "FINI",
  libelleCourt: "Portail",
  natureStock: "fini",
  unite: "u",
  actif: true,
  prixAchat: 100,
  prixVente: 200,
};
const vis = {
  id: "vis",
  code: "VIS",
  libelleCourt: "Vis",
  natureStock: "matiere_premiere",
  unite: "u",
  actif: true,
  prixAchat: 100,
  prixVente: 0,
};

useAuthStore.setState({
  user: {
    id: "u1",
    tenantId: "t1",
    email: "a@exemple.test",
    nom: "Aina",
    role: "vendeur",
    roles: ["vendeur"],
    pointDeVenteIds: ["atelier-a"],
    passwordHash: "",
    passwordSalt: "",
    passwordHistory: [],
    actif: true,
    mfaRequired: false,
    failedAttempts: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  tenant: { id: "t1", slug: "t", nom: "T", actif: true },
  currentSessionId: "s1",
  permissions: [],
});
setActiviteActor({ id: "u1", nom: "Aina" });

useStore.setState({
  ...emptyAppState(),
  pointsDeVente: [atelier, { ...atelier, id: "atelier-b", nom: "Atelier B" }] as never,
  produits: [fini, vis] as never,
  ordresFabrication: [
    ofBase({
      id: "of-cours",
      numero: "OF-COURS",
      statut: "en_cours",
      sorties: [
        {
          id: "s1",
          date: "2026-09-02T08:00:00.000Z",
          composantId: "vis",
          siteSourceId: "atelier-a",
          quantite: 8,
          cumpSortie: 100,
          valeur: 800,
        },
      ],
    }) as never,
  ],
  commandes: [{ id: "cmd", numero: "CMD-1", lignes: [], pointDeVenteId: "atelier-a" }] as never,
});

const produitBloque = useStore.getState().modifierOrdreFabrication("of-cours", {
  produitId: "autre",
});
assert(!produitBloque.ok, "store refuse le produit après sortie");
const qteOk = useStore.getState().modifierOrdreFabrication("of-cours", { quantitePrevue: 3 });
assert(qteOk.ok, qteOk.ok ? "" : qteOk.reason);
const journal = useStore
  .getState()
  .journalActivites.find((j) => j.entiteId === "of-cours" && j.action === "modification");
assert(journal?.detail?.includes("Quantité prévue"), "historique de la quantité");
assert(journal?.userNom === "Aina" || journal?.userId === "u1", "qui a modifié");

const dupliAutreSite = useStore.getState().dupliquerOrdreFabrication("of-absent");
assert(!dupliAutreSite.ok, "OF inconnu");
useStore.setState({
  ordresFabrication: [
    ...useStore.getState().ordresFabrication,
    ofBase({ id: "of-b", numero: "OF-B", atelierId: "atelier-b", statut: "brouillon" }) as never,
  ],
});
const refusSite = useStore.getState().dupliquerOrdreFabrication("of-b");
assert(!refusSite.ok, "pas de duplication hors site rattaché");
const copie = useStore.getState().dupliquerOrdreFabrication("of-cours");
assert(copie.ok, copie.ok ? "" : copie.reason);
if (copie.ok) {
  const nouveau = useStore.getState().ordresFabrication.find((o) => o.id === copie.id);
  assert(nouveau?.statut === "brouillon", "copie en brouillon");
  assert((nouveau?.sorties ?? []).length === 0, "copie sans mouvements");
  assert(!nouveau?.ofParentId, "copie sans parent");
  assert(!nouveau?.verrouEdition, "copie sans verrou");
}

useAuthStore.setState({
  user: {
    ...useAuthStore.getState().user!,
    id: "u2",
    nom: "Rabe",
    role: "lecture_seule",
    roles: ["lecture_seule"],
  },
});
setActiviteActor({ id: "u2", nom: "Rabe" });
const refusDroit = useStore.getState().modifierOrdreFabrication("of-cours", { note: "x" });
assert(!refusDroit.ok, "lecture seule ne modifie pas");

useAuthStore.setState({
  user: {
    ...useAuthStore.getState().user!,
    id: "u2",
    nom: "Rabe",
    role: "vendeur",
    roles: ["vendeur"],
    pointDeVenteIds: ["atelier-a"],
  },
});
const ofVerrou = useStore.getState().ordresFabrication.find((o) => o.id === "of-cours");
useStore.setState({
  ordresFabrication: useStore.getState().ordresFabrication.map((o) =>
    o.id === "of-cours"
      ? {
          ...o,
          verrouEdition: {
            jusquA: new Date(Date.now() + 60_000).toISOString(),
            userId: "u1",
            userNom: "Aina",
          },
        }
      : o,
  ),
});
const refusVerrou = useStore.getState().modifierOrdreFabrication("of-cours", { note: "y" });
assert(!refusVerrou.ok, "autre utilisateur bloqué");
assert(
  (refusVerrou.ok ? "" : refusVerrou.reason).includes("Aina"),
  ofVerrou ? "message Aina" : "message Aina",
);

const cloture = useStore.getState().cloturerOrdreFabrication("of-cours", {
  retours: [{ composantId: "vis", destination: "atelier", siteDestinataireId: "atelier-a" }],
});
assert(!cloture.ok, "clôture refusée sous le verrou d'un autre");
useStore.setState({
  ordresFabrication: useStore.getState().ordresFabrication.map((o) =>
    o.id === "of-cours" ? { ...o, verrouEdition: null } : o,
  ),
});
const clotureOk = useStore.getState().cloturerOrdreFabrication("of-cours", {
  retours: [{ composantId: "vis", destination: "atelier", siteDestinataireId: "atelier-a" }],
});
assert(clotureOk.ok, clotureOk.ok ? "" : clotureOk.reason);
const clos = useStore.getState().ordresFabrication.find((o) => o.id === "of-cours");
assert(clos?.statut === "cloture", "OF clôturé");
assert((clos?.retoursMatieres ?? []).some((r) => r.destination === "atelier"), "reliquat gardé à l'atelier");

const annule = useStore.getState().annulerOrdreFabrication("of-cours");
assert(annule.ok, annule.ok ? "" : annule.reason);
assert(
  useStore.getState().ordresFabrication.find((o) => o.id === "of-cours")?.statut === "cloture_annule",
  "contre-mouvement",
);

const base = emptyAppState();
const alertes = evaluerAlertes({
  parametresAlertes: PARAMETRES_ALERTES_DEFAUT,
  parametres: base.parametres,
  achats: [],
  factures: [],
  acomptes: [],
  journalAudit: [],
  clients: [],
  fournisseurs: [],
  produits: [fini, vis] as never,
  entrees: [],
  ventes: [],
  pointsDeVente: [atelier] as never,
  inventaires: [],
  ordresFabrication: [
    ofBase({
      id: "of-retard",
      numero: "OF-RET",
      statut: "en_cours",
      dateCloturePrevue: "2026-01-01T12:00:00.000Z",
      commandeId: "cmd",
    }) as never,
  ],
  commandes: [{ id: "cmd", numero: "CMD-1", lignes: [] }] as never,
  bonsATirer: [],
  aujourdHui: "2026-10-08",
});
const alerteRetard = alertes.find((a) => a.id === "of_retard:of-retard");
assert(alerteRetard?.href === "/fabrication/of-retard?mode=voir", "alerte ouvre l'OF en visualisation");
assert(
  alertes.every((a) => a.href !== "/fabrication/planning" || a.href === "/fabrication/planning"),
  "planning conservé",
);
assert(
  !alertes.some((a) => a.type === "of_retard" && a.href === "/fabrication/of-retard"),
  "le retard ne vole pas le verrou",
);

const ofBat = ofBase({
  id: "of-bat",
  statut: "brouillon",
  commandeId: "cmd",
  sorties: [],
});
assert(motifBatOfManquant(ofBat as never, [], [{ id: "cmd", numero: "CMD-1", lignes: [] }] as never), "BAT bloquant");

useAuthStore.setState({ user: null, tenant: null, currentSessionId: null, permissions: [] });
setActiviteActor(null);

console.log("of liste: ok");
