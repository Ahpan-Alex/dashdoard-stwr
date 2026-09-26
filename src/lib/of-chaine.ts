import { quantiteProduite } from "./fabrication";
import { modeApprovisionnementDuProduit } from "./mode-approvisionnement";
import { produitEstAchetable, produitEstFabrique, natureStockDuProduit } from "./nature-stock";
import { libelleProduit } from "./produits";
import type { CategorieProduit, OrdreFabrication, Produit } from "./types";

/**
 * Semi-fini ou fini en fabrication sur commande : on le fabrique.
 * Matière première et article sur stock : demande d'achat, inchangée.
 */
export function produitPeutEntrerDansNomenclature(
  produit: Pick<Produit, "natureStock" | "modeApprovisionnement"> | undefined | null,
) {
  if (!produit) return false;
  const nature = natureStockDuProduit(produit);
  if (nature === "matiere_premiere" || nature === "semi_fini") return true;
  return nature === "fini" && composantSeFabriqueSurCommande(produit);
}

export function composantSeFabriqueSurCommande(
  produit: Pick<Produit, "natureStock" | "modeApprovisionnement"> | undefined | null,
) {
  if (!produit || !produitEstFabrique(produit)) return false;
  return modeApprovisionnementDuProduit(produit) === "fabrication_commande";
}

export type ActionRuptureComposant = "demande_achat" | "of_enfant" | "sans_achat";

export function actionRuptureComposant(
  produit: Produit | undefined | null,
  categories?: CategorieProduit[] | null,
): ActionRuptureComposant {
  if (!produit) return "sans_achat";
  if (composantSeFabriqueSurCommande(produit)) return "of_enfant";
  if (produitEstAchetable(produit, categories)) return "demande_achat";
  return "sans_achat";
}

/** Texte de l'alerte production. La branche matière première reste la phrase d'origine. */
export function messageRuptureComposantOf(opts: {
  produit?: Pick<Produit, "natureStock" | "modeApprovisionnement"> | null;
  libelle: string;
  restant: number;
  stock: number;
}) {
  const base = `${opts.libelle} : encore ${opts.restant} à sortir, stock atelier ${opts.stock}.`;
  if (opts.produit && composantSeFabriqueSurCommande(opts.produit)) {
    return `${base} Un ordre de fabrication enfant peut couvrir ce composant.`;
  }
  return `${base} Une demande d'achat peut déjà avoir été créée.`;
}

export type StatutOfEnfant =
  | "a_fabriquer"
  | "en_fabrication"
  | "pret_a_livrer"
  | "cloture"
  | "annule";

export const STATUT_OF_ENFANT_LABELS: Record<StatutOfEnfant, string> = {
  a_fabriquer: "À fabriquer",
  en_fabrication: "En fabrication",
  pret_a_livrer: "Prêt à livrer",
  cloture: "Clôturé",
  annule: "Annulé",
};

export function statutOfEnfant(
  of: Pick<OrdreFabrication, "statut" | "quantitePrevue" | "entreesProduction">,
): StatutOfEnfant {
  if (of.statut === "annule" || of.statut === "cloture_annule") return "annule";
  if (of.statut === "cloture") return "cloture";
  if (of.statut === "en_cours") {
    const produit = quantiteProduite(of);
    if (produit + 1e-9 >= Math.max(0, of.quantitePrevue) && of.quantitePrevue > 0) {
      return "pret_a_livrer";
    }
    return "en_fabrication";
  }
  return "a_fabriquer";
}

export function ofEnfantEstOuvert(
  of: Pick<OrdreFabrication, "statut" | "quantitePrevue" | "entreesProduction">,
) {
  const statut = statutOfEnfant(of);
  return (
    statut === "a_fabriquer" ||
    statut === "en_fabrication" ||
    statut === "pret_a_livrer"
  );
}

/** Enfants directs : leur sortie alimente la nomenclature de cet OF. */
export function ofsEnfantsLies(parentId: string, ofs: OrdreFabrication[]) {
  return ofs.filter((o) => o.ofParentId === parentId);
}

export type LigneOfEnfant = {
  id: string;
  numero: string;
  href: string;
  produitLibelle: string;
  statut: StatutOfEnfant;
  statutLabel: string;
};

