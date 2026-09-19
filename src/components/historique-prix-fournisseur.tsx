"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  historiqueDelaisLivraison,
  historiquePrixFournisseurArticle,
} from "@/lib/classement-fournisseurs";
import { formatCurrency, formatDate } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import { assurerTiers } from "@/lib/tiers";

type Props = {
  produitId?: string;
  fournisseurId?: string;
};

export function HistoriquePrixFournisseur({ produitId, fournisseurId }: Props) {
  const achats = useStore((s) => s.achats);
  const demandesPrix = useStore((s) => s.demandesPrix ?? []);
  const produits = useStore((s) => s.produits);
  const clients = useStore((s) => s.clients);
  const fournisseursLegacy = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);

  const evenements = useMemo(
    () =>
      historiquePrixFournisseurArticle(
        { achats, demandesPrix },
        { produitId, fournisseurId },
      ),
    [achats, demandesPrix, produitId, fournisseurId],
  );

  const delais = useMemo(
    () => historiqueDelaisLivraison(achats, { produitId, fournisseurId }),
    [achats, produitId, fournisseurId],
  );

  const nomFrn = (id: string) =>
    assurerTiers({ clients, fournisseurs: fournisseursLegacy, tiers }).find((t) => t.id === id)
      ?.nom ??
    fournisseursLegacy.find((f) => f.id === id)?.nom ??
    "Fournisseur";

  return (
    <div className="space-y-6">
      {evenements.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun historique de prix pour ce couple article / fournisseur.
        </p>
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                {!produitId && <th>Article</th>}
                {!fournisseurId && <th>Fournisseur</th>}
                <th>Prix HT</th>
                <th>Délai</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {evenements.map((e, i) => {
                const p = produits.find((x) => x.id === e.produitId);
                const href =
                  e.source === "achat"
                    ? `/achats?id=${e.documentId}`
                    : `/demandes-prix/${e.documentId}`;
                return (
                  <tr
                    key={`${e.source}-${e.documentId}-${e.produitId}-${e.fournisseurId}-${i}`}
                  >
                    <td>{formatDate(e.date)}</td>
                    {!produitId && (
                      <td>{p ? `${p.code} — ${libelleProduit(p)}` : "Article"}</td>
                    )}
                    {!fournisseurId && <td>{nomFrn(e.fournisseurId)}</td>}
                    <td className="font-semibold">{formatCurrency(e.prixUnitaire)}</td>
                    <td>{e.delaiJours != null ? `${e.delaiJours} j` : "—"}</td>
                    <td>
                      <Link href={href} className="text-sea-800 hover:underline">
                        {e.source === "achat" ? "Achat" : "DP"} {e.documentNumero}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
          Délais de livraison réels
        </p>
        {delais.length === 0 ? (
          <p className="text-sm text-muted">
            Aucune réception enregistrée (date commande → date de réception).
          </p>
        ) : (
          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Réception</th>
                  <th>Délai</th>
                  {!produitId && <th>Article</th>}
                  {!fournisseurId && <th>Fournisseur</th>}
                  <th>Achat</th>
                </tr>
              </thead>
              <tbody>
                {delais.map((e) => {
                  const p = produits.find((x) => x.id === e.produitId);
                  return (
                    <tr key={`${e.achatId}-${e.livraisonId}-${e.produitId}`}>
                      <td>{formatDate(e.dateCommande)}</td>
                      <td>{formatDate(e.dateReception)}</td>
                      <td className="font-semibold">{e.jours} j</td>
                      {!produitId && (
                        <td>{p ? `${p.code} — ${libelleProduit(p)}` : "Article"}</td>
                      )}
                      {!fournisseurId && <td>{nomFrn(e.fournisseurId)}</td>}
                      <td>
                        <Link
                          href={`/achats?id=${e.achatId}`}
                          className="text-sea-800 hover:underline"
                        >
                          {e.achatNumero}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
