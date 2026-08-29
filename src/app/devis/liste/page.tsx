"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AcompteEncaissementFields,
  SAISIE_ACOMPTE_VIDE,
} from "@/components/acompte-encaissement-fields";
import {
  DocumentSaisieWizard,
  lignesToDraft,
  type DraftLigne,
} from "@/components/document-saisie-wizard";
import { DocumentPreview } from "@/components/document-preview";
import { DocumentPrintActions } from "@/components/document-print-actions";
import { DevisSubnav } from "@/components/commercial-doc-subnav";
import {
  ExportDocumentPdfButton,
} from "@/components/export-documents-pdf";
import { DocumentFiliation } from "@/components/document-filiation";
import { TransformationValidationModal } from "@/components/transformation-validation";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import {
  DEVIS_STATUTS,
  appliqueTVA,
  acomptesPourDocument,
  libelleClient,
  lignesAcomptesPourDocument,
  nextNumero,
  totauxDevis,
  totauxCommande,
  persisterRemiseGlobale,
} from "@/lib/commercial";
import { filterByPos } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";
import {
  clonerLignesDocument,
  devisEstEnCours,
  devisPeutEtreTransforme,
  documentEstVerrouille,
  raisonDocumentNonModifiable,
  verrouTransformationActif,
} from "@/lib/transformation-document";
import { useModelePourType } from "@/lib/use-modele";
import type { Commande, DevisStatut, ModeRemise } from "@/lib/types";

type Filtre = "tous" | "en_cours" | DevisStatut;

const FILTRES: { id: Filtre; label: string }[] = [
  { id: "en_cours", label: "Devis en cours" },
  { id: "transforme", label: "Devis transformés" },
  { id: "tous", label: "Tous" },
  { id: "brouillon", label: "Brouillons" },
  { id: "envoye", label: "Envoyés" },
  { id: "accepte", label: "Acceptés" },
  { id: "refuse", label: "Refusés" },
  { id: "expire", label: "Expirés" },
];

function filtreDepuisQuery(statut: string | null): Filtre {
  if (statut && FILTRES.some((f) => f.id === statut)) {
    return statut as Filtre;
  }
  return "en_cours";
}

