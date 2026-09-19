"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import {
  compteChargeProduit,
  compteVenteProduit,
  motifComptesProduitInvalides,
  produitsAMigrerComptes,
} from "@/lib/comptabilite";
import { libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";

export default function ProduitsSansComptePage() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const produits = useStore((s) => s.produits);
  const comptes = useStore((s) => s.comptesComptables ?? []);
  const liste = produitsAMigrerComptes(produits, comptes);

  return (
    <div>
      <PageHeader
        title="Produits sans compte assigné"
        description="Articles sans compte de charge (classe 6) et/ou de vente (classe 7). La pastille individuelle reste sur la fiche produit."
      />
      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Libellé</th>
              <th>Charge (cl. 6)</th>
              <th>Vente (cl. 7)</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted">
                  Tous les produits ont leurs comptes de charge et de vente.
                </td>
              </tr>
            ) : (
              liste.map((p) => {
                const charge = compteChargeProduit(p, comptes);
                const vente = compteVenteProduit(p, comptes);
                return (
                  <tr key={p.id}>
                    <td className="font-mono">{p.code}</td>
                    <td>
                      <Link
                        href="/parametres/produits"
                        className="text-sea-800 hover:underline"
                      >
                        {libelleProduit(p)}
                      </Link>
                    </td>
                    <td>{charge?.numero ?? "—"}</td>
                    <td>{vente?.numero ?? "—"}</td>
                    <td className="text-sm text-muted">
                      {motifComptesProduitInvalides(p, comptes)}
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
