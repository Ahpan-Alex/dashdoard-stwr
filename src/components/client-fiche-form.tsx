"use client";

import type { FormEvent } from "react";
import { CompteTiersSelect } from "@/components/compte-tiers-select";
import { SelectTypeClient } from "@/components/select-type-client";
import { PREFIXE_COMPTE_CLIENT } from "@/lib/comptabilite";
import type { Client, CompteComptable, Tiers } from "@/lib/types";

export type ClientFormState = {
  code: string;
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  nif: string;
  type: Client["type"];
  compteClientId: string;
};

export const CLIENT_FORM_VIDE: ClientFormState = {
  code: "",
  nom: "",
  telephone: "",
  email: "",
  adresse: "",
  ville: "",
  nif: "",
  type: "particulier",
  compteClientId: "",
};

export function clientVersForm(c: Client): ClientFormState {
  return {
    code: c.code ?? "",
    nom: c.nom,
    telephone: c.telephone ?? "",
    email: c.email ?? "",
    adresse: c.adresse ?? "",
    ville: c.ville ?? "",
    nif: c.nif ?? "",
    type: c.type,
    compteClientId: c.compteClientId ?? "",
  };
}

export function payloadClient(
  form: ClientFormState,
): Omit<Client, "id" | "actif"> {
  return {
    code: form.code.trim() || undefined,
    nom: form.nom.trim(),
    telephone: form.telephone.trim() || undefined,
    email: form.email.trim() || undefined,
    adresse: form.adresse.trim() || undefined,
    ville: form.ville.trim() || undefined,
    nif: form.nif.trim() || undefined,
    type: form.type,
    compteClientId: form.compteClientId || undefined,
  };
}

type Props = {
  form: ClientFormState;
  setForm: (form: ClientFormState) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  comptes?: CompteComptable[];
  tiers?: Tiers[];
  ignoreTiersId?: string;
  compteVerrouille?: boolean;
};

export function ClientFicheForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  submitLabel,
  comptes = [],
  tiers = [],
  ignoreTiersId,
  compteVerrouille,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-4 rounded-[var(--radius)] border border-sea-200 bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <label className="block text-xs font-semibold text-muted">
        Code client
        <input
          className="input mt-1"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="Ex. CLI-0001"
        />
      </label>
      <label className="block text-xs font-semibold text-muted sm:col-span-2 lg:col-span-2">
        Nom
        <input
          className="input mt-1"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          required
        />
      </label>
      <SelectTypeClient
        value={form.type}
        onChange={(type) => setForm({ ...form, type })}
      />
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
      <CompteTiersSelect
        label="Compte comptable client (411)"
        prefixe={PREFIXE_COMPTE_CLIENT}
        value={form.compteClientId}
        required
        verrouille={compteVerrouille}
        comptes={comptes}
        tiers={tiers}
        ignoreTiersId={ignoreTiersId}
        onChange={(compteClientId) => setForm({ ...form, compteClientId })}
      />
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
