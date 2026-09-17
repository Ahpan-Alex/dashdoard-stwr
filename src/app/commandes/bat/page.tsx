"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Stamp } from "lucide-react";
import { BatCommandePanel } from "@/components/bat-commande";
import { CommandesSubnav } from "@/components/commercial-doc-subnav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  BAT_STATUTS,
  badgeBat,
  batCourant,
  commandeABatValide,
} from "@/lib/bat";
import { libelleClient } from "@/lib/commercial";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function BonsATirerPage() {
  const commandes = useStore((s) => s.commandes);
  const clients = useStore((s) => s.clients);
  const bats = useStore((s) => s.bonsATirer ?? []);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const lignes = useMemo(() => {
    return [...commandes]
      .filter((c) => c.statut !== "annulee")
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((c) => {
        const courant = batCourant(bats, c.id);
        return {
          c,
          courant,
          valide: commandeABatValide(bats, c.id),
          versions: bats.filter((b) => b.commandeId === c.id).length,
          client: clients.find((x) => x.id === c.clientId),
        };
      });
  }, [commandes, bats, clients]);

  return (
    <div>
      <PageHeader
        title="Bons à tirer"
        description="Validation visuelle client avant fabrication. Versions conservées, notifications in-app uniquement — l'envoi se fait hors logiciel."
      />
      <CommandesSubnav />

      {lignes.length === 0 ? (
        <EmptyState
          icon={<Stamp className="h-5 w-5" />}
          title="Aucune commande"
          description="Les BAT se rattachent à une commande client."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Commande</th>
                <th>Client</th>
                <th>Date</th>
                <th>Versions</th>
                <th>Dernier statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ c, courant, valide, versions, client }) => (
                <tr key={c.id}>
                  <td className="font-medium">
                    <Link href="/commandes/liste" className="text-sea-800">
                      {c.numero}
                    </Link>
                  </td>
                  <td>{client ? libelleClient(client) : "—"}</td>
                  <td>{formatDate(c.date)}</td>
                  <td>{versions}</td>
                  <td>
                    {courant ? (
                      <span className={`badge ${badgeBat(courant.statut)}`}>
                        V{courant.version} · {BAT_STATUTS[courant.statut]}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {valide && (
                      <span className="badge badge-success ml-1">OK prod.</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        setOuvert((id) => (id === c.id ? null : c.id))
                      }
                    >
                      {ouvert === c.id ? "Fermer" : "Historique"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ouvert && (
        <div className="mt-4">
          <BatCommandePanel commandeId={ouvert} />
        </div>
      )}
    </div>
  );
}
