"use client";

import {
  avancementFacturationBl,
  avancementFacturationCommande,
  avancementLivraisonCommande,
  avancementPreparationCommande,
  couleurAvancement,
  LABEL_AVANCEMENT_FACTURATION,
  LABEL_AVANCEMENT_PREPARATION,
  libelleAvancementLivraison,
  LABEL_CIBLE_TRANSFORMATION,
  LABEL_SOURCE_TRANSFORMATION,
} from "@/lib/transformation-document";
import { moduleBonDePreparationActif } from "@/lib/bon-de-preparation";
import { nombreLignesEnFabricationNonLivrees } from "@/lib/mode-approvisionnement";
import { formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { BonDeLivraison, Commande } from "@/lib/types";
import { OF_STATUT_LABELS } from "@/lib/fabrication";
import Link from "next/link";

export function DocumentFiliation({ documentId }: { documentId: string }) {
  const transformations = useStore((s) => s.transformations ?? []);
  const parents = transformations.filter((t) => t.cibleId === documentId);
  const enfants = transformations.filter((t) => t.sourceId === documentId);
  if (parents.length === 0 && enfants.length === 0) return null;

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-line bg-card px-4 py-3 text-sm no-print">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Filiation documentaire
      </p>
      {parents.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-muted">Document source</p>
          <ul className="mt-1 space-y-1">
            {parents.map((t) => (
              <li key={t.id}>
                {LABEL_SOURCE_TRANSFORMATION[t.sourceType]}{" "}
                <strong>{t.sourceNumero}</strong>
                {" — "}
                validé par {t.userNom || "utilisateur"} le{" "}
                {formatDateTime(t.date)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {enfants.length > 0 && (
        <div>
          <p className="text-xs text-muted">Documents générés</p>
          <ul className="mt-1 space-y-1">
            {enfants.map((t) => (
              <li key={t.id}>
                {LABEL_CIBLE_TRANSFORMATION[t.cibleType]}{" "}
                <strong>{t.cibleNumero}</strong>
                {" — "}
                {t.userNom || "utilisateur"} le {formatDateTime(t.date)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function OfLiesCommande({ commandeId }: { commandeId: string }) {
  const ofs = useStore((s) =>
    (s.ordresFabrication ?? []).filter(
      (o) => o.commandeId === commandeId && o.statut !== "annule",
    ),
  );
  if (ofs.length === 0) return null;
  return (
    <div className="mt-3 rounded-[var(--radius)] border border-line bg-card px-4 py-3 text-sm no-print">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Ordres de fabrication
      </p>
      <ul className="space-y-1">
        {ofs.map((o) => (
          <li key={o.id}>
            <Link href={`/fabrication/${o.id}`} className="font-semibold text-sea-800">
              {o.numero}
            </Link>{" "}
            — {OF_STATUT_LABELS[o.statut]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BadgesAvancementCommande({ commande }: { commande: Commande }) {
  const bonsDeLivraison = useStore((s) => s.bonsDeLivraison);
  const bonsDePreparation = useStore((s) => s.bonsDePreparation ?? []);
  const factures = useStore((s) => s.factures);
  const parametres = useStore((s) => s.parametres);
  const produits = useStore((s) => s.produits);
  const ordresFabrication = useStore((s) => s.ordresFabrication);
  const liv = avancementLivraisonCommande(commande, bonsDeLivraison);
  const fac = avancementFacturationCommande(commande, factures);
  const prep = avancementPreparationCommande(commande, bonsDePreparation);
  const showPrep = moduleBonDePreparationActif(parametres);
  const lignesEnFabrication = nombreLignesEnFabricationNonLivrees({
    commande,
    produits,
    ofs: ordresFabrication ?? [],
    bons: bonsDeLivraison,
  });
  return (
    <div className="flex flex-wrap gap-1">
      {showPrep && (
        <span className={`badge badge-${couleurAvancement(prep)}`}>
          {LABEL_AVANCEMENT_PREPARATION[prep]}
        </span>
      )}
      <span className={`badge badge-${couleurAvancement(liv)}`}>
        {libelleAvancementLivraison(liv, lignesEnFabrication)}
      </span>
      <span className={`badge badge-${couleurAvancement(fac)}`}>
        {LABEL_AVANCEMENT_FACTURATION[fac]}
      </span>
    </div>
  );
}

export function BadgeAvancementBl({ bl }: { bl: BonDeLivraison }) {
  const factures = useStore((s) => s.factures);
  const fac = avancementFacturationBl(bl, factures);
  return (
    <span className={`badge badge-${couleurAvancement(fac)}`}>
      {LABEL_AVANCEMENT_FACTURATION[fac]}
    </span>
  );
}
