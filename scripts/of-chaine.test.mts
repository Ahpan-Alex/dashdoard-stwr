/**
 * Chaînage OF → OF sur composants à fabriquer.
 * Exécuter : npm run test:of-chaine
 */
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost:3000/fabrication/of-1" });
const g = globalThis as Record<string, unknown>;
g.window = win;
g.document = win.document;
g.HTMLElement = win.HTMLElement;
g.Element = win.Element;
g.Node = win.Node;
g.SVGElement = win.SVGElement;
g.ResizeObserver = win.ResizeObserver;
g.MutationObserver = win.MutationObserver;
g.getComputedStyle = win.getComputedStyle.bind(win);
g.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.self = win;
g.IS_REACT_ACT_ENVIRONMENT = true;

const { createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { AppRouterContext } = await import(
  "next/dist/shared/lib/app-router-context.shared-runtime.js"
);
const { PARAMETRES_ALERTES_DEFAUT, evaluerAlertes } = await import(
  "../src/lib/alertes.ts"
);
const { emptyAppState } = await import("../src/lib/empty-state.ts");
const {
  actionRuptureComposant,
  lignesOfsEnfants,
  messageAlerteOfsEnfants,
  messageRuptureComposantOf,
  motifBlocageDemarrageOf,
  ofsEnfantsLies,
  produitPeutEntrerDansNomenclature,
  statutOfEnfant,
} = await import("../src/lib/of-chaine.ts");
const {
  AlerteOfEnfantsOuverts,
  OfEnfantsLies,
} = await import("../src/components/of-enfants-lies.tsx");
const { useStore } = await import("../src/lib/store.ts");
const { motifBatOfManquant } = await import("../src/lib/bat.ts");

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function produit(id: string, nature: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    code: id.toUpperCase(),
    libelleCourt: id,
    libelleLong: id,
    natureStock: nature,
    unite: "u",
    actif: true,
    prixAchat: 100,
    prixVente: 200,
    ...extra,
  };
}

const vis = produit("vis", "matiere_premiere");
const structure = produit("structure", "semi_fini");
const cadreStock = produit("cadre", "semi_fini", {
  modeApprovisionnement: "sur_stock",
});
const cadreAchete = produit("cadre-achat", "semi_fini", {
  modeApprovisionnement: "sur_stock",
  achatSousTraitance: true,
});
const peinture = produit("peinture", "fini", {
  modeApprovisionnement: "fabrication_commande",
});
const portail = produit("portail", "fini");

function ofVide(extra: Record<string, unknown>) {
  return {
    id: "of-x",
    numero: "OF-X",
    atelierId: "atelier-assemblage",
    produitId: "portail",
    quantitePrevue: 1,
    nomenclatureSource: "automatique",
    nomenclatureNom: "Standard",
    nomenclatureLignes: [],
    statut: "brouillon",
    dateCreation: "2026-09-01T08:00:00.000Z",
    sorties: [],
    frais: [],
    mainOeuvre: [],
    entreesProduction: [],
    retoursMatieres: [],
    validations: [],
    ...extra,
  };
}

assert(actionRuptureComposant(vis as never) === "demande_achat", "MP : demande d'achat");
assert(
  messageRuptureComposantOf({
    produit: vis as never,
    libelle: "Vis",
    restant: 4,
    stock: 0,
  }) ===
    "Vis : encore 4 à sortir, stock atelier 0. Une demande d'achat peut déjà avoir été créée.",
  "alerte MP inchangée",
);
assert(
  actionRuptureComposant(structure as never) === "of_enfant",
  "semi-fini : OF enfant",
);
assert(
  actionRuptureComposant(cadreStock as never) === "sans_achat",
  "semi-fini sur stock non acheté : pas d'OF enfant",
);
assert(
  actionRuptureComposant(cadreAchete as never) === "demande_achat",
  "semi-fini sur stock achetable : demande d'achat",
);
assert(
  actionRuptureComposant(peinture as never) === "of_enfant",
  "fini fabrication sur commande : OF enfant",
);
assert(
  actionRuptureComposant(portail as never) !== "of_enfant",
  "fini sur stock : pas d'OF enfant",
);
assert(produitPeutEntrerDansNomenclature(vis as never), "MP dans la nomenclature");
assert(produitPeutEntrerDansNomenclature(structure as never), "semi-fini dans la nomenclature");
assert(
  produitPeutEntrerDansNomenclature(peinture as never),
  "fini à fabriquer dans la nomenclature",
);
assert(
  !produitPeutEntrerDansNomenclature(portail as never),
  "fini sur stock hors nomenclature",
);
assert(!produitPeutEntrerDansNomenclature(portail as never), "fini sur stock hors nomenclature");

