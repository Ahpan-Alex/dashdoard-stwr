import { etatCumpProduit } from "./cump";
import { coutMod, tauxHoraireModAtelier } from "./fabrication";
import { nomenclatureStandardDuProduit } from "./nomenclature";
import { produitEstFabrique } from "./nature-stock";
import {
  nomenclatureExigeDimension,
  quantiteUnitaireResolue,
  typeCalculNomenclature,
  type DimensionOf,
} from "./nomenclature-formules";
import { libelleProduit } from "./produits";
import type {
  EntreeStock,
  Inventaire,
  NomenclatureProduit,
  Parametres,
  PointDeVente,
  Produit,
  Vente,
} from "./types";

const EPS = 1e-9;
const MAX_PROFONDEUR_CASCADE = 32;

export type SourceCoutMatiere = "cump" | "cascade";

export type LigneCoutTheoriqueMatiere = {
  ligneId: string;
  composantId: string;
  nom: string;
  quantite: number | null;
  /** Coût unitaire affiché : CUMP ou coût théorique cascadé. */
  cump: number | null;
  cout: number | null;
  cumpIndisponible: boolean;
  quantiteIndeterminee: boolean;
  source: SourceCoutMatiere;
  cascade?: CoutTheoriqueNomenclature;
};

export type LigneCoutTheoriqueMod = {
  id: string;
  atelierId: string;
  atelierNom: string;
  heures: number;
  tauxHoraire: number;
  cout: number;
};

export type CoutTheoriqueNomenclature = {
  nomenclatureId: string;
  nomenclatureNom: string;
  produitId?: string;
  matiere: LigneCoutTheoriqueMatiere[];
  totalMatiere: number;
  mod: LigneCoutTheoriqueMod[];
  totalMod: number;
  total: number;
  partiel: boolean;
};

export type OverridesCoutTheorique = {
  cumpParProduitId?: Record<string, number>;
  quantiteParLigneId?: Record<string, number>;
  tauxHoraireParAtelierId?: Record<string, number>;
};

export type NiveauAlerteMargeTheorique = "ok" | "avertissement" | "critique";

export type SeuilsMargeTheorique = {
  avertissement: number;
  critique: number;
};

export type ProduitAlerteMargeTheorique = {
  produit: Produit;
  cout: number;
  prixVente: number;
  marge: number;
  taux: number;
  niveau: NiveauAlerteMargeTheorique;
  partiel: boolean;
};

type ContexteCout = {
  produits: Produit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
  ateliers: PointDeVente[];
  dims?: DimensionOf;
  overrides?: OverridesCoutTheorique;
};

/**
 * CUMP actuel du composant (moyenne pondérée des stocks restants par site).
 * Null s'il n'a jamais eu d'entrée (achat ou OF) — pas de repli sur le prix catalogue.
 */
export function cumpActuelComposant(opts: {
  produit: Produit;
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
}): number | null {
  const { produit, entrees, ventes, inventaires } = opts;
  const sites = new Set<string>();
  let aEntreePositive = false;
  for (const e of entrees) {
    if (e.produitId !== produit.id) continue;
    sites.add(e.pointDeVenteId);
    if (e.quantite > EPS) aEntreePositive = true;
  }
  if (!aEntreePositive) return null;

  for (const v of ventes) {
    if (v.produitId === produit.id) sites.add(v.pointDeVenteId);
  }
  for (const i of inventaires ?? []) {
    if (i.statut === "valide" && i.lignes.some((l) => l.produitId === produit.id)) {
      sites.add(i.pointDeVenteId);
    }
  }

  let qty = 0;
  let val = 0;
  let dernier: number | null = null;
  for (const siteId of sites) {
    const etat = etatCumpProduit({
      produitId: produit.id,
      pointDeVenteId: siteId,
      entrees,
      ventes,
      inventaires,
      produit,
    });
    if (etat.quantite > EPS) {
      qty += etat.quantite;
      val += etat.valeur;
    }
    dernier = etat.cump;
  }
  if (qty > EPS) return val / qty;
  return dernier;
}

function cumpOuOverride(
  produit: Produit,
  ctx: ContexteCout,
): number | null {
  const sim = ctx.overrides?.cumpParProduitId?.[produit.id];
  if (typeof sim === "number" && Number.isFinite(sim) && sim >= 0) return sim;
  return cumpActuelComposant({
    produit,
    entrees: ctx.entrees,
    ventes: ctx.ventes,
    inventaires: ctx.inventaires,
  });
}

