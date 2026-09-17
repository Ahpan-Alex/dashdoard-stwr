"use client";

import { PageHeader } from "@/components/page-header";
import { ParametresAlertesForm } from "@/components/parametres-alertes-form";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";

function Contenu({
  titre,
  description,
  module,
}: {
  titre: string;
  description: string;
  module: "stock" | "production" | "achat" | "vente";
}) {
  return (
    <div>
      <PageHeader title={titre} description={description} showPosSelector={false} />
      <ParametresSubnav />
      <ParametresAlertesForm module={module} />
    </div>
  );
}

export default function ParametresAlertesStockPage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <Contenu
        titre="Alertes — Stock"
        description="Activation et seuils globaux. La rupture, le réappro et le surstock restent définis sur chaque fiche produit."
        module="stock"
      />
    </RequirePermission>
  );
}
