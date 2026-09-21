"use client";

import { DESTINATION_ACHAT_LABELS } from "@/lib/achats";
import { COMMANDE_STATUTS, libelleClient } from "@/lib/commercial";
import type { Client, Commande, DestinationAchat } from "@/lib/types";

export function SelecteurDestinationAchat({
  destination,
  commandeId,
  commandes,
  clients,
  disabled,
  name = "destination-achat",
  onChange,
}: {
  destination: DestinationAchat | "";
  commandeId: string;
  commandes: Commande[];
  clients: Client[];
  disabled?: boolean;
  name?: string;
  onChange: (next: {
    destinationAchat: DestinationAchat | "";
    commandeId: string;
  }) => void;
}) {
  const ouvertes = commandes.filter((c) => c.statut !== "annulee");
  const nomClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    return c ? libelleClient(c) : "Client";
  };

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="min-w-0 sm:col-span-2">
        <p className="text-xs font-semibold text-muted">Destination</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <label className="inline-flex min-w-0 items-center gap-2 rounded-[var(--radius)] border border-line bg-card px-3 py-2">
            <input
              type="radio"
              name={name}
              disabled={disabled}
              checked={destination === "projet_client"}
              onChange={() =>
                onChange({ destinationAchat: "projet_client", commandeId })
              }
            />
            {DESTINATION_ACHAT_LABELS.projet_client}
          </label>
          <label className="inline-flex min-w-0 items-center gap-2 rounded-[var(--radius)] border border-line bg-card px-3 py-2">
            <input
              type="radio"
              name={name}
              disabled={disabled}
              checked={destination === "approvisionnement_stock"}
              onChange={() =>
                onChange({
                  destinationAchat: "approvisionnement_stock",
                  commandeId: "",
                })
              }
            />
            {DESTINATION_ACHAT_LABELS.approvisionnement_stock}
          </label>
        </div>
      </div>
      {destination === "projet_client" && (
        <label className="block text-xs font-semibold text-muted sm:col-span-2">
          Commande client (projet)
          <select
            className="select mt-1"
            disabled={disabled}
            value={commandeId}
            onChange={(e) =>
              onChange({
                destinationAchat: "projet_client",
                commandeId: e.target.value,
              })
            }
          >
            <option value="">— Choisir —</option>
            {ouvertes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero} — {nomClient(c.clientId)}
                {COMMANDE_STATUTS[c.statut] ? ` (${COMMANDE_STATUTS[c.statut]})` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