function tauxAtelierOuOverride(
  atelier: PointDeVente | undefined,
  atelierId: string,
  overrides?: OverridesCoutTheorique,
) {
  const sim = overrides?.tauxHoraireParAtelierId?.[atelierId];
  if (typeof sim === "number" && Number.isFinite(sim) && sim >= 0) return sim;
  return tauxHoraireModAtelier(atelier);
}

function coutUnitaireFabrique(
  produit: Produit,
  ctx: ContexteCout,
  visiting: Set<string>,
  profondeur: number,
  memo: Map<string, CoutTheoriqueNomenclature>,
): CoutTheoriqueNomenclature {
  const cached = memo.get(produit.id);
  if (cached) return cached;
  const vide: CoutTheoriqueNomenclature = {
    nomenclatureId: "",
    nomenclatureNom: "",
    produitId: produit.id,
    matiere: [],
    totalMatiere: 0,
    mod: [],
    totalMod: 0,
    total: 0,
    partiel: true,
  };
  if (visiting.has(produit.id) || profondeur >= MAX_PROFONDEUR_CASCADE) {
    return vide;
  }
  const nomenc = nomenclatureStandardDuProduit(produit);
  if (!nomenc) return vide;
  visiting.add(produit.id);
  const result = calculerNomenclatureInterne(
    nomenc,
    produit.id,
    { ...ctx, dims: {} },
    visiting,
    profondeur,
    memo,
  );
  visiting.delete(produit.id);
  memo.set(produit.id, result);
  return result;
}

function calculerNomenclatureInterne(
  nomenclature: NomenclatureProduit,
  produitId: string | undefined,
  ctx: ContexteCout,
  visiting: Set<string>,
  profondeur: number,
  memo: Map<string, CoutTheoriqueNomenclature>,
): CoutTheoriqueNomenclature {
  const dim = ctx.dims ?? {};
  const matiere: LigneCoutTheoriqueMatiere[] = nomenclature.lignes.map((l) => {
    const composant = ctx.produits.find((p) => p.id === l.composantId);
    const nom = composant
      ? `${composant.code} — ${libelleProduit(composant)}`
      : l.composantId;
    const type = typeCalculNomenclature(l);
    const overrideQte = ctx.overrides?.quantiteParLigneId?.[l.id];
    const qResolue = quantiteUnitaireResolue(l, nomenclature.lignes, dim);
    const qteForcee =
      typeof overrideQte === "number" && Number.isFinite(overrideQte) && overrideQte >= 0;
    const quantiteIndeterminee =
      !qteForcee && (type === "surface" || type === "perimetre") && !(qResolue > EPS);
    const quantite = qteForcee ? overrideQte : quantiteIndeterminee ? null : qResolue;

    if (composant && produitEstFabrique(composant)) {
      const cascade = coutUnitaireFabrique(
        composant,
        ctx,
        visiting,
        profondeur + 1,
        memo,
      );
      const unit = cascade.total;
      const cout = quantite != null ? quantite * unit : null;
      return {
        ligneId: l.id,
        composantId: l.composantId,
        nom,
        quantite,
        cump: quantiteIndeterminee ? null : unit,
        cout,
        cumpIndisponible: false,
        quantiteIndeterminee,
        source: "cascade" as const,
        cascade,
      };
    }

    const cump = composant ? cumpOuOverride(composant, ctx) : null;
    const cumpIndisponible = cump == null;
    const cout =
      quantite != null && cump != null ? quantite * cump : null;
    return {
      ligneId: l.id,
      composantId: l.composantId,
      nom,
      quantite,
      cump,
      cout,
      cumpIndisponible,
      quantiteIndeterminee,
      source: "cump" as const,
    };
  });

  const totalMatiere = matiere.reduce((s, l) => s + (l.cout ?? 0), 0);
  const partielMatiere = matiere.some(
    (l) =>
      l.quantiteIndeterminee ||
      l.cumpIndisponible ||
      (l.source === "cascade" && l.cascade?.partiel),
  );

  const mod: LigneCoutTheoriqueMod[] = (nomenclature.tempsMod ?? [])
    .filter((t) => t.atelierId && Number(t.heures) > 0)
    .map((t) => {
      const atelier = ctx.ateliers.find((a) => a.id === t.atelierId);
      const taux = tauxAtelierOuOverride(atelier, t.atelierId, ctx.overrides);
      const heures = Number(t.heures) || 0;
      return {
        id: t.id,
        atelierId: t.atelierId,
        atelierNom: atelier?.nom ?? t.atelierId,
        heures,
        tauxHoraire: taux,
        cout: coutMod(heures, taux),
      };
    });
  const totalMod = mod.reduce((s, l) => s + l.cout, 0);
  const bomVide = matiere.length === 0 && mod.length === 0;

  return {
    nomenclatureId: nomenclature.id,
    nomenclatureNom: nomenclature.nom,
    produitId,
    matiere,
    totalMatiere,
    mod,
    totalMod,
    total: totalMatiere + totalMod,
    partiel: partielMatiere || bomVide,
  };
}

