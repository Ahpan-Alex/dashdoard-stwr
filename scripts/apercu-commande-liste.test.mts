/**
 * Ouverture de l'aperçu depuis la liste des commandes.
 * Exécuter : npm run test:apercu-commande
 */
import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost:3000/commandes/liste" });
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

const { createElement, useState } = await import("react");
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { AppRouterContext } = await import(
  "next/dist/shared/lib/app-router-context.shared-runtime.js"
);
const { ApercuCommandeListe, MESSAGE_APERCU_COMMANDE_INDISPONIBLE } =
  await import("../src/components/apercu-commande-liste.tsx");
const { emptyAppState } = await import("../src/lib/empty-state.ts");
const { useStore } = await import("../src/lib/store.ts");

const router = new Proxy({}, { get: () => () => Promise.resolve() });

const site = {
  id: "site-1",
  nom: "Magasin",
  actif: true,
  rolesSite: ["point_de_vente", "atelier"],
};
const client = { id: "cli-1", nom: "Rasoanaivo", code: "CLI-1" };

function produit(id: string, nature: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    code: id,
    libelleCourt: id,
    natureStock: nature,
    prixVente: 1000,
    prixAchat: 400,
    unite: "u",
    actif: true,
    ...extra,
  };
}

function ligne(id: string, produitId: string, designation: string, mode: string) {
  return {
    id,
    type: "produit",
    produitId,
    designation,
    quantite: 3,
    prixUnitaire: 1500,
    unite: "u",
    modeApprovisionnement: mode,
  };
}

const stock = {
  id: "cmd-stock",
  numero: "CMD-STOCK",
  clientId: client.id,
  pointDeVenteId: site.id,
  date: "2026-09-01T08:00:00.000Z",
  statut: "confirmee",
  tauxTVA: 20,
  lignes: [ligne("l1", "vis", "Vis laiton", "sur_stock")],
};
const fab = {
  id: "cmd-fab",
  numero: "CMD-FAB",
  clientId: client.id,
  pointDeVenteId: site.id,
  date: "2026-09-02T08:00:00.000Z",
  statut: "confirmee",
  tauxTVA: 20,
  lignes: [ligne("l2", "cadre", "Cadre alu", "fabrication_commande")],
};
const mixte = {
  id: "cmd-mix",
  numero: "CMD-MIX",
  clientId: client.id,
  pointDeVenteId: site.id,
  date: "2026-09-03T08:00:00.000Z",
  statut: "confirmee",
  tauxTVA: 20,
  lignes: [
    ligne("l1", "vis", "Vis laiton", "sur_stock"),
    ligne("l2", "cadre", "Cadre alu", "fabrication_commande"),
  ],
};

function etat(patch: Record<string, unknown> = {}) {
  return {
    ...emptyAppState(),
    pointsDeVente: [site],
    clients: [client],
    produits: [
      produit("vis", "fini", { modeApprovisionnement: "sur_stock", libelleCourt: "Vis" }),
      produit("cadre", "semi_fini", {
        modeApprovisionnement: "fabrication_commande",
        libelleCourt: "Cadre",
        nomenclatures: [
          {
            id: "n1",
            type: "automatique",
            nom: "Nomenclature standard",
            lignes: [{ id: "nl1", composantId: "tole", quantite: 2, typeCalcul: "fixe" }],
          },
        ],
      }),
      produit("tole", "matiere_premiere", { libelleCourt: "Tôle" }),
    ],
    commandes: [stock, fab, mixte],
    ...patch,
  };
}

function Liste() {
  const [id, setId] = useState<string | null>(null);
  const commandes = useStore((s) => s.commandes);
  const ouverte = commandes.find((c) => c.id === id);
  return createElement(
    AppRouterContext.Provider,
    { value: router },
    createElement(
      "div",
      null,
      createElement("h1", null, "Liste des commandes"),
      ...commandes.map((c) =>
        createElement(
          "button",
          {
            type: "button",
            "aria-label": `Aperçu ${c.numero}`,
            onClick: () => setId(c.id),
          },
          "Œil",
        ),
      ),
      ouverte
        ? createElement(ApercuCommandeListe, {
            commande: ouverte,
            onFermer: () => setId(null),
            onOuvrir: () => setId(null),
          })
        : null,
    ),
  );
}

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const host = win.document.createElement("div");
win.document.body.appendChild(host);
const root = createRoot(host);

