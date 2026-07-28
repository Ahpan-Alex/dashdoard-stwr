"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function FournisseursPage() {
  const { fournisseurs, entrees } = useStore();

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        description="Consultation des partenaires d'achat. La création et la modification se font dans Paramétrage."
        showPosSelector={false}
        actions={
          <Link href="/parametres/fournisseurs" className="btn btn-primary">
            <Settings className="h-4 w-4" />
            Paramétrer les fournisseurs
          </Link>
        }
      />

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Spécialité</th>
              <th>Contact</th>
              <th>Entrées</th>
              <th>Achats cumulés</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {fournisseurs.map((f) => {
              const lignes = entrees.filter(
                (e) =>
                  e.fournisseurId === f.id ||
                  e.fournisseur.toLowerCase() === f.nom.toLowerCase(),
              );
              const achats = lignes.reduce(
                (s, e) => s + e.quantite * e.prixAchatUnitaire,
                0,
              );
              return (
                <tr key={f.id}>
                  <td className="font-medium">
                    {f.nom}
                    {f.ville && (
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {f.ville}
                      </span>
                    )}
                  </td>
                  <td>{f.specialite || "—"}</td>
                  <td>{f.telephone || "—"}</td>
                  <td>{formatNumber(lignes.length, 0)}</td>
                  <td className="font-semibold">{formatCurrency(achats)}</td>
                  <td>
                    <span
                      className={`badge ${f.actif ? "badge-success" : "badge-sand"}`}
                    >
                      {f.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
