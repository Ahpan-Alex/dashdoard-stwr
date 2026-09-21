"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, FileText, Mail } from "lucide-react";
import { DocumentPreview } from "@/components/document-preview";
import { DocumentPrintActions } from "@/components/document-print-actions";
import { EmptyState } from "@/components/empty-state";
import { EnvoiDocumentBouton } from "@/components/envoi-document-bouton";
import { ExportDocumentPdfButton } from "@/components/export-documents-pdf";
import { IconButton } from "@/components/icon-button";
import { totauxAchat } from "@/lib/achats";
import {
  detailAcomptesDocument,
  totauxFacture,
} from "@/lib/commercial";
import { presentationPourFacture } from "@/lib/document-presentation";
import { formatCurrency, formatDate } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import { clientDepuisTiers, estClient, estFournisseur } from "@/lib/tiers";
import { useModelePourType } from "@/lib/use-modele";
import type { Achat, Facture, Tiers } from "@/lib/types";

type Liste = "client" | "fournisseur";

function vendeurLibelle(
  vendeurNom: string | undefined,
  id: string,
  journal: { entiteId?: string; userNom?: string }[],
) {
  if (vendeurNom?.trim()) return vendeurNom;
  const e = journal.find((j) => j.entiteId === id && j.userNom);
  return e?.userNom?.trim() || "—";
}

function ouvrirMailto(email: string | undefined, sujet: string, corps: string) {
  if (!email?.trim()) {
    alert("Aucun e-mail renseigné sur la fiche de ce tiers.");
    return false;
  }
  const href = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  window.location.href = href;
  return true;
}

type Props = { tiers: Tiers };

