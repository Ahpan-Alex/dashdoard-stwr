"use client";

import { Plus, Trash2 } from "lucide-react";
import { createId } from "@/lib/id";
import { motifComposantBomInvalide, NOM_NOMENCLATURE_STANDARD } from "@/lib/nomenclature";
import {
  NATURE_STOCK_LABELS,
  produitEstFabrique,
} from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import type { NatureStock, NomenclatureProduit, Produit } from "@/lib/types";

export function NomenclatureEditor({
  natureStock,
  nomenclatures,
  parentId,
  produits,
  onNatureChange,
  onNomenclaturesChange,
}: {
  natureStock: NatureStock;
  nomenclatures: NomenclatureProduit[];
  parentId?: string;
  produits: Produit[];
  onNatureChange: (n: NatureStock) => void;
  onNomenclaturesChange: (n: NomenclatureProduit[]) => void;
}) {
  const fabrique = produitEstFabrique({ natureStock });
  const auto =
    nomenclatures.find((n) => n.type === "automatique") ?? {
      id: "nomenc-auto",
      type: "automatique" as const,
      nom: NOM_NOMENCLATURE_STANDARD,
      lignes: [],
    };
  const alt = nomenclatures.find((n) => n.type === "alternative");
  const composants = produits.filter(
    (p) => p.actif && p.id !== parentId && (p.natureStock ?? "matiere_premiere") !== "fini",
  );

  function setAuto(next: NomenclatureProduit) {
    onNomenclaturesChange(alt ? [next, alt] : [next]);
  }

  function setAlt(next: NomenclatureProduit | null) {
    onNomenclaturesChange(next ? [auto, next] : [auto]);
  }

  return (
    <div className="sm:col-span-2 space-y-3">
      <label className="block text-xs font-semibold text-muted">
        Nature de stock
        <select
          className="select mt-1"
          value={natureStock}
          onChange={(e) => onNatureChange(e.target.value as NatureStock)}
        >
          {(Object.keys(NATURE_STOCK_LABELS) as NatureStock[]).map((n) => (
            <option key={n} value={n}>
              {NATURE_STOCK_LABELS[n]}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted">
        Indépendant du type d&apos;achat (rattachement comptable classe 6). Semi-fini et
        fini sont vendables de la même façon ; seul un semi-fini peut aussi servir de
        composant à un OF aval.
      </p>
      {fabrique && (
        <div className="space-y-4 rounded-[var(--radius)] border border-line p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
            Nomenclatures (max. 2)
          </p>
          <BlocNomenclature
            titre={NOM_NOMENCLATURE_STANDARD}
            nomenclature={auto}
            composants={composants}
            parentId={parentId}
            produits={produits}
            nomEditable={false}
            onChange={setAuto}
          />
          {alt ? (
            <BlocNomenclature
              titre="Nomenclature alternative"
              nomenclature={alt}
              composants={composants}
              parentId={parentId}
              produits={produits}
              nomEditable
              onChange={(n) => setAlt(n)}
              onRemove={() => setAlt(null)}
            />
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setAlt({
                  id: createId("nomenc"),
                  type: "alternative",
                  nom: "",
                  lignes: [],
                })
              }
            >
              <Plus className="h-4 w-4" />
              Ajouter une nomenclature alternative
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BlocNomenclature({
  titre,
  nomenclature,
  composants,
  parentId,
  produits,
  nomEditable,
  onChange,
  onRemove,
}: {
  titre: string;
  nomenclature: NomenclatureProduit;
  composants: Produit[];
  parentId?: string;
  produits: Produit[];
  nomEditable: boolean;
  onChange: (n: NomenclatureProduit) => void;
  onRemove?: () => void;
}) {
  function ajouter() {
    const premier = composants.find(
      (c) => !nomenclature.lignes.some((l) => l.composantId === c.id),
    );
    if (!premier) {
      alert("Aucun composant disponible (matière première ou semi-fini).");
      return;
    }
    const motif = motifComposantBomInvalide(premier, parentId ?? "");
    if (motif) {
      alert(motif);
      return;
    }
    onChange({
      ...nomenclature,
      lignes: [
        ...nomenclature.lignes,
        { id: createId("nl"), composantId: premier.id, quantite: 1 },
      ],
    });
  }

  return (
    <div className="rounded-lg border border-line/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">{titre}</p>
        {onRemove && (
          <button type="button" className="text-xs text-danger" onClick={onRemove}>
            Retirer
          </button>
        )}
      </div>
      {nomEditable && (
        <label className="mb-2 block text-xs font-semibold text-muted">
          Nom libre
          <input
            className="input mt-1"
            value={nomenclature.nom}
            onChange={(e) => onChange({ ...nomenclature, nom: e.target.value })}
            placeholder="Ex. Version économique, Recette hiver"
            required
          />
        </label>
      )}
      <table className="data">
        <thead>
          <tr>
            <th>Composant</th>
            <th>Qté / unité</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {nomenclature.lignes.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-xs text-muted">
                Aucun composant.
              </td>
            </tr>
          ) : (
            nomenclature.lignes.map((l) => (
              <tr key={l.id}>
                <td>
                  <select
                    className="select"
                    value={l.composantId}
                    onChange={(e) =>
                      onChange({
                        ...nomenclature,
                        lignes: nomenclature.lignes.map((x) =>
                          x.id === l.id ? { ...x, composantId: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    {composants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {libelleProduit(c)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="input"
                    value={l.quantite}
                    onChange={(e) =>
                      onChange({
                        ...nomenclature,
                        lignes: nomenclature.lignes.map((x) =>
                          x.id === l.id
                            ? { ...x, quantite: Number(e.target.value) || 0 }
                            : x,
                        ),
                      })
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      onChange({
                        ...nomenclature,
                        lignes: nomenclature.lignes.filter((x) => x.id !== l.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <button type="button" className="btn btn-secondary mt-2" onClick={ajouter}>
        <Plus className="h-4 w-4" />
        Ajouter un composant
      </button>
      {nomenclature.lignes.map((l) => {
        const p = produits.find((x) => x.id === l.composantId);
        return p ? null : (
          <p key={l.id} className="mt-1 text-xs text-danger">
            Composant introuvable.
          </p>
        );
      })}
    </div>
  );
}
