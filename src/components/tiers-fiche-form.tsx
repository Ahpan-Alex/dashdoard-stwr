"use client";

import type { FormEvent } from "react";
import { CompteTiersSelect } from "@/components/compte-tiers-select";
import { SelectTypeClient } from "@/components/select-type-client";
import {
  adressePrincipaleEffective,
  adresseTiersVide,
  synchroniserAdresseLegacy,
} from "@/lib/adresse-tiers";
import {
  PREFIXE_COMPTE_CLIENT,
  PREFIXE_COMPTE_FOURNISSEUR,
} from "@/lib/comptabilite";
import { FORMES_JURIDIQUES_MG, PAYS_DEFAUT_TIERS, REGIONS_MADAGASCAR } from "@/lib/madagascar";
import { ROLE_TIERS_LABELS } from "@/lib/tiers";
import type {
  Client,
  CompteComptable,
  PointDeVente,
  RoleTiers,
  Tiers,
} from "@/lib/types";

export type TiersFormState = {
  code: string;
  nom: string;
  nomCommercial: string;
  formeJuridique: string;
  capitalSocial: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  region: string;
  nif: string;
  stat: string;
  rcs: string;
  siteRattachementId: string;
  type: Client["type"];
  specialite: string;
  roles: RoleTiers[];
  delaiPaiementClientJours: string;
  remiseHabituelleClientPercent: string;
  plafondCredit: string;
  delaiPaiementFournisseurJours: string;
  remiseHabituelleFournisseurPercent: string;
  compteClientId: string;
  compteFournisseurId: string;
};

export const TIERS_FORM_VIDE: TiersFormState = {
  code: "",
  nom: "",
  nomCommercial: "",
  formeJuridique: "",
  capitalSocial: "",
  telephone: "",
  email: "",
  adresse: "",
  ville: "",
  region: "",
  nif: "",
  stat: "",
  rcs: "",
  siteRattachementId: "",
  type: "particulier",
  specialite: "",
  roles: ["client"],
  delaiPaiementClientJours: "30",
  remiseHabituelleClientPercent: "",
  plafondCredit: "",
  delaiPaiementFournisseurJours: "30",
  remiseHabituelleFournisseurPercent: "",
  compteClientId: "",
  compteFournisseurId: "",
};

export function tiersVersForm(t: Tiers): TiersFormState {
  const principale = adressePrincipaleEffective(t);
  return {
    code: t.code ?? "",
    nom: t.nom,
    nomCommercial: t.nomCommercial ?? "",
    formeJuridique: t.formeJuridique ?? "",
    capitalSocial: t.capitalSocial != null ? String(t.capitalSocial) : "",
    telephone: t.telephone ?? "",
    email: t.email ?? "",
    adresse: principale.ligne1 || t.adresse || "",
    ville: principale.ville || t.ville || "",
    region: principale.region ?? "",
    nif: t.nif ?? "",
    stat: t.stat ?? "",
    rcs: t.rcs ?? "",
    siteRattachementId: t.siteRattachementId ?? "",
    type: t.type ?? "autre",
    specialite: t.specialite ?? "",
    roles: t.roles.length ? t.roles : ["client"],
    delaiPaiementClientJours:
      t.delaiPaiementClientJours != null ? String(t.delaiPaiementClientJours) : "",
    remiseHabituelleClientPercent:
      t.remiseHabituelleClientPercent != null
        ? String(t.remiseHabituelleClientPercent)
        : "",
    plafondCredit: t.plafondCredit != null ? String(t.plafondCredit) : "",
    delaiPaiementFournisseurJours:
      t.delaiPaiementFournisseurJours != null
        ? String(t.delaiPaiementFournisseurJours)
        : "",
    remiseHabituelleFournisseurPercent:
      t.remiseHabituelleFournisseurPercent != null
        ? String(t.remiseHabituelleFournisseurPercent)
        : "",
    compteClientId: t.compteClientId ?? "",
    compteFournisseurId: t.compteFournisseurId ?? "",
  };
}

