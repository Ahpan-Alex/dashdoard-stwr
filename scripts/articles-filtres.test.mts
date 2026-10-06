/**
 * Filtres de la liste des articles.
 * Exécuter : npm run test:articles-filtres
 */
import {
  FILTRES_ARTICLES_VIDE,
  ajouterFiltreEnregistre,
  badgesFiltresArticles,
  filtrerArticles,
  lignesExportArticles,
  nombreFiltresSecondaires,
  paginerArticles,
  renommerFiltreEnregistre,
  retirerFiltreArticle,
  supprimerFiltreEnregistre,
  type CtxFiltresArticles,
  type FiltresArticles,
} from "../src/lib/articles-filtres.ts";
import type { CategorieProduit, Produit } from "../src/lib/types.ts";

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function produit(partiel: Partial<Produit> & Pick<Produit, "id" | "code">): Produit {
  return {
    libelleCourt: partiel.code,
    libelleLong: "",
    categorieId: "",
    unite: "u",
    prixAchat: 0,
    prixVenteHT: 10,
    tauxTVA: 0,
    actif: true,
    natureStock: "marchandise",
    ...partiel,
  };
}

const familles: CategorieProduit[] = [
  { id: "fam-bache", code: "BAC", libelle: "Bâches", ordre: 1, actif: true },
  {
    id: "sf-imprimee",
    code: "IMP",
    libelle: "Imprimées",
    parentId: "fam-bache",
    ordre: 1,
    actif: true,
  },
  {
    id: "ssf-solvant",
    code: "SOL",
    libelle: "Solvant",
    parentId: "sf-imprimee",
    ordre: 1,
    actif: true,
  },
];

function ctx(extra: Partial<CtxFiltresArticles> = {}): CtxFiltresArticles {
  return {
    categories: familles,
    comptes: [],
    entrees: [],
    ventes: [],
    inventaires: [],
    siteIds: ["site-a", "site-b"],
    achats: [],
    demandesPrix: [],
    journal: [],
    nomSite: (id) => id,
    nomFournisseur: (id) => id,
    nomCategorie: (id) => familles.find((c) => c.id === id)?.libelle ?? id,
    ...extra,
  };
}

const bache = produit({
  id: "p-bache",
  code: "BAC-3X2",
  libelleCourt: "Bâche hôtel",
  libelleLong: "Bâche imprimée 3x2",
  categorieId: "ssf-solvant",
  natureStock: "fini",
  modeApprovisionnement: "fabrication_commande",
  actif: true,
});
const enseigne = produit({
  id: "p-enseigne",
  code: "ENS-01",
  libelleCourt: "Enseigne stock",
  categorieId: "fam-bache",
  natureStock: "marchandise",
  modeApprovisionnement: "sur_stock",
  seuilRupture: 0,
  seuilReappro: 5,
});
const toile = produit({
  id: "p-toile",
  code: "TOILE",
  libelleCourt: "Toile brute",
  natureStock: "matiere_premiere",
  actif: false,
  categorieId: "",
});
const cadre = produit({
  id: "p-cadre",
  code: "CADRE",
  libelleCourt: "Cadre atelier",
  categorieId: "sf-imprimee",
  natureStock: "semi_fini",
  modeApprovisionnement: "fabrication_commande",
  nomenclatures: [
    {
      id: "n1",
      type: "automatique",
      nom: "Standard",
      lignes: [{ id: "l1", composantId: "p-toile", quantiteUnitaire: 1 }],
    },
  ],
  fournisseursPriorite: [{ fournisseurId: "four-plast", rang: 1, manuel: true }],
});

const tous = [bache, enseigne, toile, cadre];

function filtrer(partiel: Partial<FiltresArticles>, base = ctx()) {
  return filtrerArticles(tous, { ...FILTRES_ARTICLES_VIDE, ...partiel }, base).map(
    (p) => p.id,
  );
}

