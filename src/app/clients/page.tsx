"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CLIENT_TYPES, totalFacture } from "@/lib/commercial";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function ClientsPage() {
  const { clients, factures } = useStore();

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Consultation du carnet clients. La création et la modification se font dans Paramétrage."
        showPosSelector={false}
        actions={
          <Link href="/parametres/clients" className="btn btn-primary">
            <Settings className="h-4 w-4" />
            Paramétrer les clients
          </Link>
        }
      />

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Contact</th>
              <th>CA facturé</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const ca = factures
                .filter(
                  (f) =>
                    f.clientId === c.id &&
                    f.statut !== "annulee" &&
                    f.statut !== "brouillon",
                )
                .reduce((s, f) => s + totalFacture(f), 0);
              return (
                <tr key={c.id}>
                  <td className="font-medium">
                    {c.nom}
                    {c.ville && (
                      <span className="mt-0.5 block text-xs font-normal text-muted">
                        {c.ville}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-sea">
                      {CLIENT_TYPES[c.type]}
                    </span>
                  </td>
                  <td className="text-sm">
                    {c.telephone || "—"}
                    {c.email && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {c.email}
                      </span>
                    )}
                  </td>
                  <td className="font-semibold">{formatCurrency(ca)}</td>
                  <td>
                    <span
                      className={`badge ${c.actif ? "badge-success" : "badge-sand"}`}
                    >
                      {c.actif ? "Actif" : "Inactif"}
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
