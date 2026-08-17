"use client";

import type { FormEvent } from "react";
import type { Fournisseur } from "@/lib/types";

export type FournisseurFormState = {
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  specialite: string;
  nif: string;
};

export const FOURNISSEUR_FORM_VIDE: FournisseurFormState = {
  nom: "",
  telephone: "",
  email: "",
  adresse: "",
  ville: "",
  specialite: "",
  nif: "",
};

export function fournisseurVersForm(f: Fournisseur): FournisseurFormState {
  return {
    nom: f.nom,
    telephone: f.telephone ?? "",
    email: f.email ?? "",
    adresse: f.adresse ?? "",
    ville: f.ville ?? "",
    specialite: f.specialite ?? "",
    nif: f.nif ?? "",
  };
}

export function payloadFournisseur(
  form: FournisseurFormState,
): Omit<Fournisseur, "id" | "actif"> {
  return {
    nom: form.nom.trim(),
    telephone: form.telephone.trim() || undefined,
    email: form.email.trim() || undefined,
    adresse: form.adresse.trim() || undefined,
    ville: form.ville.trim() || undefined,
    specialite: form.specialite.trim() || undefined,
    nif: form.nif.trim() || undefined,
  };
}

type Props = {
  form: FournisseurFormState;
  setForm: (form: FournisseurFormState) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
};

export function FournisseurFicheForm({
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
      <label className="block text-xs font-semibold text-muted">
        Nom
        <input
          className="input mt-1"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          required
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Spécialité
        <input
          className="input mt-1"
          value={form.specialite}
          onChange={(e) => setForm({ ...form, specialite: e.target.value })}
          placeholder="Poissons, crustacés…"
        />
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
        NIF
        <input
          className="input mt-1"
          value={form.nif}
          onChange={(e) => setForm({ ...form, nif: e.target.value })}
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
