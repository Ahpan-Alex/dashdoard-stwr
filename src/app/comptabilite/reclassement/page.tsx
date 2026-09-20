"use client";

import { useMemo, useState } from "react";
import { ComptabiliteSubnav } from "@/components/comptabilite-subnav";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import {
  comptesDestinationReclassement471,
  libelleJournalEcriture,
  lignes471AReclasser,
} from "@/lib/comptabilite";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { SourceEcriture } from "@/lib/types";

const SOURCE_ECRITURE: Record<SourceEcriture, string> = {
  facture: "Vente",
  achat: "Achat",
  avoir_achat: "Avoir achat",
  mission_achat: "Mission d'achat",
  mission_achat_depense: "Dépense de mission",
  sortie_atelier: "Sortie atelier",
  tresorerie: "Trésorerie",
  operation_tresorerie: "Appro / retrait",
  solde_initial: "Solde initial",
  reclassement_471: "Reclassement 471",
};

export default function Reclassement471Page() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <ReclassementContent />
    </RequirePermission>
  );
}

function ReclassementContent() {
  const ecrituresComptables = useStore((s) => s.ecrituresComptables ?? []);
  const reclassements471 = useStore((s) => s.reclassements471 ?? []);
  const comptesComptables = useStore((s) => s.comptesComptables);
  const journauxTresorerie = useStore((s) => s.journauxTresorerie ?? []);
  const reclasseLigne471 = useStore((s) => s.reclasseLigne471);
  const peutGerer = useAuthStore((s) => s.hasPermission("comptabilite.gerer"));
  const destinations = useMemo(
    () => comptesDestinationReclassement471(comptesComptables),
    [comptesComptables],
  );
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [filtre471, setFiltre471] = useState("tous");

  const lignes = useMemo(
    () => lignes471AReclasser(ecrituresComptables, reclassements471),
    [ecrituresComptables, reclassements471],
  );

  const comptes471Presents = useMemo(() => {
    const map = new Map<string, { numero: string; libelle: string }>();
    for (const l of lignes) {
      const key = l.compteId || l.numero;
      if (!map.has(key)) {
        map.set(key, { numero: l.numero, libelle: l.compteLibelle });
      }
    }
    return [...map.entries()]
      .map(([id, c]) => ({ id, ...c }))
      .sort((a, b) => a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  }, [lignes]);

  const visibles = useMemo(
    () =>
      filtre471 === "tous"
        ? lignes
        : lignes.filter((l) => (l.compteId || l.numero) === filtre471),
    [lignes, filtre471],
  );

  function appliquer(ecritureId: string, ligneId: string) {
    const compteId = choix[`${ecritureId}:${ligneId}`];
    if (!compteId) {
      alert("Choisissez le compte de destination.");
      return;
    }
    const res = reclasseLigne471(ecritureId, ligneId, compteId);
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title="Reclassement compte 471"
        description="Toutes les lignes imputées à un compte 471 dans les écritures (achat, trésorerie, missions, soldes…). Le comptable les reclasse vers le compte définitif."
        showPosSelector={false}
      />
      <ComptabiliteSubnav />

      {comptes471Presents.length > 1 && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-muted">
            Compte 471
            <select
              className="select mt-1"
              value={filtre471}
              onChange={(e) => setFiltre471(e.target.value)}
            >
              <option value="tous">Tous les 471 de l&apos;écriture</option>
              {comptes471Presents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} — {c.libelle}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-line bg-card p-6 text-sm text-muted">
          Aucune ligne 471 en attente de reclassement.
        </p>
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pièce</th>
                <th>Journal</th>
                <th>Origine</th>
                <th>Compte 471</th>
                <th className="text-right">Débit</th>
                <th className="text-right">Crédit</th>
                <th>Compte définitif</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((l) => {
                const key = `${l.ecritureId}:${l.ligneId}`;
                return (
                  <tr key={key}>
                    <td>{l.date ? formatDate(l.date) : "—"}</td>
                    <td>
                      <span className="font-semibold">{l.piece || "—"}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {l.libelle}
                        {l.transferee ? " · déjà transférée (OD)" : ""}
                      </span>
                    </td>
                    <td>
                      {libelleJournalEcriture(l.journal, journauxTresorerie)}
                    </td>
                    <td>{SOURCE_ECRITURE[l.sourceType] ?? l.sourceType}</td>
                    <td>
                      <span className="font-semibold">{l.numero}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {l.compteLibelle}
                      </span>
                    </td>
                    <td className="text-right">
                      {l.debit > 0 ? formatCurrency(l.debit) : "—"}
                    </td>
                    <td className="text-right">
                      {l.credit > 0 ? formatCurrency(l.credit) : "—"}
                    </td>
                    <td>
                      <select
                        className="select"
                        disabled={!peutGerer}
                        value={choix[key] ?? ""}
                        onChange={(e) =>
                          setChoix((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Choisir…</option>
                        {destinations.map((c) => (
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
                          onClick={() => appliquer(l.ecritureId, l.ligneId)}
                        >
                          Reclasser
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
