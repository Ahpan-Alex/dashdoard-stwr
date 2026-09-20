"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BadgeMargeTheorique } from "@/components/badge-marge-theorique";
import { IndicateurInfo } from "@/components/indicateur-info";
import { SimulationCoutTheoriqueModal } from "@/components/simulation-cout-theorique";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  analyserMargeTheorique,
  calculerCoutTheoriqueNomenclature,
  nomenclatureExigeDimsPourCout,
  type CoutTheoriqueNomenclature,
  type LigneCoutTheoriqueMatiere,
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
  const parametres = useStore((s) => s.parametres);
  const nomenclatures = nomenclaturesDuProduit(produit);
  const [nomenclatureId, setNomenclatureId] = useState(
    nomenclatures[0]?.id ?? "",
  );
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [simulation, setSimulation] = useState(false);

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
      produitId: produit.id,
    });
  }, [active, produits, entrees, ventes, inventaires, pointsDeVente, dims, produit.id]);

  if (!active || !cout) {
    return (
      <p className="text-sm text-muted">
        Aucune nomenclature sur cette fiche. Ajoutez des composants pour estimer
        le coût théorique.
      </p>
    );
  }

  const exigeDims = nomenclatureExigeDimsPourCout(active);
  const marge = analyserMargeTheorique(cout.total, produit.prixVenteHT, parametres);

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

      <DetailMatiere cout={cout} />

      {cout.mod.length > 0 && <DetailMod cout={cout} />}

      <div className="rounded-[var(--radius)] border border-sea-200 bg-sea-50/60 p-4">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Coût de revient théorique
          <IndicateurInfo titre="Coût de revient théorique">
            Recalculé à chaque affichage. Un composant matière première est
            valorisé au CUMP actuel ; un semi-fini ou fini l&apos;est à son
            propre coût théorique (matière + MOD), en cascade. Aucune valeur
            n&apos;est stockée. Ce n&apos;est pas le coût d&apos;entrée réel
            d&apos;un OF et cela ne génère aucune écriture comptable.
          </IndicateurInfo>
          {produit.prixVenteHT > 0 && (
            <BadgeMargeTheorique niveau={marge.niveau} taux={marge.taux} />
          )}
        </p>
        <p className="mt-1 font-display text-2xl font-semibold text-ink">
          {formatCurrency(cout.total)}
          <span className="ml-2 text-sm font-normal text-muted">/ unité</span>
        </p>
        {produit.prixVenteHT > 0 && (
          <p className="mt-1 text-xs text-muted">
            Prix catalogue {formatCurrency(produit.prixVenteHT)} · Marge{" "}
            {formatCurrency(marge.marge)}
          </p>
        )}
        {cout.partiel && (
          <p className="mt-2 text-xs font-semibold text-amber-900">
            Coût théorique partiel — un composant (y compris à un niveau
            inférieur) n&apos;a pas de CUMP ou une quantité non déterminée.
          </p>
        )}
        <button
          type="button"
          className="btn btn-secondary mt-3"
          onClick={() => setSimulation(true)}
        >
          Simulation What-if
        </button>
      </div>

      {simulation && (
        <SimulationCoutTheoriqueModal
          produit={produit}
          nomenclature={active}
          actuel={cout}
          prixVenteActuel={produit.prixVenteHT}
          parametres={parametres}
          produits={produits}
          entrees={entrees}
          ventes={ventes}
          inventaires={inventaires}
          ateliers={pointsDeVente}
          dims={dims}
          onFermer={() => setSimulation(false)}
        />
      )}
    </div>
  );
}

function DetailMatiere({ cout }: { cout: CoutTheoriqueNomenclature }) {
  return (
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
              <th className="text-right">Coût unitaire</th>
              <th className="text-right">Coût</th>
            </tr>
          </thead>
          <tbody>
            {cout.matiere.map((l) => (
              <LigneMatiere key={l.ligneId} ligne={l} profondeur={0} />
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
  );
}

function LigneMatiere({
  ligne,
  profondeur,
}: {
  ligne: LigneCoutTheoriqueMatiere;
  profondeur: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const cascadable = ligne.source === "cascade" && ligne.cascade;
  return (
    <>
      <tr>
        <td style={{ paddingLeft: `${0.75 + profondeur * 1.25}rem` }}>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {cascadable ? (
              <button
                type="button"
                className="inline-flex text-sea-800"
                aria-expanded={ouvert}
                onClick={() => setOuvert((v) => !v)}
                title="Détail du niveau inférieur"
              >
                {ouvert ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="inline-block w-4" />
            )}
            {ligne.nom}
            {ligne.source === "cascade" ? (
              <span className="rounded-full bg-sea-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sea-800">
                Coût théorique
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                CUMP
              </span>
            )}
            {ligne.cumpIndisponible && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                CUMP indisponible
              </span>
            )}
            {ligne.source === "cascade" && ligne.cascade?.partiel && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                Coût partiel
              </span>
            )}
            {ligne.quantiteIndeterminee && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Dimensions requises
              </span>
            )}
          </span>
        </td>
        <td className="text-right font-mono text-xs">
          {ligne.quantite == null ? "—" : formatNumber(ligne.quantite, 3)}
        </td>
        <td className="text-right font-mono text-xs">
          {ligne.cump == null ? "—" : formatCurrency(ligne.cump)}
        </td>
        <td className="text-right font-mono text-xs">
          {ligne.cout == null ? "—" : formatCurrency(ligne.cout)}
        </td>
      </tr>
      {ouvert && ligne.cascade && (
        <>
          {ligne.cascade.matiere.map((enfant) => (
            <LigneMatiere
              key={`${ligne.ligneId}-${enfant.ligneId}`}
              ligne={enfant}
              profondeur={profondeur + 1}
            />
          ))}
          {ligne.cascade.mod.map((m) => (
            <tr key={`${ligne.ligneId}-${m.id}`}>
              <td
                className="text-xs text-muted"
                style={{ paddingLeft: `${2 + profondeur * 1.25}rem` }}
              >
                MOD · {m.atelierNom} · {formatNumber(m.heures, 2)} h
              </td>
              <td />
              <td className="text-right font-mono text-xs">
                {m.tauxHoraire > 0 ? `${formatCurrency(m.tauxHoraire)} / h` : "—"}
              </td>
              <td className="text-right font-mono text-xs">
                {formatCurrency(m.cout)}
              </td>
            </tr>
          ))}
        </>
      )}
    </>
  );
}

function DetailMod({ cout }: { cout: CoutTheoriqueNomenclature }) {
  return (
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
                {l.tauxHoraire > 0
                  ? `${formatCurrency(l.tauxHoraire)} / h`
                  : "Non paramétré"}
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
  );
}