export function calculerCoutTheoriqueNomenclature(opts: {
  nomenclature: NomenclatureProduit;
  produits: Produit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
  ateliers: PointDeVente[];
  dims?: DimensionOf;
  overrides?: OverridesCoutTheorique;
  produitId?: string;
}): CoutTheoriqueNomenclature {
  return calculerNomenclatureInterne(
    opts.nomenclature,
    opts.produitId,
    {
      produits: opts.produits,
      entrees: opts.entrees,
      ventes: opts.ventes,
      inventaires: opts.inventaires,
      ateliers: opts.ateliers,
      dims: opts.dims,
      overrides: opts.overrides,
    },
    new Set(opts.produitId ? [opts.produitId] : []),
    0,
    new Map(),
  );
}

export function nomenclatureExigeDimsPourCout(nomenclature: NomenclatureProduit) {
  return nomenclatureExigeDimension(nomenclature.lignes);
}

export function seuilsMargeTheorique(parametres?: Pick<
  Parametres,
  | "seuilMargeTheoriqueAvertissementPercent"
  | "seuilMargeTheoriqueCritiquePercent"
> | null): SeuilsMargeTheorique {
  const avertissement = parametres?.seuilMargeTheoriqueAvertissementPercent;
  const critique = parametres?.seuilMargeTheoriqueCritiquePercent;
  return {
    avertissement:
      typeof avertissement === "number" && Number.isFinite(avertissement)
        ? avertissement
        : 20,
    critique:
      typeof critique === "number" && Number.isFinite(critique) ? critique : 0,
  };
}

export function margeTheorique(cout: number, prixVente: number) {
  if (!(prixVente > EPS)) {
    return { marge: -cout, taux: cout > EPS ? -100 : 0 };
  }
  const marge = prixVente - cout;
  return { marge, taux: (marge / prixVente) * 100 };
}

export function niveauAlerteMargeTheorique(
  taux: number,
  seuils: SeuilsMargeTheorique,
): NiveauAlerteMargeTheorique {
  if (taux <= seuils.critique) return "critique";
  if (taux < seuils.avertissement) return "avertissement";
  return "ok";
}

export function analyserMargeTheorique(
  cout: number,
  prixVente: number,
  parametres?: Parametres | null,
) {
  const seuils = seuilsMargeTheorique(parametres);
  const { marge, taux } = margeTheorique(cout, prixVente);
  return {
    marge,
    taux,
    niveau: niveauAlerteMargeTheorique(taux, seuils),
    seuils,
  };
}

export function produitsEnAlerteMargeTheoriqueVendusAuClient(opts: {
  clientId: string;
  ventes: Vente[];
  produits: Produit[];
  entrees: EntreeStock[];
  inventaires?: Inventaire[];
  ateliers: PointDeVente[];
  parametres?: Parametres | null;
}): ProduitAlerteMargeTheorique[] {
  const alertes = produitsEnAlerteMargeTheorique(opts);
  if (alertes.length === 0) return [];
  const qte = new Map<string, number>();
  for (const v of opts.ventes) {
    if (v.clientId !== opts.clientId) continue;
    qte.set(v.produitId, (qte.get(v.produitId) ?? 0) + v.quantite);
  }
  return alertes
    .filter((a) => (qte.get(a.produit.id) ?? 0) > 0)
    .sort((a, b) => (qte.get(b.produit.id) ?? 0) - (qte.get(a.produit.id) ?? 0));
}

