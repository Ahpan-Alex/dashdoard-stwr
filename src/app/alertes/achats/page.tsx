"use client";

import { AlertesListe } from "@/components/alertes-liste";
import { AlertesSubnav } from "@/components/alertes-subnav";
import { PageHeader } from "@/components/page-header";
import { useAlertes } from "@/lib/use-alertes";

export default function AlertesAchatsPage() {
  const { actives, nonLues } = useAlertes();
  const n = actives.filter((a) => a.categorie === "achat").length;
  const nl = nonLues.filter((a) => a.categorie === "achat").length;
  return (
    <div>
      <PageHeader
        title="Alertes — Achats"
        description={`${n} active${n > 1 ? "s" : ""} · ${nl} non lue${nl > 1 ? "s" : ""}. Notifications internes uniquement.`}
      />
      <AlertesSubnav hrefParametres="/parametres/alertes/achats" />
      <AlertesListe categorie="achat" />
    </div>
  );
}
