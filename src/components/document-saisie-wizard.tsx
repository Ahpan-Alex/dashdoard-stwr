"use client";

import { useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  AlignLeft,
  GripVertical,
  MessageSquare,
  Minus,
  Plus,
  Sigma,
  Trash2,
} from "lucide-react";
import { DocumentPreview } from "@/components/document-preview";
import { DocumentPrintActions } from "@/components/document-print-actions";
import type { ModeleDocument } from "@/lib/document-templates";
import {
  calculerTotaux,
  isLigneProduit,
  modeRemiseGlobale,
  montantLigneHT,
  montantRemiseLigne,
  normaliserRemiseLigne,
  prixUnitaireNetHT,
  recalculerSousTotaux as recalculerSousTotauxBase,
  type TotauxDocument,
} from "@/lib/commercial";
import {
  stockDisponible,
  stockRestantPourSaisie,
} from "@/lib/calculations";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  CategorieProduit,
  Client,
  EntreeStock,
  LigneDocument,
  ModeRemise,
  Parametres,
  PointDeVente,
  Produit,
  TarifClient,
  TypeLigneDocument,
  Vente,
} from "@/lib/types";
import {
  designationFacture,
  produitsActifs,
  resolvePrixVenteHT,
} from "@/lib/produits";
import { createId } from "@/lib/id";
import { useStore } from "@/lib/store";
import {
  libelleRemiseLigne,
  PrixUnitaireLigneSaisie,
  RemiseGlobaleSaisie,
  RemiseLigneSaisie,
} from "@/components/remise-saisie";

export type DraftLigne = Omit<LigneDocument, "id"> & { key: string };
export type EtapeDocument = "saisie" | "prevalidation";

function uidLocal() {
  return createId("tmp");
}

export function recalculerSousTotaux(lignes: DraftLigne[]): DraftLigne[] {
  return recalculerSousTotauxBase(
    lignes.map((l) => ({ ...l, id: l.key })),
  ).map(({ id, ...rest }) => ({ ...rest, key: id }));
}

export function draftToLignes(lignes: DraftLigne[]): LigneDocument[] {
  return lignes.map((l, i) => {
    const remise = normaliserRemiseLigne(l);
    return {
      id: `nl-${i}`,
      type: l.type ?? "produit",
      produitId: l.produitId,
      codeProduit: l.codeProduit,
      designation: l.designation,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      unite: l.unite,
      tauxTVA: l.tauxTVA,
      remiseMode: remise.remiseMode,
      remisePercent: remise.remisePercent,
      remiseMontant: remise.remiseMontant,
      commentaire: l.commentaire,
    };
  });
}

export function lignesToDraft(lignes: LigneDocument[]): DraftLigne[] {
  return lignes.map((l) => {
    const { id: _id, ...rest } = l;
    return { ...rest, key: uidLocal() };
  });
}

type PreviewMeta = {
  type: "devis" | "commande" | "bon_de_livraison" | "facture";
  numero: string;
  date: string;
  echeance?: string;
  client?: Client;
  pdv?: PointDeVente;
  parametres: Parametres;
  modele?: ModeleDocument;
  conditionsPaiement?: string;
  referenceDevis?: string;
  referenceCommande?: string;
  factureType?: "standard" | "acompte" | "solde" | "avoir" | "proforma";
  estProforma?: boolean;
};

type Props = {
  titre: string;
  produits: Produit[];
  categoriesProduits?: CategorieProduit[];
  tauxTVA: number;
  assujettiTVA: boolean;
  clientId?: string;
  tarifsClients?: TarifClient[];
  /** Point de vente du document (contrôle stock). */
  pointDeVenteId: string;
  entrees: EntreeStock[];
  ventes: Vente[];
  /** Métadonnées pour l'aperçu PDF obligatoire en prévalidation. */
  previewMeta: PreviewMeta;
  /** Afficher la ligne acomptes dans la prévalidation */
  showAcomptes?: boolean;
  acomptesTTC?: number;
  acomptesLabel?: string;
  confirmLabel: string;
  headerFields: ReactNode;
  /** Bloc optionnel sous les lignes (ex. saisie d'acompte). */
  footerFields?: ReactNode;
  onConfirm: (payload: {
    lignes: LigneDocument[];
    remiseGlobale: number;
    remiseGlobaleMode: ModeRemise;
    note?: string;
  }) => void;
  onCancel: () => void;
  /** Lignes initiales (ex. depuis un devis) */
  initialLignes?: DraftLigne[];
  initialRemiseGlobale?: number;
  initialRemiseGlobaleMode?: ModeRemise;
  initialNote?: string;
  acomptesDetail?: {
    numero: string;
    date: string;
    montant: number;
    mode?: string;
  }[];
};

