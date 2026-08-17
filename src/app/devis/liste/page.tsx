"use client";

import { useEffect, useMemo, useState } from "react";
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
import { DevisSubnav } from "@/components/commercial-doc-subnav";
import {
  ExportDocumentPdfButton,
} from "@/components/export-documents-pdf";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import {
  DEVIS_STATUTS,
  appliqueTVA,
  acomptesPourDocument,
  lignesAcomptesPourDocument,
  nextNumero,
  totauxDevis,
} from "@/lib/commercial";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { DevisStatut } from "@/lib/types";

type Filtre = "tous" | DevisStatut;

const FILTRES: { id: Filtre; label: string }[] = [
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
  return "tous";
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
    modelesDocuments,
    commandes,
    tarifsClients,
    entrees,
    ventes,
    acomptes,
    updateDevis,
    deleteDevis,
    addCommande,
    updateAcompte,
    encaisserAcompte,
  } = useStore();

  const [filtre, setFiltre] = useState<Filtre>(() =>
    filtreDepuisQuery(searchParams.get("statut")),
  );

  useEffect(() => {
    setFiltre(filtreDepuisQuery(searchParams.get("statut")));
  }, [searchParams]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [seed, setSeed] = useState<{
    lignes: DraftLigne[];
    remiseGlobale: number;
    note: string;
  }>({ lignes: [], remiseGlobale: 0, note: "" });
  const [meta, setMeta] = useState({
    clientId: "",
    pointDeVenteId: "",
    date: new Date().toISOString().slice(0, 10),
    validiteJours: "15",
  });
  const [acompte, setAcompte] = useState(SAISIE_ACOMPTE_VIDE);

  const modele = modelesDocuments.find((m) => m.type === "devis" && m.actif);
  const assujettiTVA = appliqueTVA(parametres);
  const editDoc = devis.find((d) => d.id === editId);
  const preview = devis.find((d) => d.id === previewId);

  const lignes = useMemo(() => {
    return [...devis]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((d) => (filtre === "tous" ? true : d.statut === filtre))
      .map((d) => ({
        d,
        t: totauxDevis(d, parametres, acomptes),
        client: clients.find((c) => c.id === d.clientId),
        pdv: pointsDeVente.find((p) => p.id === d.pointDeVenteId),
      }));
  }, [devis, filtre, parametres, acomptes, clients, pointsDeVente]);

  const resume = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of devis) {
      counts[d.statut] = (counts[d.statut] ?? 0) + 1;
    }
    return counts;
  }, [devis]);

  function ouvrirEdition(id: string) {
    const d = devis.find((x) => x.id === id);
    if (!d) return;
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
      note: d.note ?? "",
    });
    setAcompte(SAISIE_ACOMPTE_VIDE);
    setWizardKey((k) => k + 1);
  }

  function convertirEnCommande(devisId: string) {
    const d = devis.find((x) => x.id === devisId);
    if (!d) return;
    const commandeId = addCommande({
      numero: nextNumero(
        "CMD",
        commandes.map((c) => c.numero),
      ),
      clientId: d.clientId,
      pointDeVenteId: d.pointDeVenteId,
      date: new Date().toISOString(),
      statut: "confirmee",
      devisId: d.id,
      tauxTVA: d.tauxTVA ?? parametres.tauxTVA,
      conditionsPaiement:
        d.conditionsPaiement || parametres.conditionsPaiementDefaut,
      lignes: d.lignes.map((l) => ({ ...l, id: `cl-${l.id}` })),
      remiseGlobale: d.remiseGlobale,
      note: d.note,
    });
    for (const a of acomptesPourDocument(acomptes, { devisId: d.id })) {
      if (!a.commandeId) updateAcompte(a.id, { commandeId });
    }
    updateDevis(d.id, { statut: "accepte" });
    alert("Commande créée à partir du devis.");
  }

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
        description="Consultez, filtrez et modifiez les devis. Les factures fiscales restent figées une fois créées."
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
            ["brouillon", "Brouillons"],
            ["envoye", "Envoyés"],
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
            onConfirm={({ lignes, remiseGlobale, note }) => {
              if (!meta.clientId || !editId) return;
              updateDevis(editId, {
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: new Date(`${meta.date}T12:00:00`).toISOString(),
                validiteJours: Number(meta.validiteJours) || 15,
                lignes,
                remiseGlobale: remiseGlobale > 0 ? remiseGlobale : undefined,
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
                          {c.nom}
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

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>N°</th>
              <th>Date</th>
              <th>Client</th>
              <th>PDV</th>
              <th>Montant</th>
              <th>Acomptes</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted">
                  Aucun devis pour ce filtre.
                </td>
              </tr>
            ) : (
              lignes.map(({ d, t, client, pdv }) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.numero}</td>
                  <td>{formatDate(d.date)}</td>
                  <td>{client?.nom ?? "—"}</td>
                  <td>{pdv?.nom ?? "—"}</td>
                  <td className="font-semibold">
                    {formatCurrency(t.totalTTC)}
                  </td>
                  <td>{formatCurrency(t.acomptesTTC)}</td>
                  <td>
                    <select
                      className="select max-w-[160px]"
                      value={d.statut}
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
                  </td>
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
                      {d.statut !== "refuse" && d.statut !== "expire" && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => convertirEnCommande(d.id)}
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
          <div className="my-6 w-full max-w-3xl">
            <div className="mb-3 flex justify-end gap-2">
              <button className="btn btn-primary" onClick={() => window.print()}>
                Imprimer
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setPreviewId(null)}
              >
                Fermer
              </button>
            </div>
            <DocumentPreview
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
          </div>
        </div>
      )}
    </div>
  );
}
