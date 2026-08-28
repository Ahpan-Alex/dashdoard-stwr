import { endOfDay, parseISO } from "date-fns";
import { prixAchatCatalogue } from "./produits";
import type {
  EntreeStock,
  Facture,
  Inventaire,
  LigneDocument,
  Produit,
  Vente,
} from "./types";

export type EtatCump = {
  quantite: number;
  valeur: number;
  cump: number;
};

export type EvenementCump = {
  date: string;
  /** 0 = entrée, 1 = sortie, 2 = inventaire (clôture de journée). */
  ordre: 0 | 1 | 2;
  id: string;
  kind: "entree" | "sortie" | "inventaire";
  /** Entrée/sortie : quantité mouvementée (sortie d'avoir = négatif). Inventaire : stock physique. */
  quantite: number;
  prixAchat?: number;
  /**
   * Coût unitaire figé (ventes clôturées). Si présent, la sortie consomme
   * à ce coût au lieu du CUMP courant — les rapports déjà émis restent stables.
   */
  cumpFigee?: number;
};

const EPS = 1e-9;

export function etatCumpVide(cumpCatalogue: number): EtatCump {
  return { quantite: 0, valeur: 0, cump: cumpCatalogue };
}

function compareEvenements(a: EvenementCump, b: EvenementCump) {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  if (a.ordre !== b.ordre) return a.ordre - b.ordre;
  return a.id.localeCompare(b.id);
}

export function appliquerEvenementCump(
  etat: EtatCump,
  ev: EvenementCump,
  cumpCatalogue: number,
): EtatCump {
  let { quantite, valeur, cump } = etat;
  if (ev.kind === "entree") {
    const q = ev.quantite;
    const pu = ev.prixAchat ?? cump;
    if (Math.abs(q) > EPS) {
      valeur += q * pu;
      quantite += q;
      if (quantite > EPS) {
        cump = valeur / quantite;
      } else {
        quantite = 0;
        valeur = 0;
      }
    }
  } else if (ev.kind === "sortie") {
    const q = ev.quantite;
    const cout = ev.cumpFigee ?? cump;
    if (q > 0) {
      const take = Math.min(quantite, q);
      valeur -= take * cout;
      quantite -= take;
    } else if (q < 0) {
      const add = -q;
      valeur += add * cout;
      quantite += add;
    }
  } else {
    const physique = Math.max(0, ev.quantite);
    quantite = physique;
    valeur = physique * cump;
  }

  if (quantite <= EPS) {
    quantite = 0;
    valeur = 0;
  }
  if (quantite > EPS) {
    cump = valeur / quantite;
  }
  return { quantite, valeur, cump };
}

export function parcourirCump(
  evenements: EvenementCump[],
  cumpCatalogue: number,
  onEvent?: (ctx: {
    etatAvant: EtatCump;
    etatApres: EtatCump;
    event: EvenementCump;
  }) => void,
): EtatCump {
  let etat = etatCumpVide(cumpCatalogue);
  const tries = [...evenements].sort(compareEvenements);
  for (const ev of tries) {
    const etatAvant = etat;
    etat = appliquerEvenementCump(etat, ev, cumpCatalogue);
    onEvent?.({ etatAvant, etatApres: etat, event: ev });
  }
  return etat;
}

function inventairesValides(
  inventaires: Inventaire[] | undefined,
  pointDeVenteId: string,
  exclureInventaireId?: string,
) {
  return (inventaires ?? []).filter(
    (i) =>
      i.statut === "valide" &&
      i.pointDeVenteId === pointDeVenteId &&
      i.id !== exclureInventaireId,
  );
}

export function evenementsCumpProduit(opts: {
  produitId: string;
  pointDeVenteId: string;
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
  exclureInventaireId?: string;
  jusquA?: Date;
}): EvenementCump[] {
  const {
    produitId,
    pointDeVenteId,
    entrees,
    ventes,
    inventaires,
    exclureInventaireId,
    jusquA,
  } = opts;
  const limite = jusquA ? endOfDay(jusquA) : undefined;
  const inclus = (iso: string) =>
    !limite || parseISO(iso).getTime() <= limite.getTime();

  const events: EvenementCump[] = [];

  for (const e of entrees) {
    if (e.pointDeVenteId !== pointDeVenteId || e.produitId !== produitId) {
      continue;
    }
    if (!inclus(e.date)) continue;
    events.push({
      date: e.date,
      ordre: 0,
      id: e.id,
      kind: "entree",
      quantite: e.quantite,
      prixAchat: e.prixAchatUnitaire,
    });
  }

  for (const v of ventes) {
    if (v.pointDeVenteId !== pointDeVenteId || v.produitId !== produitId) {
      continue;
    }
    if (!inclus(v.date)) continue;
    events.push({
      date: v.date,
      ordre: 1,
      id: v.id,
      kind: "sortie",
      quantite: v.quantite,
      cumpFigee: v.cumpFigee,
    });
  }

  for (const inv of inventairesValides(
    inventaires,
    pointDeVenteId,
    exclureInventaireId,
  )) {
    if (!inclus(inv.date)) continue;
    const ligne = inv.lignes.find((l) => l.produitId === produitId);
    if (!ligne) continue;
    events.push({
      date: inv.date,
      ordre: 2,
      id: inv.id,
      kind: "inventaire",
      quantite: ligne.stockPhysique,
    });
  }

  return events.sort(compareEvenements);
}

