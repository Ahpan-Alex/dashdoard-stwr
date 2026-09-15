"use client";

import {
  ConfigurationSubnav,
  NumerotationSubnav,
} from "@/components/configuration-subnav";
import { NumerotationInitialeForm } from "@/components/numerotation-initiale-form";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";

export default function NumerotationInitialePage() {
  return (
    <div>
      <ParametresSubnav />
      <ConfigurationSubnav />
      <PageHeader
        title="Numérotation initiale"
        description="Pour une souscription en cours d’exercice : démarrez les n° de devis, commandes, BL et factures à partir du compteur déjà atteint, sans reconstituer l’historique."
        showPosSelector={false}
      />
      <NumerotationSubnav />
      <NumerotationInitialeForm />
    </div>
  );
}
