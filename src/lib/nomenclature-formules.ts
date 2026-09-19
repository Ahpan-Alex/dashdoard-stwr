import type {
  Commande,
  NomenclatureLigne,
  OfNomenclatureLigne,
  TypeCalculNomenclature,
} from "./types";

const EPS = 1e-9;

export const TYPE_CALCUL_NOMENCLATURE_LABELS: Record<TypeCalculNomenclature, string> = {
  fixe: "Fixe",
  surface: "Proportionnel à la surface",
  perimetre: "Proportionnel au périmètre",
  ratio_pivot: "Ratio d'un pivot",
};

export function typeCalculNomenclature(
  l: Pick<NomenclatureLigne, "typeCalcul"> | Pick<OfNomenclatureLigne, "typeCalcul">,
): TypeCalculNomenclature {
  return l.typeCalcul ?? "fixe";
}

export function nomenclatureExigeDimension(
  lignes: { typeCalcul?: TypeCalculNomenclature }[],
) {
  return lignes.some((l) => {
    const t = typeCalculNomenclature(l);
    return t === "surface" || t === "perimetre";
  });
}

export function dimensionValide(largeur?: number, hauteur?: number) {
  return (Number(largeur) || 0) > 0 && (Number(hauteur) || 0) > 0;
}

export function surfaceVenteM2(largeur?: number, hauteur?: number) {
  if (!dimensionValide(largeur, hauteur)) return 0;
  return Number(largeur) * Number(hauteur);
}

export function perimetreVenteM(largeur?: number, hauteur?: number) {
  if (!dimensionValide(largeur, hauteur)) return 0;
  return 2 * (Number(largeur) + Number(hauteur));
}

export function motifDimensionNomenclatureManquante(
  lignes: { typeCalcul?: TypeCalculNomenclature }[],
  largeur?: number,
  hauteur?: number,
) {
  if (!nomenclatureExigeDimension(lignes)) return null;
  if (dimensionValide(largeur, hauteur)) return null;
  return "La nomenclature contient une ligne proportionnelle à la surface ou au périmètre : saisissez la largeur et la hauteur de l'unité à fabriquer (mètres).";
}

export function motifNomenclatureFormules(
  lignes: NomenclatureLigne[],
): string | null {
  const byId = new Map(lignes.map((l) => [l.id, l]));
  for (const l of lignes) {
    if (!l.composantId) continue;
    const t = typeCalculNomenclature(l);
    if (t === "fixe" && !(l.quantite > 0)) continue;
    if ((t === "surface" || t === "perimetre") && !(Number(l.taux) > 0)) {
      return "Indiquez une consommation (taux) positive pour les lignes surface / périmètre.";
    }
    if (t === "ratio_pivot") {
      if (!(Number(l.pourcentage) > 0)) {
        return "Indiquez un pourcentage positif pour une ligne ratio d'un pivot.";
      }
      if (!l.lignePivotId) {
        return "Chaque ligne ratio doit désigner un pivot dans la même nomenclature.";
      }
      const pivot = byId.get(l.lignePivotId);
      if (!pivot || pivot.id === l.id) {
        return "Le pivot d'une ligne ratio est introuvable dans cette nomenclature.";
      }
      if (typeCalculNomenclature(pivot) === "ratio_pivot") {
        return "Un ratio ne peut pas s'appuyer sur un autre ratio (référence circulaire).";
      }
    }
  }
  return null;
}

export function motifNomenclaturesProduit(
  nomenclatures: { lignes: NomenclatureLigne[] }[] | undefined,
) {
  for (const n of nomenclatures ?? []) {
    const m = motifNomenclatureFormules(n.lignes);
    if (m) return m;
  }
  return null;
}

export type DimensionOf = { largeur?: number; hauteur?: number };

/** Quantité de composant pour 1 unité de produit, selon la formule de la ligne. */
export function quantiteUnitaireResolue(
  ligne: NomenclatureLigne | OfNomenclatureLigne,
  toutes: (NomenclatureLigne | OfNomenclatureLigne)[],
  dims: DimensionOf,
  cache?: Map<string, number>,
): number {
  const memo = cache ?? new Map<string, number>();
  if (memo.has(ligne.id)) return memo.get(ligne.id)!;
  const t = typeCalculNomenclature(ligne);
  let q = 0;
  if (t === "fixe") {
    if ("quantiteUnitaire" in ligne) {
      q = Number(ligne.quantiteUnitaire) || 0;
    } else {
      q = Number(ligne.quantite) || 0;
    }
  } else if (t === "surface") {
    q = surfaceVenteM2(dims.largeur, dims.hauteur) * (Number(ligne.taux) || 0);
  } else if (t === "perimetre") {
    q = perimetreVenteM(dims.largeur, dims.hauteur) * (Number(ligne.taux) || 0);
  } else if (t === "ratio_pivot") {
    const pivot = toutes.find((x) => x.id === ligne.lignePivotId);
    if (pivot && typeCalculNomenclature(pivot) !== "ratio_pivot") {
      const base = quantiteUnitaireResolue(pivot, toutes, dims, memo);
      q = (Number(ligne.pourcentage) || 0) / 100 * base;
    }
  }
  if (!(q > 0)) q = 0;
  memo.set(ligne.id, q);
  return q;
}

