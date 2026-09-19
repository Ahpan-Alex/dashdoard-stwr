"use client";

import Link from "next/link";
import { Banknote, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function LotsPaiementPage() {
  const lots = useStore((s) => s.lotsPaiementFournisseur ?? []);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const trie = [...lots].sort((a, b) => b.date.localeCompare(a.date));

  function nomFrn(id: string) {
    return (
      lots.find((l) => l.fournisseurId === id)?.fournisseurNom ||
      fournisseurs.find((f) => f.id === id)?.nom ||
      "Fournisseur"
    );
  }

  return (
    <div>
      <PageHeader
        title="Paiements groupés"
        description="Solder ou acompter plusieurs factures ouvertes d'un même fournisseur en une seule pièce, avec ventilation par ancienneté."
        actions={
          <Link href="/achats/lots/nouveau" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Nouveau lot
          </Link>
        }
      />

      {trie.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-5 w-5" />}
          title="Aucun paiement groupé"
          description="Sélectionnez des factures ouvertes d'un fournisseur pour constituer un lot."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>N° lot</th>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Factures</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {trie.map((lot) => (
                <tr key={lot.id}>
                  <td className="font-medium">
                    <Link href={`/achats/lots/${lot.id}`} className="hover:underline">
                      {lot.numero}
                    </Link>
                  </td>
                  <td>{formatDate(lot.date)}</td>
                  <td>
                    <Link href={`/tiers/${lot.fournisseurId}`} className="hover:underline">
                      {lot.fournisseurNom || nomFrn(lot.fournisseurId)}
                    </Link>
                  </td>
                  <td className="text-sm text-muted">
                    {lot.ventilations.map((v) => v.achatNumero).join(" · ")}
                  </td>
                  <td className="font-semibold">{formatCurrency(lot.montant)}</td>
                  <td>
                    <span
                      className={`badge ${lot.statut === "actif" ? "badge-success" : "badge-sand"}`}
                    >
                      {lot.statut === "actif" ? "Actif" : "Annulé"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
