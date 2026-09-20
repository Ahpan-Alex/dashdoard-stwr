"use client";

import { forwardRef } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  budgetPrevisionnelMission,
  fondsRemisMission,
  libelleSoldeMission,
  MISSION_JUSTIFICATIF_LABELS,
  MISSION_STATUT_LABELS,
  montantLignePrevisionnelle,
  montantLigneRealisee,
  nbJustificatifsManquants,
  quantiteManquanteLigne,
  quantiteReceptionneeLigne,
  soldeMission,
  syntheseFinanciereMission,
  totauxArticlesMission,
  totalDepenseMission,
} from "@/lib/missions";
import { libelleProduit } from "@/lib/produits";
import type { MissionAchat, Parametres, Produit, Tiers } from "@/lib/types";

type Props = {
  mission: MissionAchat;
  parametres: Parametres;
  produits: Produit[];
  nomSite: string;
  nomFrn: (id: string) => string;
};

export const MissionRapportDocument = forwardRef<HTMLDivElement, Props>(
  function MissionRapportDocument(
    { mission, parametres, produits, nomSite, nomFrn },
    ref,
  ) {
    const fin = syntheseFinanciereMission(mission);
    const arts = totauxArticlesMission(mission);
    const solde = soldeMission(mission);
    return (
      <div
        ref={ref}
        className="document-preview-sheet print-area mx-auto box-border w-full max-w-[210mm] overflow-x-hidden rounded-[var(--radius)] border border-line bg-white p-[12mm] text-ink shadow-sm"
      >
        <div className="mb-4 border-b border-line pb-3">
          {parametres?.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={parametres.logoDataUrl}
              alt=""
              className="mb-2 h-10 w-auto"
            />
          ) : null}
          <p className="text-xs uppercase tracking-wider text-muted">
            Rapport de mission d&apos;achat
          </p>
          <h1 className="font-display text-xl font-semibold">{mission.numero}</h1>
          <p className="text-sm text-muted">
            {parametres?.nomEntreprise || "Entreprise"} ·{" "}
            {MISSION_STATUT_LABELS[mission.statut]}
            {mission.dateCloture
              ? ` · Clôturée le ${formatDate(mission.dateCloture)}`
              : ""}
          </p>
        </div>

        <section className="mb-4 text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Informations générales
          </h2>
          <p>Acheteur : {mission.acheteurNom}</p>
          {mission.service ? <p>Service : {mission.service}</p> : null}
          {mission.objet ? <p>Objet : {mission.objet}</p> : null}
          <p>Date : {formatDate(mission.date)}</p>
          {mission.datePrevue ? (
            <p>Date prévue : {formatDate(mission.datePrevue)}</p>
          ) : null}
          <p>Site destinataire : {nomSite}</p>
          {mission.valideurNom ? <p>Validée par : {mission.valideurNom}</p> : null}
        </section>

        <section className="mb-4 text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Situation financière
          </h2>
          <p>Budget prévu : {formatCurrency(fin.budget)}</p>
          <p>Fonds demandés : {formatCurrency(fin.fondsDemandes)}</p>
          <p>Fonds validés : {formatCurrency(fin.fondsValides)}</p>
          <p>Fonds remis : {formatCurrency(fin.fondsRemis)}</p>
          <p>Total dépensé : {formatCurrency(fin.totalDepenses)}</p>
          <p>Dépenses justifiées : {formatCurrency(fin.depensesJustifiees)}</p>
          <p>
            Dépenses non justifiées : {formatCurrency(fin.depensesNonJustifiees)}
          </p>
          <p>
            Solde : {formatCurrency(solde)} ({libelleSoldeMission(solde)})
          </p>
        </section>

        <section className="mb-4 text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Articles prévus
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th>Article</th>
                <th>Qté</th>
                <th>PU est.</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {(mission.lignesPrevisionnelles ?? []).map((l) => {
                const p = (produits ?? []).find((x) => x?.id === l.produitId);
                return (
                  <tr key={l.id} className="border-b border-line/60">
                    <td>{p ? `${p.code} — ${libelleProduit(p)}` : "—"}</td>
                    <td>{l.quantiteSouhaitee}</td>
                    <td>{formatCurrency(l.prixUnitaireEstime ?? 0)}</td>
                    <td>{formatCurrency(montantLignePrevisionnelle(l))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="mb-4 text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Achats et réception
          </h2>
          <p className="mb-2 text-xs text-muted">
            Prévu {arts.prevu} · Acheté {arts.achete} · Réceptionné {arts.recu}
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th>Article</th>
                <th>Qté ach.</th>
                <th>Qté réc.</th>
                <th>Manq.</th>
                <th>Montant</th>
                <th>Fournisseur</th>
              </tr>
            </thead>
            <tbody>
              {(mission.achatsRealises ?? [])
                .filter((l) => l.quantite > 0)
                .map((l) => {
                  const p = (produits ?? []).find((x) => x?.id === l.produitId);
                  return (
                    <tr key={l.id} className="border-b border-line/60">
                      <td>{p ? `${p.code} — ${libelleProduit(p)}` : "—"}</td>
                      <td>{l.quantite}</td>
                      <td>{quantiteReceptionneeLigne(l)}</td>
                      <td>{quantiteManquanteLigne(l)}</td>
                      <td>{formatCurrency(montantLigneRealisee(l))}</td>
                      <td>{nomFrn(l.fournisseurId)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>

        <section className="mb-4 text-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
            Justificatifs
          </h2>
          <p className="text-xs">
            Manquants : {nbJustificatifsManquants(mission)} · Total dépensé{" "}
            {formatCurrency(totalDepenseMission(mission))} · Fonds remis{" "}
            {formatCurrency(fondsRemisMission(mission))}
          </p>
          {(mission.justificatifs ?? []).length > 0 ? (
            <ul className="mt-2 list-disc pl-4 text-xs">
              {(mission.justificatifs ?? []).map((j) => (
                <li key={j.id}>
                  {MISSION_JUSTIFICATIF_LABELS[j.type]}
                  {j.numero ? ` ${j.numero}` : ""}
                  {j.date ? ` — ${formatDate(j.date)}` : ""}
                  {j.libelle ? ` — ${j.libelle}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <p className="mt-6 text-xs text-muted">
          Budget prévu {formatCurrency(budgetPrevisionnelMission(mission))}.
          Document généré automatiquement à partir du dossier unique de la
          mission.
        </p>
      </div>
    );
  },
);
