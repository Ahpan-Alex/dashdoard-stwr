"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { useStore } from "@/lib/store";

export default function ParametresRentabilitePage() {
  const { parametres, updateParametres } = useStore();
  const [seuil1, setSeuil1] = useState(
    String(parametres.seuilMargePalier1Percent ?? 25),
  );
  const [seuil2, setSeuil2] = useState(
    String(parametres.seuilMargePalier2Percent ?? 5),
  );
  const [saved, setSaved] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    updateParametres({
      seuilMargePalier1Percent: Math.max(0, Number(seuil1) || 0),
      seuilMargePalier2Percent: Math.max(0, Number(seuil2) || 0),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <PageHeader
        title="Seuils de rentabilité"
        description="Alertes du tableau de bord à 2 paliers (taux de marge minimum)."
        showPosSelector={false}
        actions={
          <Link
            href="/tableau-de-bord/rentabilite"
            className="btn btn-secondary"
          >
            <TrendingUp className="h-4 w-4" />
            Voir le tableau de bord
          </Link>
        }
      />

      <ParametresSubnav />

      <form
        onSubmit={onSubmit}
        className="max-w-lg rounded-[var(--radius)] border border-line bg-card p-5"
      >
        <label className="block text-xs font-semibold text-muted">
          Seuil Palier 1 — marge avant autres charges (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            className="input mt-1"
            value={seuil1}
            onChange={(e) => setSeuil1(e.target.value)}
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Alerte si (CA − CMV − charges variables) / CA &lt; ce seuil.
          Défaut : 25 %.
        </p>

        <label className="mt-4 block text-xs font-semibold text-muted">
          Seuil Palier 2 — bénéfice après autres charges (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            className="input mt-1"
            value={seuil2}
            onChange={(e) => setSeuil2(e.target.value)}
          />
        </label>
        <p className="mt-1 text-xs text-muted">
          Alerte si résultat net analytique / CA &lt; ce seuil. Une alerte
          distincte s&apos;affiche si le Palier 2 est négatif. Défaut : 5 %.
        </p>

        <div className="mt-5 flex items-center gap-3">
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
          {saved && (
            <span className="text-sm text-success">Seuils enregistrés.</span>
          )}
        </div>
      </form>
    </div>
  );
}
