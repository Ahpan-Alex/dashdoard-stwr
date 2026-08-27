"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  DocumentSaisieWizard,
  lignesToDraft,
  type DraftLigne,
} from "@/components/document-saisie-wizard";
import { BonsDeLivraisonSubnav } from "@/components/commercial-doc-subnav";
import { PageHeader } from "@/components/page-header";
import { appliqueTVA, libelleClient, nextNumero } from "@/lib/commercial";
import { useStore } from "@/lib/store";
import { useModelePourType } from "@/lib/use-modele";

export default function BonsDeLivraisonPage() {
  const {
    bonsDeLivraison,
    commandes,
    devis,
    clients,
    produits,
    pointsDeVente,
    parametres,
    tarifsClients,
    categoriesProduits,
    entrees,
    ventes,
    addBonDeLivraison,
    updateCommande,
  } = useStore();

  const [open, setOpen] = useState(true);
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

  const modele = useModelePourType("bon_de_livraison");
  const assujettiTVA = appliqueTVA(parametres);

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

  return (
    <div>
      <PageHeader
        title="Nouveau bon de livraison"
        description="Livraisons clients — étape entre commande et facture."
        actions={
          <button className="btn btn-primary" onClick={ouvrirFormulaire}>
            <Plus className="h-4 w-4" />
            Nouveau bon de livraison
          </button>
        }
      />

      <BonsDeLivraisonSubnav />

      {open ? (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <DocumentSaisieWizard
            key={wizardKey}
            titre="Nouveau bon de livraison"
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
              numero: nextNumero(
                "BL",
                bonsDeLivraison.map((b) => b.numero),
              ),
              date: new Date(`${meta.date}T12:00:00`).toISOString(),
              echeance: meta.dateLivraison
                ? new Date(`${meta.dateLivraison}T12:00:00`).toISOString()
                : undefined,
              client: clients.find((c) => c.id === meta.clientId),
              pdv: pointsDeVente.find((p) => p.id === meta.pointDeVenteId),
              parametres,
              modele,
              conditionsPaiement: parametres.conditionsPaiementDefaut,
              referenceCommande: commandes.find((c) => c.id === meta.commandeId)
                ?.numero,
              referenceDevis: (() => {
                const cmd = commandes.find((c) => c.id === meta.commandeId);
                return devis.find((d) => d.id === cmd?.devisId)?.numero;
              })(),
            }}
            confirmLabel="Enregistrer le BL"
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
      ) : (
        <p className="mb-4 text-sm text-muted">
          Consultez et modifiez les BL dans{" "}
          <Link
            href="/bons-de-livraison/liste"
            className="font-semibold text-sea-700 underline"
          >
            Liste des BL
          </Link>
          .
        </p>
      )}
    </div>
  );
}