export function payloadTiers(
  form: TiersFormState,
  base?: Tiers,
): Omit<Tiers, "id" | "actif" | "contacts"> {
  const roles = form.roles;
  const adressePrincipale = adresseTiersVide({
    ...base?.adressePrincipale,
    ligne1: form.adresse.trim(),
    ville: form.ville.trim(),
    region: form.region.trim(),
    pays: base?.adressePrincipale?.pays || PAYS_DEFAUT_TIERS,
  });
  const legacy = synchroniserAdresseLegacy({ adressePrincipale });
  const capital = Number(form.capitalSocial.replace(/\s/g, "").replace(",", "."));
  return {
    code: form.code.trim() || undefined,
    nom: form.nom.trim(),
    nomCommercial: form.nomCommercial.trim() || undefined,
    formeJuridique: form.formeJuridique.trim() || undefined,
    capitalSocial: Number.isFinite(capital) && capital > 0 ? capital : undefined,
    telephone: form.telephone.trim() || undefined,
    email: form.email.trim() || undefined,
    adresse: legacy.adresse,
    ville: legacy.ville,
    nif: form.nif.trim() || undefined,
    stat: form.stat.trim() || undefined,
    rcs: form.rcs.trim() || undefined,
    siteRattachementId: form.siteRattachementId || undefined,
    adressePrincipale,
    type: roles.includes("client") ? form.type : undefined,
    specialite: roles.includes("fournisseur")
      ? form.specialite.trim() || undefined
      : undefined,
    roles,
    delaiPaiementClientJours: roles.includes("client")
      ? Math.max(0, Number(form.delaiPaiementClientJours) || 0)
      : undefined,
    remiseHabituelleClientPercent: roles.includes("client")
      ? Math.max(0, Number(form.remiseHabituelleClientPercent) || 0)
      : undefined,
    plafondCredit: roles.includes("client")
      ? Math.max(0, Number(form.plafondCredit) || 0)
      : undefined,
    delaiPaiementFournisseurJours: roles.includes("fournisseur")
      ? Math.max(0, Number(form.delaiPaiementFournisseurJours) || 0)
      : undefined,
    remiseHabituelleFournisseurPercent: roles.includes("fournisseur")
      ? Math.max(0, Number(form.remiseHabituelleFournisseurPercent) || 0)
      : undefined,
    compteClientId: roles.includes("client")
      ? form.compteClientId || undefined
      : undefined,
    compteFournisseurId: roles.includes("fournisseur")
      ? form.compteFournisseurId || undefined
      : undefined,
  };
}

function toggleRole(roles: RoleTiers[], role: RoleTiers): RoleTiers[] {
  return roles.includes(role)
    ? roles.filter((r) => r !== role)
    : [...roles, role];
}

type Props = {
  form: TiersFormState;
  setForm: (form: TiersFormState) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  comptes?: CompteComptable[];
  tiers?: Tiers[];
  ignoreTiersId?: string;
  compteClientVerrouille?: boolean;
  compteFournisseurVerrouille?: boolean;
  pointsDeVente?: PointDeVente[];
};

