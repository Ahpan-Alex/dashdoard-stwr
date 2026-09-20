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
    <div className="grid gap-3 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="text-xs font-semibold text-muted">Destination</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
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
          <label className="inline-flex items-center gap-2">
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
      </fieldset>
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
