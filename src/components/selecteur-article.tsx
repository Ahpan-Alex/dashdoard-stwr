"use client";

import { useMemo, useState } from "react";
import { categoriesPresentesDansCatalogue, filtrerCatalogue, libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import type { Produit } from "@/lib/types";

function libelleOption(p: Produit) {
  return `${p.code || "Sans code"} — ${libelleProduit(p) || "Sans libellé"}`;
}

export function SelecteurArticle({
  produits,
  value,
  onChange,
  label = "Article",
  allowEmpty = false,
  emptyLabel = "— Choisir —",
  compact = false,
}: {
  produits: Produit[];
  value: string;
  onChange: (produitId: string) => void;
  label?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  compact?: boolean;
}) {
  const categoriesBrutes = useStore((s) => s.categoriesProduits);
  const categories = Array.isArray(categoriesBrutes) ? categoriesBrutes : [];
  const catalogue = Array.isArray(produits) ? produits : [];
  const [familleId, setFamilleId] = useState("");
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState(false);

  const racines = useMemo(
    () =>
      categoriesPresentesDansCatalogue(categories, catalogue)
        .filter((c) => c && !c.parentId)
        .sort(
          (a, b) =>
            (Number(a.ordre) || 0) - (Number(b.ordre) || 0) ||
            String(a.libelle ?? "").localeCompare(String(b.libelle ?? ""), "fr"),
        ),
    [categories, catalogue],
  );

  const filtrees = useMemo(
    () => filtrerCatalogue(catalogue, { familleId, recherche, categories }),
    [catalogue, familleId, recherche, categories],
  );

  const courant = catalogue.find((p) => p?.id === value);
  const optionsBrutes =
    courant && !filtrees.some((p) => p?.id === courant.id)
      ? [courant, ...filtrees]
      : filtrees;
  const options = optionsBrutes.filter((p) => p?.id);
  const limite = 250;
  const trop = options.length > limite;
  const vis = trop ? options.slice(0, limite) : options;
  const visibles =
    courant && !vis.some((p) => p.id === courant.id)
      ? [courant, ...vis.filter((p) => p.id !== courant.id)]
      : vis;

  const listeOuverte = ouvert || Boolean(recherche.trim()) || Boolean(familleId);
  const optionsPourSelect = listeOuverte ? visibles : courant ? [courant] : [];
  const famillesEnSelect = compact || racines.length > 12;

  return (
    <div className="space-y-2">
      {label && !compact && (
        <p className="text-xs font-semibold text-muted">{label}</p>
      )}
      {!compact && famillesEnSelect && racines.length > 0 && (
        <select
          className="select w-full"
          value={familleId}
          onChange={(e) => setFamilleId(e.target.value)}
          onFocus={() => setOuvert(true)}
        >
          <option value="">Toutes les familles</option>
          {racines.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle || "Famille"}
            </option>
          ))}
        </select>
      )}
      {!compact && !famillesEnSelect && (
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
      )}
      <input
        className="input"
        placeholder="Recherche par code ou libellé…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        onFocus={() => setOuvert(true)}
      />
      <select
        className="select w-full"
        value={value}
        onFocus={() => setOuvert(true)}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {optionsPourSelect.map((p) => (
          <option key={p.id} value={p.id}>
            {libelleOption(p)}
          </option>
        ))}
      </select>
      {listeOuverte && trop && (
        <p className="text-xs text-muted">
          {options.length} articles — affinez la famille ou la recherche pour voir les
          suivants.
        </p>
      )}
      {listeOuverte && options.length === 0 && (
        <p className="text-xs text-muted">
          Aucun article pour ce filtre. Élargissez la famille ou la recherche.
        </p>
      )}
    </div>
  );
}
