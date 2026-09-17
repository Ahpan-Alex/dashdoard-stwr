"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  afficherMentionTvaImmatriculation,
  montantEnLettres,
  paletteParId,
  piedDePageAlignementDuModele,
  piedDePageLigneDuModele,
  zonesDuModele,
  type ColonneArticleId,
  type ModeleDocument,
} from "@/lib/document-templates";
import { ancrerPiedDernierePage, HAUTEUR_PAGE_A4_MM } from "@/lib/document-mise-en-page";
import {
  classeDensiteTableau,
  estColonneNumeriqueArticle,
  largeursColonnesPourcent,
} from "@/lib/document-table-layout";
import {
  FACTURE_TYPES,
  MODES_PAIEMENT,
  appliqueTVA,
  montantLigneBrutHT,
  montantLigneHT,
  montantRemiseLigne,
  modeRemiseLigne,
  prixUnitaireNetHT,
  type TotauxDocument,
} from "@/lib/commercial";
import { mentionRegimeFiscal } from "@/lib/facturation-mg";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { libelleValiditeDocument } from "@/lib/validite-document";
import { libelleDimensionsLigne, ligneEstSurface } from "@/lib/surface-vente";
import type {
  Client,
  LigneDocument,
  Parametres,
  PointDeVente,
} from "@/lib/types";

function libelleMesureLigne(l: LigneDocument) {
  if (ligneEstSurface(l)) return libelleDimensionsLigne(l);
  return l.unite || "—";
}

type Props = {
  type: "devis" | "commande" | "bon_de_livraison" | "facture";
  titre?: string;
  numero: string;
  date: string;
  echeance?: string;
  /** Durée de validité affichée sur le document (devis / commande). */
  validiteJours?: number;
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
  /** Traçabilité (zone 4) — valeurs facultatives */
  refCommandeClient?: string;
  destinataire?: string;
  vendeur?: string;
  intervenant?: string;
  dateIntervention?: string;
  modePaiement?: string;
  /** Aperçu éditeur : remplit les zones avec des libellés d'exemple */
  apercuModele?: boolean;
};

