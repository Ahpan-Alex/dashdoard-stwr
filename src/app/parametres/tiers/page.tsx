"use client";

import { ParametresSectionFrame } from "@/components/parametres-subnav";

export default function ParametresTiersPage() {
  return (
    <ParametresSectionFrame sectionId="tiers">
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Plafonds de crédit, comptes 411 (clients) et 401 (fournisseurs) se
        règlent sur chaque fiche. Les tranches de balance âgée s&apos;appliquent
        à toute l&apos;entreprise.
      </p>
    </ParametresSectionFrame>
  );
}
