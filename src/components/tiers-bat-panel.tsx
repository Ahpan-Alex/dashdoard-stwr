"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Stamp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import {
  BAT_STATUTS,
  badgeBat,
  batsCourantsCommande,
  libelleLignesBat,
} from "@/lib/bat";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { LigneExportTableau } from "@/lib/export-tableau";

export function TiersBatPanel({ clientId }: { clientId: string }) {
  const commandes = useStore((s) => s.commandes);
  const bats = useStore((s) => s.bonsATirer ?? []);
  const duClient = useMemo(
    () => commandes.filter((c) => c.clientId === clientId && c.statut !== "annulee"),
    [commandes, clientId],
  );
  const lignes = useMemo(() => {
    const out: {
      commandeNumero: string;
      commandeId: string;
      produits: string;
      statut: string;
      statutId: string;
      version: string;
      dateValidation: string;
    }[] = [];
    for (const c of duClient) {
      for (const bat of batsCourantsCommande(bats, c.id)) {
        out.push({
          commandeNumero: c.numero,
          commandeId: c.id,
          produits: libelleLignesBat(bat, c),
          statut: BAT_STATUTS[bat.statut],
          statutId: bat.statut,
          version: `V${bat.version}`,
          dateValidation: bat.dateValidation
            ? formatDate(bat.dateValidation)
            : "—",
        });
      }
    }
    return out.sort((a, b) => b.commandeNumero.localeCompare(a.commandeNumero));
  }, [duClient, bats]);

  const exportLignes: LigneExportTableau[] = lignes.map((l) => ({
    commande: l.commandeNumero,
    produits: l.produits,
    statut: l.statut,
    version: l.version,
    dateValidation: l.dateValidation,
  }));

  if (lignes.length === 0) {
    return (
      <EmptyState
        icon={<Stamp className="h-5 w-5" />}
        title="Aucun BAT"
        description="Les bons à tirer de ce client, toutes commandes confondues, apparaîtront ici."
      />
    );
  }

  return (
    <div>
      <TableAffichageBarre
        tableId="bats"
        lignes={exportLignes}
        fichier={`bat-${clientId}`}
        titre="Bons à tirer"
      />
      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Ligne(s) / produit(s)</th>
              <th>Statut</th>
              <th>Version active</th>
              <th>Date de validation</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={`${l.commandeId}-${i}`}>
                <td className="font-medium">
                  <Link href="/commandes/bat" className="text-sea-800 underline">
                    {l.commandeNumero}
                  </Link>
                </td>
                <td className="text-sm">{l.produits}</td>
                <td>
                  <span
                    className={`badge ${badgeBat(l.statutId as "en_attente" | "modifications_demandees" | "valide")}`}
                  >
                    {l.statut}
                  </span>
                </td>
                <td>{l.version}</td>
                <td>{l.dateValidation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
