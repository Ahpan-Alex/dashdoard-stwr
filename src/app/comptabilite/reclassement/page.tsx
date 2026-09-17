"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ComptabiliteSubnav } from "@/components/comptabilite-subnav";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import {
  comptesParClasse,
  depenseEnAttenteReclassement,
} from "@/lib/comptabilite";
import { formatCurrency, formatDate } from "@/lib/format";
import { libelleNatureDepense } from "@/lib/natures-depense-mission";
import { useStore } from "@/lib/store";

export default function Reclassement471Page() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <ReclassementContent />
    </RequirePermission>
  );
}

function ReclassementContent() {
  const missionsAchat = useStore((s) => s.missionsAchat ?? []);
  const naturesDepenseMission = useStore((s) => s.naturesDepenseMission ?? []);
  const comptesComptables = useStore((s) => s.comptesComptables);
  const reclasseDepenseMission = useStore((s) => s.reclasseDepenseMission);
  const peutGerer = useAuthStore((s) => s.hasPermission("comptabilite.gerer"));
  const charges = useMemo(
    () => comptesParClasse(comptesComptables, "6"),
    [comptesComptables],
  );
  const [choix, setChoix] = useState<Record<string, string>>({});

  const lignes = useMemo(() => {
    const out: {
      missionId: string;
      numero: string;
      depenseId: string;
      nature: string;
      montant: number;
      date?: string;
    }[] = [];
    for (const m of missionsAchat) {
      if (m.statut !== "cloture" && m.statut !== "cloture_annule") continue;
      for (const d of m.depensesDiverses) {
        if (!(d.montant > 0)) continue;
        if (!depenseEnAttenteReclassement(d, naturesDepenseMission)) continue;
        out.push({
          missionId: m.id,
          numero: m.numero,
          depenseId: d.id,
          nature: libelleNatureDepense(d, naturesDepenseMission),
          montant: d.montant,
          date: d.date ?? m.dateCloture ?? m.date,
        });
      }
    }
    return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [missionsAchat, naturesDepenseMission]);

  function appliquer(missionId: string, depenseId: string) {
    const compteId = choix[depenseId];
    if (!compteId) {
      alert("Choisissez un compte de charge (classe 6).");
      return;
    }
    const res = reclasseDepenseMission(missionId, depenseId, compteId);
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title="Reclassement compte 471"
        description="Dépenses diverses de mission saisies en nature libre, imputées au compte d'attente 471. Le comptable les reclasse vers un compte de charge (classe 6)."
        showPosSelector={false}
      />
      <ComptabiliteSubnav />

      {lignes.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-line bg-card p-6 text-sm text-muted">
          Aucune dépense en attente de reclassement.
        </p>
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Mission</th>
                <th>Date</th>
                <th>Nature libre</th>
                <th className="text-right">Montant</th>
                <th>Compte de charge</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.depenseId}>
                  <td>
                    <Link
                      href={`/missions/${l.missionId}`}
                      className="text-sea-800 underline"
                    >
                      {l.numero}
                    </Link>
                  </td>
                  <td>{l.date ? formatDate(l.date) : "—"}</td>
                  <td>{l.nature}</td>
                  <td className="text-right font-semibold">
                    {formatCurrency(l.montant)}
                  </td>
                  <td>
                    <select
                      className="select"
                      disabled={!peutGerer}
                      value={choix[l.depenseId] ?? ""}
                      onChange={(e) =>
                        setChoix((prev) => ({
                          ...prev,
                          [l.depenseId]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Choisir…</option>
                      {charges.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.numero} — {c.libelle}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {peutGerer && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => appliquer(l.missionId, l.depenseId)}
                      >
                        Reclasser
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
