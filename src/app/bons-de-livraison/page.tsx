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
  BL_STATUTS,
  creerSnapshotAcomptesDocument,
  nextNumero,
  totauxBonDeLivraison,
} from "@/lib/commercial";
import { nextNumeroDocumentCommercial } from "@/lib/facturation-mg";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { BonDeLivraisonStatut } from "@/lib/types";

export default function BonsDeLivraisonPage() {
  const {
    bonsDeLivraison,
    commandes,
    devis,
    clients,
    produits,
    pointsDeVente,
    parametres,
    modelesDocuments,
    acomptes,
    factures,
    tarifsClients,
    addBonDeLivraison,
    updateBonDeLivraison,
    deleteBonDeLivraison,
    updateCommande,
    addFacture,
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
    commandeId: "",
    date: new Date().toISOString().slice(0, 10),
    dateLivraison: new Date().toISOString().slice(0, 10),
  });

  const modele = modelesDocuments.find(
    (m) => m.type === "bon_de_livraison" && m.actif,
  );

  const assujettiTVA =
    parametres.assujettiTVA && parametres.regimeFiscal === "tva";

  function ouvrirFormulaire() {
    setMeta({
      clientId: clients[0]?.id ?? "",
      pointDeVenteId: pointsDeVente[0]?.id ?? "",
      commandeId: "",
      date: new Date().toISOString().slice(0, 10),
      dateLivraison: new Date().toISOString().slice(0, 10),
    });
    setSeed({ lignes: [], remiseGlobale: 0, note: "" });
    setWizardKey((k) => k + 1);
    setOpen(true);
  }

  function chargerDepuisCommande(commandeId: string) {
    const c = commandes.find((x) => x.id === commandeId);
    if (!c) {
      setMeta((f) => ({ ...f, commandeId }));
      setSeed({ lignes: [], remiseGlobale: 0, note: "" });
      setWizardKey((k) => k + 1);
      return;
    }
    setMeta((f) => ({
      ...f,
      commandeId,
      clientId: c.clientId,
      pointDeVenteId: c.pointDeVenteId,
      dateLivraison: c.dateLivraisonPrevue
        ? c.dateLivraisonPrevue.slice(0, 10)
        : f.dateLivraison,
    }));
    setSeed({
      lignes: lignesToDraft(c.lignes),
      remiseGlobale: c.remiseGlobale ?? 0,
      note: c.note ?? "",
    });
    setWizardKey((k) => k + 1);
  }

  function convertirEnFacture(blId: string) {
    const bl = bonsDeLivraison.find((x) => x.id === blId);
    if (!bl) return;
    const echeance = new Date();
    echeance.setDate(echeance.getDate() + 30);
    const t = totauxBonDeLivraison(bl, parametres, acomptes);
    const acomptesDoc = creerSnapshotAcomptesDocument(
      acomptes
        .filter(
          (a) =>
            a.statut !== "annule" &&
            ((bl.commandeId && a.commandeId === bl.commandeId) ||
              (bl.devisId && a.devisId === bl.devisId)),
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
    updateBonDeLivraison(bl.id, { statut: "livre" });
    if (bl.commandeId) {
      updateCommande(bl.commandeId, { statut: "livree" });
    }
    alert("Facture créée depuis le bon de livraison (document figé à l'émission).");
  }

  const preview = bonsDeLivraison.find((b) => b.id === previewId);

  return (
    <div>
      <PageHeader
        title="Bons de livraison"
        description="Livraisons clients — étape entre commande et facture (même logique que devis / commandes)."
        actions={
          <button className="btn btn-primary" onClick={ouvrirFormulaire}>
            <Plus className="h-4 w-4" />
            Nouveau bon de livraison
          </button>
        }
      />

      {open && (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <DocumentSaisieWizard
            key={wizardKey}
            titre="Nouveau bon de livraison"
            produits={produits}
            clientId={meta.clientId}
            tarifsClients={tarifsClients}
            tauxTVA={parametres.tauxTVA}
            assujettiTVA={assujettiTVA}
            confirmLabel="Enregistrer le BL"
            initialLignes={seed.lignes}
            initialRemiseGlobale={seed.remiseGlobale}
            initialNote={seed.note}
            onCancel={() => setOpen(false)}
            onConfirm={({ lignes, remiseGlobale, note }) => {
              if (!meta.clientId) return;
              const cmd = commandes.find((c) => c.id === meta.commandeId);
              addBonDeLivraison({
                numero: nextNumero(
                  "BL",
                  bonsDeLivraison.map((b) => b.numero),
                ),
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: new Date(`${meta.date}T12:00:00`).toISOString(),
                dateLivraison: meta.dateLivraison
                  ? new Date(`${meta.dateLivraison}T12:00:00`).toISOString()
                  : undefined,
                statut: "prepare",
                commandeId: meta.commandeId || undefined,
                devisId: cmd?.devisId,
                tauxTVA: parametres.tauxTVA,
                conditionsPaiement: parametres.conditionsPaiementDefaut,
                lignes,
                remiseGlobale: remiseGlobale > 0 ? remiseGlobale : undefined,
                note,
              });
              if (meta.commandeId) {
                updateCommande(meta.commandeId, { statut: "en_cours" });
              }
              setOpen(false);
            }}
            headerFields={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-xs font-semibold text-muted">
                  Depuis une commande (optionnel)
                  <select
                    className="select mt-1"
                    value={meta.commandeId}
                    onChange={(e) => chargerDepuisCommande(e.target.value)}
                  >
                    <option value="">— Nouveau —</option>
                    {commandes
                      .filter((c) =>
                        ["confirmee", "en_cours"].includes(c.statut),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.numero}
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...bonsDeLivraison]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((bl) => {
                const client = clients.find((x) => x.id === bl.clientId);
                const cmd = commandes.find((c) => c.id === bl.commandeId);
                const t = totauxBonDeLivraison(bl, parametres, acomptes);
                return (
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
                    <td>{client?.nom}</td>
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
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost"
                          title="Aperçu"
                          onClick={() => setPreviewId(bl.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
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
