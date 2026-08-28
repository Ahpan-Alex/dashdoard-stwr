"use client";

import { AlertTriangle, Boxes, Scale } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { InfoButton } from "@/components/info-button";
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
    inventaires,
  } = useStore();

  const stocks = calculerStocks(
    produits,
    entrees,
    ventes,
    pointDeVenteActifId,
    pointsDeVente,
    undefined,
    inventaires,
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

      <div className="mb-6 flex flex-col gap-3 rounded-[var(--radius)] border border-sea-200 bg-sea-100/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sea-600 text-white">
            <Scale className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sea-700">
              Méthode de valorisation des stocks
            </p>
            <p className="font-display text-lg font-semibold text-ink">
              CUMP{" "}
              <span className="text-sm font-normal text-muted">
                — Coût Unitaire Moyen Pondéré
              </span>
            </p>
          </div>
        </div>
        <InfoButton
          title="La méthode CUMP (Coût Unitaire Moyen Pondéré)"
          label="Comment ça marche ?"
          className="shrink-0"
        >
          <p>
            Le <strong>CUMP</strong> (Coût Unitaire Moyen Pondéré) valorise le
            stock à un <strong>coût moyen recalculé à chaque entrée</strong> de
            marchandise. Il évite d&apos;avoir à suivre chaque lot
            individuellement et lisse les variations des prix d&apos;achat.
          </p>
          <div className="rounded-[var(--radius)] border border-line bg-sea-100/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sea-700">
              Formule
            </p>
            <p className="mt-1 font-medium text-ink">
              CUMP = (Valeur du stock existant + Valeur des nouvelles entrées) ÷
              (Quantité existante + Quantité entrée)
            </p>
          </div>
          <p>
            Les entrées proviennent des <strong>livraisons d&apos;achats</strong>{" "}
            (menu Achats). Un retour fournisseur diminue le stock et réajuste le
            CUMP. Les ventes déjà validées conservent le coût figé à la clôture
            : un nouvel arrivage ne recalcule pas les rapports déjà émis.
          </p>
          <div className="rounded-[var(--radius)] border border-line bg-card p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Exemple
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Entrée 1 : 10 kg à 8 000 Ar = 80 000 Ar</li>
              <li>Entrée 2 : 5 kg à 11 000 Ar = 55 000 Ar</li>
              <li>
                CUMP = (80 000 + 55 000) ÷ (10 + 5) ={" "}
                <strong>9 000 Ar / kg</strong>
              </li>
              <li>
                Le stock restant est valorisé à 9 000 Ar le kg (et non au dernier
                prix payé).
              </li>
            </ul>
          </div>
          <p className="text-muted">
            Cette méthode est conforme au Plan Comptable Général et adaptée aux
            produits interchangeables (produits de la mer, denrées, etc.).
          </p>
        </InfoButton>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Valeur au coût (CUMP)
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(valeurAchat)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Coût unitaire moyen pondéré
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
