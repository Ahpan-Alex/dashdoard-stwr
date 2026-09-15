"use client";

import { forwardRef } from "react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import { totauxAchat } from "@/lib/achats";
import { libelleValiditeDocument } from "@/lib/validite-document";
import type { Achat, Parametres, Produit } from "@/lib/types";

export type DestinataireFournisseur = {
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  nif?: string;
  stat?: string;
};

type Props = {
  achat: Achat;
  parametres: Parametres;
  produits: Produit[];
  destinataire: DestinataireFournisseur | undefined;
  siteNom?: string;
};

/** Bon de commande fournisseur imprimable / PDF. */
export const BonCommandeFournisseur = forwardRef<HTMLDivElement, Props>(
  function BonCommandeFournisseur(
    { achat, parametres, produits, destinataire, siteNom },
    ref,
  ) {
    const tot = totauxAchat(achat);
    const tvaActive = parametres.assujettiTVA && achat.tauxTVA > 0;
    return (
      <div
        ref={ref}
        className="document-preview-sheet print-area mx-auto box-border w-full max-w-[210mm] overflow-x-hidden rounded-[var(--radius)] border border-line bg-white p-[12mm] text-ink shadow-sm"
      >
        <div className="mb-4 flex w-full items-start gap-3 border-b border-line pb-4">
          {parametres.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={parametres.logoDataUrl}
              alt={`Logo ${parametres.nomEntreprise}`}
              className="h-14 w-auto max-w-[160px] shrink-0 object-contain"
            />
          ) : null}
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold">
              {parametres.nomEntreprise || "Entreprise"}
            </p>
            {parametres.formeJuridique && (
              <p className="text-xs text-muted">{parametres.formeJuridique}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              {[parametres.adresse, parametres.ville].filter(Boolean).join(", ")}
              {parametres.telephone ? ` · ${parametres.telephone}` : ""}
              {parametres.email ? ` · ${parametres.email}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              {parametres.nif && (
                <span className="badge badge-sea">NIF : {parametres.nif}</span>
              )}
              {parametres.stat && (
                <span className="badge badge-sea">STAT : {parametres.stat}</span>
              )}
              {parametres.rcs && (
                <span className="badge badge-sand">RCS : {parametres.rcs}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line px-4 py-2 text-sm">
          <p className="font-display font-semibold uppercase tracking-wide text-sea-800">
            Bon de commande N° {achat.numero}
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <span>Date : {formatDate(achat.date)}</span>
            <span>
              Validité : {libelleValiditeDocument(achat.date, achat.validiteJours)}
            </span>
            {achat.echeance && <span>Échéance : {formatDate(achat.echeance)}</span>}
            {siteNom && <span>Livraison : {siteNom}</span>}
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-line p-3 text-sm">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-sea-700">
            Fournisseur
          </p>
          <p className="font-semibold">{destinataire?.nom ?? "—"}</p>
          {destinataire?.telephone && (
            <p className="text-[11px] text-muted">{destinataire.telephone}</p>
          )}
          {destinataire?.email && (
            <p className="text-[11px] text-muted">{destinataire.email}</p>
          )}
          {(destinataire?.adresse || destinataire?.ville) && (
            <p className="text-[11px] text-muted">
              {[destinataire.adresse, destinataire.ville].filter(Boolean).join(", ")}
            </p>
          )}
          {(destinataire?.nif || destinataire?.stat) && (
            <p className="mt-1 text-[11px]">
              {destinataire.nif ? `NIF : ${destinataire.nif}` : null}
              {destinataire.nif && destinataire.stat ? " · " : null}
              {destinataire.stat ? `STAT : ${destinataire.stat}` : null}
            </p>
          )}
        </div>

        <table className="data mb-4 w-full text-sm">
          <thead>
            <tr>
              <th>Code</th>
              <th>Désignation</th>
              <th className="text-right">Quantité</th>
              <th>Unité</th>
              <th className="text-right">Prix unitaire HT</th>
              <th className="text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {(achat.lignes ?? []).map((l) => {
              const p = l.produitId
                ? produits.find((x) => x.id === l.produitId)
                : undefined;
              const designation =
                (p ? libelleProduit(p) : l.designation?.trim()) || "Article";
              const ht = l.quantite * l.prixAchatUnitaire;
              return (
                <tr key={l.id}>
                  <td>{p?.code || "—"}</td>
                  <td>{designation}</td>
                  <td className="text-right">{formatNumber(l.quantite)}</td>
                  <td>{p?.unite || "—"}</td>
                  <td className="text-right">{formatCurrency(l.prixAchatUnitaire)}</td>
                  <td className="text-right">{formatCurrency(ht)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mb-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Total HT</span>
            <span>{formatCurrency(tot.ht)}</span>
          </div>
          {tvaActive && (
            <div className="flex justify-between text-muted">
              <span>TVA {achat.tauxTVA} %</span>
              <span>{formatCurrency(tot.tva)}</span>
            </div>
          )}
          <div className="flex justify-between rounded px-3 py-2 font-display font-semibold text-white" style={{ backgroundColor: "var(--sea-800)" }}>
            <span>Total TTC</span>
            <span>{formatCurrency(tot.ttc)}</span>
          </div>
        </div>

        {achat.note && (
          <p className="mb-4 text-sm">
            <span className="font-semibold">Note : </span>
            {achat.note}
          </p>
        )}

        <p className="text-xs text-muted">
          Bon de commande fournisseur — à remettre au fournisseur. La réception
          des articles se saisit ensuite sur la commande.
        </p>
      </div>
    );
  },
);
