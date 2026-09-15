"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  CONFIGURATION_MENUS,
  ConfigurationSubnav,
} from "@/components/configuration-subnav";
import { ParametresSubnav } from "@/components/parametres-subnav";

const DESCRIPTIONS: Record<string, string> = {
  "/parametres/configuration/exercices":
    "Année civile ou exercice à cheval sur deux années.",
  "/parametres/configuration/numerotation":
    "Préfixes et longueur des n° de devis, commandes, BL et factures.",
};

export default function ConfigurationGeneralePage() {
  return (
    <div>
      <ParametresSubnav />
      <PageHeader
        title="Configuration générale"
        description="Exercices comptables et numérotation des pièces commerciales."
        showPosSelector={false}
      />
      <ConfigurationSubnav />
      <div className="grid gap-3 sm:grid-cols-2">
        {CONFIGURATION_MENUS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
          >
            <p className="font-display text-base font-semibold text-ink">
              {item.label}
            </p>
            <p className="mt-1 text-xs text-muted">
              {DESCRIPTIONS[item.href] ?? "Ouvrir"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
