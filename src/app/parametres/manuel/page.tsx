"use client";

import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";

export default function ManuelPage() {
  return (
    <RequirePermission permission="parametres.lire">
      <div>
        <PageHeader
          title="Manuel"
          description="Le guide à lire dans l'ordre : d'abord la mise en service, ensuite une affaire suivie jusqu'à la relance."
          showPosSelector={false}
          actions={
            <a className="btn btn-primary" href="/manuel-negoo.pdf" download>
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </a>
          }
        />
        <ParametresSubnav />

        <div className="max-w-2xl space-y-4 text-sm">
          <p>
            Le fichier <strong>manuel-negoo.pdf</strong> est fait pour le
            comptable et l&apos;exploitant. Il suit toujours la même entreprise,
            Atelier Voalohany, et la même commande : l&apos;Hôtel Soma, trois
            bâches et une enseigne.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong>Avant de commencer</strong> — connexion, menu, et la règle
              de ne pas facturer tant que la mise en service n&apos;est pas
              finie.
            </li>
            <li>
              <strong>Mise en service</strong> — société, sites, compta,
              trésorerie, documents, catalogue, tiers, stock, atelier,
              utilisateurs. Une checklist indique quand vous pouvez passer à la
              suite.
            </li>
            <li>
              <strong>Le quotidien</strong> — achat de bâche chez Import Plast,
              devis, fabrication, bon de préparation, livraison, acompte,
              facture, relance.
            </li>
            <li>
              <strong>Annexes</strong> — glossaire, « je veux faire… je vais
              où », erreurs fréquentes, récupération des données.
            </li>
          </ol>
          <p className="text-muted">
            Le sommaire du PDF est cliquable. Les numéros de page sont en bas à
            droite. En-tête : Négoo.
          </p>
        </div>
      </div>
    </RequirePermission>
  );
}
