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
import { CommandesSubnav } from "@/components/commercial-doc-subnav";
import {
  ExportDocumentPdfButton,
} from "@/components/export-documents-pdf";
import {
  BadgesAvancementCommande,
  DocumentFiliation,
} from "@/components/document-filiation";
import { TransformationValidationModal } from "@/components/transformation-validation";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import {
  COMMANDE_STATUTS,
  appliqueTVA,
  acomptesPourDocument,
  creerSnapshotAcomptesDocument,
  libelleClient,
  lignesAcomptesPourDocument,
  nextNumero,
  totauxCommande,
  persisterRemiseGlobale,
} from "@/lib/commercial";
import { filterByPos } from "@/lib/calculations";
import { nextNumeroDocumentCommercial } from "@/lib/facturation-mg";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";
import {
  avancementLivraisonCommande,
  clonerLignesDocument,
  documentEstVerrouille,
  LABEL_AVANCEMENT_LIVRAISON,
  raisonDocumentNonModifiable,
  statutCommandeSelonLivraison,
  verrouTransformationActif,
} from "@/lib/transformation-document";
import { useModelePourType } from "@/lib/use-modele";
import type { CommandeStatut, ModeRemise } from "@/lib/types";

type Filtre = "tous" | CommandeStatut;

const FILTRES: { id: Filtre; label: string }[] = [
  { id: "tous", label: "Toutes" },
  { id: "brouillon", label: "Brouillons" },
  { id: "confirmee", label: "Confirmées" },
  { id: "en_cours", label: "En cours" },
  { id: "livree", label: "Livrées" },
  { id: "annulee", label: "Annulées" },
];

function filtreDepuisQuery(statut: string | null): Filtre {
  if (statut && FILTRES.some((f) => f.id === statut)) {
    return statut as Filtre;
  }
  return "tous";
}