export function lignesOfsEnfants(
  parentId: string,
  ofs: OrdreFabrication[],
  produits: Pick<Produit, "id" | "libelleCourt" | "libelleLong">[],
): LigneOfEnfant[] {
  return ofsEnfantsLies(parentId, ofs)
    .map((o) => {
      const produit = produits.find((p) => p.id === o.produitId);
      const statut = statutOfEnfant(o);
      return {
        id: o.id,
        numero: o.numero,
        href: `/fabrication/${o.id}`,
        produitLibelle: produit ? libelleProduit(produit) : o.produitId,
        statut,
        statutLabel: STATUT_OF_ENFANT_LABELS[statut],
      };
    })
    .sort((a, b) => a.numero.localeCompare(b.numero, "fr"));
}

export function messageAlerteOfsEnfants(
  parentId: string,
  ofs: OrdreFabrication[],
  produits: Pick<Produit, "id" | "libelleCourt" | "libelleLong">[],
): string | null {
  const ouverts = ofsEnfantsLies(parentId, ofs).filter(ofEnfantEstOuvert);
  if (ouverts.length === 0) return null;
  const phrases = ouverts.map((o) => {
    const produit = produits.find((p) => p.id === o.produitId);
    const nom = produit ? libelleProduit(produit) : o.produitId;
    const statut = STATUT_OF_ENFANT_LABELS[statutOfEnfant(o)];
    return `Le composant ${nom} provient de l'OF ${o.numero} (${statut})`;
  });
  return `${phrases.join(". ")}. Le démarrage de cet OF n'est pas bloqué.`;
}

/**
 * Le BAT validé peut bloquer le démarrage.
 * Un OF enfant encore ouvert ne le bloque jamais.
 */
export function motifBlocageDemarrageOf(motifBat: string | null) {
  return motifBat;
}

export function ofEstDescendant(
  ofs: Pick<OrdreFabrication, "id" | "ofParentId">[],
  ofId: string,
  ancetreId: string,
) {
  const parId = new Map(ofs.map((o) => [o.id, o]));
  let courant = parId.get(ofId);
  const vus = new Set<string>();
  while (courant?.ofParentId && !vus.has(courant.id)) {
    if (courant.ofParentId === ancetreId) return true;
    vus.add(courant.id);
    courant = parId.get(courant.ofParentId);
  }
  return false;
}

export function motifLienOfEnfant(opts: {
  parent: OrdreFabrication | undefined;
  enfant?: OrdreFabrication;
  produit: Produit | undefined;
  ofs: OrdreFabrication[];
}): string | null {
  const { parent, enfant, produit, ofs } = opts;
  if (!parent) return "Ordre de fabrication parent introuvable.";
  if (parent.statut === "annule" || parent.statut === "cloture_annule") {
    return "L'OF parent est annulé.";
  }
  if (!produit) return "Composant introuvable.";
  if (produit.id === parent.produitId) {
    return "Un OF ne peut pas fabriquer le même article que son parent.";
  }
  if (!composantSeFabriqueSurCommande(produit)) {
    return "Ce composant se couvre par une demande d'achat, pas par un OF enfant.";
  }
  const dansNomenclature = (parent.nomenclatureLignes ?? []).some(
    (l) => l.composantId === produit.id,
  );
  if (!dansNomenclature) {
    return "Ce produit n'est pas un composant de la nomenclature de l'OF parent.";
  }
  if (!enfant) return null;
  if (enfant.id === parent.id) {
    return "Un OF ne peut pas être enfant de lui-même.";
  }
  if (enfant.produitId !== produit.id) {
    return "Cet OF ne fabrique pas le composant manquant.";
  }
  if (enfant.statut === "annule" || enfant.statut === "cloture_annule") {
    return "Cet OF est annulé.";
  }
  if (enfant.ofParentId && enfant.ofParentId !== parent.id) {
    return "Cet OF est déjà lié à un autre OF.";
  }
  if (ofEstDescendant(ofs, parent.id, enfant.id)) {
    return "Ce lien formerait une boucle dans la chaîne d'OF.";
  }
  return null;
}

export function ofsLiablesPourComposant(
  parentId: string,
  composantId: string,
  ofs: OrdreFabrication[],
) {
  return ofs.filter(
    (o) =>
      o.id !== parentId &&
      o.produitId === composantId &&
      o.statut !== "annule" &&
      o.statut !== "cloture_annule" &&
      (!o.ofParentId || o.ofParentId === parentId),
  );
}
