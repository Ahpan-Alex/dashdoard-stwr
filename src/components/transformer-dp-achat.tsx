"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SelecteurArticle } from "@/components/selecteur-article";
import { formatCurrency } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import {
  dpPeutEtreTransformee,
  lignesCommandeDepuisDp,
} from "@/lib/demandes-prix";
import { produitEstAchetable } from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import type { DemandePrix, Produit } from "@/lib/types";

type LigneEdit = {
  produitId: string;
  quantite: string;
  prixAchatUnitaire: string;
};

function lignesInitiales(dp: DemandePrix, fournisseurId: string, produits: Produit[]) {
  return lignesCommandeDepuisDp(dp, fournisseurId, produits).map((l) => ({
    produitId: l.produitId,
    quantite: String(l.quantite),
    prixAchatUnitaire: l.prixAchatUnitaire > 0 ? String(l.prixAchatUnitaire) : "",
  }));
}

export function TransformerDpAchat({
  dp,
  nomFrn,
}: {
  dp: DemandePrix;
  nomFrn: (id: string) => string;
}) {
  const router = useRouter();
  const produits = useStore((s) => s.produits ?? []);
  const transformer = useStore((s) => s.transformerDemandePrixEnAchats);
  const { visibles } = useSitesVisibles();
  const sites = visibles.filter((s) => s.actif);
  const retenus = dp.fournisseurIdsRetenus ?? [];
  const articles = useMemo(
    () => (produits ?? []).filter((p) => p?.actif && produitEstAchetable(p)),
    [produits],
  );

  const [ouvert, setOuvert] = useState(false);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [date, setDate] = useState(jourLocalISO());
  const [frnChoisis, setFrnChoisis] = useState<string[]>(retenus);
  const [parFrn, setParFrn] = useState<Record<string, LigneEdit[]>>(() => {
    const init: Record<string, LigneEdit[]> = {};
    for (const fid of retenus) {
      init[fid] = lignesInitiales(dp, fid, produits);
    }
    return init;
  });

  if (!dpPeutEtreTransformee(dp)) {
    return (
      <p className="text-sm text-muted">
        Indiquez d’abord le ou les fournisseurs retenus pour transformer cette DP
        en commande fournisseur.
      </p>
    );
  }

  function toggleFrn(id: string) {
    setFrnChoisis((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setParFrn((m) => ({
        ...m,
        [id]: m[id] ?? lignesInitiales(dp, id, produits),
      }));
      return next;
    });
  }

  function patchLigne(fid: string, index: number, patch: Partial<LigneEdit>) {
    setParFrn((m) => ({
      ...m,
      [fid]: (m[fid] ?? []).map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));
  }

  function lancer() {
    if (!siteId) {
      alert("Choisissez un site de destination.");
      return;
    }
    if (frnChoisis.length === 0) {
      alert("Sélectionnez au moins un fournisseur retenu.");
      return;
    }
    const commandes = [];
    for (const fid of frnChoisis) {
      const lignes = (parFrn[fid] ?? [])
        .filter((l) => l.produitId)
        .map((l) => ({
          produitId: l.produitId,
          quantite: Number(l.quantite) || 0,
          prixAchatUnitaire: Number(l.prixAchatUnitaire) || 0,
        }));
      if (lignes.length === 0) {
        alert(`Ajoutez au moins un article pour ${nomFrn(fid)}.`);
        return;
      }
      if (lignes.some((l) => !(l.quantite > 0))) {
        alert("Chaque ligne doit avoir une quantité positive.");
        return;
      }
      commandes.push({ fournisseurId: fid, lignes });
    }
    const res = transformer(dp.id, {
      pointDeVenteId: siteId,
      date: isoMidiDepuisJour(date),
      commandes,
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    const premier = res.achatIds[0];
    router.push(premier ? `/achats?id=${premier}` : "/achats");
  }

  return (
    <div>
      {!ouvert ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const init: Record<string, LigneEdit[]> = {};
            for (const fid of retenus) {
              init[fid] = lignesInitiales(dp, fid, produits);
            }
            setParFrn(init);
            setFrnChoisis(retenus);
            setSiteId(sites[0]?.id ?? "");
            setOuvert(true);
          }}
        >
          Transformer en commande fournisseur
        </button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Les commandes sont créées en brouillon : vous pourrez encore modifier
            les lignes, le site et les prix avant validation.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Site de destination
              <select
                className="select mt-1"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="">— Choisir —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Date de commande
              <input
                type="date"
                className="input mt-1"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">
              Fournisseurs à commander
            </p>
            <div className="flex flex-wrap gap-2">
              {retenus.map((fid) => (
                <label
                  key={fid}
                  className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={frnChoisis.includes(fid)}
                    onChange={() => toggleFrn(fid)}
                  />
                  {nomFrn(fid)}
                </label>
              ))}
            </div>
          </div>
          {frnChoisis.map((fid) => (
            <div key={fid} className="rounded-[var(--radius)] border border-line p-3">
              <h4 className="mb-2 font-semibold">{nomFrn(fid)}</h4>
              <div className="space-y-2">
                {(parFrn[fid] ?? []).map((l, i) => {
                  const p = produits.find((x) => x.id === l.produitId);
                  return (
                    <div key={`${fid}-${i}`} className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
                      <p className="self-center text-sm">
                        {p ? `${p.code} — ${libelleProduit(p)}` : "Article"}
                      </p>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className="input"
                        value={l.quantite}
                        onChange={(e) => patchLigne(fid, i, { quantite: e.target.value })}
                        aria-label="Quantité"
                      />
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className="input"
                        value={l.prixAchatUnitaire}
                        onChange={(e) =>
                          patchLigne(fid, i, { prixAchatUnitaire: e.target.value })
                        }
                        aria-label="Prix unitaire"
                        placeholder="Prix HT"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          setParFrn((m) => ({
                            ...m,
                            [fid]: (m[fid] ?? []).filter((_, j) => j !== i),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <AjouterLigne
                articles={articles}
                onAdd={(produitId) =>
                  setParFrn((m) => ({
                    ...m,
                    [fid]: [
                      ...(m[fid] ?? []),
                      { produitId, quantite: "1", prixAchatUnitaire: "" },
                    ],
                  }))
                }
              />
              <p className="mt-2 text-xs text-muted">
                Total HT estimé :{" "}
                {formatCurrency(
                  (parFrn[fid] ?? []).reduce(
                    (s, l) =>
                      s + (Number(l.quantite) || 0) * (Number(l.prixAchatUnitaire) || 0),
                    0,
                  ),
                )}
              </p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={lancer}>
              Créer {frnChoisis.length > 1 ? "les brouillons" : "le brouillon"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOuvert(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AjouterLigne({
  articles,
  onAdd,
}: {
  articles: Produit[];
  onAdd: (produitId: string) => void;
}) {
  const [id, setId] = useState("");
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[14rem] flex-1">
        <SelecteurArticle
          produits={articles}
          value={id}
          onChange={setId}
          allowEmpty
          emptyLabel="— Ajouter un article —"
        />
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          if (!id) return;
          onAdd(id);
          setId("");
        }}
      >
        <Plus className="h-4 w-4" />
        Ajouter
      </button>
    </div>
  );
}