export function TiersFacturesPanel({ tiers }: Props) {
  const {
    factures,
    acomptes,
    achats,
    parametres,
    pointsDeVente,
    produits,
    devis,
    commandes,
    journalActivites,
    updateFacture,
  } = useStore();
  const modele = useModelePourType("facture");
  const client = estClient(tiers);
  const fournisseur = estFournisseur(tiers);
  const defaut: Liste = client ? "client" : "fournisseur";
  const [liste, setListe] = useState<Liste>(defaut);
  const [previewFactureId, setPreviewFactureId] = useState<string | null>(null);
  const [previewAchatId, setPreviewAchatId] = useState<string | null>(null);
  const previewSheetRef = useRef<HTMLDivElement>(null);

  const facturesClient = useMemo(
    () =>
      factures
        .filter((f) => f.clientId === tiers.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [factures, tiers.id],
  );
  const facturesFournisseur = useMemo(
    () =>
      achats
        .filter((a) => a.fournisseurId === tiers.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [achats, tiers.id],
  );

  const preview = factures.find((f) => f.id === previewFactureId);
  const previewAchat = achats.find((a) => a.id === previewAchatId);
  const previewPresentation = preview
    ? presentationPourFacture(preview, parametres, modele)
    : null;

  function marquerEnvoyee(f: Facture) {
    if (f.statut === "brouillon" || f.type === "proforma") {
      alert("Validez d'abord la facture fiscale avant l'envoi.");
      return;
    }
    updateFacture(
      f.id,
      {
        statut: f.statut === "payee" ? "payee" : "envoyee",
        dateEnvoi: new Date().toISOString(),
      },
      { action: "facture_envoyee" },
    );
  }

  const montrerBoutons = client && fournisseur;
  const afficherClient = client && (!montrerBoutons || liste === "client");
  const afficherFournisseur =
    fournisseur && (!montrerBoutons || liste === "fournisseur");

  return (
    <div>
      {montrerBoutons && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn ${liste === "client" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setListe("client")}
          >
            Liste facture client
          </button>
          <button
            type="button"
            className={`btn ${liste === "fournisseur" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setListe("fournisseur")}
          >
            Liste facture fournisseur
          </button>
        </div>
      )}

      {afficherClient && (
        <TableFactures
          lignes={facturesClient}
          tiers={tiers}
          parametres={parametres}
          acomptes={acomptes}
          journal={journalActivites}
          onVisionner={(id) => setPreviewFactureId(id)}
          onEnvoye={marquerEnvoyee}
        />
      )}

      {afficherFournisseur && (
        <>
          <div className="mb-3 flex justify-end">
            <Link
              href={`/achats/lots/nouveau?fournisseur=${tiers.id}`}
              className="btn btn-primary"
            >
              Paiement groupé
            </Link>
          </div>
          <TableAchats
          lignes={facturesFournisseur}
          tiers={tiers}
          journal={journalActivites}
          onVisionner={(id) => setPreviewAchatId(id)}
          onMail={(a) =>
            ouvrirMailto(
              tiers.email,
              `Facture ${a.numero}`,
              `Bonjour,\n\nVeuillez trouver la facture d'achat ${a.numero} du ${formatDate(a.date)}.\n\nCordialement`,
            )
          }
        />
        </>
      )}

      {preview && previewPresentation && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
          <div className="my-6 w-full max-w-[220mm]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/factures/liste?facture=${preview.id}`}
                className="text-sm text-muted hover:underline"
              >
                Ouvrir dans les factures
              </Link>
              <div className="flex flex-wrap gap-2">
                <DocumentPrintActions
                  sheetRef={previewSheetRef}
                  filename={`Facture ${preview.numero}`}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPreviewFactureId(null)}
                >
                  Fermer
                </button>
              </div>
            </div>
            <DocumentPreview
              ref={previewSheetRef}
              type="facture"
              factureType={preview.type}
              estProforma={
                preview.type === "proforma" || preview.statut === "proforma"
              }
              numero={preview.numero}
              date={preview.date}
              echeance={preview.echeance}
              client={clientDepuisTiers(tiers)}
              pdv={pointsDeVente.find((p) => p.id === preview.pointDeVenteId)}
              parametres={previewPresentation.parametres}
              modele={previewPresentation.modele}
              lignes={preview.lignes}
              totaux={totauxFacture(preview, parametres, acomptes)}
              conditionsPaiement={preview.conditionsPaiement}
              note={preview.note}
              vendeur={preview.vendeurNom}
              referenceFacture={
                preview.factureParenteId
                  ? factures.find((x) => x.id === preview.factureParenteId)
                      ?.numero
                  : undefined
              }
              referenceDevis={
                devis.find((d) => d.id === preview.devisId)?.numero
              }
              referenceCommande={
                commandes.find((c) => c.id === preview.commandeId)?.numero
              }
              acomptesDetail={detailAcomptesDocument(preview, acomptes)}
            />
          </div>
        </div>
      )}

      {previewAchat && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
          <div className="my-6 w-full max-w-[220mm]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/achats?id=${previewAchat.id}`}
                className="text-sm text-muted hover:underline"
              >
                Ouvrir dans les achats
              </Link>
              <div className="flex flex-wrap gap-2">
                <ExportDocumentPdfButton
                  variant="button"
                  label="Imprimer"
                  filename={`Facture ${previewAchat.numero}`}
                >
                  <AchatFeuille
                    achat={previewAchat}
                    tiers={tiers}
                    produits={produits}
                  />
                </ExportDocumentPdfButton>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPreviewAchatId(null)}
                >
                  Fermer
                </button>
              </div>
            </div>
            <div>
              <AchatFeuille
                achat={previewAchat}
                tiers={tiers}
                produits={produits}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TableFactures({
  lignes,
  tiers,
  parametres,
  acomptes,
  journal,
  onVisionner,
  onEnvoye,
}: {
  lignes: Facture[];
  tiers: Tiers;
  parametres: ReturnType<typeof useStore.getState>["parametres"];
  acomptes: ReturnType<typeof useStore.getState>["acomptes"];
  journal: ReturnType<typeof useStore.getState>["journalActivites"];
  onVisionner: (id: string) => void;
  onEnvoye: (f: Facture) => void;
}) {
  if (lignes.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Aucune facture client"
        description="Les factures de vente établies avec ce tiers apparaîtront ici."
      />
    );
  }
  return (
    <div className="table-shell">
      <table className="data">
        <thead>
          <tr>
            <th>N° facture</th>
            <th>N° client</th>
            <th>Nom du client</th>
            <th>Date</th>
            <th>Montant HT</th>
            <th>Montant TVA</th>
            <th>Montant TTC</th>
            <th>Vendeur</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((f) => {
            const t = totauxFacture(f, parametres, acomptes);
            return (
              <tr key={f.id}>
                <td className="font-medium">
                  <Link
                    href={`/factures/liste?facture=${f.id}`}
                    className="hover:underline"
                  >
                    {f.numero}
                  </Link>
                </td>
                <td className="font-mono text-xs">{tiers.code || "—"}</td>
                <td>{tiers.nom}</td>
                <td>{formatDate(f.date)}</td>
                <td>{formatCurrency(t.totalHT)}</td>
                <td>{formatCurrency(t.montantTVA)}</td>
                <td className="font-semibold">{formatCurrency(t.totalTTC)}</td>
                <td>{vendeurLibelle(f.vendeurNom, f.id, journal)}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <IconButton
                      label="Visionner"
                      onClick={() => onVisionner(f.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </IconButton>
                    <ExportDocumentPdfButton label={`Imprimer ${f.numero}`}>
                      <FactureExportInline facture={f} tiers={tiers} />
                    </ExportDocumentPdfButton>
                    <EnvoiDocumentBouton
                      filename={f.numero}
                      typeDocument="facture"
                      numero={f.numero}
                      entiteId={f.id}
                      client={clientDepuisTiers(tiers)}
                      onEnvoye={() => onEnvoye(f)}
                    >
                      <FactureExportInline facture={f} tiers={tiers} />
                    </EnvoiDocumentBouton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableAchats({
  lignes,
  tiers,
  journal,
  onVisionner,
  onMail,
}: {
  lignes: Achat[];
  tiers: Tiers;
  journal: ReturnType<typeof useStore.getState>["journalActivites"];
  onVisionner: (id: string) => void;
  onMail: (a: Achat) => void;
}) {
  const produits = useStore((s) => s.produits);
  if (lignes.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Aucune facture fournisseur"
        description="Les factures d'achat établies avec ce tiers apparaîtront ici."
      />
    );
  }
  return (
    <div className="table-shell">
      <table className="data">
        <thead>
          <tr>
            <th>N° facture</th>
            <th>N° client</th>
            <th>Nom du client</th>
            <th>Date</th>
            <th>Montant HT</th>
            <th>Montant TVA</th>
            <th>Montant TTC</th>
            <th>Vendeur</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((a) => {
            const t = totauxAchat(a);
            return (
              <tr key={a.id}>
                <td className="font-medium">
                  <Link href={`/achats?id=${a.id}`} className="hover:underline">
                    {a.numeroFactureFournisseur?.trim() || a.numero}
                  </Link>
                </td>
                <td className="font-mono text-xs">{tiers.code || "—"}</td>
                <td>{tiers.nom}</td>
                <td>{formatDate(a.date)}</td>
                <td>{formatCurrency(t.ht)}</td>
                <td>{formatCurrency(t.tva)}</td>
                <td className="font-semibold">{formatCurrency(t.ttc)}</td>
                <td>{vendeurLibelle(a.vendeurNom, a.id, journal)}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <IconButton
                      label="Visionner"
                      onClick={() => onVisionner(a.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </IconButton>
                    <ExportDocumentPdfButton label={`Imprimer ${a.numero}`}>
                      <AchatFeuille achat={a} tiers={tiers} produits={produits} />
                    </ExportDocumentPdfButton>
                    <IconButton label="Envoyer par mail" onClick={() => onMail(a)}>
                      <Mail className="h-4 w-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FactureExportInline({
  facture,
  tiers,
}: {
  facture: Facture;
  tiers: Tiers;
}) {
  const { parametres, acomptes, pointsDeVente, devis, commandes, factures } =
    useStore();
  const modele = useModelePourType("facture");
  const pres = presentationPourFacture(facture, parametres, modele);
  return (
    <DocumentPreview
      type="facture"
      factureType={facture.type}
      estProforma={facture.type === "proforma" || facture.statut === "proforma"}
      numero={facture.numero}
      date={facture.date}
      echeance={facture.echeance}
      client={clientDepuisTiers(tiers)}
      pdv={pointsDeVente.find((p) => p.id === facture.pointDeVenteId)}
      parametres={pres.parametres}
      modele={pres.modele}
      lignes={facture.lignes}
      totaux={totauxFacture(facture, parametres, acomptes)}
      conditionsPaiement={facture.conditionsPaiement}
      note={facture.note}
      vendeur={facture.vendeurNom}
      referenceFacture={
        facture.factureParenteId
          ? factures.find((x) => x.id === facture.factureParenteId)?.numero
          : undefined
      }
      referenceDevis={devis.find((d) => d.id === facture.devisId)?.numero}
      referenceCommande={
        commandes.find((c) => c.id === facture.commandeId)?.numero
      }
      acomptesDetail={detailAcomptesDocument(facture, acomptes)}
    />
  );
}

function AchatFeuille({
  achat,
  tiers,
  produits,
}: {
  achat: Achat;
  tiers: Tiers;
  produits: { id: string; libelleCourt: string; libelleLong: string }[];
}) {
  const t = totauxAchat(achat);
  return (
    <div className="rounded-[var(--radius)] border border-line bg-card p-6 text-sm">
      <p className="font-display text-lg font-semibold">
        Facture d&apos;achat {achat.numero}
      </p>
      <p className="mt-1 text-muted">
        {tiers.nom}
        {tiers.nif ? ` · NIF ${tiers.nif}` : ""}
        {tiers.stat ? ` · STAT ${tiers.stat}` : ""}
      </p>
      <p className="text-muted">Date {formatDate(achat.date)}</p>
      <table className="data mt-4">
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Qté</th>
            <th>PU HT</th>
            <th>Montant HT</th>
          </tr>
        </thead>
        <tbody>
          {achat.lignes.map((l) => {
            const p = l.produitId
              ? produits.find((x) => x.id === l.produitId)
              : undefined;
            return (
              <tr key={l.id}>
                <td>
                  {l.designation ||
                    (p ? libelleProduit(p) : "Ligne")}
                </td>
                <td>{l.quantite}</td>
                <td>{formatCurrency(l.prixAchatUnitaire)}</td>
                <td>{formatCurrency(l.quantite * l.prixAchatUnitaire)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-4 text-right">
        HT {formatCurrency(t.ht)} · TVA {formatCurrency(t.tva)} ·{" "}
        <strong>TTC {formatCurrency(t.ttc)}</strong>
      </p>
    </div>
  );
}
