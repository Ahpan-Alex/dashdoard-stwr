"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Ban, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  categoriesEnArbre,
  categoriesFeuilles,
  cheminCategorie,
  codeDejaUtilise,
  isCodeProduitValide,
  libelleNiveauCategorie,
  libelleProduit,
  MAX_PROFONDEUR_CATEGORIE,
  normalizeCodeProduit,
  profondeurCategorie,
  produitEstReference,
  trouverDoublonsPotentiels,
} from "@/lib/produits";
import { useStore } from "@/lib/store";
import { appliqueTVA, libelleClient } from "@/lib/commercial";
import type { CategorieProduit, Produit } from "@/lib/types";

type ProduitFormState = {
  code: string;
  libelleCourt: string;
  libelleLong: string;
  categorieId: string;
  unite: string;
  prixAchat: string;
  prixVenteHT: string;
  prixVenteGrosHT: string;
  seuilGros: string;
  tauxTVA: string;
  seuilReappro: string;
  seuilRupture: string;
  seuilSurstock: string;
  gerePeremption: boolean;
};

function parseSeuilOptionnel(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function formDepuisProduit(p: Produit): ProduitFormState {
  return {
    code: p.code,
    libelleCourt: p.libelleCourt,
    libelleLong: p.libelleLong,
    categorieId: p.categorieId,
    unite: p.unite,
    prixAchat: String(p.prixAchat),
    prixVenteHT: String(p.prixVenteHT),
    prixVenteGrosHT:
      p.prixVenteGrosHT != null ? String(p.prixVenteGrosHT) : "",
    seuilGros: p.seuilGros != null ? String(p.seuilGros) : "",
    tauxTVA: String(p.tauxTVA),
    seuilReappro: p.seuilReappro != null ? String(p.seuilReappro) : "",
    seuilRupture: p.seuilRupture != null ? String(p.seuilRupture) : "",
    seuilSurstock: p.seuilSurstock != null ? String(p.seuilSurstock) : "",
    gerePeremption: Boolean(p.gerePeremption),
  };
}

export default function ParametresProduitsPage() {
  const {
    produits,
    categoriesProduits,
    clients,
    tarifsClients,
    historiquesPrix,
    entrees,
    ventes,
    devis,
    commandes,
    bonsDeLivraison,
    factures,
    achats,
    parametres,
    addProduit,
    updateProduit,
    desactiverProduit,
    deleteProduit,
    addCategorieProduit,
    updateCategorieProduit,
    deleteCategorieProduit,
    addTarifClient,
    deleteTarifClient,
  } = useStore();

  const avecTVA = appliqueTVA(parametres);

  const feuilles = categoriesFeuilles(categoriesProduits);
  const arbreCategories = useMemo(
    () => categoriesEnArbre(categoriesProduits),
    [categoriesProduits],
  );

  const [filtreActif, setFiltreActif] = useState<"actifs" | "tous" | "inactifs">(
    "actifs",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [alertDoublons, setAlertDoublons] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({
    code: "",
    libelle: "",
    parentId: "",
  });

  function formVide(): ProduitFormState {
    return {
      code: "",
      libelleCourt: "",
      libelleLong: "",
      categorieId: feuilles[0]?.id ?? "",
      unite: "kg",
      prixAchat: "",
      prixVenteHT: "",
      prixVenteGrosHT: "",
      seuilGros: "",
      tauxTVA: String(parametres.tauxTVA),
      seuilReappro: "",
      seuilRupture: "",
      seuilSurstock: "",
      gerePeremption: false,
    };
  }

  const [form, setForm] = useState<ProduitFormState>(() => formVide());
  const [tarifForm, setTarifForm] = useState({
    clientId: clients[0]?.id ?? "",
    prixHT: "",
  });

  /** Parents possibles : profondeur < max ; exclut soi-même et descendants en édition. */
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

  const liste = useMemo(() => {
    return [...produits]
      .filter((p) => {
        if (filtreActif === "actifs") return p.actif;
        if (filtreActif === "inactifs") return !p.actif;
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [produits, filtreActif]);

  const selected = produits.find((p) => p.id === selectedId);
  const produitEnEdition = editingId
    ? produits.find((p) => p.id === editingId)
    : undefined;
  const categorieEnEdition = editingCatId
    ? categoriesProduits.find((c) => c.id === editingCatId)
    : undefined;
  const histSelected = historiquesPrix
    .filter((h) => h.produitId === selectedId)
    .slice(0, 20);
  const tarifsSelected = tarifsClients.filter(
    (t) => t.produitId === selectedId && t.actif,
  );

  function familleLieeAProduit(categorieId: string) {
    return produits.some((p) => p.categorieId === categorieId);
  }

  function annulerEditionFamille() {
    setEditingCatId(null);
    setCatForm({ code: "", libelle: "", parentId: "" });
  }

  function demarrerEditionFamille(cat: CategorieProduit) {
    if (familleLieeAProduit(cat.id)) {
      alert(
        "Cette famille est liée à au moins un produit : modification impossible. Réassignez les produits d'abord.",
      );
      return;
    }
    setEditingCatId(cat.id);
    setCatForm({
      code: cat.code,
      libelle: cat.libelle,
      parentId: cat.parentId ?? "",
    });
    document
      .getElementById("fiche-famille")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSubmitCategorie(e: FormEvent) {
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
      if (familleLieeAProduit(editingCatId)) {
        alert(
          "Cette famille est devenue liée à un produit : modification refusée.",
        );
        annulerEditionFamille();
        return;
      }
      updateCategorieProduit(editingCatId, {
        code,
        libelle,
        parentId: catForm.parentId || undefined,
      });
      annulerEditionFamille();
      return;
    }

    addCategorieProduit({
      code,
      libelle,
      parentId: catForm.parentId || undefined,
      ordre: categoriesProduits.length + 1,
      actif: true,
    });
    setCatForm({ code: "", libelle: "", parentId: "" });
  }

  function annulerEdition() {
    setEditingId(null);
    setAlertDoublons(null);
    setForm(formVide());
  }

  function demarrerEdition(produit: Produit) {
    setEditingId(produit.id);
    setSelectedId(produit.id);
    setAlertDoublons(null);
    setForm(formDepuisProduit(produit));
    document
      .getElementById("fiche-produit")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSubmitProduit(e: FormEvent) {
    e.preventDefault();
    setAlertDoublons(null);
    const code = normalizeCodeProduit(form.code);
    if (!isCodeProduitValide(code)) {
      alert("Code invalide (2–32 caractères : A–Z, 0–9, tirets).");
      return;
    }
    if (codeDejaUtilise(code, produits, editingId ?? undefined)) {
      alert("Ce code produit existe déjà.");
      return;
    }
    const libelleCourt = form.libelleCourt.trim();
    const libelleLong = form.libelleLong.trim() || libelleCourt;
    if (!libelleCourt || !form.categorieId) {
      alert("Choisissez une famille (feuille) pour le produit.");
      return;
    }
    const achat = Number(form.prixAchat);
    const vente = Number(form.prixVenteHT);
    if (achat < 0 || vente < 0) return;

    if (!editingId) {
      const doublons = trouverDoublonsPotentiels(libelleLong, produits);
      if (doublons.length > 0) {
        const msg = doublons
          .slice(0, 3)
          .map(
            (d) =>
              `${d.produit.code} — ${libelleProduit(d.produit)} (${Math.round(d.score * 100)} %)`,
          )
          .join("\n");
        if (
          !confirm(
            `Libellés proches détectés :\n${msg}\n\nCréer quand même ce produit ?`,
          )
        ) {
          setAlertDoublons(msg);
          return;
        }
      }
    }

    const payload = {
      code,
      libelleCourt: libelleCourt.slice(0, 40),
      libelleLong,
      categorieId: form.categorieId,
      unite: form.unite.trim() || "kg",
      prixAchat: achat,
      prixVenteHT: vente,
      prixVenteGrosHT: form.prixVenteGrosHT
        ? Number(form.prixVenteGrosHT)
        : undefined,
      seuilGros: form.seuilGros ? Number(form.seuilGros) : undefined,
      tauxTVA: avecTVA ? Number(form.tauxTVA) || 0 : 0,
      seuilReappro: parseSeuilOptionnel(form.seuilReappro),
      seuilRupture: parseSeuilOptionnel(form.seuilRupture),
      seuilSurstock: parseSeuilOptionnel(form.seuilSurstock),
      gerePeremption: form.gerePeremption,
    };

    if (editingId) {
      updateProduit(editingId, payload, {
        motifPrix: "Modification fiche produit",
      });
      setSelectedId(editingId);
      annulerEdition();
      return;
    }

    addProduit({ ...payload, actif: true });
    setForm(formVide());
  }

  function sauvegarderPrix(produitId: string) {
    if (!selected || selected.id !== produitId) return;
    const achat = Number(
      prompt("Nouveau prix d'achat HT (Ar)", String(selected.prixAchat)),
    );
    if (Number.isNaN(achat) || achat < 0) return;
    const vente = Number(
      prompt("Nouveau prix de vente HT (Ar)", String(selected.prixVenteHT)),
    );
    if (Number.isNaN(vente) || vente < 0) return;
    const grosRaw = prompt(
      "Prix gros HT (vide = aucun)",
      selected.prixVenteGrosHT != null ? String(selected.prixVenteGrosHT) : "",
    );
    if (grosRaw === null) return;
    updateProduit(
      produitId,
      {
        prixAchat: achat,
        prixVenteHT: vente,
        prixVenteGrosHT: grosRaw.trim() ? Number(grosRaw) : undefined,
      },
      { motifPrix: "Mise à jour manuelle catalogue" },
    );
  }

  return (
    <div>
      <PageHeader
        title="Catalogue produits"
        description="Familles (3 niveaux), code unique, multi-prix — désactivation pour préserver les factures."
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
              : "Familles de produits"}
          </p>
          {editingCatId && (
            <IconButton
              label="Annuler la modification"
              onClick={annulerEditionFamille}
            >
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>
        <p className="mb-4 text-xs text-muted">
          Jusqu&apos;à 3 niveaux : famille › sous-famille › sous-sous-famille.
          Modification possible uniquement tant qu&apos;aucun produit n&apos;y
          est rattaché.
        </p>

        <form
          onSubmit={onSubmitCategorie}
          className="mb-4 grid gap-3 sm:grid-cols-4"
        >
          <label className="block text-xs font-semibold text-muted">
            Code *
            <input
              className="input mt-1 font-mono uppercase"
              placeholder="ex. POI"
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Libellé *
            <input
              className="input mt-1"
              placeholder="ex. Poissons frais"
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
              onChange={(e) =>
                setCatForm({ ...catForm, parentId: e.target.value })
              }
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
                  Ajouter une{" "}
                  {libelleNiveauCategorie(niveauNouveau).toLowerCase()}
                </>
              )}
            </button>
            {editingCatId && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={annulerEditionFamille}
              >
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
                <th>Produits</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {arbreCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-sm text-muted">
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
                                ? "Modification impossible : famille liée à un produit"
                                : "Modifier cette famille"
                            }
                            disabled={nbProduits > 0}
                            onClick={() => demarrerEditionFamille(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          {cat.actif ? (
                            <IconButton
                              label="Désactiver cette famille"
                              onClick={() =>
                                updateCategorieProduit(cat.id, {
                                  actif: false,
                                })
                              }
                            >
                              <Ban className="h-4 w-4" />
                            </IconButton>
                          ) : (
                            <IconButton
                              label="Réactiver cette famille"
                              onClick={() =>
                                updateCategorieProduit(cat.id, {
                                  actif: true,
                                })
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
                              if (editingCatId === cat.id) {
                                annulerEditionFamille();
                              }
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

      <div className="mb-6" id="fiche-produit">
        <form
          onSubmit={onSubmitProduit}
          className="rounded-[var(--radius)] border border-line bg-card p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
              {editingId
                ? `Modifier le produit${produitEnEdition ? ` · ${produitEnEdition.code}` : ""}`
                : "Nouveau produit"}
            </p>
            {editingId && (
              <IconButton label="Annuler la modification" onClick={annulerEdition}>
                <X className="h-4 w-4" />
              </IconButton>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Code *
              <input
                className="input mt-1 font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Famille / feuille *
              <select
                className="select mt-1"
                value={form.categorieId}
                onChange={(e) =>
                  setForm({ ...form, categorieId: e.target.value })
                }
                required
              >
                <option value="">— Choisir —</option>
                {feuilles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cheminCategorie(c.id, categoriesProduits)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Libellé court *
              <input
                className="input mt-1"
                maxLength={40}
                value={form.libelleCourt}
                onChange={(e) =>
                  setForm({ ...form, libelleCourt: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Libellé long
              <input
                className="input mt-1"
                value={form.libelleLong}
                onChange={(e) =>
                  setForm({ ...form, libelleLong: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Unité
              <input
                className="input mt-1"
                value={form.unite}
                onChange={(e) => setForm({ ...form, unite: e.target.value })}
              />
            </label>
            {avecTVA && (
              <label className="block text-xs font-semibold text-muted">
                TVA %
                <input
                  type="number"
                  className="input mt-1"
                  value={form.tauxTVA}
                  onChange={(e) =>
                    setForm({ ...form, tauxTVA: e.target.value })
                  }
                />
              </label>
            )}
            <label className="block text-xs font-semibold text-muted">
              Prix d&apos;achat HT
              <input
                type="number"
                className="input mt-1"
                value={form.prixAchat}
                onChange={(e) =>
                  setForm({ ...form, prixAchat: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Prix vente détail HT
              <input
                type="number"
                className="input mt-1"
                value={form.prixVenteHT}
                onChange={(e) =>
                  setForm({ ...form, prixVenteHT: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Prix gros HT
              <input
                type="number"
                className="input mt-1"
                value={form.prixVenteGrosHT}
                onChange={(e) =>
                  setForm({ ...form, prixVenteGrosHT: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Seuil gros (qté)
              <input
                type="number"
                className="input mt-1"
                value={form.seuilGros}
                onChange={(e) => setForm({ ...form, seuilGros: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Seuil réappro (qté)
              <input
                type="number"
                min={0}
                step="any"
                className="input mt-1"
                value={form.seuilReappro}
                onChange={(e) =>
                  setForm({ ...form, seuilReappro: e.target.value })
                }
                placeholder="Vide = pas d'alerte"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Seuil rupture (qté)
              <input
                type="number"
                min={0}
                step="any"
                className="input mt-1"
                value={form.seuilRupture}
                onChange={(e) =>
                  setForm({ ...form, seuilRupture: e.target.value })
                }
                placeholder="0 = rupture à zéro"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Seuil surstock (qté)
              <input
                type="number"
                min={0}
                step="any"
                className="input mt-1"
                value={form.seuilSurstock}
                onChange={(e) =>
                  setForm({ ...form, seuilSurstock: e.target.value })
                }
                placeholder="Vide = pas d'alerte"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={form.gerePeremption}
                onChange={(e) =>
                  setForm({ ...form, gerePeremption: e.target.checked })
                }
              />
              Gérer une date de péremption (DLC sur les lots)
            </label>
          </div>
          {alertDoublons && (
            <p className="mt-2 whitespace-pre-wrap text-xs text-coral">
              Doublons potentiels :{"\n"}
              {alertDoublons}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary">
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Enregistrer les modifications
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Créer le produit
                </>
              )}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={annulerEdition}
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["actifs", "Actifs"],
            ["inactifs", "Inactifs"],
            ["tous", "Tous"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn ${filtreActif === id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltreActif(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="table-shell lg:col-span-3">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th>Vente HT</th>
                {avecTVA && <th>TVA</th>}
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liste.map((p) => (
                <tr
                  key={p.id}
                  className={
                    editingId === p.id
                      ? "bg-sea-100/80"
                      : selectedId === p.id
                        ? "bg-sea-50/80"
                        : "cursor-pointer"
                  }
                  onClick={() => setSelectedId(p.id)}
                >
                  <td className="font-mono text-xs font-semibold">{p.code}</td>
                  <td>
                    <span className="font-medium">{p.libelleCourt}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {p.libelleLong}
                    </span>
                  </td>
                  <td className="text-xs">
                    {cheminCategorie(p.categorieId, categoriesProduits)}
                  </td>
                  <td>{formatCurrency(p.prixVenteHT)}</td>
                  {avecTVA && <td>{p.tauxTVA} %</td>}
                  <td>
                    <span
                      className={`badge ${p.actif ? "badge-sea" : "badge-sand"}`}
                    >
                      {p.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <div
                      className="flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        label="Modifier la fiche produit"
                        onClick={() => demarrerEdition(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      {p.actif ? (
                        <IconButton
                          label="Désactiver le produit"
                          onClick={() => {
                            if (confirm(`Désactiver ${p.code} ?`)) {
                              desactiverProduit(p.id);
                            }
                          }}
                        >
                          <Ban className="h-4 w-4" />
                        </IconButton>
                      ) : (
                        <IconButton
                          label="Réactiver le produit"
                          onClick={() => updateProduit(p.id, { actif: true })}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </IconButton>
                      )}
                      <IconButton
                        label="Supprimer le produit (si jamais utilisé)"
                        onClick={() => {
                          const ref = produitEstReference(p.id, {
                            entrees,
                            ventes,
                            devis,
                            commandes,
                            bonsDeLivraison,
                            factures,
                            achats,
                          });
                          if (ref) {
                            alert(
                              "Produit référencé : suppression impossible. Utilisez la désactivation.",
                            );
                            return;
                          }
                          if (
                            !confirm(`Supprimer définitivement ${p.code} ?`)
                          ) {
                            return;
                          }
                          const res = deleteProduit(p.id);
                          if (!res.ok) alert(res.reason);
                          if (editingId === p.id) annulerEdition();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-[var(--radius)] border border-line bg-card p-4 lg:col-span-2">
          {!selected ? (
            <p className="text-sm text-muted">
              Sélectionnez un produit pour voir tarifs clients et historique des
              prix.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-xs font-semibold text-sea-700">
                  {selected.code}
                </p>
                <p className="font-display text-lg font-semibold">
                  {selected.libelleLong}
                </p>
                <p className="text-xs text-muted">
                  Achat {formatCurrency(selected.prixAchat)} · Détail{" "}
                  {formatCurrency(selected.prixVenteHT)}
                  {selected.prixVenteGrosHT != null
                    ? ` · Gros ${formatCurrency(selected.prixVenteGrosHT)}`
                    : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => demarrerEdition(selected)}
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier la fiche
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => sauvegarderPrix(selected.id)}
                  >
                    Modifier les prix
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
                  Tarifs clients
                </p>
                <ul className="mb-2 space-y-1 text-sm">
                  {tarifsSelected.length === 0 ? (
                    <li className="text-muted">Aucun tarif spécifique.</li>
                  ) : (
                    tarifsSelected.map((t) => {
                      const cli = clients.find((c) => c.id === t.clientId);
                      return (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-2 border-b border-line/60 py-1"
                        >
                          <span>
                            {cli?.nom ?? t.clientId} —{" "}
                            {formatCurrency(t.prixHT)}
                          </span>
                          <IconButton
                            label="Supprimer ce tarif client"
                            onClick={() => deleteTarifClient(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </IconButton>
                        </li>
                      );
                    })
                  )}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="select min-w-[140px] flex-1"
                    value={tarifForm.clientId}
                    onChange={(e) =>
                      setTarifForm({ ...tarifForm, clientId: e.target.value })
                    }
                  >
                    {clients
                      .filter((c) => c.actif)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {libelleClient(c)}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    className="input w-28"
                    placeholder="Prix HT"
                    value={tarifForm.prixHT}
                    onChange={(e) =>
                      setTarifForm({ ...tarifForm, prixHT: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const prix = Number(tarifForm.prixHT);
                      if (!tarifForm.clientId || prix < 0) return;
                      addTarifClient({
                        clientId: tarifForm.clientId,
                        produitId: selected.id,
                        prixHT: prix,
                        typeTarif: "fixe",
                        actif: true,
                      });
                      setTarifForm({ ...tarifForm, prixHT: "" });
                    }}
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
                  Historique des prix
                </p>
                {histSelected.length === 0 ? (
                  <p className="text-sm text-muted">Aucune modification.</p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                    {histSelected.map((h) => (
                      <li key={h.id} className="border-b border-line/50 py-1">
                        <span className="text-muted">
                          {formatDate(h.date)} · {h.champ}
                        </span>
                        <br />
                        {formatCurrency(h.ancienMontant)} →{" "}
                        {formatCurrency(h.nouveauMontant)}
                        {h.motif ? ` (${h.motif})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