export default function ListeDevisPage() {
  const searchParams = useSearchParams();
  const {
    devis,
    clients,
    produits,
    categoriesProduits,
    pointsDeVente,
    parametres,
    commandes,
    tarifsClients,
    entrees,
    ventes,
    acomptes,
    pointDeVenteActifId,
    updateDevis,
    deleteDevis,
    addCommande,
    updateAcompte,
    encaisserAcompte,
    verrouillerTransformation,
    annulerTransformation,
    libererVerrousExpires,
    finaliserTransformation,
  } = useStore();

  const [filtre, setFiltre] = useState<Filtre>(() =>
    filtreDepuisQuery(searchParams.get("statut")),
  );

  useEffect(() => {
    setFiltre(filtreDepuisQuery(searchParams.get("statut")));
  }, [searchParams]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewSheetRef = useRef<HTMLDivElement>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [seed, setSeed] = useState<{
    lignes: DraftLigne[];
    remiseGlobale: number;
    remiseGlobaleMode: ModeRemise;
    note: string;
  }>({ lignes: [], remiseGlobale: 0, remiseGlobaleMode: "montant", note: "" });
  const [meta, setMeta] = useState({
    clientId: "",
    pointDeVenteId: "",
    date: new Date().toISOString().slice(0, 10),
    validiteJours: "15",
  });
  const [acompte, setAcompte] = useState(SAISIE_ACOMPTE_VIDE);
  const [pendingDevisId, setPendingDevisId] = useState<string | null>(null);

  useEffect(() => {
    libererVerrousExpires();
  }, [libererVerrousExpires]);

  const { visible, colSpan } = useAffichageTable("devis");
  const modele = useModelePourType("devis");
  const modeleCommande = useModelePourType("commande");
  const assujettiTVA = appliqueTVA(parametres);
  const editDoc = devis.find((d) => d.id === editId);
  const preview = devis.find((d) => d.id === previewId);

  const lignes = useMemo(() => {
    return [...filterByPos(devis, pointDeVenteActifId)]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((d) => {
        if (filtre === "tous") return true;
        if (filtre === "en_cours") return devisEstEnCours(d.statut);
        return d.statut === filtre;
      })
      .map((d) => ({
        d,
        t: totauxDevis(d, parametres, acomptes),
        client: clients.find((c) => c.id === d.clientId),
        pdv: pointsDeVente.find((p) => p.id === d.pointDeVenteId),
      }));
  }, [devis, filtre, parametres, acomptes, clients, pointsDeVente, pointDeVenteActifId]);

  const lignesExport = useMemo(
    () =>
      lignes.map(({ d, t, client, pdv }) => ({
        numero: d.numero,
        date: formatDate(d.date),
        client: client?.nom ?? "",
        pdv: pdv?.nom ?? "",
        montant: formatCurrency(t.totalTTC),
        acomptes: formatCurrency(t.acomptesTTC),
        statut: DEVIS_STATUTS[d.statut] ?? d.statut,
      })),
    [lignes],
  );

  const resume = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of filterByPos(devis, pointDeVenteActifId)) {
      counts[d.statut] = (counts[d.statut] ?? 0) + 1;
    }
    return counts;
  }, [devis, pointDeVenteActifId]);

  function ouvrirEdition(id: string) {
    const d = useStore.getState().devis.find((x) => x.id === id);
    if (!d) return;
    const bloque = raisonDocumentNonModifiable(d);
    if (bloque) {
      alert(bloque);
      return;
    }
    setEditId(id);
    setPreviewId(null);
    setMeta({
      clientId: d.clientId,
      pointDeVenteId: d.pointDeVenteId,
      date: d.date.slice(0, 10),
      validiteJours: String(d.validiteJours ?? 15),
    });
    setSeed({
      lignes: lignesToDraft(d.lignes),
      remiseGlobale: d.remiseGlobale ?? 0,
      remiseGlobaleMode: d.remiseGlobaleMode ?? "montant",
      note: d.note ?? "",
    });
    setAcompte(SAISIE_ACOMPTE_VIDE);
    setWizardKey((k) => k + 1);
  }

  function demanderConversionCommande(devisId: string) {
    const d = devis.find((x) => x.id === devisId);
    if (!d) return;
    if (!devisPeutEtreTransforme(d) && d.statut !== "en_transformation") {
      alert("Ce devis ne peut plus être transformé.");
      return;
    }
    const res = verrouillerTransformation("devis", devisId, "commande");
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    setPreviewId(null);
    setEditId(null);
    setPendingDevisId(devisId);
  }

  function fermerValidation(opts?: { edition?: boolean }) {
    if (pendingDevisId) annulerTransformation("devis", pendingDevisId);
    const id = pendingDevisId;
    setPendingDevisId(null);
    if (opts?.edition && id) ouvrirEdition(id);
  }

  function confirmerConversionCommande() {
    const d = useStore.getState().devis.find((x) => x.id === pendingDevisId);
    if (!d || !verrouTransformationActif(d.verrouTransformation)) {
      libererVerrousExpires();
      setPendingDevisId(null);
      alert(
        "Le délai de validation (10 min) est dépassé. Le devis a été déverrouillé.",
      );
      return;
    }
    const numero = nextNumero(
      "CMD",
      commandes.map((c) => c.numero),
    );
    const commandeId = addCommande({
      numero,
      clientId: d.clientId,
      pointDeVenteId: d.pointDeVenteId,
      date: new Date().toISOString(),
      statut: "confirmee",
      devisId: d.id,
      tauxTVA: d.tauxTVA ?? parametres.tauxTVA,
      conditionsPaiement:
        d.conditionsPaiement || parametres.conditionsPaiementDefaut,
      lignes: clonerLignesDocument(d.lignes, "cl"),
      remiseGlobale: d.remiseGlobale,
      remiseGlobaleMode: d.remiseGlobaleMode,
      note: d.note,
    });
    const fin = finaliserTransformation({
      sourceType: "devis",
      sourceId: d.id,
      cibleType: "commande",
      cibleId: commandeId,
      cibleNumero: numero,
      statutSource: "transforme",
    });
    if (!fin.ok) {
      alert(fin.reason);
      return;
    }
    for (const a of acomptesPourDocument(acomptes, { devisId: d.id })) {
      if (!a.commandeId) updateAcompte(a.id, { commandeId });
    }
    setPendingDevisId(null);
  }

  const pendingDevis = devis.find((d) => d.id === pendingDevisId);
  const commandeProvisoire: Commande | null = pendingDevis
    ? {
        id: "preview",
        numero: nextNumero(
          "CMD",
          commandes.map((c) => c.numero),
        ),
        clientId: pendingDevis.clientId,
        pointDeVenteId: pendingDevis.pointDeVenteId,
        date: new Date().toISOString(),
        statut: "confirmee",
        devisId: pendingDevis.id,
        tauxTVA: pendingDevis.tauxTVA ?? parametres.tauxTVA,
        conditionsPaiement:
          pendingDevis.conditionsPaiement ||
          parametres.conditionsPaiementDefaut,
        lignes: pendingDevis.lignes,
        remiseGlobale: pendingDevis.remiseGlobale,
        remiseGlobaleMode: pendingDevis.remiseGlobaleMode,
        note: pendingDevis.note,
      }
    : null;

  const echeanceProvisoire = (() => {
    const d = new Date(`${meta.date}T12:00:00`);
    d.setDate(d.getDate() + (Number(meta.validiteJours) || 15));
    return d.toISOString();
  })();

  const acomptesLiesEdition = acomptesPourDocument(acomptes, {
    devisId: editId ?? undefined,
  });
  const acompteMontantEdition = Math.max(0, Number(acompte.montant) || 0);
  const acomptesTTCEdition =
    acomptesLiesEdition.reduce((s, a) => s + a.montantTTC, 0) +
    acompteMontantEdition;
  const acomptesDetailEdition = [
    ...lignesAcomptesPourDocument(acomptes, { devisId: editId ?? undefined }),
    ...(acompteMontantEdition > 0
      ? [
          {
            numero: "Acompte à l'émission",
            date: new Date(`${meta.date}T12:00:00`).toISOString(),
            montant: acompteMontantEdition,
            mode: acompte.modePaiement,
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Liste des devis"
        description="Consultez, filtrez et modifiez les devis. Toute transformation vers une commande passe par une validation."
        actions={
          <Link href="/devis" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Link>
        }
      />

      <DevisSubnav />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ["en_cours", "En cours"],
            ["transforme", "Transformés"],
            ["accepte", "Acceptés"],
            ["refuse", "Refusés"],
            ["expire", "Expirés"],
          ] as const
        ).map(([id, label]) => (
          <div
            key={id}
            className="rounded-[var(--radius)] border border-line bg-card px-4 py-3"
          >
            <p className="text-[11px] text-muted">{label}</p>
            <p className="font-display text-lg font-semibold">
              {id === "en_cours"
                ? filterByPos(devis, pointDeVenteActifId).filter((d) =>
                    devisEstEnCours(d.statut),
                  ).length
                : (resume[id] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
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

      {editId && editDoc && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <DocumentSaisieWizard
            key={wizardKey}
            titre={`Modifier ${editDoc.numero}`}
            produits={produits}
            categoriesProduits={categoriesProduits}
            clientId={meta.clientId}
            tarifsClients={tarifsClients}
            pointDeVenteId={meta.pointDeVenteId}
            entrees={entrees}
            ventes={ventes}
            tauxTVA={parametres.tauxTVA}
            assujettiTVA={assujettiTVA}
            initialLignes={seed.lignes}
            initialRemiseGlobale={seed.remiseGlobale}
            initialRemiseGlobaleMode={seed.remiseGlobaleMode}
            initialNote={seed.note}
            showAcomptes={acomptesTTCEdition > 0}
            acomptesTTC={acomptesTTCEdition}
            acomptesDetail={acomptesDetailEdition}
            previewMeta={{
              type: "devis",
              numero: editDoc.numero,
              date: new Date(`${meta.date}T12:00:00`).toISOString(),
              echeance: echeanceProvisoire,
              client: clients.find((c) => c.id === meta.clientId),
              pdv: pointsDeVente.find((p) => p.id === meta.pointDeVenteId),
              parametres,
              modele,
              conditionsPaiement:
                editDoc.conditionsPaiement ||
                parametres.conditionsPaiementDefaut,
            }}
            confirmLabel="Enregistrer les modifications"
            onCancel={() => setEditId(null)}
            onConfirm={({ lignes, remiseGlobale, remiseGlobaleMode, note }) => {
              if (!meta.clientId || !editId) return;
              updateDevis(editId, {
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: new Date(`${meta.date}T12:00:00`).toISOString(),
                validiteJours: Number(meta.validiteJours) || 15,
                lignes,
                ...persisterRemiseGlobale(remiseGlobale, remiseGlobaleMode),
                note,
              });
              if (acompteMontantEdition > 0) {
                const res = encaisserAcompte({
                  clientId: meta.clientId,
                  pointDeVenteId: meta.pointDeVenteId,
                  date: new Date(`${meta.date}T12:00:00`).toISOString(),
                  montantTTC: acompteMontantEdition,
                  modePaiement: acompte.modePaiement,
                  devisId: editId,
                  refDocument: editDoc.numero,
                  genererFactureAcompte: acompte.genererFacture,
                });
                if (!res.ok) alert(res.reason);
              }
              setEditId(null);
            }}
            headerFields={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-xs font-semibold text-muted">
                  Client
                  <select
                    className="select mt-1"
                    value={meta.clientId}
                    onChange={(e) =>
                      setMeta({ ...meta, clientId: e.target.value })
                    }
                    required
                  >
                    {clients
                      .filter((c) => c.actif)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {libelleClient(c)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Point de vente
                  <select
                    className="select mt-1"
                    value={meta.pointDeVenteId}
                    onChange={(e) =>
                      setMeta({ ...meta, pointDeVenteId: e.target.value })
                    }
                  >
                    {pointsDeVente.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Date
                  <input
                    type="date"
                    className="input mt-1"
                    value={meta.date}
                    onChange={(e) =>
                      setMeta({ ...meta, date: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Validité (jours)
                  <input
                    type="number"
                    min="1"
                    className="input mt-1"
                    value={meta.validiteJours}
                    onChange={(e) =>
                      setMeta({ ...meta, validiteJours: e.target.value })
                    }
                  />
                </label>
              </div>
            }
            footerFields={
              <AcompteEncaissementFields
                value={acompte}
                onChange={setAcompte}
                acomptesExistants={acomptesLiesEdition}
                montantLabel={
                  acomptesLiesEdition.length > 0
                    ? "Acompte complémentaire (Ar TTC)"
                    : "Acompte encaissé (Ar TTC)"
                }
              />
            }
          />
        </div>
      )}

      <TableAffichageBarre
        tableId="devis"
        lignes={lignesExport}
        fichier="devis"
        titre="Liste des devis"
      />

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <ThCol id="numero" show={visible}>N°</ThCol>
              <ThCol id="date" show={visible}>Date</ThCol>
              <ThCol id="client" show={visible}>Client</ThCol>
              <ThCol id="pdv" show={visible}>PDV</ThCol>
              <ThCol id="montant" show={visible}>Montant</ThCol>
              <ThCol id="acomptes" show={visible}>Acomptes</ThCol>
              <ThCol id="statut" show={visible}>Statut</ThCol>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={colSpan()} className="text-muted">
                  Aucun devis pour ce filtre.
                </td>
              </tr>
            ) : (
              lignes.map(({ d, t, client, pdv }) => (
                <tr key={d.id}>
                  <TdCol id="numero" show={visible} className="font-medium">{d.numero}</TdCol>
                  <TdCol id="date" show={visible}>{formatDate(d.date)}</TdCol>
                  <TdCol id="client" show={visible}>{client?.nom ?? "—"}</TdCol>
                  <TdCol id="pdv" show={visible}>{pdv?.nom ?? "—"}</TdCol>
                  <TdCol id="montant" show={visible} className="font-semibold">
                    {formatCurrency(t.totalTTC)}
                  </TdCol>
                  <TdCol id="acomptes" show={visible}>{formatCurrency(t.acomptesTTC)}</TdCol>
                  <TdCol id="statut" show={visible}>
                    <select
                      className="select max-w-[160px]"
                      value={d.statut}
                      disabled={documentEstVerrouille(d)}
                      onChange={(e) =>
                        updateDevis(d.id, {
                          statut: e.target.value as DevisStatut,
                        })
                      }
                    >
                      {Object.entries(DEVIS_STATUTS).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </TdCol>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <IconButton
                        label="Aperçu"
                        onClick={() => setPreviewId(d.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </IconButton>
                      <ExportDocumentPdfButton label={`Exporter PDF ${d.numero}`}>
                        <DocumentPreview
                          type="devis"
                          numero={d.numero}
                          date={d.date}
                          client={clients.find((c) => c.id === d.clientId)}
                          pdv={pointsDeVente.find(
                            (p) => p.id === d.pointDeVenteId,
                          )}
                          parametres={parametres}
                          modele={modele}
                          lignes={d.lignes}
                          totaux={totauxDevis(d, parametres, acomptes)}
                          conditionsPaiement={d.conditionsPaiement}
                          note={d.note}
                          acomptesDetail={lignesAcomptesPourDocument(acomptes, {
                            devisId: d.id,
                          })}
                        />
                      </ExportDocumentPdfButton>
                      <IconButton
                        label="Modifier"
                        onClick={() => ouvrirEdition(d.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      {d.statut !== "transforme" &&
                        d.statut !== "refuse" &&
                        d.statut !== "expire" && (
                        <button
                          className="btn btn-secondary"
                          disabled={documentEstVerrouille(d)}
                          onClick={() => demanderConversionCommande(d.id)}
                        >
                          → Commande
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          if (confirm(`Supprimer ${d.numero} ?`)) {
                            deleteDevis(d.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
          <div className="my-6 w-full max-w-[220mm]">
            <div className="mb-3 flex justify-end gap-2">
              <DocumentPrintActions
                sheetRef={previewSheetRef}
                filename={`Devis ${preview.numero}`}
              />
              <button
                className="btn btn-secondary"
                onClick={() => setPreviewId(null)}
              >
                Fermer
              </button>
            </div>
            <DocumentPreview
              ref={previewSheetRef}
              type="devis"
              numero={preview.numero}
              date={preview.date}
              client={clients.find((c) => c.id === preview.clientId)}
              pdv={pointsDeVente.find((p) => p.id === preview.pointDeVenteId)}
              parametres={parametres}
              modele={modele}
              lignes={preview.lignes}
              totaux={totauxDevis(preview, parametres, acomptes)}
              conditionsPaiement={preview.conditionsPaiement}
              note={preview.note}
              acomptesDetail={lignesAcomptesPourDocument(acomptes, {
                devisId: preview.id,
              })}
            />
            <DocumentFiliation documentId={preview.id} />
          </div>
        </div>
      )}

      {pendingDevis && commandeProvisoire && (
        <TransformationValidationModal
          open
          titre={`Transformer ${pendingDevis.numero} en commande`}
          sourceNumero={pendingDevis.numero}
          cible="commande"
          verrou={pendingDevis.verrouTransformation}
          onConfirmer={confirmerConversionCommande}
          onAnnuler={() => fermerValidation()}
          onRetourEdition={() => fermerValidation({ edition: true })}
          onExpire={() => {
            libererVerrousExpires();
            setPendingDevisId(null);
            alert(
              "Délai de validation dépassé (10 min). Le devis a été déverrouillé.",
            );
          }}
        >
          <DocumentPreview
            type="commande"
            numero={commandeProvisoire.numero}
            date={commandeProvisoire.date}
            client={clients.find((c) => c.id === pendingDevis.clientId)}
            pdv={pointsDeVente.find(
              (p) => p.id === pendingDevis.pointDeVenteId,
            )}
            parametres={parametres}
            modele={modeleCommande}
            lignes={pendingDevis.lignes}
            totaux={totauxCommande(commandeProvisoire, parametres, acomptes)}
            conditionsPaiement={commandeProvisoire.conditionsPaiement}
            note={pendingDevis.note}
            referenceDevis={pendingDevis.numero}
            acomptesDetail={lignesAcomptesPourDocument(acomptes, {
              devisId: pendingDevis.id,
            })}
          />
          <DocumentFiliation documentId={pendingDevis.id} />
        </TransformationValidationModal>
      )}
    </div>
  );
}
