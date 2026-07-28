"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  DocumentSaisieWizard,
} from "@/components/document-saisie-wizard";
import { PageHeader } from "@/components/page-header";
import {
  DEVIS_STATUTS,
  nextNumero,
  totauxDevis,
} from "@/lib/commercial";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { DevisStatut } from "@/lib/types";

export default function DevisPage() {
  const {
    devis,
    clients,
    produits,
    pointsDeVente,
    parametres,
    commandes,
    tarifsClients,
    addDevis,
    updateDevis,
    deleteDevis,
    addCommande,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState({
    clientId: clients[0]?.id ?? "",
    pointDeVenteId: pointsDeVente[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    validiteJours: "15",
  });

  function ouvrirFormulaire() {
    setMeta({
      clientId: clients[0]?.id ?? "",
      pointDeVenteId: pointsDeVente[0]?.id ?? "",
      date: new Date().toISOString().slice(0, 10),
      validiteJours: "15",
    });
    setOpen(true);
  }

  function convertirEnCommande(devisId: string) {
    const d = devis.find((x) => x.id === devisId);
    if (!d) return;
    addCommande({
      numero: nextNumero(
        "CMD",
        commandes.map((c) => c.numero),
      ),
      clientId: d.clientId,
      pointDeVenteId: d.pointDeVenteId,
      date: new Date().toISOString(),
      statut: "confirmee",
      devisId: d.id,
      tauxTVA: d.tauxTVA ?? parametres.tauxTVA,
      conditionsPaiement:
        d.conditionsPaiement || parametres.conditionsPaiementDefaut,
      lignes: d.lignes.map((l) => ({ ...l, id: `cl-${l.id}` })),
      remiseGlobale: d.remiseGlobale,
      note: d.note,
    });
    updateDevis(d.id, { statut: "accepte" });
    alert("Commande créée à partir du devis.");
  }

  const assujettiTVA =
    parametres.assujettiTVA && parametres.regimeFiscal === "tva";

  return (
    <div>
      <PageHeader
        title="Devis"
        description="Propositions commerciales — convertibles en commandes."
        actions={
          <button className="btn btn-primary" onClick={ouvrirFormulaire}>
            <Plus className="h-4 w-4" />
            Nouveau devis
          </button>
        }
      />

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <DocumentSaisieWizard
            titre="Nouveau devis"
            produits={produits}
            clientId={meta.clientId}
            tarifsClients={tarifsClients}
            tauxTVA={parametres.tauxTVA}
            assujettiTVA={assujettiTVA}
            confirmLabel="Enregistrer le devis"
            onCancel={() => setOpen(false)}
            onConfirm={({ lignes, remiseGlobale, note }) => {
              if (!meta.clientId) return;
              addDevis({
                numero: nextNumero(
                  "DEV",
                  devis.map((d) => d.numero),
                ),
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: new Date(`${meta.date}T12:00:00`).toISOString(),
                validiteJours: Number(meta.validiteJours) || 15,
                statut: "brouillon",
                tauxTVA: parametres.tauxTVA,
                conditionsPaiement: parametres.conditionsPaiementDefaut,
                lignes,
                remiseGlobale: remiseGlobale > 0 ? remiseGlobale : undefined,
                note,
              });
              setOpen(false);
            }}
            headerFields={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-xs font-semibold text-muted">
                  Client
                  <select
                    className="select mt-1"
                    value={meta.clientId}
                    onChange={(e) =>
                      setMeta({ ...meta, clientId: e.target.value })
                    }
                    required
                  >
                    {clients
                      .filter((c) => c.actif)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Point de vente
                  <select
                    className="select mt-1"
                    value={meta.pointDeVenteId}
                    onChange={(e) =>
                      setMeta({ ...meta, pointDeVenteId: e.target.value })
                    }
                  >
                    {pointsDeVente.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Date
                  <input
                    type="date"
                    className="input mt-1"
                    value={meta.date}
                    onChange={(e) =>
                      setMeta({ ...meta, date: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Validité (jours)
                  <input
                    type="number"
                    min="1"
                    className="input mt-1"
                    value={meta.validiteJours}
                    onChange={(e) =>
                      setMeta({ ...meta, validiteJours: e.target.value })
                    }
                  />
                </label>
              </div>
            }
          />
        </div>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>N°</th>
              <th>Date</th>
              <th>Client</th>
              <th>PDV</th>
              <th>Montant</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...devis]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((d) => {
                const client = clients.find((c) => c.id === d.clientId);
                const pdv = pointsDeVente.find(
                  (p) => p.id === d.pointDeVenteId,
                );
                return (
                  <tr key={d.id}>
                    <td className="font-medium">{d.numero}</td>
                    <td>{formatDate(d.date)}</td>
                    <td>{client?.nom ?? "—"}</td>
                    <td>{pdv?.nom ?? "—"}</td>
                    <td className="font-semibold">
                      {formatCurrency(totauxDevis(d, parametres).totalTTC)}
                    </td>
                    <td>
                      <select
                        className="select max-w-[160px]"
                        value={d.statut}
                        onChange={(e) =>
                          updateDevis(d.id, {
                            statut: e.target.value as DevisStatut,
                          })
                        }
                      >
                        {Object.entries(DEVIS_STATUTS).map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {d.statut !== "refuse" && d.statut !== "expire" && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => convertirEnCommande(d.id)}
                          >
                            → Commande
                          </button>
                        )}
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            if (confirm(`Supprimer ${d.numero} ?`)) {
                              deleteDevis(d.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </button>
                      </div>
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
