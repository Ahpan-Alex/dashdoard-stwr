"use client";

import { PageHeader } from "@/components/page-header";
import { ParametresAlertesForm } from "@/components/parametres-alertes-form";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";

export default function ParametresAlertesProductionPage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <div>
        <PageHeader
          title="Alertes — Production"
          description="Retard d'OF, perte matière, rupture de composant et surcharge d'atelier. Capacité = nombre d'OF ouverts simultanés."
          showPosSelector={false}
        />
        <ParametresSubnav />
        <ParametresAlertesForm module="production" />
      </div>
    </RequirePermission>
  );
}
