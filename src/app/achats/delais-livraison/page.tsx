"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { historiqueDelaisLivraison } from "@/lib/classement-fournisseurs";
import { formatDate, formatNumber } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import { assurerTiers } from "@/lib/tiers";

export default function HistoriqueDelaisLivraisonPage() {
  return (
    <RequirePermission permission={["achats.lire", "achats.gerer"]}>
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const achats = useStore((s) => s.achats);
  const produits = useStore((s) => s.produits);
  const clients = useStore((s) => s.clients);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);
  const [produitId, setProduitId] = useState("");
  const [fournisseurId, setFournisseurId] = useState("");

  const liste = useMemo(
    () =>
      historiqueDelaisLivraison(achats, {
        produitId: produitId || undefined,
        fournisseurId: fournisseurId || undefined,
      }),
    [achats, produitId, fournisseurId],
  );

  const nomFrn = (id: string) =>
    assurerTiers({ clients, fournisseurs, tiers }).find((t) => t.id === id)?.nom ??
    "Fournisseur";

  return (
    <div>
      <PageHeader
        title="Historique des délais de livraison"
        description="Délai réel par couple fournisseur / article : date de commande → date de réception effective. Second critère de classement fournisseur (fiche produit)."
      />
      <div className="mb-4 grid gap-3 rounded-[var(--radius)] border border-line bg-card p-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted">
          Article
          <select
            className="select mt-1"
            value={produitId}
            onChange={(e) => setProduitId(e.target.value)}
          >
            <option value="">Tous</option>
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {libelleProduit(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Fournisseur
          <select
            className="select mt-1"
            value={fournisseurId}
            onChange={(e) => setFournisseurId(e.target.value)}
          >
            <option value="">Tous</option>
            {assurerTiers({ clients, fournisseurs, tiers })
              .filter((t) => t.roles.includes("fournisseur"))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Réception</th>
              <th>Délai</th>
              <th>Article</th>
              <th>Fournisseur</th>
              <th>Qté</th>
              <th>Achat</th>
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  Aucune réception enregistrée pour ces filtres.
                </td>
              </tr>
            ) : (
              liste.map((e) => {
                const p = produits.find((x) => x.id === e.produitId);
                return (
                  <tr key={`${e.achatId}-${e.livraisonId}-${e.produitId}`}>
                    <td>{formatDate(e.dateCommande)}</td>
                    <td>{formatDate(e.dateReception)}</td>
                    <td className="font-semibold">{e.jours} j</td>
                    <td>{p ? `${p.code} — ${libelleProduit(p)}` : "Article"}</td>
                    <td>{nomFrn(e.fournisseurId)}</td>
                    <td>{formatNumber(e.quantite, 2)}</td>
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
