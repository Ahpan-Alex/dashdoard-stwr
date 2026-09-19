"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  STATUT_CHEQUE_LABELS,
  chequesDifferes,
  chequesDifferesProches,
  fenetreChequesProchesJours,
  libelleModePaiement,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";
import type { StatutChequeDiffere } from "@/lib/types";

export default function ChequesProchesPage() {
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
    parametres,
    lotsPaiementFournisseur,
    changerStatutChequeAchat,
    changerStatutChequeFacture,
    changerStatutChequeLot,
  } = useStore();
  const modes = modesPaiement ?? [];
  const fenetre = fenetreChequesProchesJours(parametres);
  const tous = chequesDifferes({
    achats,
    factures,
    modes,
    lotsPaiement: lotsPaiementFournisseur,
  });
  const liste = chequesDifferesProches(tous, fenetre);

  function changer(
    item: (typeof liste)[number],
    statut: StatutChequeDiffere,
  ) {
    if (item.source === "facture") {
      const res = changerStatutChequeFacture(item.sourceId, item.ligne.id, statut);
      if (!res.ok) alert(res.reason);
      return;
    }
    if (item.source === "lot_paiement") {
      const res = changerStatutChequeLot(item.sourceId, item.ligne.id, statut);
      if (!res.ok) alert(res.reason);
      return;
    }
    const res = changerStatutChequeAchat(item.sourceId, item.ligne.id, statut);
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title="Chèques différés à échéance proche"
        description={`Échéancier filtré sur les ${fenetre} prochains jours (J+${fenetre}), distinct de l'échéancier complet. Fenêtre réglable dans Paramètres → Trésorerie.`}
      />
      <p className="mb-4 text-sm">
        <Link href="/tresorerie/echeancier" className="text-sea-800 underline">
          Voir l&apos;échéancier complet
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
                  Aucun chèque en attente dans les {fenetre} prochains jours.
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
                          : item.source === "lot_paiement"
                            ? `/achats/lots/${item.sourceId}`
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
                    {STATUT_CHEQUE_LABELS[item.ligne.statutCheque ?? "en_attente"]}
                  </td>
                  <td>
                    <select
                      className="select"
                      value={item.ligne.statutCheque ?? "en_attente"}
                      onChange={(e) =>
                        changer(item, e.target.value as StatutChequeDiffere)
                      }
                    >
                      <option value="en_attente">En attente</option>
                      <option value="encaisse">Encaissé</option>
                      <option value="rejete">Rejeté</option>
                    </select>
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
