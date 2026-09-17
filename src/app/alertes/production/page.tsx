"use client";

import { AlertesListe } from "@/components/alertes-liste";
import { AlertesSubnav } from "@/components/alertes-subnav";
import { PageHeader } from "@/components/page-header";
import { useAlertes } from "@/lib/use-alertes";

export default function AlertesProductionPage() {
  const { actives, nonLues } = useAlertes();
  const n = actives.filter((a) => a.categorie === "production").length;
  const nl = nonLues.filter((a) => a.categorie === "production").length;
  return (
    <div>
      <PageHeader
        title="Alertes — Production"
        description={`${n} active${n > 1 ? "s" : ""} · ${nl} non lue${nl > 1 ? "s" : ""}. Notifications internes uniquement.`}
      />
      <AlertesSubnav hrefParametres="/parametres/alertes/production" />
      <AlertesListe categorie="production" />
    </div>
  );
}
