"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  STATUT_CHEQUE_LABELS,
  chequesDifferes,
  libelleModePaiement,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";
import type { StatutChequeDiffere } from "@/lib/types";

export default function EcheancierPage() {
  return (
    <RequirePermission
      permission={["factures.encaisser", "achats.lire", "comptabilite.lire"]}
    >
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const {
    achats,
    factures,
    modesPaiement,
    changerStatutChequeAchat,
    changerStatutChequeFacture,
  } = useStore();
  const modes = modesPaiement ?? [];
  const liste = chequesDifferes({ achats, factures, modes });

  function changer(
    item: (typeof liste)[number],
    statut: StatutChequeDiffere,
  ) {
    if (item.source === "facture") {
      const res = changerStatutChequeFacture(item.sourceId, item.ligne.id, statut);
      if (!res.ok) alert(res.reason);
      return;
    }
    const res = changerStatutChequeAchat(item.sourceId, item.ligne.id, statut);
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title="Échéancier"
        description="Chèques à paiement différé : le mouvement de trésorerie n'est comptabilisé qu'à l'encaissement."
      />
      <p className="mb-4 text-sm">
        <Link href="/tresorerie/cheques-proches" className="text-sea-800 underline">
          Vue dédiée : chèques à échéance proche
        </Link>
      </p>
      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Échéance</th>
              <th>Document</th>
              <th>Mode</th>
              <th>Montant</th>
              <th>Sens</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-sm text-muted">
                  Aucun chèque différé.
                </td>
              </tr>
            ) : (
              liste.map((item) => (
                <tr key={`${item.source}-${item.ligne.id}`}>
                  <td>{formatDate(item.ligne.dateEffet ?? item.ligne.date)}</td>
                  <td>
                    <Link
                      href={
                        item.source === "facture"
                          ? "/factures/liste"
                          : "/achats"
                      }
                      className="text-sea-800 underline"
                    >
                      {item.sourceLibelle}
                    </Link>
                  </td>
                  <td>{libelleModePaiement(item.ligne.modePaiement, modes)}</td>
                  <td className="font-semibold">
                    {formatCurrency(item.ligne.montant)}
                  </td>
                  <td>{item.sens === "entree" ? "Encaissement" : "Décaissement"}</td>
                  <td>
                    <span className="badge badge-sea">
                      {STATUT_CHEQUE_LABELS[item.ligne.statutCheque ?? "en_attente"]}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {item.ligne.statutCheque !== "encaisse" && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => changer(item, "encaisse")}
                        >
                          Encaisser
                        </button>
                      )}
                      {item.ligne.statutCheque !== "rejete" && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => changer(item, "rejete")}
                        >
                          Rejeter
                        </button>
                      )}
                      {item.ligne.statutCheque !== "en_attente" && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => changer(item, "en_attente")}
                        >
                          Remettre en attente
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
