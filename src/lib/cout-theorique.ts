import { etatCumpProduit } from "./cump";
import { coutMod, tauxHoraireModAtelier } from "./fabrication";
import { libelleProduit } from "./produits";
import {
  nomenclatureExigeDimension,
  quantiteUnitaireResolue,
  typeCalculNomenclature,
  type DimensionOf,
} from "./nomenclature-formules";
import type {
  EntreeStock,
  Inventaire,
  NomenclatureProduit,
  PointDeVente,
  Produit,
  Vente,
} from "./types";

const EPS = 1e-9;

export type LigneCoutTheoriqueMatiere = {
  ligneId: string;
  composantId: string;
  nom: string;
  quantite: number | null;
  cump: number | null;
  cout: number | null;
  cumpIndisponible: boolean;
  quantiteIndeterminee: boolean;
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
  matiere: LigneCoutTheoriqueMatiere[];
  totalMatiere: number;
  mod: LigneCoutTheoriqueMod[];
  totalMod: number;
  total: number;
  partiel: boolean;
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

export function calculerCoutTheoriqueNomenclature(opts: {
  nomenclature: NomenclatureProduit;
  produits: Produit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires?: Inventaire[];
  ateliers: PointDeVente[];
  dims?: DimensionOf;
}): CoutTheoriqueNomenclature {
  const { nomenclature, produits, entrees, ventes, inventaires, ateliers, dims } =
    opts;
  const dim = dims ?? {};
  const matiere: LigneCoutTheoriqueMatiere[] = nomenclature.lignes.map((l) => {
    const composant = produits.find((p) => p.id === l.composantId);
    const nom = composant
      ? `${composant.code} — ${libelleProduit(composant)}`
      : l.composantId;
    const type = typeCalculNomenclature(l);
    const q = quantiteUnitaireResolue(l, nomenclature.lignes, dim);
    const quantiteIndeterminee =
      (type === "surface" || type === "perimetre") && !(q > EPS);
    const quantite = quantiteIndeterminee ? null : q;
    const cump = composant
      ? cumpActuelComposant({
          produit: composant,
          entrees,
          ventes,
          inventaires,
        })
      : null;
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
    };
  });

  const totalMatiere = matiere.reduce((s, l) => s + (l.cout ?? 0), 0);
  const partiel = matiere.some(
    (l) => l.cumpIndisponible || l.quantiteIndeterminee,
  );

  const mod: LigneCoutTheoriqueMod[] = (nomenclature.tempsMod ?? [])
    .filter((t) => t.atelierId && Number(t.heures) > 0)
    .map((t) => {
      const atelier = ateliers.find((a) => a.id === t.atelierId);
      const taux = tauxHoraireModAtelier(atelier);
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

  return {
    nomenclatureId: nomenclature.id,
    nomenclatureNom: nomenclature.nom,
    matiere,
    totalMatiere,
    mod,
    totalMod,
    total: totalMatiere + totalMod,
    partiel,
  };
}

export function nomenclatureExigeDimsPourCout(nomenclature: NomenclatureProduit) {
  return nomenclatureExigeDimension(nomenclature.lignes);
}
