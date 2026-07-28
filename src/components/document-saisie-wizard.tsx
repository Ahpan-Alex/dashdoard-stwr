"use client";

import { useMemo, useState, type DragEvent, type ReactNode } from "react";
import {
  AlignLeft,
  GripVertical,
  MessageSquare,
  Minus,
  Plus,
  Sigma,
  Trash2,
} from "lucide-react";
import {
  calculerTotaux,
  isLigneProduit,
  montantLigneHT,
  recalculerSousTotaux as recalculerSousTotauxBase,
  type TotauxDocument,
} from "@/lib/commercial";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  LigneDocument,
  Produit,
  TarifClient,
  TypeLigneDocument,
} from "@/lib/types";
import {
  designationFacture,
  prixVenteCatalogue,
  produitsActifs,
  resolvePrixVenteHT,
} from "@/lib/produits";

export type DraftLigne = Omit<LigneDocument, "id"> & { key: string };
export type EtapeDocument = "saisie" | "prevalidation";

function uidLocal() {
  return `tmp-${crypto.randomUUID().slice(0, 8)}`;
}

export function recalculerSousTotaux(lignes: DraftLigne[]): DraftLigne[] {
  return recalculerSousTotauxBase(
    lignes.map((l) => ({ ...l, id: l.key })),
  ).map(({ id, ...rest }) => ({ ...rest, key: id }));
}

export function draftToLignes(lignes: DraftLigne[]): LigneDocument[] {
  return lignes.map((l, i) => ({
    id: `nl-${i}`,
    type: l.type ?? "produit",
    produitId: l.produitId,
    codeProduit: l.codeProduit,
    designation: l.designation,
    quantite: l.quantite,
    prixUnitaire: l.prixUnitaire,
    unite: l.unite,
    tauxTVA: l.tauxTVA,
    remisePercent: l.remisePercent,
    commentaire: l.commentaire,
  }));
}

export function lignesToDraft(lignes: LigneDocument[]): DraftLigne[] {
  return lignes.map((l) => {
    const { id: _id, ...rest } = l;
    return { ...rest, key: uidLocal() };
  });
}

type Props = {
  titre: string;
  produits: Produit[];
  tauxTVA: number;
  assujettiTVA: boolean;
  clientId?: string;
  tarifsClients?: TarifClient[];
  /** Afficher la ligne acomptes dans la prévalidation */
  showAcomptes?: boolean;
  acomptesTTC?: number;
  acomptesLabel?: string;
  confirmLabel: string;
  headerFields: ReactNode;
  onConfirm: (payload: {
    lignes: LigneDocument[];
    remiseGlobale: number;
    note?: string;
  }) => void;
  onCancel: () => void;
  /** Lignes initiales (ex. depuis un devis) */
  initialLignes?: DraftLigne[];
  initialRemiseGlobale?: number;
  initialNote?: string;
};