export function DocumentSaisieWizard({
  titre,
  produits,
  categoriesProduits = [],
  tauxTVA,
  assujettiTVA,
  clientId,
  tarifsClients = [],
  pointDeVenteId,
  entrees,
  ventes,
  previewMeta,
  showAcomptes = false,
  acomptesTTC = 0,
  acomptesLabel,
  confirmLabel,
  headerFields,
  footerFields,
  onConfirm,
  onCancel,
  initialLignes = [],
  initialRemiseGlobale = 0,
  initialRemiseGlobaleMode = "montant",
  initialNote = "",
  acomptesDetail = [],
}: Props) {
  const inventaires = useStore((s) => s.inventaires);
  const produitsDispo = produitsActifs(produits);
  const [etape, setEtape] = useState<EtapeDocument>("saisie");
  const previewSheetRef = useRef<HTMLDivElement>(null);
  const [lignes, setLignes] = useState<DraftLigne[]>(initialLignes);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [filtreFamille, setFiltreFamille] = useState("");
  const [rechercheProduit, setRechercheProduit] = useState("");
  const [form, setForm] = useState({
    remiseGlobale: String(initialRemiseGlobale || 0),
    remiseGlobaleMode: modeRemiseGlobale(initialRemiseGlobaleMode) as ModeRemise,
    note: initialNote,
    commentaireLibre: "",
  });

  const categoriesActives = useMemo(
    () =>
      [...categoriesProduits]
        .filter((c) => c.actif)
        .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle)),
    [categoriesProduits],
  );

  const lignesProduitParId = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    for (const l of lignes) {
      if (isLigneProduit(l) && l.produitId) {
        counts.set(l.produitId, (counts.get(l.produitId) ?? 0) + 1);
        total += 1;
      }
    }
    return { counts, total };
  }, [lignes]);

  const catalogueFiltre = useMemo(() => {
    const q = rechercheProduit.trim().toLowerCase();
    return produitsDispo
      .filter((p) => {
        if (filtreFamille) {
          if (p.categorieId === filtreFamille) return true;
          const cat = categoriesProduits.find((c) => c.id === p.categorieId);
          if (cat?.parentId !== filtreFamille) return false;
        }
        return true;
      })
      .filter((p) => {
        if (!q) return true;
        return (
          p.code.toLowerCase().includes(q) ||
          p.libelleCourt.toLowerCase().includes(q) ||
          p.libelleLong.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [produitsDispo, filtreFamille, rechercheProduit, categoriesProduits]);

  function libelleFamille(categorieId: string) {
    return (
      categoriesProduits.find((c) => c.id === categorieId)?.libelle ?? "—"
    );
  }

  const totauxDraft: TotauxDocument = useMemo(() => {
    return calculerTotaux(
      lignes.map((l) => ({ ...l, id: l.key })),
      tauxTVA,
      acomptesTTC,
      assujettiTVA,
      Number(form.remiseGlobale) || 0,
      form.remiseGlobaleMode,
    );
  }, [
    lignes,
    tauxTVA,
    acomptesTTC,
    assujettiTVA,
    form.remiseGlobale,
    form.remiseGlobaleMode,
  ]);
  const afficherAcomptes = showAcomptes || acomptesTTC > 0;

  function ajouterProduit(produitId: string) {
    const prod = produitsDispo.find((p) => p.id === produitId);
    if (!prod) return;
    setStockError(null);
    if (!pointDeVenteId) {
      setStockError(
        "Sélectionnez un point de vente avant d'ajouter un produit.",
      );
      return;
    }
    const dispo = stockRestantPourSaisie(
      produitId,
      pointDeVenteId,
      entrees,
      ventes,
      lignes,
      undefined,
      inventaires,
    );
    if (dispo <= 0) {
      setStockError(
        `Stock insuffisant pour « ${prod.libelleCourt} » (disponible : 0 ${prod.unite}).`,
      );
      return;
    }
    const prix = resolvePrixVenteHT(prod, {
      clientId,
      quantite: 1,
      tarifsClients,
    });
    setLignes((prev) =>
      recalculerSousTotaux([
        ...prev,
        {
          key: uidLocal(),
          type: "produit",
          produitId: prod.id,
          codeProduit: prod.code,
          designation: designationFacture(prod),
          quantite: 1,
          prixUnitaire: prix,
          unite: prod.unite,
          tauxTVA: assujettiTVA ? prod.tauxTVA : 0,
        },
      ]),
    );
  }

  function addLigneSpeciale(type: TypeLigneDocument) {
    if (type === "sous_total") {
      setLignes((prev) =>
        recalculerSousTotaux([
          ...prev,
          {
            key: uidLocal(),
            type: "sous_total",
            designation: "Sous-total",
            quantite: 0,
            prixUnitaire: 0,
            unite: "",
          },
        ]),
      );
      return;
    }
    if (type === "blanche") {
      setLignes((prev) => [
        ...prev,
        {
          key: uidLocal(),
          type: "blanche",
          designation: "",
          quantite: 0,
          prixUnitaire: 0,
          unite: "",
        },
      ]);
      return;
    }
    if (type === "commentaire") {
      const texte = form.commentaireLibre.trim();
      if (!texte) return;
      setLignes((prev) => [
        ...prev,
        {
          key: uidLocal(),
          type: "commentaire",
          designation: texte,
          quantite: 0,
          prixUnitaire: 0,
          unite: "",
        },
      ]);
      setForm((f) => ({ ...f, commentaireLibre: "" }));
    }
  }

  function updateLigne(key: string, patch: Partial<DraftLigne>) {
    setStockError(null);
    setLignes((prev) => {
      const next = prev.map((l) => {
        if (l.key !== key) return l;
        const merged = { ...l, ...patch };
        if (
          isLigneProduit(merged) &&
          merged.produitId &&
          patch.quantite !== undefined
        ) {
          const max = stockRestantPourSaisie(
            merged.produitId,
            pointDeVenteId,
            entrees,
            ventes,
            prev,
            key,
            inventaires,
          );
          merged.quantite = Math.min(Math.max(0, Number(patch.quantite) || 0), max);
        }
        return merged;
      });
      return recalculerSousTotaux(
        next.map((l) =>
          isLigneProduit(l) ? { ...l, ...normaliserRemiseLigne(l) } : l,
        ),
      );
    });
  }

  function validerStocksLignes(): string | null {
    if (!pointDeVenteId) {
      return "Sélectionnez un point de vente avant de continuer.";
    }
    for (const l of lignes) {
      if (!isLigneProduit(l) || !l.produitId) continue;
      const max = stockRestantPourSaisie(
        l.produitId,
        pointDeVenteId,
        entrees,
        ventes,
        lignes,
        l.key,
        inventaires,
      );
      if (l.quantite <= 0) {
        return `Quantité invalide pour « ${l.designation} ».`;
      }
      if (l.quantite > max) {
        return `Stock insuffisant pour « ${l.designation} » (disponible : ${formatNumber(max)} ${l.unite}).`;
      }
    }
    return null;
  }

  function removeLigne(key: string) {
    setLignes((prev) => recalculerSousTotaux(prev.filter((l) => l.key !== key)));
  }

  function deplacerLigne(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    setLignes((prev) => {
      const from = prev.findIndex((l) => l.key === fromKey);
      const to = prev.findIndex((l) => l.key === toKey);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return recalculerSousTotaux(next);
    });
  }

  function onDragStart(e: DragEvent, key: string) {
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  }

  function onDragOver(e: DragEvent, key: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragKey && dragKey !== key) setDropKey(key);
  }

  function onDrop(key: string) {
    if (dragKey) deplacerLigne(dragKey, key);
    setDragKey(null);
    setDropKey(null);
  }

  function onDragEnd() {
    setDragKey(null);
    setDropKey(null);
  }

  function allerPrevalidation() {
    if (!lignes.some((l) => isLigneProduit(l))) return;
    const err = validerStocksLignes();
    if (err) {
      setStockError(err);
      return;
    }
    setStockError(null);
    setLignes((prev) => recalculerSousTotaux(prev));
    setEtape("prevalidation");
  }

  function confirmer() {
    if (!lignes.some((l) => isLigneProduit(l))) return;
    const err = validerStocksLignes();
    if (err) {
      setStockError(err);
      setEtape("saisie");
      return;
    }
    const remiseGlobale = Number(form.remiseGlobale) || 0;
    onConfirm({
      lignes: draftToLignes(recalculerSousTotaux(lignes)),
      remiseGlobale,
      remiseGlobaleMode: form.remiseGlobaleMode,
      note: form.note.trim() || undefined,
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{titre}</h2>
        <div className="flex gap-2 text-xs">
          <span
            className={`badge ${etape === "saisie" ? "badge-sea" : "badge-sand"}`}
          >
            1. Saisie
          </span>
          <span
            className={`badge ${etape === "prevalidation" ? "badge-sea" : "badge-sand"}`}
          >
            2. Prévalidation
          </span>
        </div>
      </div>

      {etape === "saisie" ? (
        <div className="grid gap-4">
          {headerFields}

          <div className="rounded-lg border border-line p-3">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
                  Catalogue produits
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Ajoutez un article autant de fois que besoin (prix
                  différents). Chaque ligne se saisit ci-dessous.
                </p>
              </div>
              <p className="text-xs text-muted">
                {lignesProduitParId.total} ligne
                {lignesProduitParId.total > 1 ? "s" : ""} ·{" "}
                {catalogueFiltre.length} affiché
                {catalogueFiltre.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn ${filtreFamille === "" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFiltreFamille("")}
              >
                Toutes les familles
              </button>
              {categoriesActives.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`btn ${filtreFamille === c.id ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFiltreFamille(c.id)}
                >
                  {c.libelle}
                </button>
              ))}
            </div>

            <label className="mb-3 block text-xs font-semibold text-muted">
              Recherche
              <input
                className="input mt-1"
                placeholder="Code, libellé…"
                value={rechercheProduit}
                onChange={(e) => setRechercheProduit(e.target.value)}
              />
            </label>

            {!pointDeVenteId && (
              <p className="mb-2 text-xs text-muted">
                Sélectionnez un point de vente pour afficher le stock.
              </p>
            )}

            <div className="table-shell max-h-[320px] overflow-auto">
              <table className="data">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr>
                    <th className="w-14">
                      <span className="sr-only">Ajouter</span>
                    </th>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th>Famille</th>
                    <th>Stock</th>
                    <th>Unité</th>
                    <th>P.U. HT</th>
                    {assujettiTVA && <th>TVA</th>}
                  </tr>
                </thead>
                <tbody>
                  {catalogueFiltre.length === 0 ? (
                    <tr>
                      <td
                        colSpan={assujettiTVA ? 8 : 7}
                        className="text-muted"
                      >
                        Aucun produit pour ce filtre.
                      </td>
                    </tr>
                  ) : (
                    catalogueFiltre.map((p) => {
                      const nbLignes = lignesProduitParId.counts.get(p.id) ?? 0;
                      const stock = stockDisponible(
                        p.id,
                        pointDeVenteId,
                        entrees,
                        ventes,
                        inventaires,
                      );
                      const restant = stockRestantPourSaisie(
                        p.id,
                        pointDeVenteId,
                        entrees,
                        ventes,
                        lignes,
                        undefined,
                        inventaires,
                      );
                      const indispo = restant <= 0;
                      const prix = resolvePrixVenteHT(p, {
                        clientId,
                        quantite: 1,
                        tarifsClients,
                      });
                      return (
                        <tr
                          key={p.id}
                          className={
                            nbLignes > 0
                              ? "bg-sea-50/60"
                              : indispo
                                ? "opacity-55"
                                : undefined
                          }
                        >
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary px-2 py-1"
                              disabled={indispo}
                              onClick={() => ajouterProduit(p.id)}
                              aria-label={`Ajouter ${p.libelleCourt}`}
                              title={
                                indispo
                                  ? "Produit indisponible en stock"
                                  : "Ajouter une ligne (même produit, autre prix possible)"
                              }
                            >
                              <Plus className="h-4 w-4" />
                              {nbLignes > 0 ? (
                                <span className="ml-1 text-[11px] font-semibold">
                                  {nbLignes}
                                </span>
                              ) : null}
                            </button>
                          </td>
                          <td className="font-mono text-xs">{p.code}</td>
                          <td>
                            <p className="font-medium">{p.libelleCourt}</p>
                            {p.libelleLong &&
                              p.libelleLong !== p.libelleCourt && (
                                <p className="text-xs text-muted">
                                  {p.libelleLong}
                                </p>
                              )}
                            {indispo && (
                              <p className="text-xs font-medium text-danger">
                                Rupture de stock
                              </p>
                            )}
                          </td>
                          <td className="text-sm">
                            {libelleFamille(p.categorieId)}
                          </td>
                          <td
                            className={`font-semibold tabular-nums ${
                              stock <= 0 ? "text-danger" : ""
                            }`}
                          >
                            {formatNumber(stock)}
                          </td>
                          <td>{p.unite}</td>
                          <td className="font-semibold">
                            {formatCurrency(prix)}
                          </td>
                          {assujettiTVA && (
                            <td className="text-sm text-muted">
                              {`${formatNumber(p.tauxTVA)} %`}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {stockError && (
              <p className="mt-2 text-xs font-medium text-danger">{stockError}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addLigneSpeciale("sous_total")}
              >
                <Sigma className="h-4 w-4" />
                Sous-total
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addLigneSpeciale("blanche")}
              >
                <Minus className="h-4 w-4" />
                Ligne blanche
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                className="input min-w-[220px] flex-1"
                placeholder="Commentaire sur les lignes…"
                value={form.commentaireLibre}
                onChange={(e) =>
                  setForm({ ...form, commentaireLibre: e.target.value })
                }
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addLigneSpeciale("commentaire")}
              >
                <MessageSquare className="h-4 w-4" />
                Insérer commentaire
              </button>
            </div>
          </div>

          <div className="table-shell">
            <p className="border-b border-line px-4 py-2 text-xs text-muted">
              Glissez-déposez les lignes (poignée{" "}
              <GripVertical className="inline h-3 w-3" />) pour réordonner.
            </p>
            <table className="data">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>Ligne</th>
                  <th>Qté</th>
                  <th>P.U. HT (origine)</th>
                  <th>Remise</th>
                  <th>Montant HT</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lignes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted">
                      Aucune ligne. Cochez des produits dans le catalogue.
                    </td>
                  </tr>
                ) : (
                  lignes.map((l) => {
                    const type = l.type ?? "produit";
                    const rowClass = [
                      "transition-colors",
                      dragKey === l.key ? "opacity-50" : "",
                      dropKey === l.key
                        ? "outline outline-2 outline-sea-500 outline-offset-[-2px]"
                        : "",
                      type === "blanche" ? "bg-slate-50" : "",
                      type === "sous_total" ? "bg-sea-50/70 font-semibold" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const handle = (
                      <td className="w-8 !px-1">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => onDragStart(e, l.key)}
                          onDragEnd={onDragEnd}
                          className="cursor-grab touch-none rounded p-1 text-muted hover:bg-sea-100 active:cursor-grabbing"
                          title="Glisser pour déplacer"
                          aria-label="Déplacer la ligne"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </td>
                    );

                    const dropProps = {
                      onDragOver: (e: DragEvent) => onDragOver(e, l.key),
                      onDrop: () => onDrop(l.key),
                    };

                    if (type === "blanche") {
                      return (
                        <tr key={l.key} className={rowClass} {...dropProps}>
                          {handle}
                          <td colSpan={5} className="text-xs italic text-muted">
                            — Ligne blanche —
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => removeLigne(l.key)}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    if (type === "commentaire") {
                      return (
                        <tr key={l.key} className={rowClass} {...dropProps}>
                          {handle}
                          <td colSpan={5}>
                            <input
                              className="input italic"
                              value={l.designation}
                              onChange={(e) =>
                                updateLigne(l.key, {
                                  designation: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => removeLigne(l.key)}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    if (type === "sous_total") {
                      return (
                        <tr key={l.key} className={rowClass} {...dropProps}>
                          {handle}
                          <td colSpan={4}>{l.designation}</td>
                          <td>{formatCurrency(l.prixUnitaire)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => removeLigne(l.key)}
                            >
                              <Trash2 className="h-4 w-4 text-danger" />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    const stockLigne = l.produitId
                      ? stockDisponible(
                          l.produitId,
                          pointDeVenteId,
                          entrees,
                          ventes,
                          inventaires,
                        )
                      : 0;
                    const maxLigne = l.produitId
                      ? stockRestantPourSaisie(
                          l.produitId,
                          pointDeVenteId,
                          entrees,
                          ventes,
                          lignes,
                          l.key,
                          inventaires,
                        )
                      : 0;
                    return (
                      <tr key={l.key} className={rowClass} {...dropProps}>
                        {handle}
                        <td>
                          <p className="font-medium">{l.designation}</p>
                          <p className="text-xs text-muted">
                            Stock : {formatNumber(stockLigne)} {l.unite}
                          </p>
                          <input
                            className="input mt-1 text-xs"
                            placeholder="Commentaire ligne"
                            value={l.commentaire ?? ""}
                            onChange={(e) =>
                              updateLigne(l.key, {
                                commentaire: e.target.value || undefined,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input w-20"
                            min={0}
                            max={maxLigne}
                            value={l.quantite}
                            onChange={(e) =>
                              updateLigne(l.key, {
                                quantite: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td>
                          <PrixUnitaireLigneSaisie
                            ligne={l}
                            onChange={(prixUnitaire) =>
                              updateLigne(l.key, { prixUnitaire })
                            }
                          />
                        </td>
                        <td>
                          <RemiseLigneSaisie
                            ligne={l}
                            onChange={(patch) => updateLigne(l.key, patch)}
                          />
                        </td>
                        <td className="font-semibold">
                          {formatCurrency(montantLigneHT(l))}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => removeLigne(l.key)}
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <RemiseGlobaleSaisie
              htApresLignes={Math.max(
                0,
                totauxDraft.brutHT - totauxDraft.remisesLignes,
              )}
              aDesRemisesLigne={totauxDraft.remisesLignes > 0}
              mode={form.remiseGlobaleMode}
              valeur={Number(form.remiseGlobale) || 0}
              onChange={({ mode, valeur }) =>
                setForm({
                  ...form,
                  remiseGlobaleMode: mode,
                  remiseGlobale: String(valeur),
                })
              }
            />
            <label className="block text-xs font-semibold text-muted">
              Commentaire général
              <input
                className="input mt-1"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Mention libre sur le document"
              />
            </label>
          </div>

          {footerFields}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={allerPrevalidation}
              disabled={!lignes.some((l) => isLigneProduit(l))}
            >
              Prévalider
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5">
          <div className="rounded-lg border border-sea-200 bg-sea-50/50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
              Synthèse avant enregistrement
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-card px-3 py-2">
                <p className="text-[11px] text-muted">
                  {assujettiTVA ? "Montant HT" : "Montant"}
                </p>
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(totauxDraft.totalHT)}
                </p>
              </div>
              <div className="rounded-lg bg-card px-3 py-2">
                <p className="text-[11px] text-muted">Total remise</p>
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(totauxDraft.totalRemise)}
                </p>
                {(totauxDraft.remisesLignes > 0 ||
                  totauxDraft.remiseGlobaleAppliquee > 0) && (
                  <p className="text-[10px] text-muted">
                    Lignes {formatCurrency(totauxDraft.remisesLignes)}
                    {" · "}
                    Globale{" "}
                    {formatCurrency(totauxDraft.remiseGlobaleAppliquee)}
                  </p>
                )}
              </div>
              {assujettiTVA && (
                <div className="rounded-lg bg-card px-3 py-2">
                  <p className="text-[11px] text-muted">Total TVA</p>
                  <p className="font-display text-lg font-semibold">
                    {formatCurrency(totauxDraft.montantTVA)}
                  </p>
                </div>
              )}
              {afficherAcomptes && (
                <div className="rounded-lg bg-card px-3 py-2">
                  <p className="text-[11px] text-muted">Acompte(s) payé(s)</p>
                  <p className="font-display text-lg font-semibold">
                    {formatCurrency(totauxDraft.acomptesTTC)}
                  </p>
                  {acomptesLabel && (
                    <p className="text-[11px] text-muted">{acomptesLabel}</p>
                  )}
                </div>
              )}
              {assujettiTVA && (
                <div className="rounded-lg bg-card px-3 py-2">
                  <p className="text-[11px] text-muted">Total TTC</p>
                  <p className="font-display text-lg font-semibold">
                    {formatCurrency(totauxDraft.totalTTC)}
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-sea-800 px-3 py-2 text-white">
                <p className="text-[11px] text-sea-200">
                  {afficherAcomptes
                    ? "Montant à payer"
                    : assujettiTVA
                      ? "Montant TTC"
                      : "Total"}
                </p>
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(
                    afficherAcomptes ? totauxDraft.netAPayer : totauxDraft.totalTTC,
                  )}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Détail des lignes
            </p>
            <div className="table-shell">
              <table className="data">
                <thead>
                  <tr>
                    <th>Désignation</th>
                    <th>Qté</th>
                    <th>P.U. HT (origine)</th>
                    <th>Remise</th>
                    <th>Montant HT</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l) => {
                    const type = l.type ?? "produit";
                    if (type === "blanche") {
                      return (
                        <tr key={l.key}>
                          <td colSpan={5} className="h-5" />
                        </tr>
                      );
                    }
                    if (type === "commentaire") {
                      return (
                        <tr key={l.key}>
                          <td colSpan={5} className="italic text-muted">
                            {l.designation}
                          </td>
                        </tr>
                      );
                    }
                    if (type === "sous_total") {
                      return (
                        <tr
                          key={l.key}
                          className="bg-sea-50/70 font-semibold"
                        >
                          <td colSpan={4}>{l.designation}</td>
                          <td>{formatCurrency(l.prixUnitaire)}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={l.key}>
                        <td>
                          <span className="font-medium">{l.designation}</span>
                          {l.commentaire && (
                            <span className="mt-0.5 block text-xs italic text-muted">
                              {l.commentaire}
                            </span>
                          )}
                        </td>
                        <td>
                          {formatNumber(l.quantite)} {l.unite}
                        </td>
                        <td>
                          {formatCurrency(l.prixUnitaire)}
                          {montantRemiseLigne(l) > 0 ? (
                            <span className="mt-0.5 block text-[10px] text-muted">
                              Après remise :{" "}
                              {formatCurrency(prixUnitaireNetHT(l))}
                            </span>
                          ) : null}
                        </td>
                        <td>{libelleRemiseLigne(l)}</td>
                        <td className="font-semibold">
                          {formatCurrency(montantLigneHT(l))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {form.note && (
            <p className="rounded-lg border border-line bg-card px-3 py-2 text-sm">
              <AlignLeft className="mr-1 inline h-3.5 w-3.5" />
              <strong>Commentaire général :</strong> {form.note}
            </p>
          )}

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
                Prévisualisation PDF (obligatoire avant enregistrement)
              </p>
              <DocumentPrintActions
                sheetRef={previewSheetRef}
                filename={previewMeta.numero}
              />
            </div>
            <p className="mb-3 text-xs text-muted">
              Aperçu provisoire — non enregistré ({previewMeta.numero})
            </p>
            <DocumentPreview
              ref={previewSheetRef}
              type={previewMeta.type}
              numero={previewMeta.numero}
              date={previewMeta.date}
              echeance={previewMeta.echeance}
              client={previewMeta.client}
              pdv={previewMeta.pdv}
              parametres={previewMeta.parametres}
              modele={previewMeta.modele}
              lignes={draftToLignes(recalculerSousTotaux(lignes))}
              totaux={totauxDraft}
              conditionsPaiement={previewMeta.conditionsPaiement}
              note={form.note.trim() || undefined}
              referenceDevis={previewMeta.referenceDevis}
              referenceCommande={previewMeta.referenceCommande}
              factureType={previewMeta.factureType}
              estProforma={previewMeta.estProforma}
              acomptesDetail={acomptesDetail}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={confirmer}>
              {confirmLabel}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEtape("saisie")}
            >
              Retour à l&apos;édition
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
