"use client";

import { useMemo } from "react";
import { FacturesSubnav } from "@/components/factures-subnav";
import { PageHeader } from "@/components/page-header";
import { FACTURE_STATUTS_MG } from "@/lib/facturation-mg";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { JournalAuditAction } from "@/lib/types";

const ACTIONS: Record<JournalAuditAction, string> = {
  facture_brouillon: "Brouillon enregistré",
  facture_proforma: "Proforma",
  facture_validee: "Validation fiscale",
  facture_envoyee: "Envoi client",
  facture_paiement: "Paiement",
  facture_avoir: "Avoir émis",
  facture_annulee: "Annulation",
  facture_modifiee: "Modification",
  facture_supprimee: "Suppression",
  autre: "Autre",
};

export default function JournalFacturationPage() {
  const { journalAudit, factures, pointDeVenteActifId } = useStore();

  const entrees = useMemo(() => {
    if (pointDeVenteActifId === "tous") return journalAudit;
    const ids = new Set(
      factures
        .filter((f) => f.pointDeVenteId === pointDeVenteActifId)
        .map((f) => f.id),
    );
    return journalAudit.filter((e) => ids.has(e.entiteId));
  }, [journalAudit, factures, pointDeVenteActifId]);

  return (
    <div>
      <PageHeader
        title="Journal d'audit facturation"
        description="Traçabilité des actions sur les documents commerciaux (validation, avoirs, paiements)."
      />
      <FacturesSubnav />

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>N°</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {entrees.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  Aucune entrée pour le moment.
                </td>
              </tr>
            ) : (
              entrees.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.date)}</td>
                  <td>
                    <span className="badge badge-sea">
                      {ACTIONS[e.action] ?? e.action}
                    </span>
                  </td>
                  <td className="font-medium">{e.numero ?? "—"}</td>
                  <td className="text-sm text-muted">{e.detail ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        Statuts document :{" "}
        {Object.values(FACTURE_STATUTS_MG)
          .filter((l) => !l.includes("ancien"))
          .join(" · ")}
      </p>
    </div>
  );
}