export function TiersFicheForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  submitLabel,
  comptes = [],
  tiers = [],
  ignoreTiersId,
  compteClientVerrouille,
  compteFournisseurVerrouille,
  pointsDeVente = [],
}: Props) {
  const estClient = form.roles.includes("client");
  const estFournisseur = form.roles.includes("fournisseur");

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 grid gap-4 rounded-[var(--radius)] border border-sea-200 bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="text-xs font-semibold text-muted">Rôles</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {(["client", "fournisseur"] as const).map((role) => (
            <label key={role} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.roles.includes(role)}
                onChange={() =>
                  setForm({ ...form, roles: toggleRole(form.roles, role) })
                }
              />
              {ROLE_TIERS_LABELS[role]}
            </label>
          ))}
        </div>
      </div>

      <label className="block text-xs font-semibold text-muted">
        Code
        <input
          className="input mt-1"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="Ex. CLI-0001"
        />
      </label>
      <label className="block text-xs font-semibold text-muted sm:col-span-2">
        Nom ou raison sociale
        <input
          className="input mt-1"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          required
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Nom commercial ou marque
        <input
          className="input mt-1"
          value={form.nomCommercial}
          onChange={(e) => setForm({ ...form, nomCommercial: e.target.value })}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        Forme juridique
        <select
          className="select mt-1"
          value={form.formeJuridique}
          onChange={(e) => setForm({ ...form, formeJuridique: e.target.value })}
        >
          <option value="">—</option>
          {FORMES_JURIDIQUES_MG.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-muted">
        Capital social (Ar)
        <input
          type="number"
          min={0}
          className="input mt-1"
          value={form.capitalSocial}
          onChange={(e) => setForm({ ...form, capitalSocial: e.target.value })}
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
        Région
        <select
          className="select mt-1"
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
        >
          <option value="">—</option>
          {REGIONS_MADAGASCAR.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-muted">
        Site de rattachement
        <select
          className="select mt-1"
          value={form.siteRattachementId}
          onChange={(e) =>
            setForm({ ...form, siteRattachementId: e.target.value })
          }
        >
          <option value="">—</option>
          {pointsDeVente
            .filter((p) => p.actif)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-muted">
        NIF
        <input
          className="input mt-1"
          value={form.nif}
          onChange={(e) => setForm({ ...form, nif: e.target.value })}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        STAT
        <input
          className="input mt-1"
          value={form.stat}
          onChange={(e) => setForm({ ...form, stat: e.target.value })}
        />
      </label>
      <label className="block text-xs font-semibold text-muted">
        RCS
        <input
          className="input mt-1"
          value={form.rcs}
          onChange={(e) => setForm({ ...form, rcs: e.target.value })}
        />
      </label>
      <p className="sm:col-span-2 lg:col-span-3 text-[11px] text-muted">
        Sur les factures, devis, BL et BC, seuls le nom, le NIF et le STAT sont
        imprimés. Les autres champs restent informatifs sur la fiche.
      </p>

      {estClient && (
        <>
          <SelectTypeClient
            value={form.type}
            onChange={(type) => setForm({ ...form, type })}
          />
          <label className="block text-xs font-semibold text-muted">
            Délai de paiement client (j)
            <input
              type="number"
              min={0}
              className="input mt-1"
              value={form.delaiPaiementClientJours}
              onChange={(e) =>
                setForm({ ...form, delaiPaiementClientJours: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Remise habituelle vente (%)
            <input
              type="number"
              min={0}
              step="0.1"
              className="input mt-1"
              value={form.remiseHabituelleClientPercent}
              onChange={(e) =>
                setForm({
                  ...form,
                  remiseHabituelleClientPercent: e.target.value,
                })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Plafond de crédit (Ar)
            <input
              type="number"
              min={0}
              step={1000}
              className="input mt-1"
              value={form.plafondCredit}
              onChange={(e) =>
                setForm({ ...form, plafondCredit: e.target.value })
              }
              placeholder="0 = aucun plafond"
            />
          </label>
        </>
      )}

      {estFournisseur && (
        <>
          <label className="block text-xs font-semibold text-muted">
            Spécialité
            <input
              className="input mt-1"
              value={form.specialite}
              onChange={(e) =>
                setForm({ ...form, specialite: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Délai de paiement fournisseur (j)
            <input
              type="number"
              min={0}
              className="input mt-1"
              value={form.delaiPaiementFournisseurJours}
              onChange={(e) =>
                setForm({
                  ...form,
                  delaiPaiementFournisseurJours: e.target.value,
                })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Remise habituelle achat (%)
            <input
              type="number"
              min={0}
              step="0.1"
              className="input mt-1"
              value={form.remiseHabituelleFournisseurPercent}
              onChange={(e) =>
                setForm({
                  ...form,
                  remiseHabituelleFournisseurPercent: e.target.value,
                })
              }
            />
          </label>
        </>
      )}

      {(estClient || estFournisseur) && (
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
          {estClient && (
            <CompteTiersSelect
              label="Compte comptable client (411)"
              prefixe={PREFIXE_COMPTE_CLIENT}
              value={form.compteClientId}
              required
              verrouille={compteClientVerrouille}
              comptes={comptes}
              tiers={tiers}
              ignoreTiersId={ignoreTiersId}
              onChange={(compteClientId) =>
                setForm({ ...form, compteClientId })
              }
            />
          )}
          {estFournisseur && (
            <CompteTiersSelect
              label="Compte comptable fournisseur (401)"
              prefixe={PREFIXE_COMPTE_FOURNISSEUR}
              value={form.compteFournisseurId}
              required
              verrouille={compteFournisseurVerrouille}
              comptes={comptes}
              tiers={tiers}
              ignoreTiersId={ignoreTiersId}
              onChange={(compteFournisseurId) =>
                setForm({ ...form, compteFournisseurId })
              }
            />
          )}
        </div>
      )}

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
