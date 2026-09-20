"use client";

import { useMemo, useRef, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { BonsDePreparationSubnav } from "@/components/commercial-doc-subnav";
import { DocumentFiliation } from "@/components/document-filiation";
import { DocumentPreview } from "@/components/document-preview";
import { DocumentPrintActions } from "@/components/document-print-actions";
import { ExportDocumentPdfButton } from "@/components/export-documents-pdf";
import { IconButton } from "@/components/icon-button";
import { IndicateurInfo } from "@/components/indicateur-info";
import { PageHeader } from "@/components/page-header";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import { TransformationValidationModal } from "@/components/transformation-validation";
import {
  BP_STATUTS,
  moduleBonDePreparationActif,
  nomSitePreparation,
  stockLignePreparation,
  toutesLignesPreparees,
} from "@/lib/bon-de-preparation";
import { filterByPos } from "@/lib/calculations";
import { calculerTotaux, couleurStatutDocument, isLigneProduit, libelleClient } from "@/lib/commercial";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { getActiviteActor } from "@/lib/activity-actor";
import { numeroPieceSuivant } from "@/lib/numerotation-pieces";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";
import { useModelePourType } from "@/lib/use-modele";
import {
  avancementLivraisonCommande,
  clonerLignesDocument,
  statutCommandeSelonLivraison,
  verrouTransformationActif,
} from "@/lib/transformation-document";
import type { BonDePreparation, BonDePreparationStatut } from "@/lib/types";

type Filtre = "tous" | BonDePreparationStatut;

const FILTRES: { id: Filtre; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "a_preparer", label: "À préparer" },
  { id: "en_cours", label: "En cours" },
  { id: "pret", label: "Prêts" },
  { id: "transforme", label: "Transformés" },
  { id: "annule", label: "Annulés" },
];