export function produitsEnAlerteMargeTheorique(opts: {
  produits: Produit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
  ateliers: PointDeVente[];
  parametres?: Parametres | null;
}): ProduitAlerteMargeTheorique[] {
  const out: ProduitAlerteMargeTheorique[] = [];
  for (const p of opts.produits) {
    if (!p.actif || !produitEstFabrique(p)) continue;
    if (!(p.prixVenteHT > EPS)) continue;
    const nomenc = nomenclatureStandardDuProduit(p);
    if (!nomenc) continue;
    const cout = calculerCoutTheoriqueNomenclature({
      nomenclature: nomenc,
      produits: opts.produits,
      entrees: opts.entrees,
      ventes: opts.ventes,
      inventaires: opts.inventaires,
      ateliers: opts.ateliers,
      produitId: p.id,
    });
    const analyse = analyserMargeTheorique(cout.total, p.prixVenteHT, opts.parametres);
    if (analyse.niveau === "ok") continue;
    out.push({
      produit: p,
      cout: cout.total,
      prixVente: p.prixVenteHT,
      marge: analyse.marge,
      taux: analyse.taux,
      niveau: analyse.niveau,
      partiel: cout.partiel,
    });
  }
  return out.sort((a, b) => {
    if (a.niveau !== b.niveau) return a.niveau === "critique" ? -1 : 1;
    return a.taux - b.taux;
  });
}

export type ParametreSimulationCump = {
  produitId: string;
  nom: string;
  cumpActuel: number | null;
};

export type ParametreSimulationLigne = {
  ligneId: string;
  nom: string;
  quantiteActuelle: number | null;
};

export type ParametreSimulationAtelier = {
  atelierId: string;
  nom: string;
  tauxActuel: number;
};

export function collecterParametresSimulation(
  cout: CoutTheoriqueNomenclature,
): {
  lignes: ParametreSimulationLigne[];
  cump: ParametreSimulationCump[];
  ateliers: ParametreSimulationAtelier[];
} {
  const lignes: ParametreSimulationLigne[] = [];
  const cumpById = new Map<string, ParametreSimulationCump>();
  const ateliersById = new Map<string, ParametreSimulationAtelier>();

  function walk(node: CoutTheoriqueNomenclature) {
    for (const l of node.matiere) {
      lignes.push({
        ligneId: l.ligneId,
        nom: l.nom,
        quantiteActuelle: l.quantite,
      });
      if (l.source === "cump") {
        if (!cumpById.has(l.composantId)) {
          cumpById.set(l.composantId, {
            produitId: l.composantId,
            nom: l.nom,
            cumpActuel: l.cump,
          });
        }
      }
      if (l.cascade) walk(l.cascade);
    }
    for (const m of node.mod) {
      if (!ateliersById.has(m.atelierId)) {
        ateliersById.set(m.atelierId, {
          atelierId: m.atelierId,
          nom: m.atelierNom,
          tauxActuel: m.tauxHoraire,
        });
      }
    }
  }
  walk(cout);
  return {
    lignes,
    cump: [...cumpById.values()],
    ateliers: [...ateliersById.values()],
  };
}

export function lignesCsvSimulation(opts: {
  produit: string;
  nomenclature: string;
  actuel: CoutTheoriqueNomenclature;
  simule: CoutTheoriqueNomenclature;
  prixActuel: number;
  prixSimule: number;
  margeActuelle: ReturnType<typeof analyserMargeTheorique>;
  margeSimulee: ReturnType<typeof analyserMargeTheorique>;
}): (string | number)[][] {
  return [
    ["Simulation coût théorique"],
    ["Produit", opts.produit],
    ["Nomenclature", opts.nomenclature],
    [],
    ["Indicateur", "Actuel", "Simulé"],
    ["Coût matière", Math.round(opts.actuel.totalMatiere), Math.round(opts.simule.totalMatiere)],
    ["Coût MOD", Math.round(opts.actuel.totalMod), Math.round(opts.simule.totalMod)],
    ["Coût total", Math.round(opts.actuel.total), Math.round(opts.simule.total)],
    ["Prix de vente", Math.round(opts.prixActuel), Math.round(opts.prixSimule)],
    ["Marge", Math.round(opts.margeActuelle.marge), Math.round(opts.margeSimulee.marge)],
    [
      "Taux de marge %",
      opts.margeActuelle.taux.toFixed(1),
      opts.margeSimulee.taux.toFixed(1),
    ],
    ["Alerte", opts.margeActuelle.niveau, opts.margeSimulee.niveau],
    ["Coût partiel", opts.actuel.partiel ? "oui" : "non", opts.simule.partiel ? "oui" : "non"],
  ];
}
