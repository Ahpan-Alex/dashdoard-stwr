"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import { historiqueTransfertsCump } from "@/lib/transferts";
import { useStore } from "@/lib/store";

export default function HistoriqueTransfertsPage() {
  return (
    <Suspense>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const params = useSearchParams();
  const entrees = useStore((s) => s.entrees);
  const produits = useStore((s) => s.produits);
  const sites = useStore((s) => s.pointsDeVente);
  const transferts = useStore((s) => s.transfertsStock);
  const [produitId, setProduitId] = useState(params.get("produit") ?? "");
  const [siteId, setSiteId] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");

  const liste = useMemo(
    () =>
      historiqueTransfertsCump(entrees, {
        produitId: produitId || undefined,
        siteId: siteId || undefined,
        debut: debut || undefined,
        fin: fin || undefined,
      }),
    [entrees, produitId, siteId, debut, fin],
  );

  const nomSite = (id: string) => sites.find((s) => s.id === id)?.nom ?? "Site";
  const nomTrf = (id?: string) =>
    transferts.find((t) => t.id === id)?.numero ?? id ?? "—";

  return (
    <div>
      <PageHeader
        title="Historique des transferts"
        description="Mouvements CUMP liés aux transferts inter-sites, filtrables par article, site et période. Accessible aussi depuis la fiche article."
      />
      <div className="mb-4 grid gap-3 rounded-[var(--radius)] border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
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
          Site
          <select
            className="select mt-1"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
          >
            <option value="">Tous</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Du
          <input
            type="date"
            className="input mt-1"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </label>
      </div>
      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Article</th>
              <th>Site</th>
              <th>Sens</th>
              <th>Quantité</th>
              <th>CUMP</th>
              <th>Transfert</th>
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  Aucun mouvement de transfert pour ces filtres.
                </td>
              </tr>
            ) : (
              liste.map((m) => {
                const p = produits.find((x) => x.id === m.produitId);
                return (
                  <tr key={m.id}>
                    <td>{formatDate(m.date)}</td>
                    <td>{p ? `${p.code} — ${libelleProduit(p)}` : "Article"}</td>
                    <td>{nomSite(m.siteId)}</td>
                    <td>
                      {m.origine === "transfert_sortie" ? "Sortie" : "Entrée"}
                    </td>
                    <td>{formatNumber(m.quantite, 3)}</td>
                    <td>{formatCurrency(m.prixUnitaire)}</td>
                    <td>
                      <Link href="/transferts" className="text-sea-800 hover:underline">
                        {nomTrf(m.transfertId)}
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
