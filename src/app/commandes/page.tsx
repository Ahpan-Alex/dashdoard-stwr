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
  lignesToDraft,
  type DraftLigne,
} from "@/components/document-saisie-wizard";
import { CommandesSubnav } from "@/components/commercial-doc-subnav";
import { PageHeader } from "@/components/page-header";
import {
  appliqueTVA,
  acomptesPourDocument,
  lignesAcomptesPourDocument,
  nextNumero,
} from "@/lib/commercial";
import { useStore } from "@/lib/store";

export default function CommandesPage() {
  const {
    commandes,
    devis,
    clients,
    produits,
    pointsDeVente,
    parametres,
    modelesDocuments,
    tarifsClients,
    categoriesProduits,
    entrees,
    ventes,
    acomptes,
    addCommande,
    updateAcompte,
    encaisserAcompte,
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
    devisId: "",
    date: new Date().toISOString().slice(0, 10),
    dateLivraisonPrevue: "",
  });
  const [acompte, setAcompte] = useState(SAISIE_ACOMPTE_VIDE);

  const modele = modelesDocuments.find(
    (m) => m.type === "commande" && m.actif,
  );
  const assujettiTVA = appliqueTVA(parametres);

  function ouvrirFormulaire() {
    setMeta({
      clientId: clients[0]?.id ?? "",
      pointDeVenteId: pointsDeVente[0]?.id ?? "",
      devisId: "",
      date: new Date().toISOString().slice(0, 10),
      dateLivraisonPrevue: "",
    });
    setSeed({ lignes: [], remiseGlobale: 0, note: "" });
    setAcompte(SAISIE_ACOMPTE_VIDE);
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

  const acomptesLies = acomptesPourDocument(acomptes, {
    devisId: meta.devisId || undefined,
  });
  const acomptesLiesTTC = acomptesLies.reduce((s, a) => s + a.montantTTC, 0);
  const acompteMontant = Math.max(0, Number(acompte.montant) || 0);
  const acomptesTTC = acomptesLiesTTC + acompteMontant;
  const acomptesDetail = useMemo(() => {
    const existants = lignesAcomptesPourDocument(acomptes, {
      devisId: meta.devisId || undefined,
    });
    if (acompteMontant <= 0) return existants;
    return [
      ...existants,
      {
        numero: "Acompte à l'émission",
        date: new Date(`${meta.date}T12:00:00`).toISOString(),
        montant: acompteMontant,
        mode: acompte.modePaiement,
      },
    ];
  }, [acomptes, meta.devisId, meta.date, acompteMontant, acompte.modePaiement]);

  return (
    <div>
      <PageHeader
        title="Nouvelle commande"
        description="Bons de commande clients — étape entre devis et facture (conformité MG)."
        actions={
          <button className="btn btn-primary" onClick={ouvrirFormulaire}>
            <Plus className="h-4 w-4" />
            Nouvelle commande
          </button>
        }
      />

      <CommandesSubnav />

      {open ? (
        <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5">
          <DocumentSaisieWizard
            key={wizardKey}
            titre="Nouvelle commande"
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
            showAcomptes={acomptesTTC > 0}
            acomptesTTC={acomptesTTC}
            acomptesDetail={acomptesDetail}
            previewMeta={{
              type: "commande",
              numero: nextNumero(
                "CMD",
                commandes.map((c) => c.numero),
              ),
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
              conditionsPaiement: parametres.conditionsPaiementDefaut,
              referenceDevis: devis.find((d) => d.id === meta.devisId)?.numero,
            }}
            confirmLabel="Enregistrer la commande"
            onCancel={() => setOpen(false)}
            onConfirm={({ lignes, remiseGlobale, note }) => {
              if (!meta.clientId) return;
              const numero = nextNumero(
                "CMD",
                commandes.map((c) => c.numero),
              );
              const dateIso = new Date(`${meta.date}T12:00:00`).toISOString();
              const commandeId = addCommande({
                numero,
                clientId: meta.clientId,
                pointDeVenteId: meta.pointDeVenteId,
                date: dateIso,
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
              for (const a of acomptesLies) {
                if (!a.commandeId) {
                  updateAcompte(a.id, { commandeId });
                }
              }
              if (acompteMontant > 0) {
                const res = encaisserAcompte({
                  clientId: meta.clientId,
                  pointDeVenteId: meta.pointDeVenteId,
                  date: dateIso,
                  montantTTC: acompteMontant,
                  modePaiement: acompte.modePaiement,
                  devisId: meta.devisId || undefined,
                  commandeId,
                  refDocument: numero,
                  genererFactureAcompte: acompte.genererFacture,
                });
                if (!res.ok) alert(res.reason);
              }
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
            footerFields={
              <AcompteEncaissementFields
                value={acompte}
                onChange={setAcompte}
                acomptesExistants={acomptesLies}
                montantLabel={
                  acomptesLies.length > 0
                    ? "Acompte complémentaire (Ar TTC)"
                    : "Acompte encaissé (Ar TTC)"
                }
              />
            }
          />
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Consultez et modifiez les commandes dans{" "}
          <Link
            href="/commandes/liste"
            className="font-semibold text-sea-700 underline"
          >
            Liste des commandes
          </Link>
          .
        </p>
      )}
    </div>
  );
}