useStore.setState(etat() as never, true);

await act(async () => {
  root.render(createElement(Liste));
});

const texte = () => host.textContent ?? "";

assert(texte().includes("Liste des commandes"), "la liste doit rester affichée");
assert(!texte().includes("CMD-STOCK"), "l'aperçu est fermé au départ");

async function ouvrir(numero: string, attendus: string[]) {
  const bouton = [...host.querySelectorAll("button")].find((b) =>
    b.getAttribute("aria-label") === `Aperçu ${numero}`,
  );
  assert(bouton, `bouton œil introuvable pour ${numero}`);
  await act(async () => {
    bouton.click();
  });
  const vu = texte();
  assert(vu.includes("Liste des commandes"), `la liste disparaît en ouvrant ${numero}`);
  assert(!vu.includes("This page couldn’t load"), `écran Next pour ${numero}`);
  assert(!vu.includes(MESSAGE_APERCU_COMMANDE_INDISPONIBLE), `aperçu en erreur pour ${numero} : ${vu.slice(0, 240)}`);
  for (const morceau of attendus) {
    assert(vu.includes(morceau), `${numero} devrait afficher « ${morceau} »`);
  }
  const fermer = [...host.querySelectorAll("button")].find((b) => b.textContent === "Fermer");
  assert(fermer, "bouton Fermer");
  await act(async () => {
    fermer.click();
  });
  assert(!texte().includes(numero), `${numero} reste affiché après fermeture`);
}

await ouvrir("CMD-STOCK", ["Rasoanaivo", "Vis laiton", "Sur stock", "Stock insuffisant"]);
await ouvrir("CMD-FAB", ["Rasoanaivo", "Cadre alu", "Fabrication sur commande", "À fabriquer"]);
await ouvrir("CMD-MIX", [
  "Rasoanaivo",
  "Vis laiton",
  "Cadre alu",
  "Sur stock",
  "Fabrication sur commande",
  "À fabriquer",
]);

const sansMouvements = etat();
(sansMouvements as { entrees?: unknown }).entrees = undefined;
(sansMouvements as { ventes?: unknown }).ventes = undefined;
useStore.setState(sansMouvements as never, true);
await ouvrir("CMD-STOCK", ["Vis laiton", "Sur stock"]);

const modeleCasse = etat();
modeleCasse.modelesDocuments = modeleCasse.modelesDocuments.map((m: { type: string }) =>
  m.type === "commande" ? { ...m, zones: undefined, rubriques: undefined } : m,
);
useStore.setState(modeleCasse as never, true);
await ouvrir("CMD-FAB", ["Cadre alu", "Rasoanaivo"]);

const casse = etat({
  commandes: [{ ...stock, id: "cmd-casse", numero: "CMD-CASSE", lignes: undefined }],
});
useStore.setState(casse as never, true);
await act(async () => {
  root.render(createElement(Liste));
});
const boutonCasse = [...host.querySelectorAll("button")].find(
  (b) => b.getAttribute("aria-label") === "Aperçu CMD-CASSE",
);
assert(boutonCasse, "bouton œil commande illisible");
await act(async () => {
  boutonCasse.click();
});
const erreur = texte();
assert(erreur.includes("Liste des commandes"), "la liste doit rester visible si l'aperçu échoue");
assert(erreur.includes(MESSAGE_APERCU_COMMANDE_INDISPONIBLE), `message Négoo attendu, reçu : ${erreur.slice(0, 300)}`);
assert(!erreur.includes("This page couldn’t load"), "l'écran générique Next ne doit pas remplacer la page");

await act(async () => {
  root.unmount();
});
await win.happyDOM.abort();
console.log("apercu commande liste: ok");
