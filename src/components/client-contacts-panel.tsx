"use client";

import { useState, type FormEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Share2,
  Camera,
  Briefcase,
  Globe,
  MessageCircle,
  Link2,
  Contact,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { createId } from "@/lib/id";
import type { ClientContact, ReseauxSociaux } from "@/lib/types";

type ContactFormState = {
  nom: string;
  fonction: string;
  telephone: string;
  email: string;
  adresse: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  whatsapp: string;
  siteWeb: string;
  autre: string;
};

const FORM_VIDE: ContactFormState = {
  nom: "",
  fonction: "",
  telephone: "",
  email: "",
  adresse: "",
  facebook: "",
  instagram: "",
  linkedin: "",
  whatsapp: "",
  siteWeb: "",
  autre: "",
};

function contactVersForm(c: ClientContact): ContactFormState {
  return {
    nom: c.nom,
    fonction: c.fonction ?? "",
    telephone: c.telephone ?? "",
    email: c.email ?? "",
    adresse: c.adresse ?? "",
    facebook: c.reseaux?.facebook ?? "",
    instagram: c.reseaux?.instagram ?? "",
    linkedin: c.reseaux?.linkedin ?? "",
    whatsapp: c.reseaux?.whatsapp ?? "",
    siteWeb: c.reseaux?.siteWeb ?? "",
    autre: c.reseaux?.autre ?? "",
  };
}

function formVersReseaux(form: ContactFormState): ReseauxSociaux | undefined {
  const reseaux: ReseauxSociaux = {
    facebook: form.facebook.trim() || undefined,
    instagram: form.instagram.trim() || undefined,
    linkedin: form.linkedin.trim() || undefined,
    whatsapp: form.whatsapp.trim() || undefined,
    siteWeb: form.siteWeb.trim() || undefined,
    autre: form.autre.trim() || undefined,
  };
  return Object.values(reseaux).some(Boolean) ? reseaux : undefined;
}

const RESEAUX_META: {
  cle: keyof ReseauxSociaux;
  label: string;
  icon: typeof Share2;
}[] = [
  { cle: "facebook", label: "Facebook", icon: Share2 },
  { cle: "instagram", label: "Instagram", icon: Camera },
  { cle: "linkedin", label: "LinkedIn", icon: Briefcase },
  { cle: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { cle: "siteWeb", label: "Site web", icon: Globe },
  { cle: "autre", label: "Autre", icon: Link2 },
];

export function ClientContactsPanel({
  contacts,
  onChange,
}: {
  contacts: ClientContact[];
  onChange: (contacts: ClientContact[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormState>(FORM_VIDE);

  function fermer() {
    setOpen(false);
    setEditingId(null);
    setForm(FORM_VIDE);
  }

  function ouvrirCreation() {
    setEditingId(null);
    setForm(FORM_VIDE);
    setOpen(true);
  }

  function demarrerEdition(c: ClientContact) {
    setEditingId(c.id);
    setForm(contactVersForm(c));
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    const contact: ClientContact = {
      id: editingId ?? createId("ctc"),
      nom: form.nom.trim(),
      fonction: form.fonction.trim() || undefined,
      telephone: form.telephone.trim() || undefined,
      email: form.email.trim() || undefined,
      adresse: form.adresse.trim() || undefined,
      reseaux: formVersReseaux(form),
    };
    if (editingId) {
      onChange(contacts.map((c) => (c.id === editingId ? contact : c)));
    } else {
      onChange([...contacts, contact]);
    }
    fermer();
  }

  function supprimer(c: ClientContact) {
    if (!confirm(`Supprimer le contact « ${c.nom} » ?`)) return;
    onChange(contacts.filter((x) => x.id !== c.id));
    if (editingId === c.id) fermer();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Répertoriez les interlocuteurs du client : identité, coordonnées et
          réseaux sociaux.
        </p>
        <button className="btn btn-primary shrink-0" onClick={ouvrirCreation}>
          <Plus className="h-4 w-4" />
          Nouveau contact
        </button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5"
        >
          <p className="mb-4 font-display text-base font-semibold">
            {editingId ? "Modifier le contact" : "Nouveau contact"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              Fonction
              <input
                className="input mt-1"
                value={form.fonction}
                onChange={(e) => setForm({ ...form, fonction: e.target.value })}
                placeholder="Ex. Responsable achats"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Téléphone
              <input
                className="input mt-1"
                value={form.telephone}
                onChange={(e) =>
                  setForm({ ...form, telephone: e.target.value })
                }
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
          </div>

          <p className="mb-3 mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Réseaux sociaux
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-xs font-semibold text-muted">
              Facebook
              <input
                className="input mt-1"
                value={form.facebook}
                onChange={(e) => setForm({ ...form, facebook: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Instagram
              <input
                className="input mt-1"
                value={form.instagram}
                onChange={(e) =>
                  setForm({ ...form, instagram: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              LinkedIn
              <input
                className="input mt-1"
                value={form.linkedin}
                onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              WhatsApp
              <input
                className="input mt-1"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Site web
              <input
                className="input mt-1"
                value={form.siteWeb}
                onChange={(e) => setForm({ ...form, siteWeb: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Autre
              <input
                className="input mt-1"
                value={form.autre}
                onChange={(e) => setForm({ ...form, autre: e.target.value })}
              />
            </label>
          </div>

          <div className="mt-5 flex gap-2">
            <button type="submit" className="btn btn-primary">
              {editingId ? "Enregistrer" : "Ajouter le contact"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={fermer}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {contacts.length === 0 ? (
        <EmptyState
          icon={<Contact className="h-5 w-5" />}
          title="Aucun contact"
          description="Ajoutez les interlocuteurs de ce client pour centraliser leurs coordonnées."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="rounded-[var(--radius)] border border-line bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-semibold text-ink">
                    {c.nom}
                  </p>
                  {c.fonction && (
                    <p className="text-xs text-muted">{c.fonction}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => demarrerEdition(c)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => supprimer(c)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-sm">
                {c.telephone && (
                  <p className="flex items-center gap-2 text-ink">
                    <Phone className="h-3.5 w-3.5 text-muted" />
                    {c.telephone}
                  </p>
                )}
                {c.email && (
                  <p className="flex items-center gap-2 text-ink">
                    <Mail className="h-3.5 w-3.5 text-muted" />
                    {c.email}
                  </p>
                )}
                {c.adresse && (
                  <p className="flex items-center gap-2 text-ink">
                    <MapPin className="h-3.5 w-3.5 text-muted" />
                    {c.adresse}
                  </p>
                )}
              </div>

              {c.reseaux &&
                RESEAUX_META.some((m) => c.reseaux?.[m.cle]) && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    {RESEAUX_META.map(({ cle, label, icon: Icon }) => {
                      const value = c.reseaux?.[cle];
                      if (!value) return null;
                      return (
                        <span
                          key={cle}
                          className="inline-flex items-center gap-1 rounded-full bg-sea-100 px-2.5 py-1 text-xs text-sea-700"
                          title={`${label} : ${value}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="max-w-[10rem] truncate">{value}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