export default function ListeBonsDePreparationPage() {
  const {
    bonsDePreparation,
    commandes,
    devis,
    clients,
    pointsDeVente,
    parametres,
    entrees,
    ventes,
    inventaires,
    pointDeVenteActifId,
    bonsDeLivraison,
    updateBonDePreparation,
    deleteBonDePreparation,
    sauvegarderVersionBonDePreparation,
    addBonDeLivraison,
    verrouillerTransformation,
    annulerTransformation,
    finaliserTransformation,
  } = useStore();
  const actif = moduleBonDePreparationActif(parametres);
  const modele = useModelePourType("bon_de_preparation");
  const modeleBl = useModelePourType("bon_de_livraison");
  const { visible, colSpan } = useAffichageTable("bons_de_preparation");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const previewSheetRef = useRef<HTMLDivElement>(null);

  const lignes = useMemo(() => {
    return [...filterByPos(bonsDePreparation ?? [], pointDeVenteActifId)]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((b) => (filtre === "tous" ? true : b.statut === filtre))
      .map((bp) => ({
        bp,
        client: clients.find((c) => c.id === bp.clientId),
        cmd: commandes.find((c) => c.id === bp.commandeId),
        site: pointsDeVente.find((p) => p.id === bp.pointDeVenteId),
      }));
  }, [
    bonsDePreparation,
    pointDeVenteActifId,
    filtre,
    clients,
    commandes,
    pointsDeVente,
  ]);

  const preview = (bonsDePreparation ?? []).find((b) => b.id === previewId);
  const pending = (bonsDePreparation ?? []).find((b) => b.id === pendingId);

  const totauxPreview = preview
    ? calculerTotaux(preview.lignes, 0, 0, false, 0, "montant")
    : null;

  function patchLigne(bp: BonDePreparation, ligneId: string, prepare: boolean) {
    const lignesNext = bp.lignes.map((l) =>
      l.id === ligneId ? { ...l, prepare } : l,
    );
    const all = toutesLignesPreparees({ lignes: lignesNext });
    updateBonDePreparation(bp.id, {
      lignes: lignesNext,
      statut:
        bp.statut === "a_preparer" || bp.statut === "en_cours"
          ? all
            ? "pret"
            : "en_cours"
          : bp.statut,
    });
  }

  function viser(bp: BonDePreparation) {
    const actor = getActiviteActor();
    updateBonDePreparation(bp.id, {
      visa: true,
      preparateurUserId: actor.id,
      preparateurNom: actor.nom,
      dateVisa: new Date().toISOString(),
      statut: bp.statut === "a_preparer" ? "en_cours" : bp.statut,
    });
  }

  function demanderBl(bp: BonDePreparation) {
    if (bp.statut !== "pret") {
      alert("Passez le bon en statut Prêt avant de le transformer en BL.");
      return;
    }
    const res = verrouillerTransformation(
      "bon_de_preparation",
      bp.id,
      "bon_de_livraison",
    );
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    setPendingId(bp.id);
    setPreviewId(null);
  }

  function confirmerBl() {
    const bp = useStore.getState().bonsDePreparation?.find((b) => b.id === pendingId);
    if (!bp || !verrouTransformationActif(bp.verrouTransformation)) {
      setPendingId(null);
      alert("Le délai de validation (10 min) est dépassé.");
      return;
    }
    const cmd = commandes.find((c) => c.id === bp.commandeId);
    const numero = numeroPieceSuivant(
      "livraison",
      bonsDeLivraison.map((b) => b.numero),
      parametres,
    );
    const blId = addBonDeLivraison({
      numero,
      clientId: bp.clientId,
      pointDeVenteId: bp.pointDeVenteId,
      date: new Date().toISOString(),
      statut: "prepare",
      commandeId: bp.commandeId,
      devisId: bp.devisId,
      bonDePreparationId: bp.id,
      tauxTVA: cmd?.tauxTVA ?? parametres.tauxTVA,
      conditionsPaiement: cmd?.conditionsPaiement,
      lignes: clonerLignesDocument(bp.lignes, "bl"),
      note: bp.note,
    });
    const fin = finaliserTransformation({
      sourceType: "bon_de_preparation",
      sourceId: bp.id,
      cibleType: "bon_de_livraison",
      cibleId: blId,
      cibleNumero: numero,
      statutSource: "transforme",
    });
    if (!fin.ok) {
      alert(fin.reason);
      return;
    }
    if (cmd) {
      const avancement = avancementLivraisonCommande(
        cmd,
        useStore.getState().bonsDeLivraison,
      );
      useStore.getState().updateCommande(cmd.id, {
        statut: statutCommandeSelonLivraison(avancement),
      });
    }
    setPendingId(null);
  }

  if (!actif) {
    return (
      <div>
        <PageHeader title="Bons de préparation" />
        <BonsDePreparationSubnav />
        <p className="text-sm text-muted">
          Activez le bon de préparation dans Paramètres → Documents commerciaux.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Bons de préparation"
        description="Picking interne — pas de TVA, pas d'écriture. Transformable en BL une fois prêt."
      />
      <BonsDePreparationSubnav />

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn ${filtre === f.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltre(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <TableAffichageBarre
        tableId="bons_de_preparation"
        lignes={lignes.map(({ bp, client, cmd, site }) => ({
          numero: bp.numero,
          date: formatDate(bp.date),
          client: client?.nom ?? "",
          commande: cmd?.numero ?? "",
          site: site?.nom ?? "",
          statut: BP_STATUTS[bp.statut],
        }))}
        fichier="bons-de-preparation"
        titre="Bons de préparation"
      />

      <div className="table-shell overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <ThCol id="numero" show={visible}>N°</ThCol>
              <ThCol id="date" show={visible}>Date</ThCol>
              <ThCol id="client" show={visible}>Client</ThCol>
              <ThCol id="commande" show={visible}>Commande</ThCol>
              <ThCol id="site" show={visible}>Site</ThCol>
              <ThCol id="statut" show={visible}>Statut</ThCol>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={colSpan(true)} className="text-sm text-muted">
                  Aucun bon de préparation.
                </td>
              </tr>
            ) : (
              lignes.map(({ bp, client, cmd, site }) => (
                <tr key={bp.id}>
                  <TdCol id="numero" show={visible}>
                    {bp.numero}
                  </TdCol>
                  <TdCol id="date" show={visible}>
                    {formatDate(bp.date)}
                  </TdCol>
                  <TdCol id="client" show={visible}>
                    {client ? libelleClient(client) : "—"}
                  </TdCol>
                  <TdCol id="commande" show={visible}>
                    {cmd?.numero ?? "—"}
                  </TdCol>
                  <TdCol id="site" show={visible}>
                    {site?.nom ?? "—"}
                  </TdCol>
                  <TdCol id="statut" show={visible}>
                    <span className={`badge badge-${couleurStatutDocument(bp.statut)}`}>
                      {BP_STATUTS[bp.statut]}
                    </span>
                  </TdCol>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1">
                      <IconButton label="Aperçu" onClick={() => setPreviewId(bp.id)}>
                        <Eye className="h-4 w-4" />
                      </IconButton>
                      {bp.statut === "pret" && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => demanderBl(bp)}
                        >
                          → BL
                        </button>
                      )}
                      {bp.statut !== "transforme" && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => {
                            if (confirm(`Supprimer ${bp.numero} ?`)) {
                              deleteBonDePreparation(bp.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {preview && totauxPreview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
          <div className="my-6 w-full max-w-[220mm]">
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={preview.afficherPrix === true}
                  onChange={(e) =>
                    updateBonDePreparation(preview.id, {
                      afficherPrix: e.target.checked,
                    })
                  }
                />
                Afficher les prix
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => viser(preview)}
              >
                Visa préparateur
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => sauvegarderVersionBonDePreparation(preview.id)}
              >
                Sauvegarder une version
              </button>
              <DocumentPrintActions
                sheetRef={previewSheetRef}
                filename={`BP ${preview.numero}`}
              />
              <ExportDocumentPdfButton filename={`BP ${preview.numero}`}>
                <DocumentPreview
                  type="bon_de_preparation"
                  numero={preview.numero}
                  date={preview.date}
                  client={clients.find((c) => c.id === preview.clientId)}
                  pdv={pointsDeVente.find((p) => p.id === preview.pointDeVenteId)}
                  pointsDeVente={pointsDeVente}
                  parametres={parametres}
                  modele={modele}
                  lignes={preview.lignes}
                  totaux={totauxPreview}
                  note={preview.note}
                  afficherPrix={preview.afficherPrix === true}
                  referenceCommande={
                    commandes.find((c) => c.id === preview.commandeId)?.numero
                  }
                  referenceDevis={
                    devis.find(
                      (d) =>
                        d.id ===
                        commandes.find((c) => c.id === preview.commandeId)?.devisId,
                    )?.numero
                  }
                  visaPreparateur={{
                    nom: preview.preparateurNom,
                    date: preview.dateVisa,
                  }}
                  intervenant={preview.preparateurNom}
                  dateIntervention={preview.dateVisa}
                />
              </ExportDocumentPdfButton>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPreviewId(null)}
              >
                Fermer
              </button>
            </div>

            <div className="mb-4 rounded-[var(--radius)] border border-line bg-card p-4 no-print">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sea-700">
                Préparation
                <IndicateurInfo indicateur="bon_de_preparation_versions" />
              </p>
              <div className="mb-3 flex flex-wrap gap-2">
                {(
                  ["a_preparer", "en_cours", "pret", "annule"] as BonDePreparationStatut[]
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn ${preview.statut === s ? "btn-primary" : "btn-secondary"}`}
                    disabled={preview.statut === "transforme"}
                    onClick={() => updateBonDePreparation(preview.id, { statut: s })}
                  >
                    {BP_STATUTS[s]}
                  </button>
                ))}
              </div>
              <table className="data">
                <thead>
                  <tr>
                    <th>Article</th>
                    <th className="text-right">Qté</th>
                    <th>Site / emplacement</th>
                    <th className="text-right">Stock</th>
                    <th>Préparé</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.lignes.filter(isLigneProduit).map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.codeProduit ? `${l.codeProduit} — ` : ""}
                        {l.designation}
                      </td>
                      <td className="text-right font-mono text-xs">
                        {formatNumber(l.quantite, 3)} {l.unite}
                      </td>
                      <td className="text-xs">
                        {nomSitePreparation(
                          l.siteStockId || preview.pointDeVenteId,
                          pointsDeVente,
                        )}
                      </td>
                      <td className="text-right font-mono text-xs">
                        {formatNumber(
                          stockLignePreparation({
                            ligne: l,
                            entrees,
                            ventes,
                            inventaires,
                            siteDefautId: preview.pointDeVenteId,
                          }) ?? 0,
                          3,
                        )}
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={l.prepare === true}
                          disabled={preview.statut === "transforme"}
                          onChange={(e) =>
                            patchLigne(preview, l.id, e.target.checked)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(preview.versions ?? []).length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  {(preview.versions ?? []).map((v) => (
                    <li key={v.id}>
                      v{v.version} — {BP_STATUTS[v.statut]} —{" "}
                      {v.userNom || "utilisateur"} le {formatDateTime(v.date)}
                    </li>
                  ))}
                </ul>
              )}
              <DocumentFiliation documentId={preview.id} />
            </div>

            <DocumentPreview
              ref={previewSheetRef}
              type="bon_de_preparation"
              numero={preview.numero}
              date={preview.date}
              client={clients.find((c) => c.id === preview.clientId)}
              pdv={pointsDeVente.find((p) => p.id === preview.pointDeVenteId)}
              pointsDeVente={pointsDeVente}
              parametres={parametres}
              modele={modele}
              lignes={preview.lignes}
              totaux={totauxPreview}
              note={preview.note}
              afficherPrix={preview.afficherPrix === true}
              referenceCommande={
                commandes.find((c) => c.id === preview.commandeId)?.numero
              }
              visaPreparateur={{
                nom: preview.preparateurNom,
                date: preview.dateVisa,
              }}
              intervenant={preview.preparateurNom}
              dateIntervention={preview.dateVisa}
            />
          </div>
        </div>
      )}

      {pending && (
        <TransformationValidationModal
          open
          titre={`Transformer ${pending.numero} en bon de livraison`}
          sourceNumero={pending.numero}
          cible="bon_de_livraison"
          verrou={pending.verrouTransformation}
          onConfirmer={confirmerBl}
          onAnnuler={() => {
            annulerTransformation("bon_de_preparation", pending.id);
            setPendingId(null);
          }}
          onRetourEdition={() => {
            annulerTransformation("bon_de_preparation", pending.id);
            setPendingId(null);
            setPreviewId(pending.id);
          }}
          onExpire={() => {
            setPendingId(null);
            alert("Délai dépassé.");
          }}
        >
          <DocumentPreview
            type="bon_de_livraison"
            numero="(nouveau BL)"
            date={new Date().toISOString()}
            client={clients.find((c) => c.id === pending.clientId)}
            pdv={pointsDeVente.find((p) => p.id === pending.pointDeVenteId)}
            parametres={parametres}
            modele={modeleBl}
            lignes={pending.lignes}
            totaux={calculerTotaux(pending.lignes, parametres.tauxTVA, 0, false, 0, "montant")}
            referenceCommande={
              commandes.find((c) => c.id === pending.commandeId)?.numero
            }
          />
        </TransformationValidationModal>
      )}
    </div>
  );
}
