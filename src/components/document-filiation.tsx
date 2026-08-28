"use client";

import {
  avancementFacturationBl,
  avancementFacturationCommande,
  avancementLivraisonCommande,
  couleurAvancement,
  LABEL_AVANCEMENT_FACTURATION,
  LABEL_AVANCEMENT_LIVRAISON,
  LABEL_CIBLE_TRANSFORMATION,
  LABEL_SOURCE_TRANSFORMATION,
} from "@/lib/transformation-document";
import { formatDateTime } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { BonDeLivraison, Commande } from "@/lib/types";

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

export function BadgesAvancementCommande({ commande }: { commande: Commande }) {
  const bonsDeLivraison = useStore((s) => s.bonsDeLivraison);
  const factures = useStore((s) => s.factures);
  const liv = avancementLivraisonCommande(commande, bonsDeLivraison);
  const fac = avancementFacturationCommande(commande, factures);
  return (
    <div className="flex flex-wrap gap-1">
      <span className={`badge badge-${couleurAvancement(liv)}`}>
        {LABEL_AVANCEMENT_LIVRAISON[liv]}
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
