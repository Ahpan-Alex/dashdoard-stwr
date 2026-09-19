"use client";

import { IndicateurInfo } from "@/components/indicateur-info";
import { StatCard } from "@/components/stat-card";
import { indicateursBat } from "@/lib/bat";
import { formatNumber } from "@/lib/format";
import type { BonATirer, Commande } from "@/lib/types";

export function KpiBatCards({
  bats,
  commandes,
  delaiRelanceJours,
  clientId,
}: {
  bats: BonATirer[];
  commandes?: Commande[];
  delaiRelanceJours: number;
  clientId?: string;
}) {
  const ind = indicateursBat(bats, {
    delaiRelanceJours,
    clientId,
    commandes,
  });
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Versions avant validation"
        value={
          ind.versionsMoyennes == null
            ? "—"
            : formatNumber(ind.versionsMoyennes, 1)
        }
        hint={
          ind.nbCyclesValides
            ? `${ind.nbCyclesValides} BAT validé(s)`
            : "Aucun BAT validé"
        }
        info={
          <IndicateurInfo indicateur="bat_versions_moyennes" />
        }
      />
      <StatCard
        label="Délai moyen de validation"
        value={
          ind.delaiMoyenJours == null
            ? "—"
            : `${formatNumber(ind.delaiMoyenJours, 1)} j`
        }
        hint="Création V1 → validation finale"
        info={
          <IndicateurInfo indicateur="bat_delai_validation" />
        }
      />
      <StatCard
        label="Taux de BAT dupliqués"
        value={
          ind.tauxDupliques == null
            ? "—"
            : `${formatNumber(ind.tauxDupliques, 0)} %`
        }
        hint={`${ind.nbDupliques} dupliqués · ${ind.nbFromScratch} créés`}
        info={
          <IndicateurInfo indicateur="bat_taux_dupliques" />
        }
      />
      <StatCard
        label="BAT en retard de relance"
        value={String(ind.nbEnRetard)}
        hint={`Seuil ${delaiRelanceJours} j en attente`}
        info={
          <IndicateurInfo indicateur="bat_en_retard" />
        }
      />
    </div>
  );
}
