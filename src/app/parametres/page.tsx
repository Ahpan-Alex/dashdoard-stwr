"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmPasswordModal } from "@/components/confirm-password-modal";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { useAuthStore } from "@/lib/auth-store";
import type { Permission } from "@/lib/auth/rbac";
import { moduleComptabiliteActif } from "@/lib/comptabilite";
import { PARAMETRES_SECTIONS } from "@/lib/parametres-menus";
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

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Même ordre que les menus principaux — chaque module a ses réglages au même endroit."
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

      <div className="space-y-8">
        {PARAMETRES_SECTIONS.filter(
          (section) =>
            peutVoir(hasPermission, section) &&
            (moduleCompta || section.id !== "comptabilite"),
        ).map((section) => {
          const items = section.items.filter(
            (item) => !item.hidden && peutVoir(hasPermission, item),
          );
          return (
            <section key={section.id}>
              <Link href={section.href} className="group block">
                <h2 className="font-display text-lg font-semibold text-ink group-hover:text-sea-800">
                  {section.label}
                </h2>
                <p className="mt-0.5 text-xs text-muted">{section.description}</p>
              </Link>
              {items.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
                    >
                      <p className="font-display text-base font-semibold text-ink">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {item.description ?? "Ouvrir le paramétrage"}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  href={section.href}
                  className="mt-3 block rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md sm:max-w-md"
                >
                  <p className="font-display text-base font-semibold text-ink">
                    Ouvrir {section.label}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Tous les réglages de ce module.
                  </p>
                </Link>
              )}
            </section>
          );
        })}
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
