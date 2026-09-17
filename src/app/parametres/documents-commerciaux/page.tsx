"use client";

import { ParametresSectionFrame } from "@/components/parametres-subnav";

export default function ParametresDocumentsCommerciauxPage() {
  return (
    <ParametresSectionFrame sectionId="documents">
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Mise en page, pied de page, mention TVA optionnelle et colonnes des
        tableaux. La numérotation des devis, commandes, BL et factures clients
        reste dans Configuration générale.
      </p>
    </ParametresSectionFrame>
  );
}