export default function ListeCommandesPage() {
  const searchParams = useSearchParams();
  const {
    commandes,
    devis,
    clients,
    produits,
    pointsDeVente,
    parametres,
    acomptes,
    pointDeVenteActifId,
    updateCommande,
    deleteCommande,
    addBonDeLivraison,
    bonsDeLivraison,
    addFacture,
    factures,
    tarifsClients,
    categoriesProduits,
    entrees,
    ventes,
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
    devisId: "",
    date: new Date().toISOString().slice(0, 10),
    dateLivraisonPrevue: "",
  });
  const [acompte, setAcompte] = useState(SAISIE_ACOMPTE_VIDE);
  const [pending, setPending] = useState<{
    commandeId: string;
    cible: "bon_de_livraison" | "facture";
  } | null>(null);

  useEffect(() => {
    libererVerrousExpires();
  }, [libererVerrousExpires]);

  const { visible, colSpan } = useAffichageTable("commandes");
  const modele = useModelePourType("commande");
  const modeleBl = useModelePourType("bon_de_livraison");
  const modeleFacture = useModelePourType("facture");
  const assujettiTVA = appliqueTVA(parametres);
  const editDoc = commandes.find((c) => c.id === editId);
  const preview = commandes.find((c) => c.id === previewId);

  const lignes = useMemo(() => {
    return [...filterByPos(commandes, pointDeVenteActifId)]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((c) => (filtre === "tous" ? true : c.statut === filtre))
      .map((c) => ({
        c,
        t: totauxCommande(c, parametres, acomptes),
        client: clients.find((x) => x.id === c.clientId),
      }));
  }, [commandes, filtre, parametres, acomptes, clients, pointDeVenteActifId]);

  const lignesExport = useMemo(
    () =>
      lignes.map(({ c, t, client }) => ({
        numero: c.numero,
        date: formatDate(c.date),
        client: client?.nom ?? "",
        totalTTC: formatCurrency(t.totalTTC),
        acomptes: formatCurrency(t.acomptesTTC),
        avancement:
          LABEL_AVANCEMENT_LIVRAISON[
            avancementLivraisonCommande(c, bonsDeLivraison)
          ],
        statut: COMMANDE_STATUTS[c.statut] ?? c.statut,
      })),
    [lignes, bonsDeLivraison],
  );

  const resume = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filterByPos(commandes, pointDeVenteActifId)) {
      counts[c.statut] = (counts[c.statut] ?? 0) + 1;
    }
    return counts;
  }, [commandes, pointDeVenteActifId]);

  function ouvrirEdition(id: string) {
    const c = useStore.getState().commandes.find((x) => x.id === id);
    if (!c) return;
    const bloque = raisonDocumentNonModifiable(c);
    if (bloque) {
      alert(bloque);
      return;
    }
    setEditId(id);
    setPreviewId(null);
    setMeta({
      clientId: c.clientId,
      pointDeVenteId: c.pointDeVenteId,
      devisId: c.devisId ?? "",
      date: c.date.slice(0, 10),
      dateLivraisonPrevue: c.dateLivraisonPrevue
        ? c.dateLivraisonPrevue.slice(0, 10)
        : "",
    });
    setSeed({
      lignes: lignesToDraft(c.lignes),
      remiseGlobale: c.remiseGlobale ?? 0,
      remiseGlobaleMode: c.remiseGlobaleMode ?? "montant",
      note: c.note ?? "",
    });
    setAcompte(SAISIE_ACOMPTE_VIDE);
    setWizardKey((k) => k + 1);
  }

  function demanderTransformation(
    commandeId: string,
    cible: "bon_de_livraison" | "facture",
  ) {
    const c = commandes.find((x) => x.id === commandeId);
    if (!c || c.statut === "annulee") return;
    const res = verrouillerTransformation("commande", commandeId, cible);
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    setPreviewId(null);
    setEditId(null);
    setPending({ commandeId, cible });
  }

  function fermerValidation(opts?: { edition?: boolean }) {
    if (pending) annulerTransformation("commande", pending.commandeId);
    const id = pending?.commandeId;
    setPending(null);
    if (opts?.edition && id) ouvrirEdition(id);
  }

  function confirmerBonDeLivraison() {
    const c = useStore.getState().commandes.find((x) => x.id === pending?.commandeId);
    if (!c || !verrouTransformationActif(c.verrouTransformation)) {
      libererVerrousExpires();
      setPending(null);
      alert(
        "Le délai de validation (10 min) est dépassé. La commande a été déverrouillée.",
      );
      return;
    }
    const numero = nextNumero(
      "BL",
      bonsDeLivraison.map((b) => b.numero),
    );
    const blId = addBonDeLivraison({
      numero,
      clientId: c.clientId,
      pointDeVenteId: c.pointDeVenteId,
      date: new Date().toISOString(),
      dateLivraison: c.dateLivraisonPrevue ?? new Date().toISOString(),
      statut: "prepare",
      commandeId: c.id,
      devisId: c.devisId,
      tauxTVA: c.tauxTVA,
      conditionsPaiement: c.conditionsPaiement,
      lignes: clonerLignesDocument(c.lignes, "bl"),
      remiseGlobale: c.remiseGlobale,
      remiseGlobaleMode: c.remiseGlobaleMode,
      note: c.note,
    });
    const avancement = avancementLivraisonCommande(
      c,
      useStore.getState().bonsDeLivraison,
    );
    const fin = finaliserTransformation({
      sourceType: "commande",
      sourceId: c.id,
      cibleType: "bon_de_livraison",
      cibleId: blId,
      cibleNumero: numero,
      statutSource: statutCommandeSelonLivraison(avancement),
    });
    if (!fin.ok) {
      alert(fin.reason);
      return;
    }
    setPending(null);
  }

  function confirmerFacture() {
    const c = useStore.getState().commandes.find((x) => x.id === pending?.commandeId);
    if (!c || !verrouTransformationActif(c.verrouTransformation)) {
      libererVerrousExpires();
      setPending(null);
      alert(
        "Le délai de validation (10 min) est dépassé. La commande a été déverrouillée.",
      );
      return;
    }
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 30);
    const t = totauxCommande(c, parametres, acomptes);
    const acomptesLies = acomptesPourDocument(acomptes, {
      commandeId: c.id,
      devisId: c.devisId,
    });
    const acomptesDoc = creerSnapshotAcomptesDocument(
      lignesAcomptesPourDocument(acomptes, {
        commandeId: c.id,
        devisId: c.devisId,
      }),
    );
    const numero = nextNumeroDocumentCommercial({
      prefix: "FAC",
      pointDeVenteId: c.pointDeVenteId,
      pointsDeVente,
      existing: factures.map((f) => f.numero),
    });
    const factureId = addFacture({
      numero,
      type: t.acomptesTTC > 0 ? "solde" : "standard",
      clientId: c.clientId,
      pointDeVenteId: c.pointDeVenteId,
      date: new Date().toISOString(),
      echeance: echeance.toISOString(),
      statut:
        t.acomptesTTC >= t.totalTTC - 1
          ? "payee"
          : t.acomptesTTC > 0
            ? "partiellement_payee"
            : "validee",
      montantPaye: t.acomptesTTC,
      devisId: c.devisId,
      commandeId: c.id,
      tauxTVA: c.tauxTVA,
      conditionsPaiement: c.conditionsPaiement,
      dateValidation: new Date().toISOString(),
      acomptesDocument: acomptesDoc,
      lignes: clonerLignesDocument(c.lignes, "fl"),
      remiseGlobale: c.remiseGlobale,
      remiseGlobaleMode: c.remiseGlobaleMode,
      note: c.note,
    });
    const fin = finaliserTransformation({
      sourceType: "commande",
      sourceId: c.id,
      cibleType: "facture",
      cibleId: factureId,
      cibleNumero: numero,
      statutSource: c.verrouTransformation?.statutPrecedent ?? "en_cours",
    });
    if (!fin.ok) {
      alert(fin.reason);
      return;
    }
    for (const a of acomptesLies) {
      updateAcompte(a.id, {
        commandeId: a.commandeId || c.id,
        factureId,
        statut: "impute",
      });
    }
    setPending(null);
  }

  const pendingCmd = commandes.find((c) => c.id === pending?.commandeId);
  const numeroBlProvisoire = nextNumero(
    "BL",
    bonsDeLivraison.map((b) => b.numero),
  );
  const numeroFacProvisoire = nextNumeroDocumentCommercial({
    prefix: "FAC",
    pointDeVenteId: pendingCmd?.pointDeVenteId ?? pointsDeVente[0]?.id ?? "",
    pointsDeVente,
    existing: factures.map((f) => f.numero),
  });

  return (
    <div>
      <PageHeader
        title="Liste des commandes"
        description="Consultez, filtrez et modifiez les commandes. Toute transformation vers un BL ou une facture passe par une validation."
        actions={
          <Link href="/commandes" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Nouvelle commande
          </Link>
        }
      />

      <CommandesSubnav />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ["brouillon", "Brouillons"],
            ["confirmee", "Confirmées"],
            ["en_cours", "En cours"],
            ["livree", "Livrées"],
            ["annulee", "Annulées"],
          ] as const
        ).map(([id, label]) => (
          <div
            key={id}
            className="rounded-[var(--radius)] border border-line bg-card px-4 py-3"
          >
            <p className="text-[11px] text-muted">{label}</p>
            <p className="font-display text-lg font-semibold">
              {resume[id] ?? 0}
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
            showAcomptes={
              acomptesPourDocument(acomptes, {
                commandeId: editId ?? undefined,
                devisId: meta.devisId || undefined,
              }).reduce((s, a) => s + a.montantTTC, 0) +
                Math.max(0, Number(acompte.montant) || 0) >
              0
            }
            acomptesTTC={
              acomptesPourDocument(acomptes, {
                commandeId: editId ?? undefined,
                devisId: meta.devisId || undefined,
              }).reduce((s, a) => s + a.montantTTC, 0) +
              Math.max(0, Number(acompte.montant) || 0)
            }
            acomptesDetail={[
              ...lignesAcomptesPourDocument(acomptes, {
                commandeId: editId ?? undefined,
                devisId: meta.devisId || undefined,
              }),
              ...(Math.max(0, Number(acompte.montant) || 0) > 0
                ? [
                    {
                      numero: "Acompte à l'émission",
                      date: new Date(`${meta.date}T12:00:00`).toISOString(),
                      montant: Math.max(0, Number(acompte.montant) || 0),
                      mode: acompte.modePaiement,
                    },
                  ]
                : []),
            ]}
            previewMeta={{
              type: "commande",
              numero: editDoc.numero,
              date: new Date(`${meta.date}T12:00:00`).toISOString(),
              echeance: meta.dateLivraisonPrevue
                ? new Date(
                    `${meta.dateLivraisonPrevue}T12:00:00`,
                  ).toISOString()
                : undefined,
              client: clients.find((c) => c.id === meta.clientId),
              pdv: pointsDeVente.find((p) => p.id === meta.pointDeVenteId),
              parametres,
              modele,
              conditionsPaiement:
                editDoc.conditionsPaiement ||
                parametres.conditionsPaiementDefaut,
              referenceDevis: devis.find((d) => d.id === meta.devisId)?.numero,
            }}
            confirmLabel="Enregistrer les modifications"
            onCancel={() => setEditId(null)}
            onConfirm={({ lignes, remiseGlobale, remiseGlobaleMode, note }) => {
              if (!meta.clientId || !editId) return;
              updateCommande(editId, {
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: new Date(`${meta.date}T12:00:00`).toISOString(),
                dateLivraisonPrevue: meta.dateLivraisonPrevue
                  ? new Date(
                      `${meta.dateLivraisonPrevue}T12:00:00`,
                    ).toISOString()
                  : undefined,
                devisId: meta.devisId || undefined,
                lignes,
                ...persisterRemiseGlobale(remiseGlobale, remiseGlobaleMode),
                note,
              });
              const montant = Math.max(0, Number(acompte.montant) || 0);
              if (montant > 0) {
                const res = encaisserAcompte({
                  clientId: meta.clientId,
                  pointDeVenteId: meta.pointDeVenteId,
                  date: new Date(`${meta.date}T12:00:00`).toISOString(),
                  montantTTC: montant,
                  modePaiement: acompte.modePaiement,
                  devisId: meta.devisId || undefined,
                  commandeId: editId,
                  refDocument: editDoc.numero,
                  genererFactureAcompte: acompte.genererFacture,
                });
                if (!res.ok) alert(res.reason);
              }
              setEditId(null);
            }}
            headerFields={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  Livraison prévue
                  <input
                    type="date"
                    className="input mt-1"
                    value={meta.dateLivraisonPrevue}
                    onChange={(e) =>
                      setMeta({
                        ...meta,
                        dateLivraisonPrevue: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
            }
            footerFields={
              <AcompteEncaissementFields
                value={acompte}
                onChange={setAcompte}
                acomptesExistants={acomptesPourDocument(acomptes, {
                  commandeId: editId ?? undefined,
                  devisId: meta.devisId || undefined,
                })}
                montantLabel={
                  acomptesPourDocument(acomptes, {
                    commandeId: editId ?? undefined,
                    devisId: meta.devisId || undefined,
                  }).length > 0
                    ? "Acompte complémentaire (Ar TTC)"
                    : "Acompte encaissé (Ar TTC)"
                }
              />
            }
          />
        </div>
      )}

      <TableAffichageBarre
        tableId="commandes"
        lignes={lignesExport}
        fichier="commandes"
        titre="Liste des commandes"
      />

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <ThCol id="numero" show={visible}>N°</ThCol>
              <ThCol id="date" show={visible}>Date</ThCol>
              <ThCol id="client" show={visible}>Client</ThCol>
              <ThCol id="totalTTC" show={visible}>Total TTC</ThCol>
              <ThCol id="acomptes" show={visible}>Acomptes</ThCol>
              <ThCol id="avancement" show={visible}>Avancement</ThCol>
              <ThCol id="statut" show={visible}>Statut</ThCol>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={colSpan()} className="text-muted">
                  Aucune commande pour ce filtre.
                </td>
              </tr>
            ) : (
              lignes.map(({ c, t, client }) => (
                <tr key={c.id}>
                  <TdCol id="numero" show={visible} className="font-medium">{c.numero}</TdCol>
                  <TdCol id="date" show={visible}>{formatDate(c.date)}</TdCol>
                  <TdCol id="client" show={visible}>{client?.nom ?? "—"}</TdCol>
                  <TdCol id="totalTTC" show={visible} className="font-semibold">
                    {formatCurrency(t.totalTTC)}
                  </TdCol>
                  <TdCol id="acomptes" show={visible}>{formatCurrency(t.acomptesTTC)}</TdCol>
                  <TdCol id="avancement" show={visible}>
                    <BadgesAvancementCommande commande={c} />
                  </TdCol>
                  <TdCol id="statut" show={visible}>
                    <select
                      className="select max-w-[140px]"
                      value={c.statut}
                      disabled={documentEstVerrouille(c)}
                      onChange={(e) =>
                        updateCommande(c.id, {
                          statut: e.target.value as CommandeStatut,
                        })
                      }
                    >
                      {Object.entries(COMMANDE_STATUTS).map(([id, label]) => (
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
                        onClick={() => setPreviewId(c.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </IconButton>
                      <ExportDocumentPdfButton
                        label={`Exporter PDF ${c.numero}`}
                      >
                        <DocumentPreview
                          type="commande"
                          numero={c.numero}
                          date={c.date}
                          client={clients.find((x) => x.id === c.clientId)}
                          pdv={pointsDeVente.find(
                            (p) => p.id === c.pointDeVenteId,
                          )}
                          parametres={parametres}
                          modele={modele}
                          lignes={c.lignes}
                          totaux={totauxCommande(c, parametres, acomptes)}
                          conditionsPaiement={c.conditionsPaiement}
                          note={c.note}
                          referenceDevis={
                            devis.find((d) => d.id === c.devisId)?.numero
                          }
                          acomptesDetail={lignesAcomptesPourDocument(acomptes, {
                            commandeId: c.id,
                            devisId: c.devisId,
                          })}
                        />
                      </ExportDocumentPdfButton>
                      <IconButton
                        label="Modifier"
                        onClick={() => ouvrirEdition(c.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      {c.statut !== "annulee" && (
                        <>
                          <button
                            className="btn btn-secondary"
                            disabled={documentEstVerrouille(c)}
                            onClick={() =>
                              demanderTransformation(c.id, "bon_de_livraison")
                            }
                          >
                            → BL
                          </button>
                          <button
                            className="btn btn-secondary"
                            disabled={documentEstVerrouille(c)}
                            onClick={() =>
                              demanderTransformation(c.id, "facture")
                            }
                          >
                            → Facture
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          if (confirm(`Supprimer ${c.numero} ?`)) {
                            deleteCommande(c.id);
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
                filename={`Commande ${preview.numero}`}
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
              type="commande"
              numero={preview.numero}
              date={preview.date}
              client={clients.find((c) => c.id === preview.clientId)}
              pdv={pointsDeVente.find((p) => p.id === preview.pointDeVenteId)}
              parametres={parametres}
              modele={modele}
              lignes={preview.lignes}
              totaux={totauxCommande(preview, parametres, acomptes)}
              conditionsPaiement={preview.conditionsPaiement}
              note={preview.note}
              referenceDevis={
                devis.find((d) => d.id === preview.devisId)?.numero
              }
              acomptesDetail={lignesAcomptesPourDocument(acomptes, {
                commandeId: preview.id,
                devisId: preview.devisId,
              })}
            />
            <DocumentFiliation documentId={preview.id} />
          </div>
        </div>
      )}

      {pending && pendingCmd && (
        <TransformationValidationModal
          open
          titre={
            pending.cible === "bon_de_livraison"
              ? `Transformer ${pendingCmd.numero} en bon de livraison`
              : `Transformer ${pendingCmd.numero} en facture`
          }
          sourceNumero={pendingCmd.numero}
          cible={pending.cible}
          verrou={pendingCmd.verrouTransformation}
          onConfirmer={
            pending.cible === "bon_de_livraison"
              ? confirmerBonDeLivraison
              : confirmerFacture
          }
          onAnnuler={() => fermerValidation()}
          onRetourEdition={() => fermerValidation({ edition: true })}
          onExpire={() => {
            libererVerrousExpires();
            setPending(null);
            alert(
              "Délai de validation dépassé (10 min). La commande a été déverrouillée.",
            );
          }}
        >
          {pending.cible === "bon_de_livraison" ? (
            <DocumentPreview
              type="bon_de_livraison"
              numero={numeroBlProvisoire}
              date={new Date().toISOString()}
              echeance={pendingCmd.dateLivraisonPrevue}
              client={clients.find((x) => x.id === pendingCmd.clientId)}
              pdv={pointsDeVente.find(
                (p) => p.id === pendingCmd.pointDeVenteId,
              )}
              parametres={parametres}
              modele={modeleBl}
              lignes={pendingCmd.lignes}
              totaux={totauxCommande(pendingCmd, parametres, acomptes)}
              conditionsPaiement={pendingCmd.conditionsPaiement}
              note={pendingCmd.note}
              referenceDevis={
                devis.find((d) => d.id === pendingCmd.devisId)?.numero
              }
              referenceCommande={pendingCmd.numero}
            />
          ) : (
            <DocumentPreview
              type="facture"
              numero={numeroFacProvisoire}
              date={new Date().toISOString()}
              echeance={new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString()}
              client={clients.find((x) => x.id === pendingCmd.clientId)}
              pdv={pointsDeVente.find(
                (p) => p.id === pendingCmd.pointDeVenteId,
              )}
              parametres={parametres}
              modele={modeleFacture}
              lignes={pendingCmd.lignes}
              totaux={totauxCommande(pendingCmd, parametres, acomptes)}
              conditionsPaiement={pendingCmd.conditionsPaiement}
              note={pendingCmd.note}
              referenceDevis={
                devis.find((d) => d.id === pendingCmd.devisId)?.numero
              }
              referenceCommande={pendingCmd.numero}
              acomptesDetail={lignesAcomptesPourDocument(acomptes, {
                commandeId: pendingCmd.id,
                devisId: pendingCmd.devisId,
              })}
            />
          )}
          <DocumentFiliation documentId={pendingCmd.id} />
        </TransformationValidationModal>
      )}
    </div>
  );
}
