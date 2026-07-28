"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { CLIENT_TYPES, totalFacture } from "@/lib/commercial";
import { formatCurrency } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Client } from "@/lib/types";

export default function ParametresClientsPage() {
  const { clients, factures, addClient, updateClient, deleteClient } =
    useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
    ville: "",
    nif: "",
    type: "restaurant" as Client["type"],
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    addClient({
      nom: form.nom.trim(),
      telephone: form.telephone.trim() || undefined,
      email: form.email.trim() || undefined,
      ville: form.ville.trim() || undefined,
      nif: form.nif.trim() || undefined,
      type: form.type,
      actif: true,
    });
    setForm({
      nom: "",
      telephone: "",
      email: "",
      ville: "",
      nif: "",
      type: "restaurant",
    });
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Paramétrage du carnet clients (identité, type, contacts)."
        showPosSelector={false}
        actions={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau client
          </button>
        }
      />

      <ParametresSubnav />

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 grid gap-4 rounded-[var(--radius)] border border-sea-200 bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Nom
            <input
              className="input mt-1"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Type
            <select
              className="select mt-1"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as Client["type"] })
              }
            >
              {Object.entries(CLIENT_TYPES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Téléphone
            <input
              className="input mt-1"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Email
            <input
              type="email"
              className="input mt-1"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Ville
            <input
              className="input mt-1"
              value={form.ville}
              onChange={(e) => setForm({ ...form, ville: e.target.value })}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            NIF client
            <input
              className="input mt-1"
              value={form.nif}
              onChange={(e) => setForm({ ...form, nif: e.target.value })}
              placeholder="Si professionnel"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setOpen(false)}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Contact</th>
              <th>CA facturé</th>
              <th>Statut</th>
              <th></th>
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
                    <button
                      className={`badge ${c.actif ? "badge-success" : "badge-sand"}`}
                      onClick={() =>
                        updateClient(c.id, { actif: !c.actif })
                      }
                    >
                      {c.actif ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        if (confirm(`Supprimer « ${c.nom} » ?`)) {
                          deleteClient(c.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </button>
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