const atelierA = {
  id: "atelier-assemblage",
  nom: "Assemblage",
  actif: true,
  rolesSite: ["atelier_final"],
};
const atelierM = {
  id: "atelier-metal",
  nom: "Métallurgie",
  actif: true,
  rolesSite: ["atelier"],
};

const parentMp = ofVide({
  id: "of-mp",
  numero: "OF-MP",
  nomenclatureLignes: [{ id: "nl-vis", composantId: "vis", quantiteUnitaire: 4 }],
});

useStore.setState({
  ...emptyAppState(),
  pointsDeVente: [atelierA, atelierM] as never,
  produits: [vis, structure, peinture, portail, cadreStock] as never,
  ordresFabrication: [parentMp] as never,
  commandes: [],
  bonsATirer: [],
});

const refusMp = useStore.getState().creerOrdreFabrication({
  atelierId: atelierM.id,
  produitId: "vis",
  quantitePrevue: 4,
  ofParentId: "of-mp",
});
assert(!refusMp.ok, "pas d'OF sur une matière première");
assert(
  useStore.getState().ordresFabrication.length === 1,
  "OF matière première non créé",
);

const parent = ofVide({
  id: "of-final",
  numero: "OF-FINAL",
  produitId: "portail",
  nomenclatureLignes: [
    { id: "nl-vis", composantId: "vis", quantiteUnitaire: 8 },
    { id: "nl-struct", composantId: "structure", quantiteUnitaire: 1 },
  ],
});
const metalLibre = ofVide({
  id: "of-libre",
  numero: "OF-LIBRE",
  atelierId: atelierM.id,
  produitId: "structure",
  quantitePrevue: 1,
  nomenclatureLignes: [],
});

useStore.setState({
  ordresFabrication: [parent, metalLibre] as never,
});

const cree = useStore.getState().creerOrdreFabrication({
  atelierId: atelierM.id,
  produitId: "structure",
  quantitePrevue: 1,
  ofParentId: "of-final",
  commandeId: undefined,
});
assert(cree.ok && cree.ok && "id" in cree, cree.ok ? "" : cree.reason);
const enfantId = cree.ok ? cree.id : "";
const enfant = useStore.getState().ordresFabrication.find((o) => o.id === enfantId);
assert(enfant?.ofParentId === "of-final", "lien parent enregistré");
assert(enfant?.statut === "brouillon", "OF enfant à fabriquer");
assert(
  statutOfEnfant(enfant!) === "a_fabriquer",
  "statut à fabriquer",
);
const lignes = lignesOfsEnfants(
  "of-final",
  useStore.getState().ordresFabrication,
  useStore.getState().produits,
);
assert(lignes.some((l) => l.numero === enfant?.numero && l.statutLabel === "À fabriquer"), "liste des enfants");
assert(
  !ofsEnfantsLies("of-final", useStore.getState().ordresFabrication).some(
    (o) => o.id === "of-libre",
  ),
  "OF manuel hors chaîne",
);

const alerteOuverte = messageAlerteOfsEnfants(
  "of-final",
  useStore.getState().ordresFabrication,
  useStore.getState().produits,
);
assert(alerteOuverte?.includes(enfant!.numero), "alerte enfant non clôturé");
assert(alerteOuverte?.includes("n'est pas bloqué"), "alerte sans blocage");
assert(motifBlocageDemarrageOf(null) === null, "enfant ouvert ne bloque pas");

const demarre = useStore.getState().demarrerOrdreFabrication("of-final");
assert(demarre.ok, demarre.ok ? "" : demarre.reason);
assert(
  useStore.getState().ordresFabrication.find((o) => o.id === enfantId)?.statut ===
    "brouillon",
  "l'enfant reste ouvert après démarrage du parent",
);

