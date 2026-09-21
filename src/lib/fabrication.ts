import { nextNumero } from "./commercial";
import { etatCumpProduit, quantiteStockChronologique } from "./cump";
import { createId } from "./id";
import {
  motifProduitNonAchetable,
  produitEstAchetable,
  produitEstFabrique,
} from "./nature-stock";
import { NOM_NOMENCLATURE_STANDARD } from "./nomenclature";
import {
  motifDimensionNomenclatureManquante,
  resoudreLignesNomenclatureOf,
  type DimensionOf,
} from "./nomenclature-formules";
import { siteEstAtelier } from "./sites";
import type {
  EntreeStock,
  Facture,
  Inventaire,
  OfEntreeProduction,
  OfFraisAdditionnel,
  OfMainOeuvre,
  OfNomenclatureLigne,
  OfRetourMatiere,
  OfSortieMatiere,
  OfValidationEtape,
  OrdreFabrication,
  OrdreFabricationStatut,
  PointDeVente,
  CategorieProduit,
  Produit,
  TransfertStock,
  TypeNomenclature,
  Vente,
} from "./types";

export const OF_STATUT_LABELS: Record<OrdreFabricationStatut, string> = {
  brouillon: "Brouillon",
  en_cours: "En cours",
  cloture: "Clôturé",
  annule: "Annulé",
  cloture_annule: "Clôturé — Annulé",
};

export const NOM_NOMENCLATURE_OF_STANDARD = NOM_NOMENCLATURE_STANDARD;

export function nextNumeroOf(ofs: OrdreFabrication[]) {
  return nextNumero(
    "OF",
    ofs.map((o) => o.numero),
  );
}

export function ofEstVerrouille(of: Pick<OrdreFabrication, "statut">) {
  return of.statut === "cloture" || of.statut === "cloture_annule" || of.statut === "annule";
}

export function ofPeutMouvementer(of: Pick<OrdreFabrication, "statut">) {
  return of.statut === "en_cours";
}

export function ateliersVisibles(
  sites: PointDeVente[],
  rattache: (id: string) => boolean,
) {
  return sites.filter((s) => s.actif && siteEstAtelier(s) && rattache(s.id));
}

export function copierNomenclatureVersOf(
  produit: Produit,
  source: TypeNomenclature,
  dims: DimensionOf = {},
  nomComposant?: (id: string) => string,
): { nom: string; lignes: OfNomenclatureLigne[] } {
  const nomenc = (produit.nomenclatures ?? []).find((n) => n.type === source);
  const fallback = (produit.nomenclatures ?? []).find((n) => n.type === "automatique");
  const used = nomenc ?? fallback;
  const idMap = new Map<string, string>();
  const brutes: OfNomenclatureLigne[] = (used?.lignes ?? []).map((l) => {
    const id = createId("ofnl");
    idMap.set(l.id, id);
    return {
      id,
      composantId: l.composantId,
      quantiteUnitaire: l.quantite,
      typeCalcul: l.typeCalcul,
      taux: l.taux,
      pourcentage: l.pourcentage,
      lignePivotId: l.lignePivotId,
    };
  });
  const avecPivots = brutes.map((l) => ({
    ...l,
    lignePivotId: l.lignePivotId ? idMap.get(l.lignePivotId) : undefined,
  }));
  return {
    nom: used?.nom ?? NOM_NOMENCLATURE_STANDARD,
    lignes: resoudreLignesNomenclatureOf(avecPivots, dims, nomComposant),
  };
}

export function motifLancementOfDimension(
  of: Pick<OrdreFabrication, "nomenclatureLignes" | "dimensionLargeur" | "dimensionHauteur">,
) {
  return motifDimensionNomenclatureManquante(
    of.nomenclatureLignes ?? [],
    of.dimensionLargeur,
    of.dimensionHauteur,
  );
}

export function lignesMainOeuvre(of: Pick<OrdreFabrication, "mainOeuvre">) {
  return of.mainOeuvre ?? [];
}

/** Taux horaire MOD de l'atelier. Absent / invalide / négatif → 0. */
export function tauxHoraireModAtelier(
  atelier?: Pick<PointDeVente, "tauxHoraireMod"> | null,
) {
  const t = atelier?.tauxHoraireMod;
  return typeof t === "number" && Number.isFinite(t) && t > 0 ? t : 0;
}

