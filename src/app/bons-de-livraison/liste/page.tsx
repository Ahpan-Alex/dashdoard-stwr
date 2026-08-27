"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DocumentSaisieWizard,
  lignesToDraft,
  type DraftLigne,
} from "@/components/document-saisie-wizard";
import { DocumentPreview } from "@/components/document-preview";
import { BonsDeLivraisonSubnav } from "@/components/commercial-doc-subnav";
import {
  ExportDocumentPdfButton,
} from "@/components/export-documents-pdf";
import { IconButton } from "@/components/icon-button";
import { PageHeader } from "@/components/page-header";
import {
  BL_STATUTS,
  appliqueTVA,
  acomptesPourDocument,
  creerSnapshotAcomptesDocument,
  libelleClient,
  lignesAcomptesPourDocument,
  totauxBonDeLivraison,
} from "@/lib/commercial";
import { nextNumeroDocumentCommercial } from "@/lib/facturation-mg";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useModelePourType } from "@/lib/use-modele";
import type { BonDeLivraisonStatut } from "@/lib/types";

type Filtre = "tous" | BonDeLivraisonStatut;

const FILTRES: { id: Filtre; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "brouillon", label: "Brouillons" },
  { id: "prepare", label: "Préparés" },
  { id: "expedie", label: "Expédiés" },
  { id: "livre", label: "Livrés" },
  { id: "annule", label: "Annulés" },
];

function filtreDepuisQuery(statut: string | null): Filtre {
  if (statut && FILTRES.some((f) => f.id === statut)) {
    return statut as Filtre;
  }
  return "tous";
}

