"use client";

import { AlertesListe } from "@/components/alertes-liste";
import { AlertesSubnav } from "@/components/alertes-subnav";
import { PageHeader } from "@/components/page-header";
import { useAlertes } from "@/lib/use-alertes";

export default function AlertesStockPage() {
  const { actives, nonLues } = useAlertes();
  const n = actives.filter((a) => a.categorie === "stock").length;
  const nl = nonLues.filter((a) => a.categorie === "stock").length;
  return (
    <div>
      <PageHeader
        title="Alertes — Stock"
        description={`${n} active${n > 1 ? "s" : ""} · ${nl} non lue${nl > 1 ? "s" : ""}. Notifications internes uniquement.`}
      />
      <AlertesSubnav hrefParametres="/parametres/alertes" />
      <AlertesListe categorie="stock" />
    </div>
  );
}