export function atelierSansTauxMod(
  atelier?: Pick<PointDeVente, "tauxHoraireMod"> | null,
) {
  return tauxHoraireModAtelier(atelier) <= 0;
}

export function coutMod(heures: number, taux: number) {
  const h = Number(heures) || 0;
  const t = Number(taux) || 0;
  if (h <= 0 || t <= 0) return 0;
  return Math.round(h * t);
}

export function coutsNonAffectes(of: OrdreFabrication) {
  const sorties = of.sorties.filter((s) => !s.affecteEntreeId);
  const frais = of.frais.filter((f) => !f.affecteEntreeId);
  const mainOeuvre = lignesMainOeuvre(of).filter((m) => !m.affecteEntreeId);
  const totalSorties = sorties.reduce((s, x) => s + x.valeur, 0);
  const totalFrais = frais.reduce((s, x) => s + x.montant, 0);
  const totalMod = mainOeuvre.reduce((s, x) => s + x.montant, 0);
  return {
    sorties,
    frais,
    mainOeuvre,
    totalSorties,
    totalFrais,
    totalMod,
    total: totalSorties + totalFrais + totalMod,
  };
}

export function quantiteProduite(of: Pick<OrdreFabrication, "entreesProduction">) {
  return (of.entreesProduction ?? []).reduce((s, e) => s + e.quantite, 0);
}

export function quantiteSortieComposant(of: OrdreFabrication, composantId: string) {
  return (of.sorties ?? [])
    .filter((s) => s.composantId === composantId)
    .reduce((s, x) => s + x.quantite, 0);
}

export function quantiteTheoriqueComposantOf(
  of: Pick<OrdreFabrication, "nomenclatureLignes" | "quantitePrevue">,
  composantId: string,
  quantiteRef?: number,
) {
  const ligne = (of.nomenclatureLignes ?? []).find(
    (l) => l.composantId === composantId,
  );
  return (ligne?.quantiteUnitaire ?? 0) * (quantiteRef ?? of.quantitePrevue);
}

export function depassementNomenclature(
  of: OrdreFabrication,
): { composantId: string; prevu: number; sorti: number }[] {
  const ids = new Set([
    ...(of.nomenclatureLignes ?? []).map((l) => l.composantId),
    ...(of.sorties ?? []).map((s) => s.composantId),
  ]);
  const out: { composantId: string; prevu: number; sorti: number }[] = [];
  for (const id of ids) {
    const prevu = quantiteTheoriqueComposantOf(of, id);
    const sorti = quantiteSortieComposant(of, id);
    if (sorti > prevu + 1e-9) out.push({ composantId: id, prevu, sorti });
  }
  return out;
}

/** Reliquat physique par composant : sorti − (BOM × quantité produite). */
export function reliquatsMatieres(of: OrdreFabrication) {
  const produit = quantiteProduite(of);
  const parComposant = new Map<string, { sorti: number; theorique: number }>();
  for (const s of of.sorties ?? []) {
    const cur = parComposant.get(s.composantId) ?? { sorti: 0, theorique: 0 };
    cur.sorti += s.quantite;
    parComposant.set(s.composantId, cur);
  }
  for (const l of of.nomenclatureLignes ?? []) {
    const cur = parComposant.get(l.composantId) ?? { sorti: 0, theorique: 0 };
    cur.theorique = l.quantiteUnitaire * produit;
    parComposant.set(l.composantId, cur);
  }
  return [...parComposant.entries()]
    .map(([composantId, v]) => ({
      composantId,
      sorti: v.sorti,
      theorique: v.theorique,
      reliquat: Math.max(0, v.sorti - v.theorique),
    }))
    .filter((r) => r.reliquat > 1e-9);
}

