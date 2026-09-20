"use client";

import { useMemo, useState } from "react";
import { BadgeMargeTheorique } from "@/components/badge-marge-theorique";
import { downloadCsv } from "@/lib/csv";
import {
  analyserMargeTheorique,
  calculerCoutTheoriqueNomenclature,
  collecterParametresSimulation,
  lignesCsvSimulation,
  type CoutTheoriqueNomenclature,
  type OverridesCoutTheorique,
} from "@/lib/cout-theorique";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { DimensionOf } from "@/lib/nomenclature-formules";
import type {
  EntreeStock,
  Inventaire,
  NomenclatureProduit,
  Parametres,
  PointDeVente,
  Produit,
  Vente,
} from "@/lib/types";

export function SimulationCoutTheoriqueModal({
  produit,
  nomenclature,
  actuel,
  prixVenteActuel,
  parametres,
  produits,
  entrees,
  ventes,
  inventaires,
  ateliers,
  dims,
  onFermer,
}: {
  produit: Produit;
  nomenclature: NomenclatureProduit;
  actuel: CoutTheoriqueNomenclature;
  prixVenteActuel: number;
  parametres: Parametres;
  produits: Produit[];
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires: Inventaire[];
  ateliers: PointDeVente[];
  dims?: DimensionOf;
  onFermer: () => void;
}) {
  const params = useMemo(() => collecterParametresSimulation(actuel), [actuel]);
  const [qte, setQte] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const l of params.lignes) {
      o[l.ligneId] = l.quantiteActuelle == null ? "" : String(l.quantiteActuelle);
    }
    return o;
  });
  const [cump, setCump] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const c of params.cump) {
      o[c.produitId] = c.cumpActuel == null ? "" : String(Math.round(c.cumpActuel));
    }
    return o;
  });
  const [taux, setTaux] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const a of params.ateliers) {
      o[a.atelierId] = a.tauxActuel > 0 ? String(a.tauxActuel) : "";
    }
    return o;
  });
  const [prixVente, setPrixVente] = useState(
    prixVenteActuel > 0 ? String(prixVenteActuel) : "",
  );

  const overrides: OverridesCoutTheorique = useMemo(() => {
    const quantiteParLigneId: Record<string, number> = {};
    for (const [id, raw] of Object.entries(qte)) {
      if (raw.trim() === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) quantiteParLigneId[id] = n;
    }
    const cumpParProduitId: Record<string, number> = {};
    for (const [id, raw] of Object.entries(cump)) {
      if (raw.trim() === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) cumpParProduitId[id] = n;
    }
    const tauxHoraireParAtelierId: Record<string, number> = {};
    for (const [id, raw] of Object.entries(taux)) {
      if (raw.trim() === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) tauxHoraireParAtelierId[id] = n;
    }
    return { quantiteParLigneId, cumpParProduitId, tauxHoraireParAtelierId };
  }, [qte, cump, taux]);

  const simule = useMemo(
    () =>
      calculerCoutTheoriqueNomenclature({
        nomenclature,
        produits,
        entrees,
        ventes,
        inventaires,
        ateliers,
        dims,
        overrides,
        produitId: produit.id,
      }),
    [nomenclature, produits, entrees, ventes, inventaires, ateliers, dims, overrides, produit.id],
  );

  const prixSim = Number(prixVente);
  const prixSimule = Number.isFinite(prixSim) && prixSim >= 0 ? prixSim : 0;
  const margeActuelle = analyserMargeTheorique(
    actuel.total,
    prixVenteActuel,
    parametres,
  );
  const margeSimulee = analyserMargeTheorique(simule.total, prixSimule, parametres);

  function exporterCsv() {
    downloadCsv(
      `simulation-cout-${produit.code || produit.id}.csv`,
      lignesCsvSimulation({
        produit: `${produit.code} — ${produit.libelleCourt || produit.libelleLong}`,
        nomenclature: nomenclature.nom,
        actuel,
        simule,
        prixActuel: prixVenteActuel,
        prixSimule,
        margeActuelle,
        margeSimulee,
      }),
    );
  }

  function exporterPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    const row = (label: string, a: string, b: string) =>
      `<tr><td>${label}</td><td>${a}</td><td>${b}</td></tr>`;
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Simulation</title>
      <style>body{font-family:sans-serif;padding:24px;color:#0c1f28}table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f4f7f8}</style></head><body>
      <h1>Simulation coût théorique</h1>
      <p>${produit.code} — ${produit.libelleLong || produit.libelleCourt}<br>Nomenclature : ${nomenclature.nom}</p>
      <table><thead><tr><th>Indicateur</th><th>Actuel</th><th>Simulé</th></tr></thead><tbody>
      ${row("Coût matière", formatCurrency(actuel.totalMatiere), formatCurrency(simule.totalMatiere))}
      ${row("Coût MOD", formatCurrency(actuel.totalMod), formatCurrency(simule.totalMod))}
      ${row("Coût total", formatCurrency(actuel.total), formatCurrency(simule.total))}
      ${row("Prix de vente", formatCurrency(prixVenteActuel), formatCurrency(prixSimule))}
      ${row("Marge", formatCurrency(margeActuelle.marge), formatCurrency(margeSimulee.marge))}
      ${row("Taux de marge", formatPercent(margeActuelle.taux / 100), formatPercent(margeSimulee.taux / 100))}
      </tbody></table>
      <p style="margin-top:16px;font-size:12px;color:#5c6b73">Scénario non enregistré — aucun impact sur la fiche produit.</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print"
      onClick={onFermer}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Simulation What-if
            </h2>
            <p className="mt-1 text-xs text-muted">
              Copie temporaire, non enregistrée. Fermer l&apos;écran annule le
              scénario.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onFermer}>
            Fermer
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <ComparatifBloc
            titre="Actuel"
            cout={actuel}
            prix={prixVenteActuel}
            marge={margeActuelle}
          />
          <ComparatifBloc
            titre="Simulé"
            cout={simule}
            prix={prixSimule}
            marge={margeSimulee}
          />
        </div>

        <label className="mb-4 block text-xs font-semibold text-muted">
          Prix de vente catalogue simulé
          <input
            type="number"
            min={0}
            className="input mt-1"
            value={prixVente}
            onChange={(e) => setPrixVente(e.target.value)}
          />
        </label>

        {params.lignes.length > 0 && (
          <section className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Quantités nomenclature
            </p>
            <table className="data">
              <thead>
                <tr>
                  <th>Composant</th>
                  <th className="text-right">Actuel</th>
                  <th className="text-right">Simulé</th>
                </tr>
              </thead>
              <tbody>
                {params.lignes.map((l) => (
                  <tr key={l.ligneId}>
                    <td>{l.nom}</td>
                    <td className="text-right font-mono text-xs">
                      {l.quantiteActuelle == null
                        ? "—"
                        : formatNumber(l.quantiteActuelle, 3)}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className="input ml-auto w-28 text-right"
                        value={qte[l.ligneId] ?? ""}
                        onChange={(e) =>
                          setQte({ ...qte, [l.ligneId]: e.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {params.cump.length > 0 && (
          <section className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              CUMP composants
            </p>
            <table className="data">
              <thead>
                <tr>
                  <th>Composant</th>
                  <th className="text-right">Actuel</th>
                  <th className="text-right">Simulé</th>
                </tr>
              </thead>
              <tbody>
                {params.cump.map((c) => (
                  <tr key={c.produitId}>
                    <td>{c.nom}</td>
                    <td className="text-right font-mono text-xs">
                      {c.cumpActuel == null ? "—" : formatCurrency(c.cumpActuel)}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className="input ml-auto w-28 text-right"
                        value={cump[c.produitId] ?? ""}
                        onChange={(e) =>
                          setCump({ ...cump, [c.produitId]: e.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {params.ateliers.length > 0 && (
          <section className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Taux horaire atelier
            </p>
            <table className="data">
              <thead>
                <tr>
                  <th>Atelier</th>
                  <th className="text-right">Actuel</th>
                  <th className="text-right">Simulé</th>
                </tr>
              </thead>
              <tbody>
                {params.ateliers.map((a) => (
                  <tr key={a.atelierId}>
                    <td>{a.nom}</td>
                    <td className="text-right font-mono text-xs">
                      {a.tauxActuel > 0
                        ? `${formatCurrency(a.tauxActuel)} / h`
                        : "Non paramétré"}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className="input ml-auto w-28 text-right"
                        value={taux[a.atelierId] ?? ""}
                        onChange={(e) =>
                          setTaux({ ...taux, [a.atelierId]: e.target.value })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={exporterCsv}>
            Exporter CSV
          </button>
          <button type="button" className="btn btn-secondary" onClick={exporterPdf}>
            Exporter PDF
          </button>
          <button type="button" className="btn btn-primary" onClick={onFermer}>
            Fermer sans enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparatifBloc({
  titre,
  cout,
  prix,
  marge,
}: {
  titre: string;
  cout: CoutTheoriqueNomenclature;
  prix: number;
  marge: ReturnType<typeof analyserMargeTheorique>;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-line p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sea-700">
        {titre}
        {prix > 0 && (
          <BadgeMargeTheorique niveau={marge.niveau} taux={marge.taux} compact />
        )}
      </p>
      <ul className="space-y-1 text-sm">
        <li className="flex justify-between">
          <span className="text-muted">Matière</span>
          <span className="font-mono text-xs">{formatCurrency(cout.totalMatiere)}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted">MOD</span>
          <span className="font-mono text-xs">{formatCurrency(cout.totalMod)}</span>
        </li>
        <li className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="font-mono text-xs">{formatCurrency(cout.total)}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted">Prix vente</span>
          <span className="font-mono text-xs">{formatCurrency(prix)}</span>
        </li>
        <li className="flex justify-between">
          <span className="text-muted">Marge</span>
          <span className="font-mono text-xs">{formatCurrency(marge.marge)}</span>
        </li>
      </ul>
      {cout.partiel && (
        <p className="mt-2 text-[11px] font-semibold text-amber-900">
          Coût théorique partiel
        </p>
      )}
    </div>
  );
}
