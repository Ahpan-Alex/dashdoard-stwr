"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  ConfigurationSubnav,
  NumerotationSubnav,
} from "@/components/configuration-subnav";
import { ParametresSubnav } from "@/components/parametres-subnav";
import {
  apercuNumeroPiece,
  formatNumeroPieceEffectif,
  PIECES_NUMEROTEES,
} from "@/lib/numerotation-pieces";
import { useStore } from "@/lib/store";

export default function GestionNumeroPiecesPage() {
  const parametres = useStore((s) => s.parametres);

  return (
    <div>
      <ParametresSubnav />
      <ConfigurationSubnav />
      <PageHeader
        title="Gestion n° des pièces"
        description="Définissez le format de numéro pour chaque document commercial. La facture fournisseur reprend le n° saisi manuellement."
        showPosSelector={false}
      />
      <NumerotationSubnav />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PIECES_NUMEROTEES.map((p) => {
          const format = formatNumeroPieceEffectif(parametres, p.type);
          return (
            <Link
              key={p.slug}
              href={`/parametres/configuration/numerotation/${p.slug}`}
              className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
            >
              <p className="font-display text-base font-semibold text-ink">
                {p.label}
              </p>
              <p className="mt-1 text-xs text-muted">{p.description}</p>
              <p className="mt-3 font-mono text-sm font-semibold tracking-wide">
                {apercuNumeroPiece(format)}
              </p>
            </Link>
          );
        })}
        <Link
          href="/parametres/configuration/numerotation/facture-fournisseur"
          className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
        >
          <p className="font-display text-base font-semibold text-ink">
            Facture fournisseur
          </p>
          <p className="mt-1 text-xs text-muted">
            Pas de format automatique : on reprend le n° de la facture
            fournisseur saisi à la main.
          </p>
        </Link>
      </div>
    </div>
  );
}