/** Alloue un reliquat sur les sorties (plus récentes d'abord) à leur CUMP d'origine. */
export function allouerReliquatSurSorties(
  sorties: OfSortieMatiere[],
  composantId: string,
  quantiteReliquat: number,
): { sortieId: string; quantite: number; cumpOrigine: number }[] {
  let reste = quantiteReliquat;
  const out: { sortieId: string; quantite: number; cumpOrigine: number }[] = [];
  const candidates = [...sorties]
    .filter((s) => s.composantId === composantId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  for (const s of candidates) {
    if (reste <= 1e-9) break;
    const q = Math.min(s.quantite, reste);
    if (q > 1e-9) {
      out.push({ sortieId: s.id, quantite: q, cumpOrigine: s.cumpSortie });
      reste -= q;
    }
  }
  return out;
}

export function valeurReliquats(
  of: OrdreFabrication,
  retours: Pick<OfRetourMatiere, "quantite" | "cumpOrigine">[],
) {
  return retours.reduce((s, r) => s + r.quantite * r.cumpOrigine, 0);
}

export function montantEcartCloture(
  of: OrdreFabrication,
  retours: Pick<OfRetourMatiere, "quantite" | "cumpOrigine">[],
) {
  const pot = coutsNonAffectes(of).total;
  const rendu = valeurReliquats(of, retours);
  return Math.max(0, pot - rendu);
}

export function entreesDepuisOf(
  of: OrdreFabrication,
  produits: Produit[],
): EntreeStock[] {
  if (of.statut === "brouillon") return [];
  const contreMouvement =
    of.statut === "cloture_annule" ||
    (of.statut === "annule" &&
      (of.sorties.length > 0 || of.entreesProduction.length > 0));
  if (of.statut === "annule" && !contreMouvement) return [];
  const fabrique = produits.find((p) => p.id === of.produitId);
  const out: EntreeStock[] = [];
  const dateAnnul = of.dateAnnulation ?? of.dateClotureReelle ?? new Date().toISOString();

  const push = (e: EntreeStock) => {
    out.push(e);
  };

  for (const s of of.sorties) {
    const c = produits.find((p) => p.id === s.composantId);
    push({
      id: `ent-of-out-${of.id}-${s.id}`,
      pointDeVenteId: s.siteSourceId,
      produitId: s.composantId,
      quantite: -s.quantite,
      prixAchatUnitaire: s.cumpSortie,
      prixVenteUnitaire: c?.prixVenteHT ?? 0,
      fournisseur: "Fabrication",
      date: s.date,
      origine: "of_sortie",
      ofId: of.id,
      note: of.numero,
    });
  }

  for (const e of of.entreesProduction) {
    push({
      id: `ent-of-in-${of.id}-${e.id}`,
      pointDeVenteId: of.atelierId,
      produitId: of.produitId,
      quantite: e.quantite,
      prixAchatUnitaire: e.coutUnitaire,
      prixVenteUnitaire: fabrique?.prixVenteHT ?? 0,
      fournisseur: "Fabrication",
      date: e.date,
      origine: "of_entree",
      ofId: of.id,
      note: of.numero,
    });
  }

  for (const r of of.retoursMatieres) {
    const c = produits.find((p) => p.id === r.composantId);
    push({
      id: `ent-of-ret-${of.id}-${r.id}`,
      pointDeVenteId: r.siteDestinataireId,
      produitId: r.composantId,
      quantite: r.quantite,
      prixAchatUnitaire: r.cumpOrigine,
      prixVenteUnitaire: c?.prixVenteHT ?? 0,
      fournisseur: "Fabrication",
      date: of.dateClotureReelle ?? r.sortieId,
      origine: "of_retour",
      ofId: of.id,
      note: `${of.numero} — retour matière`,
    });
  }

  if (contreMouvement) {
    for (const s of of.sorties) {
      const c = produits.find((p) => p.id === s.composantId);
      push({
        id: `ent-of-ann-out-${of.id}-${s.id}`,
        pointDeVenteId: s.siteSourceId,
        produitId: s.composantId,
        quantite: s.quantite,
        prixAchatUnitaire: s.cumpSortie,
        prixVenteUnitaire: c?.prixVenteHT ?? 0,
        fournisseur: "Fabrication",
        date: dateAnnul,
        origine: "of_annulation",
        ofId: of.id,
        note: `${of.numero} — contre-mouvement matières`,
      });
    }
    for (const e of of.entreesProduction) {
      push({
        id: `ent-of-ann-in-${of.id}-${e.id}`,
        pointDeVenteId: of.atelierId,
        produitId: of.produitId,
        quantite: -e.quantite,
        prixAchatUnitaire: e.coutUnitaire,
        prixVenteUnitaire: fabrique?.prixVenteHT ?? 0,
        fournisseur: "Fabrication",
        date: dateAnnul,
        origine: "of_annulation",
        ofId: of.id,
        note: `${of.numero} — contre-mouvement production`,
      });
    }
    for (const r of of.retoursMatieres) {
      const c = produits.find((p) => p.id === r.composantId);
      push({
        id: `ent-of-ann-ret-${of.id}-${r.id}`,
        pointDeVenteId: r.siteDestinataireId,
        produitId: r.composantId,
        quantite: -r.quantite,
        prixAchatUnitaire: r.cumpOrigine,
        prixVenteUnitaire: c?.prixVenteHT ?? 0,
        fournisseur: "Fabrication",
        date: dateAnnul,
        origine: "of_annulation",
        ofId: of.id,
        note: `${of.numero} — contre-mouvement retour`,
      });
    }
  }

  return out;
}

export function regenererEntreesOf(
  entrees: EntreeStock[],
  of: OrdreFabrication,
  produits: Produit[],
): EntreeStock[] {
  const hors = entrees.filter((e) => e.ofId !== of.id);
  return [...hors, ...entreesDepuisOf(of, produits)];
}

export type MouvementBloquantAnnulation = {
  type: "vente" | "transfert" | "of" | "stock";
  libelle: string;
  date: string;
  quantite: number;
};

export function listerMouvementsBloquantAnnulationOf(
  of: OrdreFabrication,
  ctx: {
    entrees: EntreeStock[];
    ventes: Vente[];
    inventaires: Inventaire[];
    factures: Facture[];
    transfertsStock: TransfertStock[];
    ordresFabrication: OrdreFabrication[];
    produits: Produit[];
  },
): MouvementBloquantAnnulation[] {
  const dateMin =
    of.entreesProduction[0]?.date ?? of.sorties[0]?.date ?? of.dateCreation;
  const bloquants: MouvementBloquantAnnulation[] = [];

  const entreesSimulees = regenererEntreesOf(
    ctx.entrees,
    {
      ...of,
      statut: "cloture_annule",
      dateAnnulation: of.dateAnnulation ?? new Date().toISOString(),
    },
    ctx.produits,
  );

  const sitesProduits = new Map<string, Set<string>>();
  const mark = (siteId: string, produitId: string) => {
    if (!sitesProduits.has(siteId)) sitesProduits.set(siteId, new Set());
    sitesProduits.get(siteId)!.add(produitId);
  };
  mark(of.atelierId, of.produitId);
  for (const s of of.sorties) mark(s.siteSourceId, s.composantId);
  for (const r of of.retoursMatieres) mark(r.siteDestinataireId, r.composantId);

  let stockNegatif = false;
  for (const [siteId, produits] of sitesProduits) {
    for (const produitId of produits) {
      const q = quantiteStockChronologique({
        produitId,
        pointDeVenteId: siteId,
        entrees: entreesSimulees,
        ventes: ctx.ventes,
        inventaires: ctx.inventaires,
      });
      if (q < -1e-9) stockNegatif = true;
    }
  }
  if (!stockNegatif) return [];

  const qProduite = quantiteProduite(of);
  if (qProduite > 1e-9) {
    for (const v of ctx.ventes) {
      if (v.produitId !== of.produitId || v.pointDeVenteId !== of.atelierId) continue;
      if (v.quantite <= 0) continue;
      if (v.date < dateMin) continue;
      const fac = ctx.factures.find((f) => f.id === v.factureId);
      bloquants.push({
        type: "vente",
        libelle: fac
          ? `Vente ${fac.numero}`
          : "Vente du produit fabriqué",
        date: v.date,
        quantite: v.quantite,
      });
    }
    for (const t of ctx.transfertsStock) {
      if (t.statut === "annule" || t.statut === "demande") continue;
      if (t.siteSourceId !== of.atelierId) continue;
      const ligne = t.lignes.find((l) => l.produitId === of.produitId && l.quantite > 0);
      if (!ligne) continue;
      const d = t.dateExpedition ?? t.dateDemande;
      if (d < dateMin) continue;
      bloquants.push({
        type: "transfert",
        libelle: `Transfert ${t.numero} vers un autre site`,
        date: d,
        quantite: ligne.quantite,
      });
    }
    for (const autre of ctx.ordresFabrication) {
      if (autre.id === of.id) continue;
      if (autre.statut === "brouillon" || autre.statut === "annule") continue;
      if (autre.statut === "cloture_annule") continue;
      for (const s of autre.sorties) {
        if (s.composantId !== of.produitId) continue;
        if (s.siteSourceId !== of.atelierId) continue;
        if (s.date < dateMin) continue;
        bloquants.push({
          type: "of",
          libelle: `Consommation dans l'OF ${autre.numero}`,
          date: s.date,
          quantite: s.quantite,
        });
      }
    }
  }

  if (bloquants.length === 0) {
    bloquants.push({
      type: "stock",
      libelle:
        "Le stock du site concerné serait négatif après contre-mouvement (mouvements ultérieurs).",
      date: dateMin,
      quantite: qProduite,
    });
  }

  return bloquants;
}

export function messageAnnulationRefusee(mouvements: MouvementBloquantAnnulation[]) {
  if (mouvements.length === 0) return null;
  const lignes = mouvements.map((m) => {
    const q = m.quantite > 0 ? ` (${m.quantite} u.)` : "";
    return `• ${m.libelle}${q}`;
  });
  return `Annulation impossible : la quantité produite a déjà été utilisée.\nTraitez d'abord ces mouvements :\n${lignes.join("\n")}`;
}

export function cumpCourantSite(opts: {
  produitId: string;
  siteId: string;
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires: Inventaire[];
  produit: Produit;
  exclureOfId?: string;
}) {
  const entrees = opts.exclureOfId
    ? opts.entrees.filter((e) => e.ofId !== opts.exclureOfId)
    : opts.entrees;
  return etatCumpProduit({
    produitId: opts.produitId,
    pointDeVenteId: opts.siteId,
    entrees,
    ventes: opts.ventes,
    inventaires: opts.inventaires,
    produit: opts.produit,
  });
}

export function stockDisponibleComposant(opts: {
  produitId: string;
  siteId: string;
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires: Inventaire[];
  exclureOfId?: string;
}) {
  const entrees = opts.exclureOfId
    ? opts.entrees.filter((e) => e.ofId !== opts.exclureOfId)
    : opts.entrees;
  return quantiteStockChronologique({
    produitId: opts.produitId,
    pointDeVenteId: opts.siteId,
    entrees,
    ventes: opts.ventes,
    inventaires: opts.inventaires,
  });
}

export function motifProduitOfInvalide(produit: Produit | undefined) {
  if (!produit) return "Produit introuvable.";
  if (!produit.actif) return "Ce produit est inactif.";
  if (!produitEstFabrique(produit)) {
    return "Seuls les produits semi-finis et finis peuvent être fabriqués. Une matière première entre en stock uniquement par achat.";
  }
  return null;
}

export function motifAchatNatureInterdite(
  produits: Produit[],
  lignes: { produitId?: string }[],
  categories?: CategorieProduit[],
) {
  for (const l of lignes) {
    if (!l.produitId) continue;
    const p = produits.find((x) => x.id === l.produitId);
    if (p && !produitEstAchetable(p, categories)) {
      return motifProduitNonAchetable(p);
    }
  }
  return null;
}

export function ofsPourCommande(ofs: OrdreFabrication[], commandeId: string) {
  return ofs.filter(
    (o) =>
      o.commandeId === commandeId &&
      o.statut !== "annule",
  );
}

export function achatsPourOf(achats: { ofId?: string }[], ofId: string) {
  return achats.filter((a) => a.ofId === ofId);
}

export function etapeValidation(
  action: OfValidationEtape["action"],
  actor: { id?: string; nom?: string },
  detail?: string,
): OfValidationEtape {
  return {
    id: createId("ofval"),
    date: new Date().toISOString(),
    userId: actor.id,
    userNom: actor.nom,
    action,
    detail,
  };
}

export function affecterPotAEntree(
  of: OrdreFabrication,
  entree: OfEntreeProduction,
): {
  sorties: OfSortieMatiere[];
  frais: OfFraisAdditionnel[];
  mainOeuvre: OfMainOeuvre[];
} {
  return {
    sorties: of.sorties.map((s) =>
      s.affecteEntreeId ? s : { ...s, affecteEntreeId: entree.id },
    ),
    frais: of.frais.map((f) =>
      f.affecteEntreeId ? f : { ...f, affecteEntreeId: entree.id },
    ),
    mainOeuvre: lignesMainOeuvre(of).map((m) =>
      m.affecteEntreeId ? m : { ...m, affecteEntreeId: entree.id },
    ),
  };
}
