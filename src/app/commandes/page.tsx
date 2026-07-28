"use client";

import { useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import {
  DocumentSaisieWizard,
  lignesToDraft,
  type DraftLigne,
} from "@/components/document-saisie-wizard";
import { DocumentPreview } from "@/components/document-preview";
import { PageHeader } from "@/components/page-header";
import {
  COMMANDE_STATUTS,
  creerSnapshotAcomptesDocument,
  nextNumero,
  totauxCommande,
} from "@/lib/commercial";
import { nextNumeroDocumentCommercial } from "@/lib/facturation-mg";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CommandeStatut } from "@/lib/types";

export default function CommandesPage() {
  const {
    commandes,
    devis,
    clients,
    produits,
    pointsDeVente,
    parametres,
    modelesDocuments,
    acomptes,
    addCommande,
    updateCommande,
    deleteCommande,
    addBonDeLivraison,
    bonsDeLivraison,
    addFacture,
    factures,
    tarifsClients,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const [seed, setSeed] = useState<{
    lignes: DraftLigne[];
    remiseGlobale: number;
    note: string;
  }>({ lignes: [], remiseGlobale: 0, note: "" });
  const [meta, setMeta] = useState({
    clientId: clients[0]?.id ?? "",
    pointDeVenteId: pointsDeVente[0]?.id ?? "",
    devisId: "",
    date: new Date().toISOString().slice(0, 10),
    dateLivraisonPrevue: "",
  });

  const modele = modelesDocuments.find(
    (m) => m.type === "commande" && m.actif,
  );

  const assujettiTVA =
    parametres.assujettiTVA && parametres.regimeFiscal === "tva";

  function ouvrirFormulaire() {
    setMeta({
      clientId: clients[0]?.id ?? "",
      pointDeVenteId: pointsDeVente[0]?.id ?? "",
      devisId: "",
      date: new Date().toISOString().slice(0, 10),
      dateLivraisonPrevue: "",
    });
    setSeed({ lignes: [], remiseGlobale: 0, note: "" });
    setWizardKey((k) => k + 1);
    setOpen(true);
  }

  function chargerDepuisDevis(devisId: string) {
    const d = devis.find((x) => x.id === devisId);
    if (!d) {
      setMeta((f) => ({ ...f, devisId }));
      setSeed({ lignes: [], remiseGlobale: 0, note: "" });
      setWizardKey((k) => k + 1);
      return;
    }
    setMeta((f) => ({
      ...f,
      devisId,
      clientId: d.clientId,
      pointDeVenteId: d.pointDeVenteId,
    }));
    setSeed({
      lignes: lignesToDraft(d.lignes),
      remiseGlobale: d.remiseGlobale ?? 0,
      note: d.note ?? "",
    });
    setWizardKey((k) => k + 1);
  }

  function convertirEnBonDeLivraison(commandeId: string) {
    const c = commandes.find((x) => x.id === commandeId);
    if (!c) return;
    addBonDeLivraison({
      numero: nextNumero(
        "BL",
        bonsDeLivraison.map((b) => b.numero),
      ),
      clientId: c.clientId,
      pointDeVenteId: c.pointDeVenteId,
      date: new Date().toISOString(),
      dateLivraison: c.dateLivraisonPrevue ?? new Date().toISOString(),
      statut: "prepare",
      commandeId: c.id,
      devisId: c.devisId,
      tauxTVA: c.tauxTVA,
      conditionsPaiement: c.conditionsPaiement,
      lignes: c.lignes.map((l) => ({ ...l, id: `bl-${l.id}` })),
      remiseGlobale: c.remiseGlobale,
      note: c.note,
    });
    updateCommande(c.id, { statut: "en_cours" });
    alert("Bon de livraison créé.");
  }

  function convertirEnFacture(commandeId: string) {
    const c = commandes.find((x) => x.id === commandeId);
    if (!c) return;
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 30);
    const t = totauxCommande(c, parametres, acomptes);
    const acomptesDoc = creerSnapshotAcomptesDocument(
      acomptes
        .filter(
          (a) =>
            a.statut !== "annule" &&
            a.commandeId === c.id,
        )
        .map((a) => ({
          numero: a.numero,
          date: a.date,
          montant: a.montantTTC,
          mode: a.modePaiement,
        })),
    );
    addFacture({
      numero: nextNumeroDocumentCommercial({
        prefix: "FAC",
        pointDeVenteId: c.pointDeVenteId,
        pointsDeVente,
        existing: factures.map((f) => f.numero),
      }),
      type: t.acomptesTTC > 0 ? "solde" : "standard",
      clientId: c.clientId,
      pointDeVenteId: c.pointDeVenteId,
      date: new Date().toISOString(),
      echeance: echeance.toISOString(),
      statut: t.acomptesTTC >= t.totalTTC - 1 ? "payee" : t.acomptesTTC > 0 ? "partiellement_payee" : "validee",
      montantPaye: t.acomptesTTC,
      devisId: c.devisId,
      commandeId: c.id,
      tauxTVA: c.tauxTVA,
      conditionsPaiement: c.conditionsPaiement,
      dateValidation: new Date().toISOString(),
      acomptesDocument: acomptesDoc,
      lignes: c.lignes.map((l) => ({ ...l, id: `fl-${l.id}` })),
      remiseGlobale: c.remiseGlobale,
      note: c.note,
    });
    updateCommande(c.id, { statut: "livree" });
    alert("Facture créée (acomptes figés sur le document ; le solde ultérieur ne modifiera pas le PDF).");
  }

  const preview = commandes.find((c) => c.id === previewId);

  return (
    <div>
      <PageHeader
        title="Commandes"
        description="Bons de commande clients — étape entre devis et facture (conformité MG)."
        actions={
          <button className="btn btn-primary" onClick={ouvrirFormulaire}>
            <Plus className="h-4 w-4" />
            Nouvelle commande
          </button>
        }
      />

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <DocumentSaisieWizard
            key={wizardKey}
            titre="Nouvelle commande"
            produits={produits}
            clientId={meta.clientId}
            tarifsClients={tarifsClients}
            tauxTVA={parametres.tauxTVA}
            assujettiTVA={assujettiTVA}
            confirmLabel="Enregistrer la commande"
            initialLignes={seed.lignes}
            initialRemiseGlobale={seed.remiseGlobale}
            initialNote={seed.note}
            onCancel={() => setOpen(false)}
            onConfirm={({ lignes, remiseGlobale, note }) => {
              if (!meta.clientId) return;
              addCommande({
                numero: nextNumero(
                  "CMD",
                  commandes.map((c) => c.numero),
                ),
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: new Date(`${meta.date}T12:00:00`).toISOString(),
                dateLivraisonPrevue: meta.dateLivraisonPrevue
                  ? new Date(
                      `${meta.dateLivraisonPrevue}T12:00:00`,
                    ).toISOString()
                  : undefined,
                statut: "confirmee",
                devisId: meta.devisId || undefined,
                tauxTVA: parametres.tauxTVA,
                conditionsPaiement: parametres.conditionsPaiementDefaut,
                lignes,
                remiseGlobale: remiseGlobale > 0 ? remiseGlobale : undefined,
                note,
              });
              setOpen(false);
            }}
            headerFields={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs font-semibold text-muted">
                  Depuis un devis (optionnel)
                  <select
                    className="select mt-1"
                    value={meta.devisId}
                    onChange={(e) => chargerDepuisDevis(e.target.value)}
                  >
                    <option value="">— Nouveau —</option>
                    {devis
                      .filter((d) => ["accepte", "envoye"].includes(d.statut))
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.numero}
                        </option>
                      ))}
                  </select>
                </label>
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
              <th>Total TTC</th>
              <th>Acomptes</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...commandes]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((c) => {
                const client = clients.find((x) => x.id === c.clientId);
                const t = totauxCommande(c, parametres, acomptes);
                return (
                  <tr key={c.id}>
                    <td className="font-medium">{c.numero}</td>
                    <td>{formatDate(c.date)}</td>
                    <td>{client?.nom}</td>
                    <td className="font-semibold">
                      {formatCurrency(t.totalTTC)}
                    </td>
                    <td>{formatCurrency(t.acomptesTTC)}</td>
                    <td>
                      <select
                        className="select max-w-[140px]"
                        value={c.statut}
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
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost"
                          title="Aperçu"
                          onClick={() => setPreviewId(c.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {c.statut !== "annulee" && (
                          <>
                            <button
                              className="btn btn-secondary"
                              onClick={() => convertirEnBonDeLivraison(c.id)}
                            >
                              → BL
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => convertirEnFacture(c.id)}
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
                );
              })}
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
              acomptesDetail={acomptes
                .filter(
                  (a) =>
                    a.commandeId === preview.id && a.statut !== "annule",
                )
                .map((a) => ({
                  numero: a.numero,
                  date: a.date,
                  montant: a.montantTTC,
                  mode: a.modePaiement,
                }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
