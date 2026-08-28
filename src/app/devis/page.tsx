"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AcompteEncaissementFields,
  SAISIE_ACOMPTE_VIDE,
} from "@/components/acompte-encaissement-fields";
import {
  DocumentSaisieWizard,
} from "@/components/document-saisie-wizard";
import { DevisSubnav } from "@/components/commercial-doc-subnav";
import { PageHeader } from "@/components/page-header";
import { appliqueTVA, libelleClient, nextNumero, persisterRemiseGlobale } from "@/lib/commercial";
import { pointDeVenteSaisieDefaut } from "@/lib/calculations";
import { useStore } from "@/lib/store";
import { useModelePourType } from "@/lib/use-modele";

export default function DevisPage() {
  const {
    devis,
    clients,
    produits,
    categoriesProduits,
    pointsDeVente,
    parametres,
    tarifsClients,
    entrees,
    ventes,
    addDevis,
    encaisserAcompte,
    pointDeVenteActifId,
  } = useStore();

  const [open, setOpen] = useState(true);
  const [meta, setMeta] = useState({
    clientId: clients[0]?.id ?? "",
    pointDeVenteId: pointDeVenteSaisieDefaut(pointsDeVente, pointDeVenteActifId),
    date: new Date().toISOString().slice(0, 10),
    validiteJours: "15",
  });
  const [acompte, setAcompte] = useState(SAISIE_ACOMPTE_VIDE);
  const [wizardKey, setWizardKey] = useState(0);

  const modele = useModelePourType("devis");
  const numeroProvisoire = nextNumero(
    "DEV",
    devis.map((d) => d.numero),
  );
  const echeanceProvisoire = (() => {
    const d = new Date(`${meta.date}T12:00:00`);
    d.setDate(d.getDate() + (Number(meta.validiteJours) || 15));
    return d.toISOString();
  })();
  const acompteMontant = Math.max(0, Number(acompte.montant) || 0);
  const acomptesDetail = useMemo(
    () =>
      acompteMontant > 0
        ? [
            {
              numero: "Acompte à l'émission",
              date: new Date(`${meta.date}T12:00:00`).toISOString(),
              montant: acompteMontant,
              mode: acompte.modePaiement,
            },
          ]
        : [],
    [acompteMontant, acompte.modePaiement, meta.date],
  );

  function ouvrirFormulaire() {
    setMeta({
      clientId: clients[0]?.id ?? "",
      pointDeVenteId: pointDeVenteSaisieDefaut(pointsDeVente, pointDeVenteActifId),
      date: new Date().toISOString().slice(0, 10),
      validiteJours: "15",
    });
    setAcompte(SAISIE_ACOMPTE_VIDE);
    setWizardKey((k) => k + 1);
    setOpen(true);
  }

  const assujettiTVA = appliqueTVA(parametres);

  return (
    <div>
      <PageHeader
        title="Nouveau devis"
        description="Propositions commerciales — convertibles en commandes."
        actions={
          <button className="btn btn-primary" onClick={ouvrirFormulaire}>
            <Plus className="h-4 w-4" />
            Nouveau devis
          </button>
        }
      />

      <DevisSubnav />

      {open ? (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <DocumentSaisieWizard
            key={wizardKey}
            titre="Nouveau devis"
            produits={produits}
            categoriesProduits={categoriesProduits}
            clientId={meta.clientId}
            tarifsClients={tarifsClients}
            pointDeVenteId={meta.pointDeVenteId}
            entrees={entrees}
            ventes={ventes}
            tauxTVA={parametres.tauxTVA}
            assujettiTVA={assujettiTVA}
            showAcomptes={acompteMontant > 0}
            acomptesTTC={acompteMontant}
            acomptesDetail={acomptesDetail}
            previewMeta={{
              type: "devis",
              numero: numeroProvisoire,
              date: new Date(`${meta.date}T12:00:00`).toISOString(),
              echeance: echeanceProvisoire,
              client: clients.find((c) => c.id === meta.clientId),
              pdv: pointsDeVente.find((p) => p.id === meta.pointDeVenteId),
              parametres,
              modele,
              conditionsPaiement: parametres.conditionsPaiementDefaut,
            }}
            confirmLabel="Enregistrer le devis"
            onCancel={() => setOpen(false)}
            onConfirm={({ lignes, remiseGlobale, remiseGlobaleMode, note }) => {
              if (!meta.clientId) return;
              const numero = nextNumero(
                "DEV",
                devis.map((d) => d.numero),
              );
              const dateIso = new Date(`${meta.date}T12:00:00`).toISOString();
              const devisId = addDevis({
                numero,
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: dateIso,
                validiteJours: Number(meta.validiteJours) || 15,
                statut: "brouillon",
                tauxTVA: parametres.tauxTVA,
                conditionsPaiement: parametres.conditionsPaiementDefaut,
                lignes,
                ...persisterRemiseGlobale(remiseGlobale, remiseGlobaleMode),
                note,
              });
              if (acompteMontant > 0) {
                const res = encaisserAcompte({
                  clientId: meta.clientId,
                  pointDeVenteId: meta.pointDeVenteId,
                  date: dateIso,
                  montantTTC: acompteMontant,
                  modePaiement: acompte.modePaiement,
                  devisId,
                  refDocument: numero,
                  genererFactureAcompte: acompte.genererFacture,
                });
                if (!res.ok) alert(res.reason);
              }
              setOpen(false);
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
              />
            }
          />
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Consultez et modifiez les devis dans{" "}
          <Link
            href="/devis/liste"
            className="font-semibold text-sea-700 underline"
          >
            Liste des devis
          </Link>
          .
        </p>
      )}
    </div>
  );
}
