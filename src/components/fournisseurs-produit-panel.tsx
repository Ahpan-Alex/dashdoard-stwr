"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import {
  CRITERE_CLASSEMENT_LABELS,
  appliquerRangManuel,
  critereClassementProduit,
  fichesFournisseursProduit,
} from "@/lib/classement-fournisseurs";
import { HistoriquePrixFournisseur } from "@/components/historique-prix-fournisseur";
import { useStore } from "@/lib/store";
import type { CritereClassementFournisseur, Produit } from "@/lib/types";

export function FournisseursProduitPanel({ produit }: { produit: Produit }) {
  const achats = useStore((s) => s.achats);
  const demandesPrix = useStore((s) => s.demandesPrix ?? []);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const updateProduit = useStore((s) => s.updateProduit);
  const critere = critereClassementProduit(produit);

  const fiches = useMemo(
    () => fichesFournisseursProduit(produit, { achats, demandesPrix }),
    [produit, achats, demandesPrix],
  );

  const nomFrn = (id: string) => fournisseurs.find((f) => f.id === id)?.nom ?? id;

  function setCritere(next: CritereClassementFournisseur) {
    const res = updateProduit(produit.id, { criteresClassementFournisseurs: next });
    if (!res.ok && res.reason) alert(res.reason);
  }

  function setRang(fournisseurId: string, rang: number) {
    const res = updateProduit(produit.id, {
      fournisseursPriorite: appliquerRangManuel(produit.fournisseursPriorite, fournisseurId, rang),
    });
    if (!res.ok && res.reason) alert(res.reason);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
        Fournisseurs
      </p>
      <p className="mb-3 text-xs text-muted">
        Fournisseurs ayant déjà vendu cet article (achats ou demandes de prix). Le rang 1 est
        proposé par défaut à la création d&apos;un achat classique. Le critère « délai » s&apos;appuie
        sur les délais de livraison réels (commande → réception), consultables aussi dans{" "}
        <Link href="/achats/delais-livraison" className="underline">
          Achats → Délais de livraison
        </Link>
        .
      </p>
      <label className="mb-3 block text-xs font-semibold text-muted">
        Critère de classement (cette fiche uniquement)
        <select
          className="select mt-1 max-w-xs"
          value={critere}
          onChange={(e) => setCritere(e.target.value as CritereClassementFournisseur)}
        >
          {(Object.keys(CRITERE_CLASSEMENT_LABELS) as CritereClassementFournisseur[]).map((k) => (
            <option key={k} value={k}>
              {CRITERE_CLASSEMENT_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
        {fiches.length === 0 ? (
        <p className="text-sm text-muted">Aucun historique fournisseur pour cet article.</p>
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Fournisseur</th>
                <th>Dernier prix connu</th>
                <th>Délai moyen</th>
              </tr>
            </thead>
            <tbody>
              {fiches.map((f) => (
                <tr key={f.fournisseurId}>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="input w-16"
                      value={f.rang}
                      onChange={(e) => setRang(f.fournisseurId, Number(e.target.value) || 1)}
                    />
                    {f.manuel && (
                      <span className="ml-1 text-[10px] uppercase text-muted">manuel</span>
                    )}
                  </td>
                  <td className="font-medium">{nomFrn(f.fournisseurId)}</td>
                  <td>
                    {f.dernierPrix != null ? formatCurrency(f.dernierPrix) : "—"}
                  </td>
                  <td>
                    {f.delaiMoyenJours != null ? `${f.delaiMoyenJours} j` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Historique des prix
        </p>
        <HistoriquePrixFournisseur produitId={produit.id} />
      </div>
      <p className="mt-4 text-xs text-muted">
        Transferts inter-sites de cet article :{" "}
        <Link
          href={`/transferts/historique?produit=${encodeURIComponent(produit.id)}`}
          className="underline"
        >
          historique par site
        </Link>
        .
      </p>
    </div>
  );
}
