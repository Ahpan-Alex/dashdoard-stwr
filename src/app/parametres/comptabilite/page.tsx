"use client";

import Link from "next/link";
import { LongueurNumeroCompteForm } from "@/components/longueur-numero-compte-form";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";

export default function ParametresComptabilitePage() {
  return (
    <RequirePermission permission="comptabilite.lire">
      <div>
        <PageHeader
          title="Compta"
          description="Longueur des numéros de compte. Plan, journaux et transfert restent dans le menu Comptabilité."
          showPosSelector={false}
        />
        <ParametresSubnav />
        <LongueurNumeroCompteForm />
        <p className="mt-4 max-w-2xl text-sm text-muted">
          L&apos;import du plan comptable et les comptes TVA se gèrent dans{" "}
          <Link href="/comptabilite/plan" className="text-sea-800 underline">
            Comptabilité → Plan comptable
          </Link>
          . Les exercices sont l&apos;onglet à côté.
        </p>
      </div>
    </RequirePermission>
  );
}
