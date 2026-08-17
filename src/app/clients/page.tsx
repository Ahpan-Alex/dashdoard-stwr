"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import {
  ClientFicheForm,
  CLIENT_FORM_VIDE,
  clientVersForm,
  payloadClient,
} from "@/components/client-fiche-form";
import { FicheApercuModal, LigneInfo } from "@/components/fiche-apercu-modal";
import { PageHeader } from "@/components/page-header";
import { RowCrudActions } from "@/components/row-crud-actions";
import { CLIENT_TYPES, creancesDunClient, motifLienClient, totalAcomptesClient, totalFacture } from "@/lib/commercial";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const {
    clients,
    factures,
    devis,
    commandes,
    bonsDeLivraison,
    acomptes,
    tarifsClients,
    parametres,
    addClient,
    updateClient,
    deleteClient,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apercuId, setApercuId] = useState<string | null>(null);
  const [form, setForm] = useState(CLIENT_FORM_VIDE);
  const apercu = clients.find((c) => c.id === apercuId);

  function fermerForm() {
    setOpen(false);
    setEditingId(null);
    setForm(CLIENT_FORM_VIDE);
  }

  function ouvrirCreation() {
    setEditingId(null);
    setForm(CLIENT_FORM_VIDE);
    setOpen(true);
  }

  function demarrerEdition(c: Client) {
    setEditingId(c.id);
    setForm(clientVersForm(c));
    setOpen(true);
    setApercuId(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    const payload = payloadClient(form);
    if (editingId) {
      updateClient(editingId, payload);
    } else {
      addClient({ ...payload, actif: true });
    }
    fermerForm();
  }

  function refsClient() {
    return {
      factures,
      devis,
      commandes,
      bonsDeLivraison,
      acomptes,
      tarifsClients,
    };
  }

  function supprimer(c: Client) {
    const motif = motifLienClient(c.id, refsClient());
    if (motif) {
      alert(motif);
      return;
    }
    if (!confirm(`Supprimer « ${c.nom} » ?`)) return;
    const res = deleteClient(c.id);
    if (!res.ok && res.reason) alert(res.reason);
    if (editingId === c.id) fermerForm();
    if (apercuId === c.id) setApercuId(null);
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Carnet clients : créez, modifiez ou désactivez une fiche. La suppression n'est possible que si le client n'est pas encore utilisé."
        showPosSelector={false}
        actions={
          <button className="btn btn-primary" onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Nouveau client
          </button>
        }
      />

      {open && (
        <ClientFicheForm
          form={form}
          setForm={setForm}
          onSubmit={onSubmit}
          onCancel={fermerForm}
          submitLabel={editingId ? "Enregistrer les modifications" : "Enregistrer"}
        />
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Contact</th>
              <th>CA facturé</th>
              <th>Acomptes</th>
              <th>Reste dû</th>
              <th>Statut</th>
              <th>Actions</th>
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
              const motif = motifLienClient(c.id, refsClient());
              const acomptesClient = totalAcomptesClient(c.id, acomptes);
              const resteDu = creancesDunClient(
                c.id,
                factures,
                parametres,
                acomptes,
              );
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
                  <td>{formatCurrency(acomptesClient)}</td>
                  <td
                    className={
                      resteDu > 0 ? "font-semibold text-coral" : "font-semibold"
                    }
                  >
                    {formatCurrency(resteDu)}
                  </td>
                  <td>
                    <button
                      className={`badge ${c.actif ? "badge-success" : "badge-sand"}`}
                      onClick={() => updateClient(c.id, { actif: !c.actif })}
                    >
                      {c.actif ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td>
                    <RowCrudActions
                      onView={() => {
                        setApercuId(c.id);
                        setOpen(false);
                      }}
                      onEdit={() => demarrerEdition(c)}
                      onDelete={() => supprimer(c)}
                      deleteDisabled={Boolean(motif)}
                      deleteReason={motif ?? undefined}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <FicheApercuModal
        open={Boolean(apercu)}
        title={apercu?.nom ?? ""}
        subtitle="Fiche client"
        onClose={() => setApercuId(null)}
        onEdit={apercu ? () => demarrerEdition(apercu) : undefined}
      >
        <LigneInfo
          label="Type"
          value={apercu ? CLIENT_TYPES[apercu.type] : undefined}
        />
        <LigneInfo label="Téléphone" value={apercu?.telephone} />
        <LigneInfo label="Email" value={apercu?.email} />
        <LigneInfo label="Adresse" value={apercu?.adresse} />
        <LigneInfo label="Ville" value={apercu?.ville} />
        <LigneInfo label="NIF" value={apercu?.nif} />
        <LigneInfo
          label="Statut"
          value={apercu?.actif ? "Actif" : "Inactif"}
        />
        <LigneInfo
          label="Acomptes encaissés"
          value={
            apercu
              ? formatCurrency(totalAcomptesClient(apercu.id, acomptes))
              : undefined
          }
        />
        <LigneInfo
          label="Reste dû"
          value={
            apercu
              ? formatCurrency(
                  creancesDunClient(apercu.id, factures, parametres, acomptes),
                )
              : undefined
          }
        />
      </FicheApercuModal>
    </div>
  );
}
