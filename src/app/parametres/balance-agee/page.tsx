"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import {
  labelsTranchesBalanceAgee,
  normaliserTranchesBalanceAgee,
  TRANCHES_BALANCE_AGEE_DEFAUT,
} from "@/lib/tiers";
import { useStore } from "@/lib/store";

export default function ParametresBalanceAgeePage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <BalanceAgeeContent />
    </RequirePermission>
  );
}

function BalanceAgeeContent() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const actuelles = normaliserTranchesBalanceAgee(
    parametres.tranchesBalanceAgeeJours,
  );
  const [saisie, setSaisie] = useState(actuelles.join(", "));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = saisie
      .split(/[,;\s]+/)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    const next = normaliserTranchesBalanceAgee(
      raw.length ? raw : [...TRANCHES_BALANCE_AGEE_DEFAUT],
    );
    updateParametres({ tranchesBalanceAgeeJours: next });
    setSaisie(next.join(", "));
  }

  const labels = labelsTranchesBalanceAgee(
    normaliserTranchesBalanceAgee(
      saisie
        .split(/[,;\s]+/)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  );

  return (
    <div>
      <PageHeader
        title="Balance âgée"
        description="Tranches d'ancienneté des créances et dettes, pour toute l'entreprise. Pas de personnalisation par tiers."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <form
        onSubmit={onSubmit}
        className="max-w-xl rounded-[var(--radius)] border border-line bg-card p-5"
      >
        <label className="block text-xs font-semibold text-muted">
          Bornes en jours (séparées par des virgules)
          <input
            className="input mt-1"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="30, 60, 90"
          />
        </label>
        <p className="mt-3 text-sm text-muted">
          Tranches résultantes : {labels.join(" · ")}
        </p>
        <p className="mt-2 text-xs text-muted">
          Défaut : 0–30, 31–60, 61–90, plus de 90 jours.
        </p>
        <button type="submit" className="btn btn-primary mt-4">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
