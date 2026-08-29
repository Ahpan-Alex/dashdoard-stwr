"use client";

import { useMemo } from "react";
import { FacturesSubnav } from "@/components/factures-subnav";
import { PageHeader } from "@/components/page-header";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import { FACTURE_STATUTS_MG } from "@/lib/facturation-mg";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";
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
  const { visible, colSpan } = useAffichageTable("journal_factures");

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

      <TableAffichageBarre
        tableId="journal_factures"
        lignes={entrees.map((e) => ({
          date: formatDate(e.date),
          action: ACTIONS[e.action] ?? e.action,
          numero: e.numero ?? "",
          detail: e.detail ?? "",
        }))}
        fichier="journal-facturation"
        titre="Journal d'audit facturation"
      />

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <ThCol id="date" show={visible}>Date</ThCol>
              <ThCol id="action" show={visible}>Action</ThCol>
              <ThCol id="numero" show={visible}>N°</ThCol>
              <ThCol id="detail" show={visible}>Détail</ThCol>
            </tr>
          </thead>
          <tbody>
            {entrees.length === 0 ? (
              <tr>
                <td colSpan={colSpan(false)} className="text-muted">
                  Aucune entrée pour le moment.
                </td>
              </tr>
            ) : (
              entrees.map((e) => (
                <tr key={e.id}>
                  <TdCol id="date" show={visible}>{formatDate(e.date)}</TdCol>
                  <TdCol id="action" show={visible}>
                    <span className="badge badge-sea">
                      {ACTIONS[e.action] ?? e.action}
                    </span>
                  </TdCol>
                  <TdCol id="numero" show={visible} className="font-medium">{e.numero ?? "—"}</TdCol>
                  <TdCol id="detail" show={visible} className="text-sm text-muted">{e.detail ?? "—"}</TdCol>
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
