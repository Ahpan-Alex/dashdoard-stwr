"use client";

import { LongueurNumeroCompteForm } from "@/components/longueur-numero-compte-form";
import { ParametresSectionFrame } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";

export default function ParametresComptabilitePage() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <ParametresSectionFrame sectionId="comptabilite">
        <LongueurNumeroCompteForm />
        <p className="mb-4 max-w-2xl text-sm text-muted">
          L&apos;import du plan comptable (PCG 2005 ou CSV) et les comptes
          obligatoires de TVA se gèrent dans le plan comptable. Le bilan initial
          est dans le menu Comptabilité.
        </p>
      </ParametresSectionFrame>
    </RequirePermission>
  );
}