const parentBat = ofVide({
  id: "of-bat",
  numero: "OF-BAT",
  commandeId: "cmd-1",
  nomenclatureLignes: [
    { id: "nl-struct", composantId: "structure", quantiteUnitaire: 1 },
  ],
});
const enfantBat = ofVide({
  id: "of-bat-enfant",
  numero: "OF-BAT-E",
  produitId: "structure",
  ofParentId: "of-bat",
  statut: "en_cours",
});
useStore.setState({
  commandes: [{ id: "cmd-1", numero: "CMD-1", lignes: [] }] as never,
  bonsATirer: [],
  ordresFabrication: [parentBat, enfantBat] as never,
});
const motifBat = motifBatOfManquant(parentBat as never, [], useStore.getState().commandes);
assert(motifBat, "BAT manquant");
assert(
  motifBlocageDemarrageOf(motifBat) === motifBat,
  "le blocage reste celui du BAT",
);
const refusBat = useStore.getState().demarrerOrdreFabrication("of-bat");
assert(!refusBat.ok, "démarrage refusé sans BAT");
assert(/BAT/i.test(refusBat.ok ? "" : (refusBat.reason ?? "")), "motif BAT");
assert(
  !/enfant/i.test(refusBat.ok ? "" : (refusBat.reason ?? "")),
  "le motif ne parle pas de l'OF enfant",
);
assert(
  useStore.getState().ordresFabrication.find((o) => o.id === "of-bat")?.statut ===
    "brouillon",
  "parent non démarré",
);

const portailFab = produit("portail-fab", "fini", {
  modeApprovisionnement: "fabrication_commande",
});

useStore.setState({
  produits: [vis, structure, peinture, portail, portailFab, cadreStock] as never,
  ordresFabrication: [parent, metalLibre, enfant!] as never,
});
const lienOk = useStore.getState().lierOfEnfant("of-final", "of-libre");
assert(lienOk.ok, lienOk.ok ? "" : lienOk.reason);
assert(
  useStore.getState().ordresFabrication.find((o) => o.id === "of-libre")?.ofParentId ===
    "of-final",
  "OF existant lié",
);

const ofAssemblage = ofVide({
  id: "of-assemblage",
  numero: "OF-ASS",
  produitId: "portail-fab",
  nomenclatureLignes: [
    { id: "nl-struct", composantId: "structure", quantiteUnitaire: 1 },
  ],
});
const ofMetal = ofVide({
  id: "of-metal",
  numero: "OF-MET",
  produitId: "structure",
  ofParentId: "of-assemblage",
  nomenclatureLignes: [
    { id: "nl-peint", composantId: "peinture", quantiteUnitaire: 1 },
  ],
});
const ofPeint = ofVide({
  id: "of-peint",
  numero: "OF-PEINT",
  produitId: "peinture",
  ofParentId: "of-metal",
  nomenclatureLignes: [
    { id: "nl-portail", composantId: "portail-fab", quantiteUnitaire: 1 },
  ],
});
useStore.setState({
  ordresFabrication: [ofAssemblage, ofMetal, ofPeint] as never,
});
const boucle = useStore.getState().lierOfEnfant("of-peint", "of-assemblage");
assert(!boucle.ok, boucle.ok ? "boucle acceptée" : boucle.reason);
assert(/boucle/i.test(boucle.ok ? "" : (boucle.reason ?? "")), "motif de boucle");

const petit = ofVide({
  id: "of-petit",
  numero: "OF-PETIT",
  produitId: "peinture",
  ofParentId: enfantId,
  statut: "cloture",
  nomenclatureLignes: [],
});
useStore.setState({
  ordresFabrication: [parent, enfant!, petit] as never,
});
const directs = ofsEnfantsLies("of-final", useStore.getState().ordresFabrication).map(
  (o) => o.id,
);
assert(!directs.includes("of-petit"), "le petit-enfant n'est pas listé sur l'OF final");
assert(
  ofsEnfantsLies(enfantId, useStore.getState().ordresFabrication).some(
    (o) => o.id === "of-petit",
  ),
  "le niveau intermédiaire voit son enfant",
);