assert(
  filtrer({ code: "bac" }).join() === "p-bache",
  "Le code est partiel et insensible à la casse.",
);
assert(
  filtrer({ libelle: "HÔTEL" }).join() === "p-bache",
  "Le libellé est partiel et insensible à la casse.",
);
assert(
  filtrer({ recherche: "toile" }).join() === "p-toile",
  "La recherche rapide couvre le libellé.",
);
assert(
  filtrer({ recherche: "ens-01", code: "bac" }).length === 0,
  "Recherche rapide et code se combinent en ET.",
);
assert(
  filtrer({ familleId: "fam-bache" }).sort().join() ===
    ["p-bache", "p-cadre", "p-enseigne"].sort().join(),
  "La famille inclut ses sous-familles.",
);
assert(
  filtrer({ familleId: "fam-bache", sousFamilleId: "sf-imprimee" }).sort().join() ===
    ["p-bache", "p-cadre"].sort().join(),
  "La sous-famille limite à sa branche.",
);
assert(
  filtrer({ natureStock: "matiere_premiere" }).join() === "p-toile",
  "La nature de stock filtre.",
);
assert(
  filtrer({ modeApprovisionnement: "fabrication_commande" }).sort().join() ===
    ["p-bache", "p-cadre"].sort().join(),
  "Le mode d'approvisionnement filtre.",
);
assert(filtrer({ statut: "inactif" }).join() === "p-toile", "Le statut filtre.");
assert(filtrer({ sansFamille: true }).join() === "p-toile", "Sans famille.");
assert(
  filtrer({ sansNomenclature: true }).join() === "p-bache",
  "Sans nomenclature ne garde que la fabrication sur commande sans BOM.",
);
assert(
  filtrer({ fournisseurId: "four-plast" }).join() === "p-cadre",
  "Le fournisseur prioritaire filtre.",
);

const stock = ctx({
  entrees: [
    {
      id: "e1",
      produitId: "p-enseigne",
      pointDeVenteId: "site-a",
      quantite: 2,
      prixUnitaire: 1,
      date: "2026-01-01T00:00:00.000Z",
      origine: "stock_initial",
    } as CtxFiltresArticles["entrees"][number],
    {
      id: "e2",
      produitId: "p-enseigne",
      pointDeVenteId: "site-b",
      quantite: 20,
      prixUnitaire: 1,
      date: "2026-01-01T00:00:00.000Z",
      origine: "stock_initial",
    } as CtxFiltresArticles["entrees"][number],
  ],
});
assert(
  filtrer({ situationStock: "seuil", siteId: "site-a" }, stock).includes("p-enseigne"),
  "Sous le seuil se calcule sur le site choisi.",
);
assert(
  !filtrer({ situationStock: "seuil", siteId: "site-b" }, stock).includes("p-enseigne"),
  "Un autre site ne reprend pas la situation du premier.",
);
assert(
  !filtrer({ situationStock: "rupture", siteId: "site-inconnu" }, stock).includes(
    "p-enseigne",
  ),
  "Un site hors visibilité n'est pas utilisé.",
);

const dates = ctx({
  journal: [
    {
      id: "j1",
      date: "2026-03-02T10:00:00.000Z",
      action: "creation",
      entite: "produit",
      entiteId: "p-bache",
    },
  ],
});
assert(
  filtrer({ dateDebut: "2026-03-01", dateFin: "2026-03-31" }, dates).join() ===
    "p-bache",
  "La période de création exclut les articles sans date.",
);

const secondaires = {
  ...FILTRES_ARTICLES_VIDE,
  statut: "actif" as const,
  sansFamille: true,
};
assert(
  nombreFiltresSecondaires(secondaires) === 2,
  "Le compteur du panneau ne compte que les filtres secondaires.",
);
const badges = badgesFiltresArticles(secondaires, {
  nomCategorie: () => "",
  nomSite: () => "",
  nomFournisseur: () => "",
});
assert(badges.length === 2, "Chaque filtre actif a un badge.");
assert(
  retirerFiltreArticle(secondaires, "sansFamille").sansFamille === false,
  "Retirer un badge n'efface que ce filtre.",
);

const page = paginerArticles([1, 2, 3], 2, 2);
assert(page.total === 3 && page.lignes.join() === "3", "La pagination suit la liste filtrée.");

const exportes = lignesExportArticles(
  filtrerArticles(tous, { ...FILTRES_ARTICLES_VIDE, code: "CADRE" }, ctx()),
  familles,
);
assert(exportes.length === 2 && exportes[1][0] === "CADRE", "L'export ne contient que les lignes filtrées.");

let enregistres = ajouterFiltreEnregistre([], {
  id: "f1",
  nom: "Ruptures",
  filtres: FILTRES_ARTICLES_VIDE,
});
assert(enregistres.ok, "Un filtre se sauvegarde.");
if (!enregistres.ok) throw new Error("unreachable");
const doublon = ajouterFiltreEnregistre(enregistres.liste, {
  id: "f2",
  nom: "ruptures",
  filtres: FILTRES_ARTICLES_VIDE,
});
assert(!doublon.ok, "Un nom déjà utilisé est refusé.");
const renomme = renommerFiltreEnregistre(enregistres.liste, "f1", "Atelier");
assert(renomme.ok && renomme.ok && renomme.liste[0].nom === "Atelier", "Un filtre se renomme.");
assert(
  supprimerFiltreEnregistre(renomme.ok ? renomme.liste : [], "f1").length === 0,
  "Un filtre se supprime.",
);

console.log("articles-filtres: ok");