export function libelleFormuleNomenclature(
  ligne: NomenclatureLigne | OfNomenclatureLigne,
  toutes: (NomenclatureLigne | OfNomenclatureLigne)[],
  dims: DimensionOf,
  nomPivot?: string,
): string {
  const t = typeCalculNomenclature(ligne);
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
  const q = quantiteUnitaireResolue(ligne, toutes, dims);
  if (t === "fixe") {
    return `Fixe : ${fmt(q)} / unité`;
  }
  if (t === "surface") {
    const s = surfaceVenteM2(dims.largeur, dims.hauteur);
    const taux = Number(ligne.taux) || 0;
    if (s <= 0) {
      return `Surface : ${fmt(taux)} × L×H (dimension manquante)`;
    }
    return `Surface : ${fmt(dims.largeur!)} × ${fmt(dims.hauteur!)} m × ${fmt(taux)} = ${fmt(q)} / unité`;
  }
  if (t === "perimetre") {
    const p = perimetreVenteM(dims.largeur, dims.hauteur);
    const taux = Number(ligne.taux) || 0;
    if (p <= 0) {
      return `Périmètre : ${fmt(taux)} × 2×(L+H) (dimension manquante)`;
    }
    return `Périmètre : 2×(${fmt(dims.largeur!)}+${fmt(dims.hauteur!)}) m × ${fmt(taux)} = ${fmt(q)} / unité`;
  }
  const pct = Number(ligne.pourcentage) || 0;
  const pivot = toutes.find((x) => x.id === ligne.lignePivotId);
  const base = pivot ? quantiteUnitaireResolue(pivot, toutes, dims) : 0;
  return `Ratio : ${fmt(pct)} % × ${nomPivot ?? "pivot"} (${fmt(base)}) = ${fmt(q)} / unité`;
}

export function resoudreLignesNomenclatureOf(
  lignes: OfNomenclatureLigne[],
  dims: DimensionOf,
  nomComposant?: (id: string) => string,
): OfNomenclatureLigne[] {
  const cache = new Map<string, number>();
  const independantes = lignes.filter((l) => typeCalculNomenclature(l) !== "ratio_pivot");
  const ratios = lignes.filter((l) => typeCalculNomenclature(l) === "ratio_pivot");
  const ordre = [...independantes, ...ratios];
  const resolved = new Map<string, OfNomenclatureLigne>();
  for (const l of ordre) {
    const q = quantiteUnitaireResolue(l, lignes, dims, cache);
    const pivot = lignes.find((x) => x.id === l.lignePivotId);
    resolved.set(l.id, {
      ...l,
      quantiteUnitaire: q,
      formuleLibelle: libelleFormuleNomenclature(
        l,
        lignes,
        dims,
        pivot ? nomComposant?.(pivot.composantId) : undefined,
      ),
    });
  }
  return lignes.map((l) => resolved.get(l.id) ?? l);
}

export function champsFormuleNomenclature(
  l: NomenclatureLigne,
): Pick<NomenclatureLigne, "typeCalcul" | "taux" | "pourcentage" | "lignePivotId"> {
  const t = typeCalculNomenclature(l);
  return {
    typeCalcul: t === "fixe" ? undefined : t,
    taux: t === "surface" || t === "perimetre" ? l.taux : undefined,
    pourcentage: t === "ratio_pivot" ? l.pourcentage : undefined,
    lignePivotId: t === "ratio_pivot" ? l.lignePivotId : undefined,
  };
}

export function dimensionDepuisCommande(
  commande: Pick<Commande, "lignes"> | undefined,
  produitId: string,
): { largeur: number; hauteur: number } | null {
  if (!commande) return null;
  const candidates = commande.lignes.filter(
    (l) => (l.type ?? "produit") === "produit" && l.produitId === produitId,
  );
  const pool = candidates.length > 0 ? candidates : commande.lignes;
  for (const l of pool) {
    const largeur = Number(l.largeurM);
    const hauteur = Number(l.hauteurM);
    if (largeur > EPS && hauteur > EPS) return { largeur, hauteur };
  }
  return null;
}
