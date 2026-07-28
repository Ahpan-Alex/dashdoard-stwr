"use client";

import { AlertTriangle, Boxes } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { calculerStocks } from "@/lib/calculations";
import { formatCurrency, formatNumber } from "@/lib/format";
import { categorieLabel, libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";

export default function StocksPage() {
  const {
    produits,
    categoriesProduits,
    entrees,
    ventes,
    pointsDeVente,
    pointDeVenteActifId,
  } = useStore();

  const stocks = calculerStocks(
    produits,
    entrees,
    ventes,
    pointDeVenteActifId,
    pointsDeVente,
  );

  const valeurAchat = stocks.reduce((s, l) => s + l.valeurAchat, 0);
  const valeurVente = stocks.reduce((s, l) => s + l.valeurVente, 0);
  const alertes = stocks.filter((l) => l.quantiteRestante < 5);

  return (
    <div>
      <PageHeader
        title="Stocks"
        description="État des stocks par produit et point de vente, valorisés au coût d'achat."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Valeur au coût
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(valeurAchat)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Valeur au prix de vente
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(valeurVente)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Marge potentielle
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-success">
            {formatCurrency(valeurVente - valeurAchat)}
          </p>
        </div>
      </div>

      {alertes.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-[var(--radius)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Stock bas</p>
            <p className="text-amber-800/80">
              {alertes.length} ligne{alertes.length > 1 ? "s" : ""} sous le seuil
              de 5 unités :{" "}
              {alertes
                .slice(0, 3)
                .map((a) => a.produit.libelleCourt)
                .join(", ")}
              {alertes.length > 3 ? "…" : ""}
            </p>
          </div>
        </div>
      )}

      {stocks.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-5 w-5" />}
          title="Aucun stock"
          description="Enregistrez des entrées de marchandises pour alimenter le stock."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Point de vente</th>
                <th>Entrées</th>
                <th>Vendues</th>
                <th>Restant</th>
                <th>Valeur achat</th>
                <th>Valeur vente</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((ligne) => {
                const pdv = pointsDeVente.find(
                  (p) => p.id === ligne.pointDeVenteId,
                );
                const bas = ligne.quantiteRestante < 5;
                return (
                  <tr key={`${ligne.pointDeVenteId}-${ligne.produit.id}`}>
                    <td className="font-medium">
                      {ligne.produit.code} — {libelleProduit(ligne.produit)}
                    </td>
                    <td>
                      <span className="badge badge-sea">
                        {categorieLabel(
                          ligne.produit.categorieId,
                          categoriesProduits,
                        )}
                      </span>
                    </td>
                    <td>{pdv?.nom}</td>
                    <td>
                      {formatNumber(ligne.quantiteEntree)}{" "}
                      {ligne.produit.unite}
                    </td>
                    <td>
                      {formatNumber(ligne.quantiteVendue)}{" "}
                      {ligne.produit.unite}
                    </td>
                    <td>
                      <span
                        className={
                          bas
                            ? "font-semibold text-coral"
                            : "font-semibold text-ink"
                        }
                      >
                        {formatNumber(ligne.quantiteRestante)}{" "}
                        {ligne.produit.unite}
                      </span>
                    </td>
                    <td>{formatCurrency(ligne.valeurAchat)}</td>
                    <td>{formatCurrency(ligne.valeurVente)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
