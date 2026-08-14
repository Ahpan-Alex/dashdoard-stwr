"use client";

import { hasRubrique, type ModeleDocument } from "@/lib/document-templates";
import type { TotauxDocument } from "@/lib/commercial";
import { FACTURE_TYPES, MODES_PAIEMENT, appliqueTVA } from "@/lib/commercial";
import { mentionRegimeFiscal } from "@/lib/facturation-mg";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import type {
  Client,
  LigneDocument,
  Parametres,
  PointDeVente,
} from "@/lib/types";

type Props = {
  type: "devis" | "commande" | "bon_de_livraison" | "facture";
  titre?: string;
  numero: string;
  date: string;
  echeance?: string;
  client: Client | undefined;
  pdv?: PointDeVente;
  parametres: Parametres;
  modele: ModeleDocument | undefined;
  lignes: LigneDocument[];
  totaux: TotauxDocument;
  conditionsPaiement?: string;
  note?: string;
  referenceDevis?: string;
  referenceCommande?: string;
  referenceBl?: string;
  factureType?: "standard" | "acompte" | "solde" | "avoir" | "proforma";
  referenceFacture?: string;
  acomptesDetail?: { numero: string; date: string; montant: number; mode?: string }[];
  /** Afficher bandeau PROFORMA */
  estProforma?: boolean;
};

