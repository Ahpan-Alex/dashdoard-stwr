"use client";

import { Component, useRef, type ReactNode } from "react";
import { BatCommandePanel } from "@/components/bat-commande";
import { PanneauApprovisionnementCommande } from "@/components/commande-lignes-approvisionnement";
import { DocumentFiliation, OfLiesCommande } from "@/components/document-filiation";
import { DocumentPreview } from "@/components/document-preview";
import { DocumentPrintActions } from "@/components/document-print-actions";
import { EnvoiDocumentBouton } from "@/components/envoi-document-bouton";
import { lignesAcomptesPourDocument, totauxCommande } from "@/lib/commercial";
import { useStore } from "@/lib/store";
import type { Commande } from "@/lib/types";
import { useModelePourType } from "@/lib/use-modele";

export const MESSAGE_APERCU_COMMANDE_INDISPONIBLE =
  "Impossible de charger l'aperçu de cette commande. Réessayez ou ouvrez la commande directement.";

type GardeProps = {
  children: ReactNode;
  onFermer: () => void;
  onOuvrir: () => void;
};

type GardeState = { erreur: boolean };

class GardeApercuCommande extends Component<GardeProps, GardeState> {
  state: GardeState = { erreur: false };

  static getDerivedStateFromError(): GardeState {
    return { erreur: true };
  }

  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <div className="rounded-[var(--radius)] border border-line bg-card p-6 text-sm">
        <p className="font-semibold">{MESSAGE_APERCU_COMMANDE_INDISPONIBLE}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => this.setState({ erreur: false })}
          >
            Réessayer
          </button>
          <button type="button" className="btn btn-secondary" onClick={this.props.onOuvrir}>
            Ouvrir la commande
          </button>
          <button type="button" className="btn btn-ghost" onClick={this.props.onFermer}>
            Fermer
          </button>
        </div>
      </div>
    );
  }
}

function ContenuApercuCommande({
  commande,
  onFermer,
}: {
  commande: Commande;
  onFermer: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const modele = useModelePourType("commande");
  const clients = useStore((s) => s.clients);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const parametres = useStore((s) => s.parametres);
  const acomptes = useStore((s) => s.acomptes);
  const devis = useStore((s) => s.devis);
  const client = clients.find((c) => c.id === commande.clientId);
  const pdv = pointsDeVente.find((p) => p.id === commande.pointDeVenteId);
  const totaux = totauxCommande(commande, parametres, acomptes ?? []);
  const referenceDevis = devis.find((d) => d.id === commande.devisId)?.numero;
  const acomptesDetail = lignesAcomptesPourDocument(acomptes ?? [], {
    commandeId: commande.id,
    devisId: commande.devisId,
  });

  return (
    <>
      <div className="mb-3 flex justify-end gap-2">
        <DocumentPrintActions
          sheetRef={sheetRef}
          filename={`Commande ${commande.numero}`}
        />
        <EnvoiDocumentBouton
          filename={commande.numero}
          typeDocument="commande"
          numero={commande.numero}
          entiteId={commande.id}
          client={client}
        >
          <DocumentPreview
            type="commande"
            numero={commande.numero}
            date={commande.date}
            client={client}
            pdv={pdv}
            parametres={parametres}
            modele={modele}
            lignes={commande.lignes}
            totaux={totaux}
            conditionsPaiement={commande.conditionsPaiement}
            note={commande.note}
            validiteJours={commande.validiteJours}
            referenceDevis={referenceDevis}
            acomptesDetail={acomptesDetail}
          />
        </EnvoiDocumentBouton>
        <button type="button" className="btn btn-secondary" onClick={onFermer}>
          Fermer
        </button>
      </div>
      <DocumentPreview
        ref={sheetRef}
        type="commande"
        numero={commande.numero}
        date={commande.date}
        client={client}
        pdv={pdv}
        parametres={parametres}
        modele={modele}
        lignes={commande.lignes}
        totaux={totaux}
        conditionsPaiement={commande.conditionsPaiement}
        note={commande.note}
        validiteJours={commande.validiteJours}
        referenceDevis={referenceDevis}
        acomptesDetail={acomptesDetail}
      />
      <DocumentFiliation documentId={commande.id} />
      <PanneauApprovisionnementCommande commande={commande} />
      <OfLiesCommande commandeId={commande.id} />
      <BatCommandePanel commandeId={commande.id} />
    </>
  );
}

export function ApercuCommandeListe({
  commande,
  onFermer,
  onOuvrir,
}: {
  commande: Commande;
  onFermer: () => void;
  onOuvrir: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
      <div className="my-6 w-full max-w-[220mm]">
        <GardeApercuCommande key={commande.id} onFermer={onFermer} onOuvrir={onOuvrir}>
          <ContenuApercuCommande commande={commande} onFermer={onFermer} />
        </GardeApercuCommande>
      </div>
    </div>
  );
}
