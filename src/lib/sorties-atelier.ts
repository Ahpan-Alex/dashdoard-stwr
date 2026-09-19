import type {
  EntreeStock,
  MotifSortieAtelier,
  Produit,
  SortieAtelier,
} from "./types";

export const MOTIFS_SORTIE_ATELIER_DEFAUT: { id: string; libelle: string }[] = [
  { id: "msa-lame", libelle: "Remplacement lame" },
  { id: "msa-entretien", libelle: "Entretien machine" },
  { id: "msa-consommable", libelle: "Consommable production" },
  { id: "msa-ampoule", libelle: "Ampoule / éclairage" },
  { id: "msa-autre", libelle: "Autre" },
];

export function seedMotifsSortieAtelier(): MotifSortieAtelier[] {
  return MOTIFS_SORTIE_ATELIER_DEFAUT.map((m, i) => ({
    id: m.id,
    libelle: m.libelle,
    ordre: i + 1,
    actif: true,
  }));
}

export function fusionnerMotifsSortieAtelier(
  existing?: MotifSortieAtelier[] | null,
) {
  if (existing == null || existing.length === 0) return seedMotifsSortieAtelier();
  return existing;
}

export function motifsSortieAtelierTries(motifs: MotifSortieAtelier[]) {
  return [...motifs].sort(
    (a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr"),
  );
}

export function motifsSortieAtelierActifs(motifs: MotifSortieAtelier[]) {
  return motifsSortieAtelierTries(motifs).filter((m) => m.actif);
}

export function libelleMotifSortieAtelier(
  motifs: MotifSortieAtelier[] | undefined,
  id: string | undefined,
  fallback?: string,
) {
  if (!id) return fallback?.trim() || "—";
  const m = (motifs ?? []).find((x) => x.id === id);
  return m?.libelle ?? fallback?.trim() ?? id;
}

export function entreesDepuisSortiesAtelier(
  sorties: SortieAtelier[],
  produits: Produit[],
): EntreeStock[] {
  return sorties.map((s) => {
    const p = produits.find((x) => x.id === s.produitId);
    return {
      id: `ent-sat-${s.id}`,
      pointDeVenteId: s.siteSourceId,
      produitId: s.produitId,
      quantite: -Math.abs(s.quantite),
      prixAchatUnitaire: s.cumpSortie,
      prixVenteUnitaire: p?.prixVenteHT ?? 0,
      fournisseur: "Sortie atelier",
      date: s.date,
      origine: "sortie_atelier" as const,
      sortieAtelierId: s.id,
      note: s.motif,
    };
  });
}

export function regenererEntreesSortiesAtelier(
  entrees: EntreeStock[],
  sorties: SortieAtelier[],
  produits: Produit[],
): EntreeStock[] {
  const hors = entrees.filter((e) => e.origine !== "sortie_atelier");
  return [...hors, ...entreesDepuisSortiesAtelier(sorties, produits)];
}

export function coutConsommablesAtelierPeriode(
  sorties: SortieAtelier[],
  atelierId: string,
  dansPeriode: (dateIso: string) => boolean,
) {
  return sorties
    .filter((s) => s.atelierId === atelierId && dansPeriode(s.date))
    .reduce((acc, s) => acc + (Number(s.valeur) || 0), 0);
}

export function motifSortieAtelierInvalide(
  libelle: string,
  motifs: MotifSortieAtelier[],
  ignoreId?: string,
) {
  const l = libelle.trim();
  if (!l) return "Indiquez un libellé.";
  const norm = l.toLocaleLowerCase("fr");
  const doublon = motifs.find(
    (m) =>
      m.id !== ignoreId && m.libelle.trim().toLocaleLowerCase("fr") === norm,
  );
  if (doublon) return `Le motif « ${doublon.libelle} » existe déjà.`;
  return null;
}
