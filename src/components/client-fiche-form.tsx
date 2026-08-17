"use client";

import type { FormEvent } from "react";
import { CLIENT_TYPES } from "@/lib/commercial";
import type { Client } from "@/lib/types";

export type ClientFormState = {
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  nif: string;
  type: Client["type"];
};

export const CLIENT_FORM_VIDE: ClientFormState = {
  nom: "",
  telephone: "",
  email: "",
  adresse: "",
  ville: "",
  nif: "",
  type: "restaurant",
};

export function clientVersForm(c: Client): ClientFormState {
  return {
    nom: c.nom,
    telephone: c.telephone ?? "",
    email: c.email ?? "",
    adresse: c.adresse ?? "",
    ville: c.ville ?? "",
    nif: c.nif ?? "",
    type: c.type,
  };
}

export function payloadClient(
  form: ClientFormState,
): Omit<Client, "id" | "actif"> {
  return {
    nom: form.nom.trim(),
    telephone: form.telephone.trim() || undefined,
    email: form.email.trim() || undefined,
    adresse: form.adresse.trim() || undefined,
    ville: form.ville.trim() || undefined,
    nif: form.nif.trim() || undefined,
    type: form.type,
  };
}

type Props = {
  form: ClientFormState;
  setForm: (form: ClientFormState) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
};

export function ClientFicheForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  submitLabel,
}: Props) {
  return (
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
      <label className="block text-xs font-semibold text-muted sm:col-span-2">
        Adresse
        <input
          className="input mt-1"
          value={form.adresse}
          onChange={(e) => setForm({ ...form, adresse: e.target.value })}
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
          {submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
