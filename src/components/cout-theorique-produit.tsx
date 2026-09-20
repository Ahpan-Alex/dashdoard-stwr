"use client";

import { useMemo, useState } from "react";
import { IndicateurInfo } from "@/components/indicateur-info";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  calculerCoutTheoriqueNomenclature,
  nomenclatureExigeDimsPourCout,
} from "@/lib/cout-theorique";
import { nomenclaturesDuProduit } from "@/lib/nomenclature";
import { useStore } from "@/lib/store";
import type { Produit } from "@/lib/types";

export function CoutTheoriqueProduitPanel({ produit }: { produit: Produit }) {
  const produits = useStore((s) => s.produits);
  const entrees = useStore((s) => s.entrees);
  const ventes = useStore((s) => s.ventes);
  const inventaires = useStore((s) => s.inventaires);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const nomenclatures = nomenclaturesDuProduit(produit);
  const [nomenclatureId, setNomenclatureId] = useState(
    nomenclatures[0]?.id ?? "",
  );
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");

  const active =
    nomenclatures.find((n) => n.id === nomenclatureId) ?? nomenclatures[0];
  const dims = useMemo(() => {
    const l = Number(largeur);
    const h = Number(hauteur);
    if (l > 0 && h > 0) return { largeur: l, hauteur: h };
    return {};
  }, [largeur, hauteur]);

  const cout = useMemo(() => {
    if (!active) return null;
    return calculerCoutTheoriqueNomenclature({
      nomenclature: active,
      produits,
      entrees,
      ventes,
      inventaires,
      ateliers: pointsDeVente,
      dims,
    });
  }, [active, produits, entrees, ventes, inventaires, pointsDeVente, dims]);

  if (!active || !cout) {
    return (
      <p className="text-sm text-muted">
        Aucune nomenclature sur cette fiche. Ajoutez des composants pour estimer
        le coût théorique.
      </p>
    );
  }

  const exigeDims = nomenclatureExigeDimsPourCout(active);

  return (
    <div className="space-y-5">
      {nomenclatures.length > 1 && (
        <label className="block text-xs font-semibold text-muted">
          Nomenclature
          <select
            className="select mt-1"
            value={active.id}
            onChange={(e) => setNomenclatureId(e.target.value)}
          >
            {nomenclatures.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nom || (n.type === "automatique" ? "Nomenclature standard" : "Alternative")}
              </option>
            ))}
          </select>
        </label>
      )}

      {exigeDims && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-muted">
            Largeur de référence (m)
            <input
              type="number"
              min={0}
              step="0.01"
              className="input mt-1"
              value={largeur}
              onChange={(e) => setLargeur(e.target.value)}
              placeholder="Pour les lignes surface / périmètre"
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Hauteur de référence (m)
            <input
              type="number"
              min={0}
              step="0.01"
              className="input mt-1"
              value={hauteur}
              onChange={(e) => setHauteur(e.target.value)}
            />
          </label>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Détail matière
        </p>
        {cout.matiere.length === 0 ? (
          <p className="text-sm text-muted">Aucun composant sur cette nomenclature.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Composant</th>
                <th className="text-right">Qté / unité</th>
                <th className="text-right">CUMP actuel</th>
                <th className="text-right">Coût</th>
              </tr>
            </thead>
            <tbody>
              {cout.matiere.map((l) => (
                <tr key={l.ligneId}>
                  <td>
                    {l.nom}
                    {l.cumpIndisponible && (
                      <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                        CUMP indisponible
                      </span>
                    )}
                    {l.quantiteIndeterminee && (
                      <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Dimensions requises
                      </span>
                    )}
                  </td>
                  <td className="text-right font-mono text-xs">
                    {l.quantite == null ? "—" : formatNumber(l.quantite, 3)}
                  </td>
                  <td className="text-right font-mono text-xs">
                    {l.cump == null ? "—" : formatCurrency(l.cump)}
                  </td>
                  <td className="text-right font-mono text-xs">
                    {l.cout == null ? "—" : formatCurrency(l.cout)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="text-right">
                  Coût matière théorique
                </th>
                <th className="text-right font-mono">
                  {formatCurrency(cout.totalMatiere)}
                </th>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {cout.mod.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Détail main d&apos;œuvre
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Atelier</th>
                <th className="text-right">Temps standard</th>
                <th className="text-right">Taux horaire</th>
                <th className="text-right">Coût MOD</th>
              </tr>
            </thead>
            <tbody>
              {cout.mod.map((l) => (
                <tr key={l.id}>
                  <td>{l.atelierNom}</td>
                  <td className="text-right font-mono text-xs">
                    {formatNumber(l.heures, 2)} h
                  </td>
                  <td className="text-right font-mono text-xs">
                    {l.tauxHoraire > 0 ? `${formatCurrency(l.tauxHoraire)} / h` : "Non paramétré"}
                  </td>
                  <td className="text-right font-mono text-xs">
                    {formatCurrency(l.cout)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="text-right">
                  Coût MOD théorique
                </th>
                <th className="text-right font-mono">
                  {formatCurrency(cout.totalMod)}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="rounded-[var(--radius)] border border-sea-200 bg-sea-50/60 p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Coût de revient théorique
          <IndicateurInfo titre="Coût de revient théorique">
            Recalculé à chaque affichage : quantité de chaque composant de la
            nomenclature × CUMP actuel (moyenne pondérée des stocks restants),
            plus temps standard × taux horaire atelier en vigueur. Aucune
            valeur n&apos;est stockée. Ce n&apos;est pas le coût d&apos;entrée
            réel d&apos;un OF et cela ne génère aucune écriture comptable.
          </IndicateurInfo>
        </p>
        <p className="mt-1 font-display text-2xl font-semibold text-ink">
          {formatCurrency(cout.total)}
          <span className="ml-2 text-sm font-normal text-muted">/ unité</span>
        </p>
        {cout.partiel && (
          <p className="mt-2 text-xs font-semibold text-amber-900">
            Coût théorique partiel — au moins un composant n&apos;a pas de CUMP
            (jamais entré en stock) ou une quantité non déterminée, et n&apos;est
            pas inclus dans le total.
          </p>
        )}
      </div>
    </div>
  );
}
