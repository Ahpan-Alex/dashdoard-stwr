"use client";

import { useMemo } from "react";
import {
  analyserMargeTheorique,
  calculerCoutTheoriqueNomenclature,
  type NiveauAlerteMargeTheorique,
} from "@/lib/cout-theorique";
import { nomenclatureStandardDuProduit } from "@/lib/nomenclature";
import { formatPercent } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Produit } from "@/lib/types";

export function BadgeMargeTheorique({
  niveau,
  taux,
  compact = false,
}: {
  niveau: NiveauAlerteMargeTheorique;
  taux: number;
  compact?: boolean;
}) {
  const label =
    niveau === "critique"
      ? compact
        ? "Marge critique"
        : `Marge critique ${formatPercent(taux / 100)}`
      : niveau === "avertissement"
        ? compact
          ? "Marge faible"
          : `Marge faible ${formatPercent(taux / 100)}`
        : compact
          ? "Marge"
          : `Marge ${formatPercent(taux / 100)}`;
  const cls =
    niveau === "critique"
      ? "bg-red-100 text-red-800"
      : niveau === "avertissement"
        ? "bg-amber-100 text-amber-900"
        : "bg-emerald-50 text-emerald-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

export function BadgeMargeFiche({ produit }: { produit: Produit }) {
  const produits = useStore((s) => s.produits);
  const entrees = useStore((s) => s.entrees);
  const ventes = useStore((s) => s.ventes);
  const inventaires = useStore((s) => s.inventaires);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const parametres = useStore((s) => s.parametres);
  const analyse = useMemo(() => {
    if (!(produit.prixVenteHT > 0)) return null;
    const nomenc = nomenclatureStandardDuProduit(produit);
    if (!nomenc) return null;
    const cout = calculerCoutTheoriqueNomenclature({
      nomenclature: nomenc,
      produits,
      entrees,
      ventes,
      inventaires,
      ateliers: pointsDeVente,
      produitId: produit.id,
    });
    return analyserMargeTheorique(cout.total, produit.prixVenteHT, parametres);
  }, [
    produit,
    produits,
    entrees,
    ventes,
    inventaires,
    pointsDeVente,
    parametres,
  ]);
  if (!analyse || analyse.niveau === "ok") return null;
  return (
    <span className="ml-2 align-middle">
      <BadgeMargeTheorique niveau={analyse.niveau} taux={analyse.taux} compact />
    </span>
  );
}