const cloture = ofVide({
  id: "of-clos",
  numero: "OF-CLOS",
  produitId: "structure",
  ofParentId: "of-final",
  statut: "cloture",
});
assert(statutOfEnfant(cloture as never) === "cloture", "clôturé");
assert(
  messageAlerteOfsEnfants("parent-clos", [cloture] as never, [structure] as never) ===
    null,
  "enfant clôturé : pas d'alerte",
);
const pret = ofVide({
  id: "of-pret",
  numero: "OF-PRET",
  produitId: "structure",
  ofParentId: "of-final",
  statut: "en_cours",
  quantitePrevue: 2,
  entreesProduction: [{ id: "e1", quantite: 2, date: "2026-09-02", coutUnitaire: 1, coutTotal: 2 }],
});
assert(statutOfEnfant(pret as never) === "pret_a_livrer", "prêt à livrer");
assert(
  messageAlerteOfsEnfants("of-final", [pret] as never, [structure] as never)?.includes(
    "n'est pas bloqué",
  ),
  "prêt à livrer reste une alerte tant que l'OF n'est pas clôturé",
);

const base = emptyAppState();
const ofMpCours = ofVide({
  id: "of-mp-cours",
  numero: "OF-MP-C",
  statut: "en_cours",
  nomenclatureLignes: [{ id: "nl-vis", composantId: "vis", quantiteUnitaire: 4 }],
});
const ofSemiCours = ofVide({
  id: "of-semi-cours",
  numero: "OF-SEMI-C",
  statut: "en_cours",
  nomenclatureLignes: [
    { id: "nl-struct", composantId: "structure", quantiteUnitaire: 1 },
  ],
});
const alertes = evaluerAlertes({
  parametresAlertes: PARAMETRES_ALERTES_DEFAUT,
  parametres: base.parametres,
  achats: [],
  factures: [],
  acomptes: [],
  journalAudit: [],
  clients: [],
  fournisseurs: [],
  produits: [vis, structure] as never,
  entrees: [],
  ventes: [],
  pointsDeVente: [atelierA] as never,
  inventaires: [],
  ordresFabrication: [ofMpCours, ofSemiCours] as never,
  aujourdHui: "2026-09-26",
});
const alerteVis = alertes.find((a) => a.id === "of_rupture_composant:of-mp-cours:vis");
const alerteStruct = alertes.find(
  (a) => a.id === "of_rupture_composant:of-semi-cours:structure",
);
assert(alerteVis?.message.includes("Une demande d'achat peut déjà avoir été créée."), "alerte MP");
assert(
  !alerteVis?.message.includes("ordre de fabrication enfant"),
  "l'alerte MP ne propose pas d'OF enfant",
);
assert(
  alerteStruct?.message.includes("Un ordre de fabrication enfant peut couvrir ce composant."),
  "alerte composant à fabriquer",
);

const router = new Proxy({}, { get: () => () => Promise.resolve() });
const host = win.document.createElement("div");
win.document.body.appendChild(host);
const root = createRoot(host);
await act(async () => {
  root.render(
    createElement(
      AppRouterContext.Provider,
      { value: router as never },
      createElement(
        "div",
        null,
        createElement(OfEnfantsLies, {
          lignes: [
            {
              id: "a",
              numero: "OF-METAL",
              href: "/fabrication/a",
              produitLibelle: "structure",
              statut: "a_fabriquer",
              statutLabel: "À fabriquer",
            },
            {
              id: "b",
              numero: "OF-PEINT",
              href: "/fabrication/b",
              produitLibelle: "peinture",
              statut: "cloture",
              statutLabel: "Clôturé",
            },
          ],
        }),
        createElement(AlerteOfEnfantsOuverts, {
          message:
            "Le composant structure provient de l'OF OF-METAL (À fabriquer). Le démarrage de cet OF n'est pas bloqué.",
        }),
        createElement(
          "button",
          { type: "button" },
          "Démarrer l'OF",
        ),
      ),
    ),
  );
});
const texte = host.textContent ?? "";
assert(texte.includes("OF enfants"), "titre de la liste");
assert(texte.includes("OF-METAL"), "OF enfant affiché");
assert(texte.includes("À fabriquer"), "statut à fabriquer");
assert(texte.includes("Clôturé"), "statut clôturé");
assert(texte.includes("n'est pas bloqué"), "alerte affichée");
const bouton = host.querySelector("button");
assert(bouton && !bouton.hasAttribute("disabled"), "démarrage non désactivé par l'alerte");
const lienMetal = [...host.querySelectorAll("a")].find((a) =>
  (a.textContent ?? "").includes("OF-METAL"),
);
assert(lienMetal?.getAttribute("href") === "/fabrication/a", "lien vers l'OF enfant");

console.log("of chaine: ok");
