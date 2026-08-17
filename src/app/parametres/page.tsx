"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmPasswordModal } from "@/components/confirm-password-modal";
import { PageHeader } from "@/components/page-header";
import {
  PARAMETRES_MENUS,
  ParametresSubnav,
} from "@/components/parametres-subnav";
import { useStore } from "@/lib/store";

export default function ParametresHubPage() {
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

  return (
    <div>
      <PageHeader
        title="Paramétrage"
        description="Toute la configuration de base se fait ici — identité, catalogue, partenaires et ouverture."
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

      <ParametresSubnav />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PARAMETRES_MENUS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
          >
            <p className="font-display text-base font-semibold text-ink">
              {item.label}
            </p>
            <p className="mt-1 text-xs text-muted">Ouvrir le paramétrage</p>
          </Link>
        ))}
      </div>

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
