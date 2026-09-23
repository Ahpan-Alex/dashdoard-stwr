"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmPasswordModal } from "@/components/confirm-password-modal";
import { PageHeader } from "@/components/page-header";
import { useAuthStore } from "@/lib/auth-store";
import type { Permission } from "@/lib/auth/rbac";
import { moduleComptabiliteActif } from "@/lib/comptabilite";
import {
  REFERENTIEL_SECTIONS,
  REGLAGES_SECTIONS,
} from "@/lib/parametres-menus";
import { useStore } from "@/lib/store";

function peutVoir(
  hasPermission: (p: Permission) => boolean,
  item: { permission?: Permission; anyOf?: Permission[] },
) {
  if (item.anyOf?.length) return item.anyOf.some((p) => hasPermission(p));
  if (item.permission) return hasPermission(item.permission);
  return true;
}

export default function ParametresHubPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const moduleCompta = useStore((s) => moduleComptabiliteActif(s.parametres));
  const { resetBusinessData } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  async function confirmerReset(password: string) {
    setResetError(null);
    setResetLoading(true);
    try {
      const res = await resetBusinessData(password);
      if (!res.ok) {
        setResetError(res.error);
        return;
      }
      setResetOpen(false);
    } finally {
      setResetLoading(false);
    }
  }

  const reglages = REGLAGES_SECTIONS.filter(
    (s) =>
      peutVoir(hasPermission, s) &&
      (moduleCompta || s.id !== "comptabilite"),
  );
  const referentiels = REFERENTIEL_SECTIONS.filter(
    (s) => s.id !== "recuperation" && peutVoir(hasPermission, s),
  );

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Quatre réglages rares, puis les listes du quotidien."
        showPosSelector={false}
        actions={
          <button
            className="btn btn-secondary"
            onClick={() => {
              setResetError(null);
              setResetOpen(true);
            }}
          >
            Reset données
          </button>
        }
      />

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/parametres/manuel"
          className="block rounded-[var(--radius)] border border-sea-200 bg-sea-50/70 p-5 transition-shadow hover:border-sea-400 hover:shadow-md"
        >
          <p className="font-display text-lg font-semibold text-ink">Manuel</p>
          <p className="mt-1 text-sm text-muted">
            Guide complet : mise en service, puis une affaire suivie du stock
            jusqu&apos;à la relance. Téléchargement PDF.
          </p>
        </Link>
        <Link
          href="/parametres/recuperation"
          className="block rounded-[var(--radius)] border border-sea-200 bg-sea-50/70 p-5 transition-shadow hover:border-sea-400 hover:shadow-md"
        >
          <p className="font-display text-lg font-semibold text-ink">
            Récupération des données
          </p>
          <p className="mt-1 text-sm text-muted">
            Si vous quittez Négoo : liste des fichiers à emporter, et où les
            retrouver dans le logiciel.
          </p>
        </Link>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Réglages</h2>
        <p className="mt-0.5 text-xs text-muted">
          Société, objectifs et alertes, documents, compta — une page par bloc.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {reglages.map((bloc) => (
            <Link
              key={bloc.id}
              href={bloc.href}
              className="rounded-[var(--radius)] border border-line bg-card p-5 transition-shadow hover:border-sea-300 hover:shadow-md"
            >
              <p className="font-display text-lg font-semibold text-ink">
                {bloc.label}
              </p>
              <p className="mt-1 text-sm text-muted">{bloc.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">
          Référentiels
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Catalogue, tiers, sites — les listes que l&apos;on ouvre pour travailler.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {referentiels.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
            >
              <p className="font-display text-base font-semibold text-ink">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-muted">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <ConfirmPasswordModal
        open={resetOpen}
        title="Reset des données métier"
        description="Cette action vide stocks, factures, clients, etc. Elle est irréversible. Saisissez le mot de passe de votre compte pour confirmer."
        confirmLabel="Réinitialiser"
        loading={resetLoading}
        error={resetError}
        onCancel={() => {
          if (resetLoading) return;
          setResetOpen(false);
          setResetError(null);
        }}
        onConfirm={confirmerReset}
      />
    </div>
  );
}
