"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Ban, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import {
  USAGE_COMMERCIAL_FAMILLE_LABELS,
  USAGES_COMMERCIAUX,
  estUsageCommercial,
  usageCommercialDeLaFamille,
} from "@/lib/nature-stock";
import {
  MAX_PROFONDEUR_CATEGORIE,
  categoriesEnArbre,
  cheminCategorie,
  libelleNiveauCategorie,
  normalizeCodeProduit,
  profondeurCategorie,
} from "@/lib/produits";
import { useStore } from "@/lib/store";
import type { CategorieProduit, UsageCommercialProduit } from "@/lib/types";

const FORM_VIDE = {
  code: "",
  libelle: "",
  parentId: "",
  usageCommercial: "achat_vente" as UsageCommercialProduit,
};

export default function ParametresFamillesPage() {
  const {
    produits,
    categoriesProduits,
    addCategorieProduit,
    updateCategorieProduit,
    deleteCategorieProduit,
  } = useStore();

  const arbreCategories = useMemo(
    () => categoriesEnArbre(categoriesProduits),
    [categoriesProduits],
  );
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState(FORM_VIDE);

  const parentsPossibles = useMemo(() => {
    const descendants = new Set<string>();
    if (editingCatId) {
      const stack = [editingCatId];
      while (stack.length) {
        const id = stack.pop()!;
        for (const c of categoriesProduits) {
          if (c.parentId === id && !descendants.has(c.id)) {
            descendants.add(c.id);
            stack.push(c.id);
          }
        }
      }
      descendants.add(editingCatId);
    }
    return categoriesProduits.filter((c) => {
      if (!c.actif) return false;
      if (descendants.has(c.id)) return false;
      return (
        profondeurCategorie(c.id, categoriesProduits) < MAX_PROFONDEUR_CATEGORIE
      );
    });
  }, [categoriesProduits, editingCatId]);

  const niveauNouveau =
    catForm.parentId === ""
      ? 0
      : profondeurCategorie(catForm.parentId, categoriesProduits) + 1;

  const categorieEnEdition = editingCatId
    ? categoriesProduits.find((c) => c.id === editingCatId)
    : undefined;

  function familleLieeAProduit(categorieId: string) {
    return produits.some((p) => p.categorieId === categorieId);
  }

  function usageFamille(categorieId: string) {
    return usageCommercialDeLaFamille(categorieId, categoriesProduits);
  }

  function annulerEdition() {
    setEditingCatId(null);
    setCatForm(FORM_VIDE);
  }

  function demarrerEdition(cat: CategorieProduit) {
    setEditingCatId(cat.id);
    setCatForm({
      code: cat.code,
      libelle: cat.libelle,
      parentId: cat.parentId ?? "",
      usageCommercial: usageFamille(cat.id),
    });
    document
      .getElementById("fiche-famille")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const code = normalizeCodeProduit(catForm.code);
    const libelle = catForm.libelle.trim();
    if (!code || !libelle) return;
    if (niveauNouveau > MAX_PROFONDEUR_CATEGORIE) {
      alert(
        "Maximum 3 niveaux : famille › sous-famille › sous-sous-famille.",
      );
      return;
    }
    if (
      categoriesProduits.some(
        (c) =>
          c.id !== editingCatId && normalizeCodeProduit(c.code) === code,
      )
    ) {
      alert("Ce code de famille existe déjà.");
      return;
    }

    if (editingCatId) {
      const liee = familleLieeAProduit(editingCatId);
      if (liee) {
        updateCategorieProduit(editingCatId, {
          libelle,
          usageCommercial: catForm.usageCommercial,
        });
      } else {
        updateCategorieProduit(editingCatId, {
          code,
          libelle,
          parentId: catForm.parentId || undefined,
          usageCommercial: catForm.usageCommercial,
        });
      }
      annulerEdition();
      return;
    }

    addCategorieProduit({
      code,
      libelle,
      parentId: catForm.parentId || undefined,
      ordre: categoriesProduits.length + 1,
      actif: true,
      usageCommercial: catForm.usageCommercial,
    });
    setCatForm(FORM_VIDE);
  }

  const structureVerrouillee = Boolean(
    editingCatId && familleLieeAProduit(editingCatId),
  );

  return (
    <div>
      <PageHeader
        title="Familles"
        description="Familles, sous-familles et sous-sous-familles. Les fiches articles se rattachent ensuite à une feuille."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <div
        className="mb-6 rounded-[var(--radius)] border border-line bg-card p-4"
        id="fiche-famille"
      >
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
            {editingCatId
              ? `Modifier la famille${categorieEnEdition ? ` · ${categorieEnEdition.code}` : ""}`
              : "Nouvelle famille"}
          </p>
          {editingCatId && (
            <IconButton label="Annuler la modification" onClick={annulerEdition}>
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
        <p className="mb-4 text-xs text-muted">
          Jusqu&apos;à 3 niveaux : famille › sous-famille › sous-sous-famille.
          Le circuit commercial (acheté / vendu / les deux) s&apos;applique aux
          produits de la famille et de ses descendants. Code et parent ne sont
          plus modifiables une fois un produit rattaché.
        </p>

        <form onSubmit={onSubmit} className="mb-4 grid gap-3 sm:grid-cols-4">
          <label className="block text-xs font-semibold text-muted">
            Code *
            <input
              className="input mt-1 font-mono uppercase"
              placeholder="ex. VIN"
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
              disabled={structureVerrouillee}
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Libellé *
            <input
              className="input mt-1"
              placeholder="ex. Vinyle adhésif"
              value={catForm.libelle}
              onChange={(e) =>
                setCatForm({ ...catForm, libelle: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Parent (niveau supérieur)
            <select
              className="select mt-1"
              value={catForm.parentId}
              disabled={structureVerrouillee}
              onChange={(e) => {
                const parentId = e.target.value;
                setCatForm({
                  ...catForm,
                  parentId,
                  usageCommercial: usageCommercialDeLaFamille(
                    parentId || undefined,
                    categoriesProduits,
                  ),
                });
              }}
            >
              <option value="">— Aucun = famille racine —</option>
              {parentsPossibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {cheminCategorie(c.id, categoriesProduits)} →{" "}
                  {libelleNiveauCategorie(
                    profondeurCategorie(c.id, categoriesProduits) + 1,
                  )}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Articles de la famille *
            <select
              className="select mt-1"
              value={catForm.usageCommercial}
              required
              onChange={(e) =>
                setCatForm({
                  ...catForm,
                  usageCommercial: e.target.value as UsageCommercialProduit,
                })
              }
            >
              {USAGES_COMMERCIAUX.map((u) => (
                <option key={u} value={u}>
                  {USAGE_COMMERCIAL_FAMILLE_LABELS[u]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] font-normal">
              Indique si la famille contient des articles achetés, vendus, ou
              les deux. Les produits rattachés suivent ce choix.
            </span>
          </label>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-4">
            <button type="submit" className="btn btn-secondary">
              {editingCatId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Enregistrer la famille
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Ajouter une {libelleNiveauCategorie(niveauNouveau).toLowerCase()}
                </>
              )}
            </button>
            {editingCatId && (
              <button type="button" className="btn btn-ghost" onClick={annulerEdition}>
                Annuler
              </button>
            )}
          </div>
        </form>

        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Code</th>
                <th>Libellé / chemin</th>
                <th>Articles</th>
                <th>Produits</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {arbreCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-sm text-muted">
                    Aucune famille. Créez d&apos;abord une famille racine.
                  </td>
                </tr>
              ) : (
                arbreCategories.map(({ cat, depth }) => {
                  const nbProduits = produits.filter(
                    (p) => p.categorieId === cat.id,
                  ).length;
                  const nbEnfants = categoriesProduits.filter(
                    (c) => c.parentId === cat.id,
                  ).length;
                  return (
                    <tr
                      key={cat.id}
                      className={
                        editingCatId === cat.id
                          ? "bg-sea-100/80"
                          : !cat.actif
                            ? "opacity-60"
                            : undefined
                      }
                    >
                      <td>
                        <span className="badge badge-sand">
                          {libelleNiveauCategorie(depth)}
                        </span>
                      </td>
                      <td className="font-mono text-xs font-semibold">
                        {cat.code}
                      </td>
                      <td>
                        <span
                          className="font-medium"
                          style={{ paddingLeft: `${depth * 1.25}rem` }}
                        >
                          {depth > 0 ? "└ " : ""}
                          {cat.libelle}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {cheminCategorie(cat.id, categoriesProduits)}
                        </span>
                      </td>
                      <td className="text-xs">
                        {USAGE_COMMERCIAL_FAMILLE_LABELS[usageFamille(cat.id)]}
                        {!estUsageCommercial(cat.usageCommercial) &&
                        cat.parentId ? (
                          <span className="mt-0.5 block text-[11px] text-muted">
                            Hérité
                          </span>
                        ) : null}
                      </td>
                      <td className="text-xs text-muted">
                        {nbProduits > 0
                          ? `${nbProduits} prod.`
                          : nbEnfants > 0
                            ? `${nbEnfants} sous-fam.`
                            : "—"}
                      </td>
                      <td>
                        <span
                          className={`badge ${cat.actif ? "badge-sea" : "badge-sand"}`}
                        >
                          {cat.actif ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <IconButton
                            label={
                              nbProduits > 0
                                ? "Modifier le circuit (code et parent verrouillés)"
                                : "Modifier cette famille"
                            }
                            onClick={() => demarrerEdition(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          {cat.actif ? (
                            <IconButton
                              label="Désactiver cette famille"
                              onClick={() =>
                                updateCategorieProduit(cat.id, { actif: false })
                              }
                            >
                              <Ban className="h-4 w-4" />
                            </IconButton>
                          ) : (
                            <IconButton
                              label="Réactiver cette famille"
                              onClick={() =>
                                updateCategorieProduit(cat.id, { actif: true })
                              }
                            >
                              <RotateCcw className="h-4 w-4" />
                            </IconButton>
                          )}
                          <IconButton
                            label="Supprimer cette famille"
                            onClick={() => {
                              if (
                                !confirm(
                                  `Supprimer la ${libelleNiveauCategorie(depth).toLowerCase()} « ${cat.libelle} » ?`,
                                )
                              ) {
                                return;
                              }
                              const res = deleteCategorieProduit(cat.id);
                              if (!res.ok) alert(res.reason);
                              if (editingCatId === cat.id) annulerEdition();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
