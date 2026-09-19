"use client";

import { Plus, Trash2 } from "lucide-react";
import { createId } from "@/lib/id";
import { motifComposantBomInvalide, NOM_NOMENCLATURE_STANDARD } from "@/lib/nomenclature";
import {
  NATURE_STOCK_LABELS,
  produitEstFabrique,
} from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import {
  TYPE_CALCUL_NOMENCLATURE_LABELS,
  typeCalculNomenclature,
} from "@/lib/nomenclature-formules";
import type {
  NatureStock,
  NomenclatureLigne,
  NomenclatureProduit,
  Produit,
  TypeCalculNomenclature,
} from "@/lib/types";

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
          <p className="text-xs text-muted">
            Chaque ligne a son propre type de calcul. Le taux (surface / périmètre) et le
            pourcentage (ratio) se saisissent ici, pas sur la fiche matière — deux produits
            peuvent consommer la même peinture à des taux différents. Faces à habiller et
            marge de chute se fondent dans le coefficient, pas dans un second champ de
            dimension.
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
            <th>Type de calcul</th>
            <th>Paramètre</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {nomenclature.lignes.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-xs text-muted">
                Aucun composant.
              </td>
            </tr>
          ) : (
            nomenclature.lignes.map((l) => (
              <LigneNomenclature
                key={l.id}
                ligne={l}
                nomenclature={nomenclature}
                composants={composants}
                onChange={onChange}
              />
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

function patchLigne(
  nomenclature: NomenclatureProduit,
  id: string,
  patch: Partial<NomenclatureLigne>,
): NomenclatureProduit {
  return {
    ...nomenclature,
    lignes: nomenclature.lignes.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  };
}

function appliquerType(
  l: NomenclatureLigne,
  t: TypeCalculNomenclature,
): Partial<NomenclatureLigne> {
  if (t === "fixe") {
    return {
      typeCalcul: undefined,
      taux: undefined,
      pourcentage: undefined,
      lignePivotId: undefined,
      quantite: l.quantite > 0 ? l.quantite : 1,
    };
  }
  if (t === "surface" || t === "perimetre") {
    return {
      typeCalcul: t,
      pourcentage: undefined,
      lignePivotId: undefined,
      taux: Number(l.taux) > 0 ? l.taux : undefined,
      quantite: 0,
    };
  }
  return {
    typeCalcul: "ratio_pivot",
    taux: undefined,
    quantite: 0,
    pourcentage: Number(l.pourcentage) > 0 ? l.pourcentage : 10,
  };
}

function LigneNomenclature({
  ligne,
  nomenclature,
  composants,
  onChange,
}: {
  ligne: NomenclatureLigne;
  nomenclature: NomenclatureProduit;
  composants: Produit[];
  onChange: (n: NomenclatureProduit) => void;
}) {
  const type = typeCalculNomenclature(ligne);
  const utiliseeCommePivot = nomenclature.lignes.some(
    (x) => x.lignePivotId === ligne.id,
  );
  const pivots = nomenclature.lignes.filter(
    (x) => x.id !== ligne.id && typeCalculNomenclature(x) !== "ratio_pivot",
  );
  const nomLigne = (id: string) => {
    const x = nomenclature.lignes.find((n) => n.id === id);
    const c = x ? composants.find((p) => p.id === x.composantId) : undefined;
    return c ? `${c.code} — ${libelleProduit(c)}` : id;
  };

  return (
    <tr>
      <td>
        <select
          className="select"
          value={ligne.composantId}
          onChange={(e) =>
            onChange(patchLigne(nomenclature, ligne.id, { composantId: e.target.value }))
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
        <select
          className="select"
          value={type}
          onChange={(e) => {
            const t = e.target.value as TypeCalculNomenclature;
            if (t === "ratio_pivot" && utiliseeCommePivot) {
              alert(
                "Cette ligne est le pivot d'un ratio : retirez d'abord les ratios qui s'y réfèrent.",
              );
              return;
            }
            onChange(patchLigne(nomenclature, ligne.id, appliquerType(ligne, t)));
          }}
        >
          {(Object.keys(TYPE_CALCUL_NOMENCLATURE_LABELS) as TypeCalculNomenclature[]).map(
            (t) => (
              <option key={t} value={t}>
                {TYPE_CALCUL_NOMENCLATURE_LABELS[t]}
              </option>
            ),
          )}
        </select>
      </td>
      <td>
        {type === "fixe" && (
          <label className="block text-[11px] font-semibold text-muted">
            Qté / unité
            <input
              type="number"
              min={0}
              step="any"
              className="input mt-1"
              value={ligne.quantite}
              onChange={(e) =>
                onChange(
                  patchLigne(nomenclature, ligne.id, {
                    quantite: Number(e.target.value) || 0,
                  }),
                )
              }
            />
          </label>
        )}
        {type === "surface" && (
          <label className="block text-[11px] font-semibold text-muted">
            Consommation par m² de surface de vente
            <input
              type="number"
              min={0}
              step="any"
              className="input mt-1"
              value={ligne.taux ?? ""}
              onChange={(e) =>
                onChange(
                  patchLigne(nomenclature, ligne.id, {
                    taux: Number(e.target.value) || 0,
                  }),
                )
              }
              placeholder="ex. 150 (g/m², faces + chute inclus)"
            />
          </label>
        )}
        {type === "perimetre" && (
          <label className="block text-[11px] font-semibold text-muted">
            Consommation par m de périmètre de vente
            <input
              type="number"
              min={0}
              step="any"
              className="input mt-1"
              value={ligne.taux ?? ""}
              onChange={(e) =>
                onChange(
                  patchLigne(nomenclature, ligne.id, {
                    taux: Number(e.target.value) || 0,
                  }),
                )
              }
              placeholder="ex. ml/m, vis/m…"
            />
          </label>
        )}
        {type === "ratio_pivot" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] font-semibold text-muted">
              % du pivot
              <input
                type="number"
                min={0}
                step="any"
                className="input mt-1"
                value={ligne.pourcentage ?? ""}
                onChange={(e) =>
                  onChange(
                    patchLigne(nomenclature, ligne.id, {
                      pourcentage: Number(e.target.value) || 0,
                    }),
                  )
                }
              />
            </label>
            <label className="block text-[11px] font-semibold text-muted">
              Pivot
              <select
                className="select mt-1"
                value={ligne.lignePivotId ?? ""}
                onChange={(e) =>
                  onChange(
                    patchLigne(nomenclature, ligne.id, {
                      lignePivotId: e.target.value || undefined,
                    }),
                  )
                }
              >
                <option value="">—</option>
                {pivots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {nomLigne(p.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </td>
      <td>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() =>
            onChange({
              ...nomenclature,
              lignes: nomenclature.lignes
                .filter((x) => x.id !== ligne.id)
                .map((x) =>
                  x.lignePivotId === ligne.id ? { ...x, lignePivotId: undefined } : x,
                ),
            })
          }
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