export function quantiteStockChronologique(opts: {
  produitId: string;
  pointDeVenteId: string;
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
  exclureInventaireId?: string;
  jusquA?: Date;
}): number {
  return parcourirCump(evenementsCumpProduit(opts), 0).quantite;
}

export function etatCumpProduit(
  opts: {
    produitId: string;
    pointDeVenteId: string;
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires?: Inventaire[];
    exclureInventaireId?: string;
    jusquA?: Date;
  } & { produit: Produit },
): EtatCump {
  const catalogue = prixAchatCatalogue(opts.produit);
  return parcourirCump(evenementsCumpProduit(opts), catalogue);
}

/** CUMP du stock restant (après tous les mouvements, y compris inventaires validés). */
export function cumpStockRestant(
  produitId: string,
  pointDeVenteId: string | "tous",
  entrees: EntreeStock[],
  ventes: Vente[],
  produit: Produit,
  inventaires?: Inventaire[],
  jusquA?: Date,
): number {
  if (pointDeVenteId === "tous") {
    const pdvIds = new Set<string>();
    for (const e of entrees) {
      if (e.produitId === produitId) pdvIds.add(e.pointDeVenteId);
    }
    for (const v of ventes) {
      if (v.produitId === produitId) pdvIds.add(v.pointDeVenteId);
    }
    for (const i of inventaires ?? []) {
      if (i.statut === "valide" && i.lignes.some((l) => l.produitId === produitId)) {
        pdvIds.add(i.pointDeVenteId);
      }
    }
    let qty = 0;
    let val = 0;
    for (const pdvId of pdvIds) {
      const etat = etatCumpProduit({
        produitId,
        pointDeVenteId: pdvId,
        entrees,
        ventes,
        inventaires,
        jusquA,
        produit,
      });
      qty += etat.quantite;
      val += etat.valeur;
    }
    if (qty > EPS) return val / qty;
    return prixAchatCatalogue(produit);
  }

  const etat = etatCumpProduit({
    produitId,
    pointDeVenteId,
    entrees,
    ventes,
    inventaires,
    jusquA,
    produit,
  });
  if (etat.quantite > EPS) return etat.cump;
  return prixAchatCatalogue(produit);
}

export type CmvPeriode = { quantite: number; cmv: number };

/** CMV des sorties d'une période, au CUMP en vigueur au moment de chaque sortie. */
export function cmvSortiesPeriode(opts: {
  produitId: string;
  pointDeVenteId: string;
  entrees: EntreeStock[];
  ventes: Vente[];
  produit: Produit;
  inventaires?: Inventaire[];
  dansPeriode: (dateIso: string) => boolean;
}): CmvPeriode {
  const { produit, dansPeriode, ...rest } = opts;
  const catalogue = prixAchatCatalogue(produit);
  const events = evenementsCumpProduit(rest);
  let quantite = 0;
  let cmv = 0;
  parcourirCump(events, catalogue, ({ etatAvant, event }) => {
    if (event.kind !== "sortie") return;
    if (!dansPeriode(event.date)) return;
    if (event.quantite > 0) {
      const take = Math.min(etatAvant.quantite, event.quantite);
      const cout = event.cumpFigee ?? etatAvant.cump;
      quantite += take;
      cmv += take * cout;
    } else if (event.quantite < 0) {
      const cout = event.cumpFigee ?? etatAvant.cump;
      quantite += event.quantite;
      cmv += event.quantite * cout;
    }
  });
  return { quantite, cmv };
}

/**
 * Fige le CUMP unitaire de chaque ligne produit au moment de la clôture
 * (validation fiscale). Les livraisons ultérieures ne modifieront plus ce coût.
 */
export function snapshotCumpLignesFacture(
  facture: Facture,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires?: Inventaire[];
    produits: Produit[];
  },
): LigneDocument[] {
  return facture.lignes.map((l) => {
    if ((l.type && l.type !== "produit") || !l.produitId) return l;
    if (l.cumpFigee != null) return l;
    const produit = ctx.produits.find((p) => p.id === l.produitId);
    if (!produit) return l;
    const cump = cumpStockRestant(
      l.produitId,
      facture.pointDeVenteId,
      ctx.entrees,
      ctx.ventes,
      produit,
      ctx.inventaires,
      parseISO(facture.date),
    );
    return { ...l, cumpFigee: cump };
  });
}
