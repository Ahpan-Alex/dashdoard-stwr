"use client";

import { PageHeader } from "@/components/page-header";
import { ParametresAlertesForm } from "@/components/parametres-alertes-form";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";

export default function ParametresAlertesAchatsPage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <div>
        <PageHeader
          title="Alertes — Achats"
          description="Échéances fournisseur, avances de mission, compte 471 et demandes de prix sans réponse."
          showPosSelector={false}
        />
        <ParametresSubnav />
        <ParametresAlertesForm module="achat" />
      </div>
    </RequirePermission>
  );
}
