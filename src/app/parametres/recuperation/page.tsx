"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import {
  LOTS_RECUPERATION,
  telechargerJsonComplet,
} from "@/lib/recuperation-donnees";
import { pickAppState } from "@/lib/empty-state";
import { useStore } from "@/lib/store";

export default function RecuperationDonneesPage() {
  return (
    <RequirePermission permission="parametres.lire">
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const state = useStore();
  const snapshot = pickAppState(state);
  const entreprise = state.parametres.nomEntreprise.trim() || "votre entreprise";

  return (
    <div>
      <PageHeader
        title="Récupération des données"
        description="Si vous quittez Négoo, emportez ici les fichiers de votre dossier. Rien n'est effacé en téléchargeant."
        showPosSelector={false}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => telechargerJsonComplet(snapshot)}
          >
            <Download className="h-4 w-4" />
            Fichier complet
          </button>
        }
      />
      <ParametresSubnav />

      <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-sea-50/70 p-5 text-sm text-sea-950">
        <p className="font-semibold">En cas de désabonnement</p>
        <p className="mt-2">
          Téléchargez d&apos;abord le <strong>fichier complet</strong> (toutes
          les données de {entreprise}, conservable sur votre ordinateur). Puis
          les tableaux Excel (CSV) ci-dessous, ouvrables dans Excel ou un
          logiciel comptable. Les PDF de factures, devis et BL se
          téléchargent aussi pièce par pièce dans chaque liste, colonne
          Exporter PDF.
        </p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-card">
        <table className="data">
          <thead>
            <tr>
              <th>Donnée récupérable</th>
              <th>Combien</th>
              <th>Où la voir dans Négoo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {LOTS_RECUPERATION.map((lot) => (
              <tr key={lot.id}>
                <td>
                  <p className="font-medium">{lot.titre}</p>
                  <p className="text-xs text-muted">{lot.pourquoi}</p>
                </td>
                <td>{lot.compter(snapshot)}</td>
                <td>
                  <Link href={lot.ouHref} className="text-sea-800 underline">
                    {lot.ouLabel}
                  </Link>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => lot.exporter(snapshot)}
                    disabled={lot.compter(snapshot) === 0}
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
