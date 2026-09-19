"use client";

import { useCallback, useMemo, useState } from "react";
import { BookOpen, CircleAlert } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import {
  compteChargeProduit,
  compteUtiliseEnEcriture,
  compteVenteProduit,
  comptesParClasse,
  estCompteGeneriqueProduit,
  MSG_COMPTE_VERROUILLE,
  MSG_PRODUIT_SANS_COMPTE,
  moduleComptabiliteActif,
  produitsSansCompteSurLignes,
} from "@/lib/comptabilite";
import { libelleProduit } from "@/lib/produits";
import { produitEstVendable, typeAchatEstAttendu } from "@/lib/nature-stock";
import { useStore } from "@/lib/store";
import type { Produit } from "@/lib/types";

export function PastilleCompteManquant({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 ${className}`.trim()}
      title="Compte comptable manquant"
      aria-label="Compte comptable manquant"
    >
      <CircleAlert className="h-3.5 w-3.5" />
    </span>
  );
}

type NatureCompte = "charge" | "vente";

export function useAvertissementCompteProduit(nature: NatureCompte) {
  const parametres = useStore((s) => s.parametres);
  const moduleActif = moduleComptabiliteActif(parametres);
  const [pending, setPending] = useState<{
    produits: Produit[];
    onContinue: () => void;
  } | null>(null);
  const [edition, setEdition] = useState(false);

  const confirmerSiBesoin = useCallback(
    (
      lignes: Array<{ produitId?: string; type?: string }>,
      onContinue: () => void,
    ) => {
      if (!moduleActif) {
        onContinue();
        return;
      }
      const manquants = produitsSansCompteSurLignes(
        lignes,
        useStore.getState().produits,
        useStore.getState().comptesComptables,
        nature,
      );
      if (manquants.length === 0) {
        onContinue();
        return;
      }
      setEdition(false);
      setPending({ produits: manquants, onContinue });
    },
    [moduleActif, nature],
  );

  const relancerApresSaisie = useCallback(() => {
    if (!pending) return;
    const encore = produitsSansCompteSurLignes(
      pending.produits.map((p) => ({ produitId: p.id })),
      useStore.getState().produits,
      useStore.getState().comptesComptables,
      nature,
    );
    if (encore.length === 0) {
      const fn = pending.onContinue;
      setPending(null);
      setEdition(false);
      fn();
      return;
    }
    setEdition(false);
    setPending({ ...pending, produits: encore });
  }, [nature, pending]);

  const modal = pending ? (
    <AvertissementCompteProduitModal
      produit={pending.produits[0]!}
      restants={pending.produits.length}
      nature={nature}
      edition={edition}
      onContinuer={() => {
        const fn = pending.onContinue;
        setPending(null);
        setEdition(false);
        fn();
      }}
      onRenseigner={() => setEdition(true)}
      onCompteEnregistre={relancerApresSaisie}
      onRetourAvertissement={() => setEdition(false)}
      onFermer={() => {
        setPending(null);
        setEdition(false);
      }}
    />
  ) : null;

  return { confirmerSiBesoin, modal, moduleActif };
}

function AvertissementCompteProduitModal({
  produit,
  restants,
  nature,
  edition,
  onContinuer,
  onRenseigner,
  onCompteEnregistre,
  onRetourAvertissement,
  onFermer,
}: {
  produit: Produit;
  restants: number;
  nature: NatureCompte;
  edition: boolean;
  onContinuer: () => void;
  onRenseigner: () => void;
  onCompteEnregistre: () => void;
  onRetourAvertissement: () => void;
  onFermer: () => void;
}) {
  const peutModifier = useAuthStore((s) => s.hasPermission("parametres.gerer"));

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
      <div className="my-8 w-full max-w-lg rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg">
        {edition ? (
          <EditionCompteProduit
            key={produit.id}
            produit={produit}
            nature={nature}
            onAnnuler={onRetourAvertissement}
            onEnregistre={onCompteEnregistre}
          />
        ) : (
          <>
            <div className="mb-3 flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Compte comptable manquant
                </h2>
                <p className="mt-0.5 font-mono text-xs font-semibold text-sea-700">
                  {produit.code} — {libelleProduit(produit)}
                </p>
              </div>
            </div>
            <p className="text-sm text-ink">{MSG_PRODUIT_SANS_COMPTE}</p>
            {restants > 1 && (
              <p className="mt-2 text-xs text-muted">
                {restants} produits concernés. « Continuer » valide sans
                écriture pour toutes ces lignes.
              </p>
            )}
            {!peutModifier && (
              <p className="mt-2 text-xs text-amber-800">
                Seul un administrateur peut renseigner le compte sur la fiche
                produit.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onContinuer}
              >
                Continuer
              </button>
              {peutModifier && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onRenseigner}
                >
                  Renseigner le compte
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onFermer}
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditionCompteProduit({
  produit,
  nature,
  onAnnuler,
  onEnregistre,
}: {
  produit: Produit;
  nature: NatureCompte;
  onAnnuler: () => void;
  onEnregistre: () => void;
}) {
  const comptes = useStore((s) => s.comptesComptables);
  const categories = useStore((s) => s.categoriesProduits);
  const ecritures = useStore((s) => s.ecrituresComptables);
  const updateProduit = useStore((s) => s.updateProduit);
  const charge = compteChargeProduit(produit, comptes);
  const vente = compteVenteProduit(produit, comptes);
  const [compteChargeId, setCompteChargeId] = useState(charge?.id ?? "");
  const [compteVenteId, setCompteVenteId] = useState(vente?.id ?? "");

  const charges = useMemo(
    () =>
      comptesParClasse(comptes, "6").filter(
        (c) => !estCompteGeneriqueProduit(c) || c.id === compteChargeId,
      ),
    [comptes, compteChargeId],
  );
  const ventes = useMemo(
    () =>
      comptesParClasse(comptes, "7").filter(
        (c) => !estCompteGeneriqueProduit(c) || c.id === compteVenteId,
      ),
    [comptes, compteVenteId],
  );
  const chargeVerrouille = compteUtiliseEnEcriture(charge?.id, ecritures);
  const venteVerrouille = compteUtiliseEnEcriture(vente?.id, ecritures);

  function enregistrer() {
    const res = updateProduit(produit.id, {
      compteChargeId: typeAchatEstAttendu(produit)
        ? compteChargeId || undefined
        : undefined,
      compteVenteId: produitEstVendable(produit, categories)
        ? compteVenteId || undefined
        : undefined,
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    onEnregistre();
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold">
        Renseigner le compte
      </h2>
      <p className="mt-0.5 font-mono text-xs font-semibold text-sea-700">
        {produit.code} — {libelleProduit(produit)}
      </p>
      <p className="mt-2 text-sm text-muted">
        La saisie de la facture en cours est conservée.
      </p>
      <div className="mt-4 space-y-3">
        {typeAchatEstAttendu(produit) && (
        <label className="block text-xs font-semibold text-muted">
          Compte de charge (achat)
          <select
            className="select mt-1"
            value={compteChargeId}
            disabled={chargeVerrouille}
            autoFocus={nature === "charge"}
            onChange={(e) => setCompteChargeId(e.target.value)}
          >
            <option value="">— Choisir un compte de classe 6 —</option>
            {charges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero} — {c.libelle}
              </option>
            ))}
          </select>
        </label>
        )}
        {chargeVerrouille && typeAchatEstAttendu(produit) && (
          <p className="text-xs text-amber-800">{MSG_COMPTE_VERROUILLE}</p>
        )}
        {produitEstVendable(produit, categories) && (
        <label className="block text-xs font-semibold text-muted">
          Compte de vente
          <select
            className="select mt-1"
            value={compteVenteId}
            disabled={venteVerrouille}
            autoFocus={nature === "vente"}
            onChange={(e) => setCompteVenteId(e.target.value)}
          >
            <option value="">— Choisir un compte de classe 7 —</option>
            {ventes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero} — {c.libelle}
              </option>
            ))}
          </select>
        </label>
        )}
        {venteVerrouille && produitEstVendable(produit, categories) && (
          <p className="text-xs text-amber-800">{MSG_COMPTE_VERROUILLE}</p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={enregistrer}>
          Enregistrer le compte
        </button>
        <button type="button" className="btn btn-secondary" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </div>
  );
}
