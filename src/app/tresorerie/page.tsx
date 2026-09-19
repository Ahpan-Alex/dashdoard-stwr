"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency } from "@/lib/format";
import {
  TYPE_COMPTE_TRESORERIE_LABELS,
  comptesTresorerieTries,
  soldeCompteTresorerie,
  tousMouvementsTresorerie,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";

export default function TresoreriePage() {
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
    comptesTresorerie,
    pointsDeVente,
    achats,
    factures,
    acomptes,
    missionsAchat,
    modesPaiement,
  } = useStore();
  const mouvements = tousMouvementsTresorerie({
    achats,
    factures,
    acomptes,
    missions: missionsAchat,
    modes: modesPaiement ?? [],
  });
  const liste = comptesTresorerieTries(comptesTresorerie ?? []);

  return (
    <div>
      <PageHeader
        title="Trésorerie"
        description="Soldes des comptes de caisse, banque et mobile monnaie. Les chèques différés n'affectent le solde qu'à l'encaissement."
        actions={
          <Link href="/parametres/tresorerie" className="btn btn-secondary">
            Paramétrer
          </Link>
        }
      />
      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Type</th>
              <th>Site</th>
              <th>Solde courant</th>
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-sm text-muted">
                  Aucun compte. Créez-en dans Paramètres → Trésorerie.
                </td>
              </tr>
            ) : (
              liste.map((c) => (
                <tr key={c.id}>
                  <td>{c.libelle}</td>
                  <td>{TYPE_COMPTE_TRESORERIE_LABELS[c.type]}</td>
                  <td>
                    {c.siteId
                      ? pointsDeVente.find((s) => s.id === c.siteId)?.nom ?? "—"
                      : "Global"}
                  </td>
                  <td className="font-semibold">
                    {formatCurrency(soldeCompteTresorerie(c.id, mouvements))}
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
