import { createId } from "./id";
import { natureStockDuProduit, produitEstFabrique } from "./nature-stock";
import {
  champsFormuleNomenclature,
  motifNomenclatureFormules,
  typeCalculNomenclature,
} from "./nomenclature-formules";
import type {
  NomenclatureLigne,
  NomenclatureProduit,
  Produit,
  TypeNomenclature,
} from "./types";

export const NOM_NOMENCLATURE_STANDARD = "Nomenclature standard";

export function nomenclaturesDuProduit(
  produit: Pick<Produit, "nomenclatures" | "natureStock"> | undefined,
): NomenclatureProduit[] {
  if (!produit || !produitEstFabrique(produit)) return [];
  const list = produit.nomenclatures ?? [];
  const auto = list.find((n) => n.type === "automatique");
  const alt = list.find((n) => n.type === "alternative");
  const out: NomenclatureProduit[] = [
    auto ?? {
      id: "nomenc-auto",
      type: "automatique",
      nom: NOM_NOMENCLATURE_STANDARD,
      lignes: [],
    },
  ];
  if (alt) out.push(alt);
  return out.slice(0, 2);
}

export function nomenclatureParType(
  produit: Pick<Produit, "nomenclatures" | "natureStock">,
  type: TypeNomenclature,
): NomenclatureProduit | undefined {
  return nomenclaturesDuProduit(produit).find((n) => n.type === type);
}

export function normaliserNomenclatures(
  nomenclatures: NomenclatureProduit[] | undefined,
  natureFabriquee: boolean,
): NomenclatureProduit[] | undefined {
  if (!natureFabriquee) return undefined;
  const list = nomenclatures ?? [];
  const autoRaw = list.find((n) => n.type === "automatique") ?? list[0];
  const altRaw = list.find((n) => n.type === "alternative");
  const auto: NomenclatureProduit = {
    id: autoRaw?.id || createId("nomenc"),
    type: "automatique",
    nom: NOM_NOMENCLATURE_STANDARD,
    lignes: nettoyerLignes(autoRaw?.lignes ?? []),
  };
  const out: NomenclatureProduit[] = [auto];
  if (altRaw) {
    const nom = altRaw.nom.trim() || "Nomenclature alternative";
    out.push({
      id: altRaw.id || createId("nomenc"),
      type: "alternative",
      nom,
      lignes: nettoyerLignes(altRaw.lignes),
    });
  }
  return out;
}

function nettoyerLignes(lignes: NomenclatureLigne[]): NomenclatureLigne[] {
  const seen = new Set<string>();
  const independantes: NomenclatureLigne[] = [];
  const ratios: NomenclatureLigne[] = [];
  for (const l of lignes) {
    if (!l.composantId) continue;
    if (seen.has(l.composantId)) continue;
    const t = typeCalculNomenclature(l);
    if (t === "fixe" && !(l.quantite > 0)) continue;
    if ((t === "surface" || t === "perimetre") && !(Number(l.taux) > 0)) continue;
    if (t === "ratio_pivot") {
      if (!(Number(l.pourcentage) > 0) || !l.lignePivotId) continue;
      seen.add(l.composantId);
      ratios.push({
        id: l.id || createId("nl"),
        composantId: l.composantId,
        quantite: Number(l.quantite) || 0,
        ...champsFormuleNomenclature({ ...l, typeCalcul: t }),
      });
      continue;
    }
    seen.add(l.composantId);
    independantes.push({
      id: l.id || createId("nl"),
      composantId: l.composantId,
      quantite: t === "fixe" ? l.quantite : Number(l.quantite) || 0,
      ...champsFormuleNomenclature({ ...l, typeCalcul: t }),
    });
  }
  const ratiosOk = ratios.filter((l) => {
    const pivot = independantes.find((p) => p.id === l.lignePivotId);
    return pivot && typeCalculNomenclature(pivot) !== "ratio_pivot";
  });
  const out = [...independantes, ...ratiosOk];
  if (motifNomenclatureFormules(out)) {
    return independantes;
  }
  return out;
}

export function quantiteTheoriqueComposant(
  lignes: { composantId: string; quantiteUnitaire?: number; quantite?: number }[],
  composantId: string,
  quantiteProduit: number,
) {
  const ligne = lignes.find((l) => l.composantId === composantId);
  const qUnit = ligne?.quantiteUnitaire ?? ligne?.quantite ?? 0;
  return qUnit * quantiteProduit;
}

/** Détecte un cycle A ⊂ B ⊂ A dans les nomenclatures. */
export function cycleNomenclature(
  produitId: string,
  nomenclatures: NomenclatureProduit[],
  tousProduits: Produit[],
): string | null {
  const byId = new Map(tousProduits.map((p) => [p.id, p]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(id: string, chemin: string[]): string | null {
    if (visiting.has(id)) {
      return `Cycle de nomenclature : ${[...chemin, libelle(id)].join(" → ")}`;
    }
    if (visited.has(id)) return null;
    visiting.add(id);
    const p = byId.get(id);
    const nomencls =
      id === produitId ? nomenclatures : (p?.nomenclatures ?? []);
    for (const nom of nomencls) {
      for (const l of nom.lignes) {
        const err = walk(l.composantId, [...chemin, libelle(id)]);
        if (err) return err;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return null;
  }

  function libelle(id: string) {
    const p = byId.get(id);
    return p ? p.code : id;
  }

  return walk(produitId, []);
}

export function motifComposantBomInvalide(
  composant: Produit | undefined,
  parentId: string,
): string | null {
  if (!composant) return "Composant introuvable.";
  if (composant.id === parentId) {
    return "Un produit ne peut pas être composant de sa propre nomenclature.";
  }
  if (natureStockDuProduit(composant) === "fini") {
    return "Un produit fini ne peut pas servir de composant. Utilisez un semi-fini ou une matière première.";
  }
  return null;
}