export function DocumentSaisieWizard({
  titre,
  produits,
  tauxTVA,
  assujettiTVA,
  clientId,
  tarifsClients = [],
  showAcomptes = false,
  acomptesTTC = 0,
  acomptesLabel,
  confirmLabel,
  headerFields,
  onConfirm,
  onCancel,
  initialLignes = [],
  initialRemiseGlobale = 0,
  initialNote = "",
}: Props) {
  const produitsDispo = produitsActifs(produits);
  const [etape, setEtape] = useState<EtapeDocument>("saisie");
  const [lignes, setLignes] = useState<DraftLigne[]>(initialLignes);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    produitId: produitsDispo[0]?.id ?? "",
    quantite: "1",
    prixUnitaire: produitsDispo[0]
      ? String(
          resolvePrixVenteHT(produitsDispo[0], {
            clientId,
            quantite: 1,
            tarifsClients,
          }),
        )
      : "",
    remisePercent: "0",
    commentaireLigne: "",
    remiseGlobale: String(initialRemiseGlobale || 0),
    note: initialNote,
    commentaireLibre: "",
  });

  const totauxDraft: TotauxDocument = useMemo(() => {
    return calculerTotaux(
      lignes.map((l) => ({ ...l, id: l.key })),
      tauxTVA,
      acomptesTTC,
      assujettiTVA,
      Number(form.remiseGlobale) || 0,
    );
  }, [lignes, tauxTVA, acomptesTTC, assujettiTVA, form.remiseGlobale]);

  function addProduitLigne() {
    const prod = produitsDispo.find((p) => p.id === form.produitId);
    const qte = Number(form.quantite);
    const prix = Number(form.prixUnitaire);
    const remise = Number(form.remisePercent) || 0;
    if (!prod || qte <= 0 || prix < 0) return;
    setLignes((prev) =>
      recalculerSousTotaux([
        ...prev,
        {
          key: uidLocal(),
          type: "produit",
          produitId: prod.id,
          codeProduit: prod.code,
          designation: designationFacture(prod),
          quantite: qte,
          prixUnitaire: prix,
          unite: prod.unite,
          tauxTVA: assujettiTVA ? prod.tauxTVA : 0,
          remisePercent: remise > 0 ? remise : undefined,
          commentaire: form.commentaireLigne.trim() || undefined,
        },
      ]),
    );
    setForm((f) => ({
      ...f,
      quantite: "1",
      remisePercent: "0",
      commentaireLigne: "",
    }));
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
    setLignes((prev) =>
      recalculerSousTotaux(
        prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
      ),
    );
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
    setLignes((prev) => recalculerSousTotaux(prev));
    setEtape("prevalidation");
  }

  function confirmer() {
    if (!lignes.some((l) => isLigneProduit(l))) return;
    const remiseGlobale = Number(form.remiseGlobale) || 0;
    onConfirm({
      lignes: draftToLignes(recalculerSousTotaux(lignes)),
      remiseGlobale,
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
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Ajouter un produit
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <select
                className="select lg:col-span-2"
                value={form.produitId}
                onChange={(e) => {
                  const prod = produitsDispo.find((p) => p.id === e.target.value);
                  const qte = Number(form.quantite) || 1;
                  setForm({
                    ...form,
                    produitId: e.target.value,
                    prixUnitaire: prod
                      ? String(
                          resolvePrixVenteHT(prod, {
                            clientId,
                            quantite: qte,
                            tarifsClients,
                          }),
                        )
                      : form.prixUnitaire,
                  });
                }}
              >
                {produitsDispo.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.libelleCourt} ({prixVenteCatalogue(p)} Ar)
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.1"
                className="input"
                placeholder="Qté"
                value={form.quantite}
                onChange={(e) => setForm({ ...form, quantite: e.target.value })}
              />
              <input
                type="number"
                step="100"
                className="input"
                placeholder="P.U. HT"
                value={form.prixUnitaire}
                onChange={(e) =>
                  setForm({ ...form, prixUnitaire: e.target.value })
                }
              />
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                placeholder="Remise %"
                value={form.remisePercent}
                onChange={(e) =>
                  setForm({ ...form, remisePercent: e.target.value })
                }
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addProduitLigne}
              >
                <Plus className="h-4 w-4" />
                Produit
              </button>
            </div>
            <input
              className="input mt-2"
              placeholder="Commentaire sur cette ligne (optionnel)"
              value={form.commentaireLigne}
              onChange={(e) =>
                setForm({ ...form, commentaireLigne: e.target.value })
              }
            />
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
                  <th>P.U. HT</th>
                  <th>Remise</th>
                  <th>Montant HT</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lignes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted">
                      Aucune ligne. Ajoutez des produits ou éléments.
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
                    return (
                      <tr key={l.key} className={rowClass} {...dropProps}>
                        {handle}
                        <td>
                          <p className="font-medium">{l.designation}</p>
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
                            value={l.quantite}
                            onChange={(e) =>
                              updateLigne(l.key, {
                                quantite: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input w-28"
                            value={l.prixUnitaire}
                            onChange={(e) =>
                              updateLigne(l.key, {
                                prixUnitaire: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input w-16"
                            value={l.remisePercent ?? 0}
                            onChange={(e) =>
                              updateLigne(l.key, {
                                remisePercent:
                                  Number(e.target.value) || undefined,
                              })
                            }
                          />
                          <span className="ml-1 text-xs text-muted">%</span>
                        </td>
                        <td className="font-semibold">
                          {formatCurrency(montantLigneHT({ ...l, id: l.key }))}
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
            <label className="block text-xs font-semibold text-muted">
              Remise globale HT (Ar)
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={form.remiseGlobale}
                onChange={(e) =>
                  setForm({ ...form, remiseGlobale: e.target.value })
                }
              />
            </label>
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
                <p className="text-[11px] text-muted">Montant HT</p>
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(totauxDraft.totalHT)}
                </p>
              </div>
              <div className="rounded-lg bg-card px-3 py-2">
                <p className="text-[11px] text-muted">Total remise</p>
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(totauxDraft.totalRemise)}
                </p>
              </div>
              <div className="rounded-lg bg-card px-3 py-2">
                <p className="text-[11px] text-muted">Total TVA</p>
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(totauxDraft.montantTVA)}
                </p>
              </div>
              {showAcomptes && (
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
              <div className="rounded-lg bg-card px-3 py-2">
                <p className="text-[11px] text-muted">Total TTC</p>
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(totauxDraft.totalTTC)}
                </p>
              </div>
              <div className="rounded-lg bg-sea-800 px-3 py-2 text-white">
                <p className="text-[11px] text-sea-200">
                  {showAcomptes ? "Montant à payer" : "Montant TTC"}
                </p>
                <p className="font-display text-lg font-semibold">
                  {formatCurrency(
                    showAcomptes ? totauxDraft.netAPayer : totauxDraft.totalTTC,
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
                    <th>P.U. HT</th>
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
                        <td>{formatCurrency(l.prixUnitaire)}</td>
                        <td>
                          {l.remisePercent ? `${l.remisePercent} %` : "—"}
                        </td>
                        <td className="font-semibold">
                          {formatCurrency(montantLigneHT({ ...l, id: l.key }))}
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

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={confirmer}>
              {confirmLabel}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEtape("saisie")}
            >
              Modifier
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