export const DocumentPreview = forwardRef<HTMLDivElement, Props>(
  function DocumentPreview(props, ref) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => sheetRef.current as HTMLDivElement);

  const {
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
    refCommandeClient,
    destinataire,
    vendeur,
    intervenant,
    dateIntervention,
    modePaiement,
    apercuModele = false,
    validiteJours,
  } = props;

  const z = zonesDuModele(modele);
  const palette = paletteParId(z.couleurId);
  const labelStyle = { color: palette.accent };
  const softStyle = { backgroundColor: palette.soft };
  const tvaActive = appliqueTVA(parametres);
  const alignementPied = piedDePageAlignementDuModele(modele);
  const lignePied = piedDePageLigneDuModele(modele);
  const mentionTva = afficherMentionTvaImmatriculation(modele);
  const hasPied =
    Boolean(modele?.piedDePage?.trim()) || lignePied !== "aucune";
  const alignPiedClass =
    alignementPied === "gauche"
      ? "text-left"
      : alignementPied === "droite"
        ? "text-right"
        : "text-center";

  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const run = () => ancrerPiedDernierePage(el, HAUTEUR_PAGE_A4_MM);
    run();
    const ro = new ResizeObserver(run);
    const corps = el.querySelector(".document-preview-corps");
    const bas = el.querySelector(".document-preview-bas");
    if (corps) ro.observe(corps);
    if (bas) ro.observe(bas);
    return () => ro.disconnect();
  });

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

  const nomDocument = titre ?? z.document.nomDocument ?? labelType;

  const colonnesVisibles = z.articles.colonnes.filter((c) => c.visible);
  const largeursColonnes = largeursColonnesPourcent(
    colonnesVisibles.map((c) => c.id),
  );

  const ligneCalc = (l: LigneDocument) => {
    const pu = l.prixUnitaire;
    const brut = montantLigneBrutHT(l);
    const remiseHT = montantRemiseLigne(l);
    const totalHT = montantLigneHT(l);
    const remisePct = brut > 0 ? (remiseHT / brut) * 100 : 0;
    const puRemise = prixUnitaireNetHT(l);
    const tvaPct = tvaActive ? (l.tauxTVA ?? parametres.tauxTVA) : 0;
    const tvaMontant = totalHT * (tvaPct / 100);
    const totalTTC = totalHT + tvaMontant;
    return {
      pu,
      remisePct,
      remiseMode: modeRemiseLigne(l),
      puRemise,
      puTTC: pu * (1 + tvaPct / 100),
      puTTCRemise: puRemise * (1 + tvaPct / 100),
      brut,
      remiseHT,
      totalHT,
      tvaPct,
      tvaMontant,
      totalTTC,
    };
  };

  const cellValue = (colId: ColonneArticleId, l: LigneDocument): string => {
    const c = ligneCalc(l);
    switch (colId) {
      case "code":
        return l.codeProduit ?? "—";
      case "designation":
        return ligneEstSurface(l)
          ? `${l.designation} — ${libelleDimensionsLigne(l)}`
          : l.designation;
      case "pu_ht":
        return formatCurrency(c.pu) + (l.venduAuM2 ? " / m²" : "");
      case "pu_ttc":
        return formatCurrency(c.puTTC);
      case "remise_pct":
        if (!c.remiseHT) return "—";
        return c.remiseMode === "montant"
          ? formatCurrency(c.remiseHT)
          : `${Math.round(c.remisePct * 100) / 100} %`;
      case "remise_ht":
        return formatCurrency(c.remiseHT);
      case "pu_ht_remise":
        return formatCurrency(c.puRemise);
      case "pu_ttc_remise":
        return formatCurrency(c.puTTCRemise);
      case "unite":
        return l.unite || "—";
      case "quantite":
        return formatNumber(l.quantite);
      case "total_ht":
        return formatCurrency(c.brut);
      case "total_ht_remise":
        return formatCurrency(c.totalHT);
      case "tva_pct":
        return `${c.tvaPct} %`;
      case "tva_montant":
        return formatCurrency(c.tvaMontant);
      case "total_ttc":
        return formatCurrency(c.totalTTC);
      case "mesure":
        return libelleMesureLigne(l);
      default:
        return "";
    }
  };

  const totauxColonne = (colId: ColonneArticleId): string => {
    const produits = lignes.filter((l) => (l.type ?? "produit") === "produit");
    const sum = (fn: (c: ReturnType<typeof ligneCalc>) => number) =>
      produits.reduce((s, l) => s + fn(ligneCalc(l)), 0);
    switch (colId) {
      case "quantite":
        return formatNumber(produits.reduce((s, l) => s + l.quantite, 0));
      case "total_ht":
        return formatCurrency(sum((c) => c.brut));
      case "remise_ht":
        return formatCurrency(sum((c) => c.remiseHT));
      case "total_ht_remise":
        return formatCurrency(sum((c) => c.totalHT));
      case "tva_montant":
        return formatCurrency(sum((c) => c.tvaMontant));
      case "total_ttc":
        return formatCurrency(sum((c) => c.totalTTC));
      default:
        return "";
    }
  };

  const alignCol = (colId: ColonneArticleId) =>
    estColonneNumeriqueArticle(colId)
      ? "doc-col-num text-right"
      : "doc-col-text text-left";

  const ex = (val: string | undefined, placeholder: string) =>
    val ?? (apercuModele ? placeholder : "");

  // En-tête entreprise (zone 1)
  const logoNode =
    parametres.logoDataUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={parametres.logoDataUrl}
        alt={`Logo ${parametres.nomEntreprise}`}
        className="h-14 w-auto max-w-[160px] shrink-0 object-contain"
      />
    ) : apercuModele ? (
      <div className="flex h-14 w-20 items-center justify-center rounded border border-dashed border-line text-[10px] text-muted">
        Logo
      </div>
    ) : null;

  const entrepriseNode = z.entete.afficherInfosEntreprise ? (
    <div className="min-w-0">
      <p className="font-display text-xl font-semibold">
        {parametres.nomEntreprise || (apercuModele ? "Votre entreprise" : "")}
      </p>
      {parametres.formeJuridique && (
        <p className="text-xs text-muted">{parametres.formeJuridique}</p>
      )}
      <p className="mt-1 text-xs text-muted">
        {[
          z.entete.adresse ? parametres.adresse : "",
          z.entete.ville ? parametres.ville : "",
        ]
          .filter(Boolean)
          .join(", ")}
        {z.entete.telephone && parametres.telephone
          ? ` · ${parametres.telephone}`
          : ""}
        {z.entete.email && parametres.email ? ` · ${parametres.email}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        {z.entete.nif && (
          <span className="badge badge-sea">NIF : {parametres.nif || "—"}</span>
        )}
        {z.entete.stat && (
          <span className="badge badge-sea">
            STAT : {parametres.stat || "—"}
          </span>
        )}
        {z.entete.rcs && parametres.rcs && (
          <span className="badge badge-sand">RCS : {parametres.rcs}</span>
        )}
      </div>
    </div>
  ) : null;

  const enteteContenu = () => {
    switch (z.entete.disposition) {
      case "logo_only":
        return <div className="flex items-center">{logoNode}</div>;
      case "entreprise_only":
        return <div className="flex w-full justify-end text-right">{entrepriseNode}</div>;
      case "logo_droite":
        return (
          <div className="flex w-full items-start justify-between gap-4">
            {entrepriseNode}
            {logoNode}
          </div>
        );
      case "logo_gauche":
      default:
        return (
          <div className="flex w-full items-start gap-3">
            {logoNode}
            {entrepriseNode}
          </div>
        );
    }
  };

  // Cadres client (zone 3)
  const clientFrames: { titre: string; contenu: ReactNode }[] = [];
  if (z.client.cadreClient) {
    clientFrames.push({
      titre: "Client",
      contenu: (
        <>
          {z.client.codeClient && (client?.code || apercuModele) && (
            <p className="text-[11px] text-muted">
              Code : {client?.code ?? "CLI-0001"}
            </p>
          )}
          {z.client.nomClient && (
            <p className="font-semibold">{client?.nom ?? (apercuModele ? "Nom du client" : "—")}</p>
          )}
          {z.client.emailClient && (client?.email || apercuModele) && (
            <p className="text-[11px] text-muted">{client?.email ?? "email@client.mg"}</p>
          )}
          {z.client.telClient && (client?.telephone || apercuModele) && (
            <p className="text-[11px] text-muted">{client?.telephone ?? "020 xx xxx xx"}</p>
          )}
          {z.client.immatriculation &&
            (client?.nif || client?.stat || apercuModele) && (
              <p className="mt-1 text-[11px]">
                {client?.nif || apercuModele
                  ? `NIF : ${client?.nif ?? "—"}`
                  : null}
                {(client?.nif || apercuModele) && (client?.stat || apercuModele)
                  ? " · "
                  : null}
                {client?.stat || apercuModele
                  ? `STAT : ${client?.stat ?? "—"}`
                  : null}
              </p>
            )}
        </>
      ),
    });
  }
  if (z.client.cadreAdresseEtablissement) {
    clientFrames.push({
      titre: "Adresse de l'établissement",
      contenu: z.client.adresseEtablissement ? (
        <p className="text-[11px] text-muted">
          {[client?.adresse, client?.ville].filter(Boolean).join(", ") ||
            (apercuModele ? "Adresse · Ville" : "—")}
        </p>
      ) : null,
    });
  }
  if (z.client.cadreEntrepriseFacturee) {
    clientFrames.push({
      titre: "Entreprise facturée",
      contenu: z.client.adresseEntrepriseFacturee ? (
        <p className="text-[11px] text-muted">
          {client?.nom ?? (apercuModele ? "Entreprise · Adresse" : "—")}
        </p>
      ) : null,
    });
  }
  if (z.client.cadreAdresseLivraison) {
    clientFrames.push({
      titre: "Adresse de livraison",
      contenu: z.client.adresseLivraison ? (
        <p className="text-[11px] text-muted">
          {[client?.adresse, client?.ville].filter(Boolean).join(", ") ||
            (apercuModele ? "Adresse · Ville" : "—")}
        </p>
      ) : null,
    });
  }

  // Traçabilité (zone 4)
  const tracaItems: { label: string; value: string }[] = [];
  if (z.tracabilite.afficher) {
    if (z.tracabilite.refCommandeClient)
      tracaItems.push({
        label: "Réf. commande client",
        value: ex(refCommandeClient ?? referenceCommande, "—"),
      });
    if (z.tracabilite.destinataire)
      tracaItems.push({ label: "Destinataire", value: ex(destinataire, "—") });
    if (z.tracabilite.vendeur)
      tracaItems.push({ label: "Vendeur", value: ex(vendeur, "—") });
    if (z.tracabilite.intervenant)
      tracaItems.push({ label: "Intervenant", value: ex(intervenant, "—") });
    if (z.tracabilite.dateIntervention)
      tracaItems.push({
        label: "Date d'intervention",
        value: ex(dateIntervention, "—"),
      });
  }

  const conditions = conditionsPaiement || parametres.conditionsPaiementDefaut;
  const paiementEffectue = totaux.acomptesTTC;
  const totalAPayer = totaux.totalTTC;

  return (
    <div
      ref={sheetRef}
      className={`document-preview-sheet print-area mx-auto box-border w-full max-w-[210mm] rounded-[var(--radius)] border border-line bg-white p-[12mm] text-ink shadow-sm${
        hasPied ? " document-preview-sheet--avec-pied" : ""
      }`}
    >
      <div className="document-preview-corps">
      {(estProforma || factureType === "proforma") && (
        <p className="mb-3 rounded bg-amber-100 px-3 py-1 text-center text-xs font-bold uppercase tracking-wider text-amber-900">
          Document proforma — sans valeur fiscale / hors série de facturation
        </p>
      )}

      {/* Zone 1 — En-tête */}
      <div className="mb-4 border-b border-line pb-4">{enteteContenu()}</div>

      {/* Zone 2 — Informations sur le document */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line px-4 py-2 text-sm">
        <p
          className="font-display font-semibold uppercase tracking-wide"
          style={{ color: palette.primary }}
        >
          {nomDocument}
          {z.document.numero ? ` N° ${numero}` : ""}
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          {z.document.date && <span>Date : {formatDate(date)}</span>}
          {z.document.delaiPaiement && (echeance || apercuModele) && (
            <span>
              Délai paiement :{" "}
              {echeance ? formatDate(echeance) : apercuModele ? "30 jours" : ""}
            </span>
          )}
          {pdv && <span>Point de vente : {pdv.nom}</span>}
          {(type === "devis" || type === "commande") && (
            <span>
              Validité : {libelleValiditeDocument(date, validiteJours)}
            </span>
          )}
        </div>
      </div>

      {/* Références */}
      {((referenceDevis && type !== "devis") ||
        referenceCommande ||
        referenceBl ||
        referenceFacture) && (
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          {referenceDevis && type !== "devis" && (
            <span>
              Réf. devis : <strong>{referenceDevis}</strong>
            </span>
          )}
          {referenceCommande && (
            <span>
              Réf. commande : <strong>{referenceCommande}</strong>
            </span>
          )}
          {referenceBl && (
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
      )}

      {/* Zone 3 — Client & adresses */}
      {clientFrames.length > 0 && (
        <div
          className={`mb-4 grid gap-2 ${
            clientFrames.length >= 4
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : clientFrames.length === 3
                ? "sm:grid-cols-3"
                : clientFrames.length === 2
                  ? "sm:grid-cols-2"
                  : ""
          }`}
        >
          {clientFrames.map((f) => (
            <div
              key={f.titre}
              className="rounded-lg border border-line p-3 text-sm"
              style={softStyle}
            >
              <p
                className="mb-1 text-[10px] font-bold uppercase tracking-wider"
                style={labelStyle}
              >
                {f.titre}
              </p>
              {f.contenu}
            </div>
          ))}
        </div>
      )}

      {/* Zone 4 — Traçabilité */}
      {tracaItems.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-x-8 gap-y-1 rounded-lg border border-line px-4 py-2 text-xs">
          {tracaItems.map((it) => (
            <span key={it.label}>
              {it.label} : <strong>{it.value}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Zone 5 — Tableau des articles */}
      {colonnesVisibles.length > 0 && (
        <table
          className={`data mb-4 w-full ${classeDensiteTableau(colonnesVisibles.length)}`.trim()}
        >
          <colgroup>
            {colonnesVisibles.map((c) => (
              <col
                key={c.id}
                style={{ width: `${largeursColonnes[c.id] ?? 10}%` }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {colonnesVisibles.map((c) => (
                <th
                  key={c.id}
                  className={alignCol(c.id)}
                  style={{ backgroundColor: palette.accent, color: "#fff" }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const ltype = l.type ?? "produit";
              if (ltype === "blanche") {
                return (
                  <tr key={l.id}>
                    <td
                      colSpan={colonnesVisibles.length}
                      className="h-6 border-0 bg-transparent"
                    />
                  </tr>
                );
              }
              if (ltype === "commentaire") {
                return (
                  <tr key={l.id}>
                    <td
                      colSpan={colonnesVisibles.length}
                      className="italic text-muted"
                    >
                      {l.designation || l.commentaire}
                    </td>
                  </tr>
                );
              }
              if (ltype === "sous_total") {
                return (
                  <tr key={l.id} className="bg-sea-50/80 font-semibold">
                    <td colSpan={Math.max(1, colonnesVisibles.length - 1)}>
                      {l.designation || "Sous-total"}
                    </td>
                    <td className="text-right">
                      {formatCurrency(l.prixUnitaire)}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={l.id}>
                  {colonnesVisibles.map((c) => (
                    <td
                      key={c.id}
                      className={`${alignCol(c.id)} ${
                        c.id === "total_ttc" || c.id === "total_ht_remise"
                          ? "font-semibold"
                          : ""
                      }`}
                    >
                      {cellValue(c.id, l)}
                      {c.id === "designation" && l.commentaire ? (
                        <span className="mt-0.5 block text-xs italic text-muted">
                          {l.commentaire}
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
            {z.articles.afficherLigneTotal && (
              <tr
                className="font-semibold"
                style={{ backgroundColor: palette.soft, borderTop: `2px solid ${palette.primary}` }}
              >
                {colonnesVisibles.map((c, i) => (
                  <td key={c.id} className={alignCol(c.id)}>
                    {i === 0 ? "Total" : totauxColonne(c.id)}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Zone 6 — Totaux */}
      {z.totaux.afficher && (
        <div className="ml-auto mb-4 w-full max-w-xs space-y-1 text-sm">
          {parametres.regimeFiscal === "imp" ? (
            <>
              {z.totaux.montantIMP && (
                <div className="flex justify-between">
                  <span>Montant IMP</span>
                  <span>{formatCurrency(totaux.totalTTC)}</span>
                </div>
              )}
              {z.totaux.tauxIMP && (
                <div className="flex justify-between text-muted">
                  <span>Taux IMP</span>
                  <span>—</span>
                </div>
              )}
            </>
          ) : (
            <>
              {totaux.totalRemise > 0 && (
                <>
                  <div className="flex justify-between text-muted">
                    <span>Brut HT</span>
                    <span>{formatCurrency(totaux.brutHT)}</span>
                  </div>
                  {totaux.remisesLignes > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>Remises lignes</span>
                      <span>− {formatCurrency(totaux.remisesLignes)}</span>
                    </div>
                  )}
                  {totaux.remiseGlobaleAppliquee > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>Remise globale</span>
                      <span>
                        − {formatCurrency(totaux.remiseGlobaleAppliquee)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {tvaActive && z.totaux.totalHT && (
                <div className="flex justify-between">
                  <span>Total HT</span>
                  <span>{formatCurrency(totaux.totalHT)}</span>
                </div>
              )}
              {tvaActive && z.totaux.totalTVA && (
                <div className="flex justify-between">
                  <span>Total TVA ({totaux.tauxTVA} %)</span>
                  <span>{formatCurrency(totaux.montantTVA)}</span>
                </div>
              )}
              {z.totaux.totalTTC && (
                <div className="flex justify-between border-t border-line pt-1 font-semibold">
                  <span>{tvaActive ? "Total TTC" : "Total"}</span>
                  <span>{formatCurrency(totaux.totalTTC)}</span>
                </div>
              )}
            </>
          )}
          {z.totaux.taxesAdditionnelles && (
            <div className="flex justify-between text-muted">
              <span>Taxes additionnelles</span>
              <span>—</span>
            </div>
          )}
          {z.totaux.cautionConsigne && (
            <div className="flex justify-between text-muted">
              <span>Caution et consigne</span>
              <span>—</span>
            </div>
          )}
          {z.totaux.totalAPayer && (
            <div className="flex justify-between font-semibold">
              <span>Total à payer</span>
              <span>{formatCurrency(totalAPayer)}</span>
            </div>
          )}
          {z.totaux.paiementEffectue && paiementEffectue > 0 && (
            <div className="flex justify-between text-muted">
              <span>Paiement effectué</span>
              <span>− {formatCurrency(paiementEffectue)}</span>
            </div>
          )}
          {z.totaux.netAPayer && (
            <div
              className="mt-1 flex justify-between rounded px-3 py-2 font-display text-base font-semibold text-white"
              style={{ backgroundColor: palette.primary }}
            >
              <span>Net à payer</span>
              <span>{formatCurrency(totaux.netAPayer)}</span>
            </div>
          )}
        </div>
      )}

      <div className="document-preview-pied">
        {/* Détail des acomptes */}
        {acomptesDetail.length > 0 && (
          <div className="mb-4 rounded-lg border border-line p-3 text-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Acomptes
            </p>
            {acomptesDetail.map((a) => (
              <div key={a.numero} className="flex justify-between text-xs">
                <span>
                  {a.numero} — {formatDate(a.date)}
                  {a.mode ? ` (${MODES_PAIEMENT[a.mode] ?? a.mode})` : ""}
                </span>
                <span className="font-semibold">− {formatCurrency(a.montant)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Zone 8 — Montant en lettres */}
        {z.montantEnLettres.afficher && (
          <div className="mb-4 rounded-lg border border-line px-4 py-2 text-sm" style={softStyle}>
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={labelStyle}
            >
              {z.montantEnLettres.titre}
            </p>
            <p className="mt-0.5 capitalize">
              {montantEnLettres(totaux.netAPayer)}
            </p>
          </div>
        )}

        {/* Zone 7 — Mode de règlement & échéance */}
        {z.reglement.afficher && (
          <div className="mb-4 rounded-lg border border-line p-3 text-xs">
            <p
              className="mb-1 text-[10px] font-bold uppercase tracking-wider"
              style={labelStyle}
            >
              Mode de règlement
              {z.reglement.delai && echeance
                ? ` — Échéance : ${formatDate(echeance)}`
                : ""}
            </p>
            {z.reglement.mode && modePaiement && (
              <p>Mode : {MODES_PAIEMENT[modePaiement] ?? modePaiement}</p>
            )}
            {z.reglement.description && <p>{conditions}</p>}
            {z.reglement.compteBancaire && parametres.rib && (
              <p className="mt-1">
                Compte bancaire :{" "}
                {parametres.banque ? `${parametres.banque} — ` : ""}
                {parametres.rib}
              </p>
            )}
          </div>
        )}

        {note && <p className="mb-2 text-xs text-muted">Note : {note}</p>}

        {modele?.mentionsLegales ? (
          <div className="mt-4 pt-3 text-[10px] leading-relaxed text-muted">
            <p>{modele.mentionsLegales}</p>
          </div>
        ) : null}
      </div>
      </div>

      <div className="document-preview-bas">
        {z.signataire.afficher && (
          <div className="doc-cachet mt-5 flex justify-end">
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
                    Signature
                  </span>
                </div>
              )}
              <div className="pt-2 text-xs text-muted">
                {z.signataire.nom?.trim() ||
                  parametres.signatureNom?.trim() ||
                  "Signature / cachet"}
              </div>
            </div>
          </div>
        )}

        {mentionTva && (
          <div className="mt-4 pt-3 text-[10px] leading-relaxed text-muted">
            <p className="font-semibold text-ink">
              {mentionRegimeFiscal(parametres)}
            </p>
            <p className="mt-1">
              NIF : {parametres.nif || "—"} · STAT : {parametres.stat || "—"}
              {parametres.rcs ? ` · RCS : ${parametres.rcs}` : ""}
            </p>
          </div>
        )}
      </div>

      {hasPied && (
        <div className="document-preview-footer">
          {lignePied === "pleine" ? (
            <div className="document-preview-footer-ligne--pleine" />
          ) : null}
          {lignePied === "centree" ? (
            <div className="document-preview-footer-ligne--centree" />
          ) : null}
          {modele?.piedDePage?.trim() ? (
            <p className={`text-[11px] text-muted ${alignPiedClass}`}>
              {modele.piedDePage}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
});

DocumentPreview.displayName = "DocumentPreview";
