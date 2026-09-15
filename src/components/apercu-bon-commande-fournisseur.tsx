"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { BonCommandeFournisseur } from "@/components/bon-commande-fournisseur";
import { DocumentPrintActions } from "@/components/document-print-actions";
import { STATUT_ACHAT_LABELS } from "@/lib/achats";
import { assurerTiers } from "@/lib/tiers";
import { useStore } from "@/lib/store";
import type { Achat } from "@/lib/types";

export function ApercuBonCommandeFournisseur({
  achat,
  afficherValidation = true,
  afficherLienEdition = true,
  onValider,
}: {
  achat: Achat;
  afficherValidation?: boolean;
  afficherLienEdition?: boolean;
  onValider?: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const parametres = useStore((s) => s.parametres);
  const produits = useStore((s) => s.produits ?? []);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const clients = useStore((s) => s.clients);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);
  const validerAchat = useStore((s) => s.validerAchat);
  const brouillon = achat.statut === "brouillon";

  const destinataire = useMemo(() => {
    const tous = assurerTiers({ clients, fournisseurs, tiers });
    const t = tous.find((x) => x.id === achat.fournisseurId);
    const f = fournisseurs.find((x) => x.id === achat.fournisseurId);
    return {
      nom: t?.nom ?? f?.nom ?? "Fournisseur",
      telephone: t?.telephone ?? f?.telephone,
      email: t?.email ?? f?.email,
      adresse: t?.adresse ?? f?.adresse,
      ville: t?.ville ?? f?.ville,
      nif: t?.nif ?? f?.nif,
      stat: t?.stat ?? f?.stat,
    };
  }, [achat.fournisseurId, clients, fournisseurs, tiers]);

  const siteNom =
    pointsDeVente.find((p) => p.id === achat.pointDeVenteId)?.nom ?? "";

  function valider() {
    if (
      !confirm(
        `Valider ${achat.numero} pour ${destinataire.nom} ? Le bon de commande ne pourra plus être modifié.`,
      )
    ) {
      return;
    }
    if (onValider) {
      onValider();
      return;
    }
    const res = validerAchat(achat.id);
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">
            {achat.numero} · {destinataire.nom}
          </p>
          <span
            className={`badge ${
              achat.statut === "valide"
                ? "badge-success"
                : achat.statut === "annule"
                  ? "badge-danger"
                  : "badge-sand"
            }`}
          >
            {STATUT_ACHAT_LABELS[achat.statut]}
          </span>
        </div>
        {brouillon && afficherLienEdition && (
          <Link href={`/achats?id=${achat.id}`} className="btn btn-secondary">
            Modifier le contenu
          </Link>
        )}
      </div>
      {brouillon && (
        <p className="mb-3 text-sm text-muted">
          Prévisualisez le bon, téléchargez-le pour l’envoyer au fournisseur,
          puis validez cette commande.
        </p>
      )}
      <DocumentPrintActions
        sheetRef={sheetRef}
        filename={`${achat.numero}.pdf`}
        className="mb-4"
      />
      <BonCommandeFournisseur
        ref={sheetRef}
        achat={achat}
        parametres={parametres}
        produits={produits}
        destinataire={destinataire}
        siteNom={siteNom}
      />
      {afficherValidation && brouillon && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={valider}>
            <ClipboardCheck className="h-4 w-4" />
            Valider cette commande
          </button>
        </div>
      )}
    </div>
  );
}

export function SelecteurApercuCommandesFournisseur({
  achats,
  afficherValidation = true,
}: {
  achats: Achat[];
  afficherValidation?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= achats.length && achats.length > 0) setIndex(0);
  }, [achats.length, index]);

  if (achats.length === 0) return null;
  const courant = achats[Math.min(index, achats.length - 1)];
  if (!courant) return null;

  return (
    <div className="space-y-4">
      {achats.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {achats.map((a, i) => (
            <button
              key={a.id}
              type="button"
              className={`btn ${i === index ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setIndex(i)}
            >
              {a.numero}
              {a.statut === "brouillon" ? " · aperçu" : ""}
            </button>
          ))}
        </div>
      )}
      <ApercuBonCommandeFournisseur
        key={courant.id}
        achat={courant}
        afficherValidation={afficherValidation}
      />
    </div>
  );
}
