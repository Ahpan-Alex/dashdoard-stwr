"use client";

import { AlertTriangle } from "lucide-react";
import { dernierPrixAchatConnu, anomaliesFournisseurRetenu } from "@/lib/classement-fournisseurs";
import {
  fournisseurRetenuLigne,
  offreLigneFournisseur,
  prixMiniLigne,
  prixNetOffre,
} from "@/lib/demandes-prix";
import { formatCurrency, formatDate } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import type { DemandePrix, DemandePrixOffre } from "@/lib/types";

type Props = {
  dp: DemandePrix;
  nomFrn: (id: string) => string;
  verrouille: boolean;
};

export function DpComparatif({ dp, nomFrn, verrouille }: Props) {
  const produits = useStore((s) => s.produits ?? []);
  const achats = useStore((s) => s.achats);
  const patchOffre = useStore((s) => s.patchOffreDemandePrix);
  const modifier = useStore((s) => s.modifierDemandePrix);
  const fournisseurs = dp.fournisseurIds ?? [];
  const lignes = dp.lignes ?? [];

  function maj(
    ligneId: string,
    fournisseurId: string,
    patch: Partial<
      Pick<
        DemandePrixOffre,
        | "prixUnitaire"
        | "delaiJours"
        | "remisePercent"
        | "validiteOffreJours"
        | "francoPort"
        | "conditions"
      >
    >,
  ) {
    const res = patchOffre(dp.id, ligneId, fournisseurId, patch);
    if (!res.ok) alert(res.reason);
  }

  function retenir(ligneId: string, fournisseurId: string) {
    const next = [
      ...(dp.retenuesParLigne ?? []).filter((r) => r.ligneId !== ligneId),
      ...(fournisseurId ? [{ ligneId, fournisseurId }] : []),
    ];
    const ids = [...new Set(next.map((r) => r.fournisseurId))];
    const res = modifier(dp.id, { retenuesParLigne: next, fournisseurIdsRetenus: ids });
    if (!res.ok) alert(res.reason);
  }

  if (lignes.length === 0 || fournisseurs.length === 0) {
    return (
      <p className="text-sm text-muted">
        Ajoutez au moins un article et un fournisseur (en brouillon) pour saisir les
        réponses.
      </p>
    );
  }

  return (
    <div className="table-shell overflow-x-auto">
      <table className="data">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card">Article</th>
            <th>Qté</th>
            {fournisseurs.map((fid) => (
              <th key={fid}>{nomFrn(fid)}</th>
            ))}
            <th>Fournisseur retenu</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => {
            const p = produits.find((x) => x.id === ligne.produitId);
            const offres = fournisseurs.map(
              (fid) =>
                offreLigneFournisseur(dp, ligne.id, fid) ?? {
                  id: `tmp-${ligne.id}-${fid}`,
                  ligneId: ligne.id,
                  fournisseurId: fid,
                  prixUnitaire: 0,
                },
            );
            const mini = prixMiniLigne(offres, ligne.id);
            const dernier = dernierPrixAchatConnu(ligne.produitId, achats);
            const retenu = fournisseurRetenuLigne(dp, ligne.id) ?? "";
            const anomalieRetenu = anomaliesFournisseurRetenu(dp, achats).find(
              (a) => a.ligneId === ligne.id,
            );
            return (
              <tr key={ligne.id}>
                <td className="sticky left-0 z-10 bg-card font-medium">
                  <div>{p ? `${p.code} — ${libelleProduit(p)}` : "Article"}</div>
                  {ligne.specifications && (
                    <p className="text-[11px] text-muted">{ligne.specifications}</p>
                  )}
                  {(ligne.dateLivraisonSouhaitee || dp.dateLivraisonSouhaitee) && (
                    <p className="text-[11px] text-muted">
                      Livraison{" "}
                      {formatDate(
                        ligne.dateLivraisonSouhaitee || dp.dateLivraisonSouhaitee || "",
                      )}
                    </p>
                  )}
                  {dernier && (
                    <p className="text-[11px] text-muted">
                      Dernier achat {formatCurrency(dernier.prix)}
                    </p>
                  )}
                </td>
                <td>{ligne.quantite}</td>
                {offres.map((o) => {
                  const net = o.prixUnitaire > 0 ? prixNetOffre(o) : 0;
                  const bas = mini != null && net > 0 && net === mini;
                  const tropCher = dernier != null && net > 0 && net > dernier.prix;
                  return (
                    <td
                      key={`${o.ligneId}-${o.fournisseurId}`}
                      className={`align-top ${bas ? "bg-emerald-50" : ""}`}
                    >
                      <div className="grid min-w-[14rem] gap-1 sm:grid-cols-2">
                        <label className="text-[10px] font-semibold text-muted">
                          PU HT
                          {verrouille ? (
                            <p className={`text-sm ${bas ? "font-semibold text-emerald-800" : ""}`}>
                              {o.prixUnitaire > 0 ? formatCurrency(o.prixUnitaire) : "—"}
                              {bas ? " · plus bas" : ""}
                            </p>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              className={`input mt-0.5 ${bas ? "border-emerald-400" : ""} ${
                                tropCher ? "border-amber-500" : ""
                              }`}
                              value={o.prixUnitaire || ""}
                              onChange={(e) =>
                                maj(ligne.id, o.fournisseurId, {
                                  prixUnitaire: Number(e.target.value) || 0,
                                })
                              }
                            />
                          )}
                        </label>
                        <label className="text-[10px] font-semibold text-muted">
                          Délai (j)
                          {verrouille ? (
                            <p className="text-sm">{o.delaiJours ?? "—"}</p>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              className="input mt-0.5"
                              value={o.delaiJours ?? ""}
                              onChange={(e) =>
                                maj(ligne.id, o.fournisseurId, {
                                  delaiJours:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                })
                              }
                            />
                          )}
                        </label>
                        <label className="text-[10px] font-semibold text-muted">
                          Remise %
                          {verrouille ? (
                            <p className="text-sm">{o.remisePercent ?? "—"}</p>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="input mt-0.5"
                              value={o.remisePercent ?? ""}
                              onChange={(e) =>
                                maj(ligne.id, o.fournisseurId, {
                                  remisePercent:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                })
                              }
                            />
                          )}
                        </label>
                        <label className="text-[10px] font-semibold text-muted">
                          Validité offre (j)
                          {verrouille ? (
                            <p className="text-sm">{o.validiteOffreJours ?? "—"}</p>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              className="input mt-0.5"
                              value={o.validiteOffreJours ?? ""}
                              onChange={(e) =>
                                maj(ligne.id, o.fournisseurId, {
                                  validiteOffreJours:
                                    e.target.value === ""
                                      ? undefined
                                      : Number(e.target.value),
                                })
                              }
                            />
                          )}
                        </label>
                      </div>
                      <label className="mt-1 flex items-center gap-1.5 text-[11px]">
                        <input
                          type="checkbox"
                          checked={Boolean(o.francoPort)}
                          disabled={verrouille}
                          onChange={(e) =>
                            maj(ligne.id, o.fournisseurId, {
                              francoPort: e.target.checked,
                            })
                          }
                        />
                        Franco de port
                      </label>
                      {verrouille ? (
                        o.conditions ? (
                          <p className="mt-1 text-[11px] text-muted">{o.conditions}</p>
                        ) : null
                      ) : (
                        <input
                          className="input mt-1"
                          placeholder="Autres conditions"
                          value={o.conditions ?? ""}
                          onChange={(e) =>
                            maj(ligne.id, o.fournisseurId, {
                              conditions: e.target.value,
                            })
                          }
                        />
                      )}
                      {tropCher && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Au-dessus du dernier achat ({formatCurrency(dernier.prix)})
                        </p>
                      )}
                      {bas && !verrouille && (
                        <p className="mt-1 text-[11px] font-medium text-emerald-800">
                          Prix le plus bas
                        </p>
                      )}
                    </td>
                  );
                })}
                <td>
                  <select
                    className="select min-w-[10rem]"
                    value={retenu}
                    disabled={dp.statut === "annulee"}
                    onChange={(e) => retenir(ligne.id, e.target.value)}
                  >
                    <option value="">— Choisir —</option>
                    {fournisseurs.map((fid) => (
                      <option key={fid} value={fid}>
                        {nomFrn(fid)}
                      </option>
                    ))}
                  </select>
                  {anomalieRetenu && (
                    <p className="mt-1 flex items-start gap-1 text-[11px] font-medium text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      Ni le moins cher
                      {anomalieRetenu.prixMini != null
                        ? ` (${formatCurrency(anomalieRetenu.prixMini)})`
                        : ""}
                      {" "}ni conforme au dernier prix connu
                      {anomalieRetenu.dernierPrix != null
                        ? ` (${formatCurrency(anomalieRetenu.dernierPrix)})`
                        : ""}
                      .
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
