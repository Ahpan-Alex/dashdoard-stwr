"use client";

import { forwardRef } from "react";
import { formatDate, formatNumber } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import type { DemandePrix, Parametres, Produit } from "@/lib/types";

export type DestinataireDp = {
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  nif?: string;
  stat?: string;
};

type Props = {
  dp: DemandePrix;
  parametres: Parametres;
  produits: Produit[];
  destinataire: DestinataireDp | undefined;
};

/** Document commercial de demande de prix (à imprimer / PDF), adressé à un fournisseur. */
export const DemandePrixDocument = forwardRef<HTMLDivElement, Props>(
  function DemandePrixDocument({ dp, parametres, produits, destinataire }, ref) {
    const lignes = dp.lignes ?? [];
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
            Demande de prix N° {dp.numero}
          </p>
          <span className="text-xs text-muted">Date : {formatDate(dp.date)}</span>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line p-3 text-sm">
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
          <div className="rounded-lg border border-line p-3 text-sm">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-sea-700">
              Objet
            </p>
            <p>
              Merci de nous communiquer vos meilleurs prix et délais pour les
              articles ci-dessous.
            </p>
          </div>
        </div>

        <table className="data mb-4 w-full text-sm">
          <thead>
            <tr>
              <th>Code</th>
              <th>Désignation</th>
              <th className="text-right">Quantité</th>
              <th>Unité</th>
              <th className="text-right">Prix unitaire HT proposé</th>
              <th className="text-right">Délai (j)</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((ligne) => {
              const p = produits.find((x) => x.id === ligne.produitId);
              return (
                <tr key={ligne.id}>
                  <td>{p?.code || "—"}</td>
                  <td>{p ? libelleProduit(p) || "Article" : "Article"}</td>
                  <td className="text-right">{formatNumber(ligne.quantite)}</td>
                  <td>{p?.unite || "—"}</td>
                  <td className="text-right text-muted">………………</td>
                  <td className="text-right text-muted">………………</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {dp.note && (
          <p className="mb-4 text-sm">
            <span className="font-semibold">Note : </span>
            {dp.note}
          </p>
        )}

        <p className="text-xs text-muted">
          Document commercial — demande de prix. Sans valeur de commande tant
          qu’un bon de commande fournisseur n’a pas été établi.
        </p>
      </div>
    );
  },
);
