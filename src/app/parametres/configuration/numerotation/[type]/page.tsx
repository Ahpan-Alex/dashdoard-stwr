"use client";

import { notFound, useParams } from "next/navigation";
import {
  ConfigurationSubnav,
  NumerotationSubnav,
} from "@/components/configuration-subnav";
import { FormatNumeroPieceForm } from "@/components/format-numero-piece-form";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { pieceNumeroteeDepuisSlug } from "@/lib/numerotation-pieces";

export default function FormatNumeroPiecePage() {
  const params = useParams<{ type: string }>();
  const type = params.type;
  if (type === "facture-fournisseur") {
    return <FactureFournisseurNumeroPage />;
  }
  const piece = pieceNumeroteeDepuisSlug(type);
  if (!piece) notFound();

  return (
    <div>
      <ParametresSubnav />
      <ConfigurationSubnav />
      <PageHeader
        title={piece.label}
        description={piece.description}
        showPosSelector={false}
      />
      <NumerotationSubnav />
      <FormatNumeroPieceForm type={piece.type} title={`Format ${piece.label}`} />
    </div>
  );
}

function FactureFournisseurNumeroPage() {
  return (
    <div>
      <ParametresSubnav />
      <ConfigurationSubnav />
      <PageHeader
        title="Facture fournisseur"
        description="Aucun format automatique : le n° reprend celui de la facture fournisseur, saisi manuellement sur la commande."
        showPosSelector={false}
      />
      <NumerotationSubnav />
      <div className="max-w-xl rounded-[var(--radius)] border border-line bg-card p-5 text-sm">
        <p>
          À la différence des pièces clients, Négoo n’attribue pas de numéro à
          la facture fournisseur. Renseignez le n° imprimé sur la facture du
          fournisseur dans le champ{" "}
          <span className="font-semibold">N° facture fournisseur</span> de la
          commande d’achat.
        </p>
        <p className="mt-3 text-muted">
          Le n° interne de bon de commande fournisseur (ACH-…) reste généré
          automatiquement et n’est pas celui de la facture.
        </p>
      </div>
    </div>
  );
}