export default function ListeBonsDeLivraisonPage() {
  const searchParams = useSearchParams();
  const {
    bonsDeLivraison,
    commandes,
    devis,
    clients,
    produits,
    pointsDeVente,
    parametres,
    acomptes,
    factures,
    tarifsClients,
    categoriesProduits,
    entrees,
    ventes,
    updateBonDeLivraison,
    deleteBonDeLivraison,
    updateCommande,
    addFacture,
    updateAcompte,
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
    commandeId: "",
    date: new Date().toISOString().slice(0, 10),
    dateLivraison: new Date().toISOString().slice(0, 10),
  });

  const modele = useModelePourType("bon_de_livraison");
  const assujettiTVA = appliqueTVA(parametres);
  const editDoc = bonsDeLivraison.find((b) => b.id === editId);
  const preview = bonsDeLivraison.find((b) => b.id === previewId);

  const lignes = useMemo(() => {
    return [...bonsDeLivraison]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((bl) => (filtre === "tous" ? true : bl.statut === filtre))
      .map((bl) => ({
        bl,
        t: totauxBonDeLivraison(bl, parametres, acomptes),
        client: clients.find((x) => x.id === bl.clientId),
        cmd: commandes.find((c) => c.id === bl.commandeId),
      }));
  }, [bonsDeLivraison, filtre, parametres, acomptes, clients, commandes]);

  const resume = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const bl of bonsDeLivraison) {
      counts[bl.statut] = (counts[bl.statut] ?? 0) + 1;
    }
    return counts;
  }, [bonsDeLivraison]);

  function ouvrirEdition(id: string) {
    const bl = bonsDeLivraison.find((x) => x.id === id);
    if (!bl) return;
    setEditId(id);
    setPreviewId(null);
    setMeta({
      clientId: bl.clientId,
      pointDeVenteId: bl.pointDeVenteId,
      commandeId: bl.commandeId ?? "",
      date: bl.date.slice(0, 10),
      dateLivraison: bl.dateLivraison
        ? bl.dateLivraison.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setSeed({
      lignes: lignesToDraft(bl.lignes),
      remiseGlobale: bl.remiseGlobale ?? 0,
      note: bl.note ?? "",
    });
    setWizardKey((k) => k + 1);
  }

  function convertirEnFacture(blId: string) {
    const bl = bonsDeLivraison.find((x) => x.id === blId);
    if (!bl) return;
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 30);
    const t = totauxBonDeLivraison(bl, parametres, acomptes);
    const acomptesLies = acomptesPourDocument(acomptes, {
      commandeId: bl.commandeId,
      devisId: bl.devisId,
    });
    const acomptesDoc = creerSnapshotAcomptesDocument(
      lignesAcomptesPourDocument(acomptes, {
        commandeId: bl.commandeId,
        devisId: bl.devisId,
      }),
    );
    const factureId = addFacture({
      numero: nextNumeroDocumentCommercial({
        prefix: "FAC",
        pointDeVenteId: bl.pointDeVenteId,
        pointsDeVente,
        existing: factures.map((f) => f.numero),
      }),
      type: t.acomptesTTC > 0 ? "solde" : "standard",
      clientId: bl.clientId,
      pointDeVenteId: bl.pointDeVenteId,
      date: new Date().toISOString(),
      echeance: echeance.toISOString(),
      statut:
        t.acomptesTTC >= t.totalTTC - 1
          ? "payee"
          : t.acomptesTTC > 0
            ? "partiellement_payee"
            : "validee",
      montantPaye: t.acomptesTTC,
      devisId: bl.devisId,
      commandeId: bl.commandeId,
      bonDeLivraisonId: bl.id,
      tauxTVA: bl.tauxTVA,
      conditionsPaiement: bl.conditionsPaiement,
      dateValidation: new Date().toISOString(),
      acomptesDocument: acomptesDoc,
      lignes: bl.lignes.map((l) => ({ ...l, id: `fl-${l.id}` })),
      remiseGlobale: bl.remiseGlobale,
      note: bl.note,
    });
    for (const a of acomptesLies) {
      updateAcompte(a.id, {
        factureId,
        commandeId: a.commandeId || bl.commandeId,
        devisId: a.devisId || bl.devisId,
        statut: "impute",
      });
    }
    updateBonDeLivraison(bl.id, { statut: "livre" });
    if (bl.commandeId) {
      updateCommande(bl.commandeId, { statut: "livree" });
    }
    alert(
      "Facture créée depuis le bon de livraison (document figé à l'émission).",
    );
  }

  return (
    <div>
      <PageHeader
        title="Liste des bons de livraison"
        description="Consultez, filtrez et modifiez les BL. Une facture créée reste figée."
        actions={
          <Link href="/bons-de-livraison" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Nouveau BL
          </Link>
        }
      />

      <BonsDeLivraisonSubnav />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ["brouillon", "Brouillons"],
            ["prepare", "Préparés"],
            ["expedie", "Expédiés"],
            ["livre", "Livrés"],
            ["annule", "Annulés"],
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
            previewMeta={{
              type: "bon_de_livraison",
              numero: editDoc.numero,
              date: new Date(`${meta.date}T12:00:00`).toISOString(),
              echeance: meta.dateLivraison
                ? new Date(`${meta.dateLivraison}T12:00:00`).toISOString()
                : undefined,
              client: clients.find((c) => c.id === meta.clientId),
              pdv: pointsDeVente.find((p) => p.id === meta.pointDeVenteId),
              parametres,
              modele,
              conditionsPaiement:
                editDoc.conditionsPaiement ||
                parametres.conditionsPaiementDefaut,
              referenceCommande: commandes.find((c) => c.id === meta.commandeId)
                ?.numero,
              referenceDevis: (() => {
                const cmd = commandes.find((c) => c.id === meta.commandeId);
                return (
                  devis.find((d) => d.id === (cmd?.devisId ?? editDoc.devisId))
                    ?.numero
                );
              })(),
            }}
            confirmLabel="Enregistrer les modifications"
            onCancel={() => setEditId(null)}
            onConfirm={({ lignes, remiseGlobale, note }) => {
              if (!meta.clientId) return;
              const cmd = commandes.find((c) => c.id === meta.commandeId);
              updateBonDeLivraison(editId, {
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: new Date(`${meta.date}T12:00:00`).toISOString(),
                dateLivraison: meta.dateLivraison
                  ? new Date(`${meta.dateLivraison}T12:00:00`).toISOString()
                  : undefined,
                commandeId: meta.commandeId || undefined,
                devisId: cmd?.devisId ?? editDoc.devisId,
                lignes,
                remiseGlobale: remiseGlobale > 0 ? remiseGlobale : undefined,
                note,
              });
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
                  Date du document
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
                  Date de livraison
                  <input
                    type="date"
                    className="input mt-1"
                    value={meta.dateLivraison}
                    onChange={(e) =>
                      setMeta({ ...meta, dateLivraison: e.target.value })
                    }
                  />
                </label>
              </div>
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
              <th>Commande</th>
              <th>Total TTC</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  Aucun BL pour ce filtre.
                </td>
              </tr>
            ) : (
              lignes.map(({ bl, t, client, cmd }) => (
                <tr key={bl.id}>
                  <td className="font-medium">{bl.numero}</td>
                  <td>
                    {formatDate(bl.date)}
                    {bl.dateLivraison && (
                      <span className="mt-0.5 block text-xs text-muted">
                        Livr. {formatDate(bl.dateLivraison)}
                      </span>
                    )}
                  </td>
                  <td>{client?.nom ?? "—"}</td>
                  <td>{cmd?.numero ?? "—"}</td>
                  <td className="font-semibold">
                    {formatCurrency(t.totalTTC)}
                  </td>
                  <td>
                    <select
                      className="select max-w-[140px]"
                      value={bl.statut}
                      onChange={(e) =>
                        updateBonDeLivraison(bl.id, {
                          statut: e.target.value as BonDeLivraisonStatut,
                        })
                      }
                    >
                      {Object.entries(BL_STATUTS).map(([id, label]) => (
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
                        onClick={() => setPreviewId(bl.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </IconButton>
                      <ExportDocumentPdfButton
                        label={`Exporter PDF ${bl.numero}`}
                      >
                        <DocumentPreview
                          type="bon_de_livraison"
                          numero={bl.numero}
                          date={bl.date}
                          echeance={bl.dateLivraison}
                          client={clients.find((c) => c.id === bl.clientId)}
                          pdv={pointsDeVente.find(
                            (p) => p.id === bl.pointDeVenteId,
                          )}
                          parametres={parametres}
                          modele={modele}
                          lignes={bl.lignes}
                          totaux={totauxBonDeLivraison(bl, parametres, acomptes)}
                          conditionsPaiement={bl.conditionsPaiement}
                          note={bl.note}
                          referenceDevis={
                            devis.find((d) => d.id === bl.devisId)?.numero
                          }
                          referenceCommande={
                            commandes.find((c) => c.id === bl.commandeId)
                              ?.numero
                          }
                        />
                      </ExportDocumentPdfButton>
                      <IconButton
                        label="Modifier"
                        onClick={() => ouvrirEdition(bl.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      {bl.statut !== "annule" && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => convertirEnFacture(bl.id)}
                        >
                          → Facture
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          if (confirm(`Supprimer ${bl.numero} ?`)) {
                            deleteBonDeLivraison(bl.id);
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
              type="bon_de_livraison"
              numero={preview.numero}
              date={preview.date}
              echeance={preview.dateLivraison}
              client={clients.find((c) => c.id === preview.clientId)}
              pdv={pointsDeVente.find((p) => p.id === preview.pointDeVenteId)}
              parametres={parametres}
              modele={modele}
              lignes={preview.lignes}
              totaux={totauxBonDeLivraison(preview, parametres, acomptes)}
              conditionsPaiement={preview.conditionsPaiement}
              note={preview.note}
              referenceDevis={
                devis.find((d) => d.id === preview.devisId)?.numero
              }
              referenceCommande={
                commandes.find((c) => c.id === preview.commandeId)?.numero
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
