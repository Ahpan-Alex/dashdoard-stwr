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
import { appliqueTVA, libelleClient, nextNumero, persisterRemiseGlobale } from "@/lib/commercial";
import { useStore } from "@/lib/store";
import {
  avancementLivraisonCommande,
  statutCommandeSelonLivraison,
} from "@/lib/transformation-document";
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
    verrouillerTransformation,
    annulerTransformation,
    finaliserTransformation,
  } = useStore();

  const [open, setOpen] = useState(true);
  const [wizardKey, setWizardKey] = useState(0);
  const [seed, setSeed] = useState<{
    lignes: DraftLigne[];
    remiseGlobale: number;
    remiseGlobaleMode: "percent" | "montant";
    note: string;
  }>({ lignes: [], remiseGlobale: 0, remiseGlobaleMode: "montant", note: "" });
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
    if (meta.commandeId) annulerTransformation("commande", meta.commandeId);
    setMeta({
      clientId: clients[0]?.id ?? "",
      pointDeVenteId: pointsDeVente[0]?.id ?? "",
      commandeId: "",
      date: new Date().toISOString().slice(0, 10),
      dateLivraison: new Date().toISOString().slice(0, 10),
    });
    setSeed({ lignes: [], remiseGlobale: 0, remiseGlobaleMode: "montant", note: "" });
    setWizardKey((k) => k + 1);
    setOpen(true);
  }

  function chargerDepuisCommande(commandeId: string) {
    if (meta.commandeId && meta.commandeId !== commandeId) {
      annulerTransformation("commande", meta.commandeId);
    }
    const c = commandes.find((x) => x.id === commandeId);
    if (!c) {
      if (meta.commandeId) annulerTransformation("commande", meta.commandeId);
      setMeta((f) => ({ ...f, commandeId }));
      setSeed({ lignes: [], remiseGlobale: 0, remiseGlobaleMode: "montant", note: "" });
      setWizardKey((k) => k + 1);
      return;
    }
    const res = verrouillerTransformation(
      "commande",
      commandeId,
      "bon_de_livraison",
    );
    if (!res.ok) {
      alert(res.reason);
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
      remiseGlobaleMode: c.remiseGlobaleMode ?? "montant",
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
            initialRemiseGlobaleMode={seed.remiseGlobaleMode}
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
            confirmLabel="Confirmer le BL"
            onCancel={() => {
              if (meta.commandeId) {
                annulerTransformation("commande", meta.commandeId);
              }
              setOpen(false);
            }}
            onConfirm={({ lignes, remiseGlobale, remiseGlobaleMode, note }) => {
              if (!meta.clientId) return;
              const cmd = commandes.find((c) => c.id === meta.commandeId);
              const numero = nextNumero(
                "BL",
                bonsDeLivraison.map((b) => b.numero),
              );
              const blId = addBonDeLivraison({
                numero,
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
                ...persisterRemiseGlobale(remiseGlobale, remiseGlobaleMode),
                note,
              });
              if (meta.commandeId && cmd) {
                const avancement = avancementLivraisonCommande(
                  cmd,
                  useStore.getState().bonsDeLivraison,
                );
                const fin = finaliserTransformation({
                  sourceType: "commande",
                  sourceId: meta.commandeId,
                  cibleType: "bon_de_livraison",
                  cibleId: blId,
                  cibleNumero: numero,
                  statutSource: statutCommandeSelonLivraison(avancement),
                });
                if (!fin.ok) alert(fin.reason);
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
                      .filter((c) => c.statut !== "annulee")
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
