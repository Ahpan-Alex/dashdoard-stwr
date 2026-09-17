"use client";

import { PageHeader } from "@/components/page-header";
import { ParametresAlertesForm } from "@/components/parametres-alertes-form";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";

export default function ParametresAlertesVentesPage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <div>
        <PageHeader
          title="Alertes — Ventes"
          description="Factures clients en retard (tranches de balance âgée) et anticipation du plafond de crédit, distincte du blocage à 100 %."
          showPosSelector={false}
        />
        <ParametresSubnav />
        <ParametresAlertesForm module="vente" />
      </div>
    </RequirePermission>
  );
}
