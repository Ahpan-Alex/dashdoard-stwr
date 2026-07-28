"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  PARAMETRES_MENUS,
  ParametresSubnav,
} from "@/components/parametres-subnav";
import { useStore } from "@/lib/store";

export default function ParametresHubPage() {
  const { resetDemo } = useStore();

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
              if (
                confirm("Réinitialiser toutes les données de démonstration ?")
              ) {
                resetDemo();
              }
            }}
          >
            Reset démo
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
    </div>
  );
}