export function DocumentPreview({
  type,
  titre,
  numero,
  date,
  echeance,
  client,
  pdv,
  parametres,
  modele,
  lignes,
  totaux,
  conditionsPaiement,
  note,
  referenceDevis,
  referenceCommande,
  referenceBl,
  factureType = "standard",
  referenceFacture,
  acomptesDetail = [],
  estProforma = false,
}: Props) {
  const show = (id: Parameters<typeof hasRubrique>[1]) =>
    hasRubrique(modele, id);

  const labelType =
    type === "facture"
      ? estProforma || factureType === "proforma"
        ? "Proforma"
        : FACTURE_TYPES[factureType] ?? "Facture"
      : type === "devis"
        ? "Devis"
        : type === "bon_de_livraison"
          ? "Bon de livraison"
          : "Bon de commande";

  return (
    <div className="print-area rounded-[var(--radius)] border border-line bg-white p-6 text-ink shadow-sm">
      {(estProforma || factureType === "proforma") && (
        <p className="mb-3 rounded bg-amber-100 px-3 py-1 text-center text-xs font-bold uppercase tracking-wider text-amber-900">
          Document proforma — sans valeur fiscale / hors série de facturation
        </p>
      )}
      {show("entete_entreprise") && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {show("logo") && parametres.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={parametres.logoDataUrl}
                alt={`Logo ${parametres.nomEntreprise}`}
                className="h-14 w-auto max-w-[160px] shrink-0 object-contain print:h-16"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold">
                {parametres.nomEntreprise}
              </p>
              {parametres.formeJuridique && (
                <p className="text-xs text-muted">{parametres.formeJuridique}</p>
              )}
              {show("coordonnees_entreprise") && (
                <p className="mt-1 text-xs text-muted">
                  {[parametres.adresse, parametres.ville]
                    .filter(Boolean)
                    .join(", ")}
                  {parametres.telephone ? ` · ${parametres.telephone}` : ""}
                  {parametres.email ? ` · ${parametres.email}` : ""}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {show("nif") && (
                  <span className="badge badge-sea">
                    NIF : {parametres.nif || "—"}
                  </span>
                )}
                {show("stat") && (
                  <span className="badge badge-sea">
                    STAT : {parametres.stat || "—"}
                  </span>
                )}
                {show("rcs") && parametres.rcs && (
                  <span className="badge badge-sand">
                    RCS : {parametres.rcs}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold uppercase tracking-wide text-sea-800">
              {titre ?? labelType}
            </p>
            {show("numero_date") && (
              <>
                <p className="mt-1 text-sm font-semibold">{numero}</p>
                <p className="text-xs text-muted">Date : {formatDate(date)}</p>
                {show("echeance") && echeance && (
                  <p className="text-xs text-muted">
                    Échéance : {formatDate(echeance)}
                  </p>
                )}
              </>
            )}
            {pdv && (
              <p className="mt-1 text-xs text-muted">Point de vente : {pdv.nom}</p>
            )}
          </div>
        </div>
      )}

      {(show("reference_devis") && referenceDevis) ||
      (show("reference_commande") && referenceCommande) ||
      (show("reference_bl") && referenceBl) ||
      referenceFacture ? (
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          {show("reference_devis") && referenceDevis && (
            <span>Réf. devis : <strong>{referenceDevis}</strong></span>
          )}
          {show("reference_commande") && referenceCommande && (
            <span>
              Réf. commande : <strong>{referenceCommande}</strong>
            </span>
          )}
          {show("reference_bl") && referenceBl && (
            <span>
              Réf. BL : <strong>{referenceBl}</strong>
            </span>
          )}
          {referenceFacture && (
            <span>
              Réf. facture : <strong>{referenceFacture}</strong>
            </span>
          )}
        </div>
      ) : null}

      {show("client") && (
        <div className="mb-4 rounded-lg bg-sea-100/40 px-3 py-2 text-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
            Client
          </p>
          <p className="font-semibold">{client?.nom ?? "—"}</p>
          <p className="text-xs text-muted">
            {[client?.adresse, client?.ville].filter(Boolean).join(", ")}
            {client?.telephone ? ` · ${client.telephone}` : ""}
          </p>
          {show("client_nif") && client?.nif && (
            <p className="text-xs">NIF client : {client.nif}</p>
          )}
        </div>
      )}

      {show("lignes") && (
        <table className="data mb-4 w-full text-sm">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Qté</th>
              <th>P.U. HT</th>
              <th>Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const type = l.type ?? "produit";
              if (type === "blanche") {
                return (
                  <tr key={l.id}>
                    <td colSpan={4} className="h-6 border-0 bg-transparent" />
                  </tr>
                );
              }
              if (type === "commentaire") {
                return (
                  <tr key={l.id}>
                    <td colSpan={4} className="italic text-muted">
                      {l.designation || l.commentaire}
                    </td>
                  </tr>
                );
              }
              if (type === "sous_total") {
                return (
                  <tr key={l.id} className="bg-sea-50/80 font-semibold">
                    <td colSpan={3}>{l.designation || "Sous-total"}</td>
                    <td>{formatCurrency(l.prixUnitaire)}</td>
                  </tr>
                );
              }
              const brut = l.quantite * l.prixUnitaire;
              const remise = l.remisePercent
                ? Math.round(brut * (l.remisePercent / 100))
                : 0;
              return (
                <tr key={l.id}>
                  <td>
                    {l.designation}
                    {l.codeProduit ? (
                      <span className="mt-0.5 block font-mono text-[10px] text-muted">
                        {l.codeProduit}
                      </span>
                    ) : null}
                    {l.remisePercent ? (
                      <span className="mt-0.5 block text-xs text-muted">
                        Remise {l.remisePercent} %
                      </span>
                    ) : null}
                    {l.commentaire ? (
                      <span className="mt-0.5 block text-xs italic text-muted">
                        {l.commentaire}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {formatNumber(l.quantite)} {l.unite}
                  </td>
                  <td>{formatCurrency(l.prixUnitaire)}</td>
                  <td className="font-semibold">
                    {formatCurrency(brut - remise)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {show("totaux_ht_tva_ttc") && (
        <div className="ml-auto mb-4 w-full max-w-xs space-y-1 text-sm">
          {parametres.regimeFiscal === "imp" ? (
            <div className="flex justify-between font-semibold">
              <span>Montant (régime IMP)</span>
              <span>{formatCurrency(totaux.totalTTC)}</span>
            </div>
          ) : !appliqueTVA(parametres) ? (
            <>
              {totaux.totalRemise > 0 && (
                <>
                  <div className="flex justify-between text-muted">
                    <span>Brut</span>
                    <span>{formatCurrency(totaux.brutHT)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Total remise</span>
                    <span>− {formatCurrency(totaux.totalRemise)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-line pt-1 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totaux.totalTTC)}</span>
              </div>
            </>
          ) : (
            <>
              {totaux.totalRemise > 0 && (
                <>
                  <div className="flex justify-between text-muted">
                    <span>Brut HT</span>
                    <span>{formatCurrency(totaux.brutHT)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Total remise</span>
                    <span>− {formatCurrency(totaux.totalRemise)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span>Total HT</span>
                <span>{formatCurrency(totaux.totalHT)}</span>
              </div>
              <div className="flex justify-between">
                <span>TVA ({totaux.tauxTVA} %)</span>
                <span>{formatCurrency(totaux.montantTVA)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-semibold">
                <span>Total TTC</span>
                <span>{formatCurrency(totaux.totalTTC)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {show("acomptes") && acomptesDetail.length > 0 && (
        <div className="mb-4 rounded-lg border border-line p-3 text-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Acomptes
          </p>
          {acomptesDetail.map((a) => (
            <div key={a.numero} className="flex justify-between text-xs">
              <span>
                {a.numero} — {formatDate(a.date)}
                {a.mode
                  ? ` (${MODES_PAIEMENT[a.mode] ?? a.mode})`
                  : ""}
              </span>
              <span className="font-semibold">
                − {formatCurrency(a.montant)}
              </span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold">
            <span>Total acomptes</span>
            <span>− {formatCurrency(totaux.acomptesTTC)}</span>
          </div>
        </div>
      )}

      {show("net_a_payer") && (
        <div className="mb-4 rounded-lg bg-sea-800 px-4 py-3 text-white">
          <div className="flex justify-between font-display text-lg font-semibold">
            <span>
              {totaux.acomptesTTC > 0 ? "Reste à payer" : "Net à payer"}
            </span>
            <span>{formatCurrency(totaux.netAPayer)}</span>
          </div>
          {totaux.acomptesTTC > 0 && (
            <p className="mt-1 text-[11px] text-white/80">
              Montant après déduction des acomptes mentionnés à l&apos;émission
              — inchangé en cas de règlement ultérieur du solde.
            </p>
          )}
        </div>
      )}

      {show("rib") && parametres.rib && (
        <p className="mb-2 text-xs text-muted">
          RIB : {parametres.banque ? `${parametres.banque} — ` : ""}
          {parametres.rib}
        </p>
      )}

      {show("conditions_paiement") && (
        <p className="mb-2 text-xs">
          <strong>Conditions de paiement :</strong>{" "}
          {conditionsPaiement || parametres.conditionsPaiementDefaut}
        </p>
      )}

      {note && <p className="mb-2 text-xs text-muted">Note : {note}</p>}

      {show("mentions_legales") && (
        <div className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-muted">
          <p className="font-semibold text-ink">
            {mentionRegimeFiscal(parametres)}
          </p>
          <p className="mt-1">
            NIF : {parametres.nif || "—"} · STAT : {parametres.stat || "—"}
            {parametres.rcs ? ` · RCS : ${parametres.rcs}` : ""}
          </p>
          <p className="mt-1">
            {modele?.mentionsLegales ||
              "Document conforme aux mentions fiscales malagasy (NIF, STAT, date d'émission et d'échéance, désignation, quantités, prix HT, TVA le cas échéant)."}
          </p>
          <p className="mt-1">
            La facture matérialise l&apos;opération commerciale (et non le
            paiement). Les acomptes et le reste à payer indiqués sont ceux de
            l&apos;émission ; un règlement ultérieur du solde ne modifie pas ce
            document — seul le statut de paiement évolue.
          </p>
          <p className="mt-1">
            Conservation légale : 10 ans (IS/IR) — ne pas supprimer les factures
            validées ; utiliser une facture d&apos;avoir.
          </p>
        </div>
      )}

      {modele?.piedDePage && (
        <p className="mt-2 text-center text-[11px] text-muted">
          {modele.piedDePage}
        </p>
      )}

      {show("signature_cachet") && (
        <div className="mt-8 flex justify-end">
          <div className="min-w-[12rem] max-w-[16rem] text-center">
            {parametres.signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={parametres.signatureDataUrl}
                alt="Signature électronique"
                className="mx-auto mb-1 h-16 w-auto max-w-full object-contain"
              />
            ) : (
              <div className="mb-1 flex h-16 items-end justify-center border-b border-dashed border-line">
                <span className="pb-1 text-[10px] text-muted">
                  Signature non paramétrée
                </span>
              </div>
            )}
            <div
              className={`pt-2 text-xs ${
                parametres.signatureDataUrl
                  ? "border-t border-line text-muted"
                  : "text-muted"
              }`}
            >
              {parametres.signatureNom?.trim() || "Signature / cachet"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
