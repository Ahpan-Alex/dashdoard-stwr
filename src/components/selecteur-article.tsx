"use client";

import { useMemo, useState } from "react";
import { filtrerCatalogue, libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import type { Produit } from "@/lib/types";

export function SelecteurArticle({
  produits,
  value,
  onChange,
  label = "Article",
  allowEmpty = false,
  emptyLabel = "— Choisir —",
}: {
  produits: Produit[];
  value: string;
  onChange: (produitId: string) => void;
  label?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const categories = useStore((s) => s.categoriesProduits);
  const [familleId, setFamilleId] = useState("");
  const [recherche, setRecherche] = useState("");

  const racines = useMemo(
    () =>
      categories
        .filter((c) => c.actif && !c.parentId)
        .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr")),
    [categories],
  );

  const filtrees = useMemo(
    () => filtrerCatalogue(produits, { familleId, recherche, categories }),
    [produits, familleId, recherche, categories],
  );

  const courant = produits.find((p) => p.id === value);
  const options =
    courant && !filtrees.some((p) => p.id === courant.id)
      ? [courant, ...filtrees]
      : filtrees;

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold text-muted">{label}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`btn ${familleId === "" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFamilleId("")}
        >
          Toutes les familles
        </button>
        {racines.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`btn ${familleId === c.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFamilleId(c.id)}
          >
            {c.libelle}
          </button>
        ))}
      </div>
      <input
        className="input"
        placeholder="Recherche par code ou libellé…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />
      <select
        className="select w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} — {libelleProduit(p)}
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="text-xs text-muted">
          Aucun article pour ce filtre. Élargissez la famille ou la recherche.
        </p>
      )}
    </div>
  );
}
