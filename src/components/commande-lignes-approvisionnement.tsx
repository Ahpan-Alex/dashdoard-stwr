"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import { isLigneProduit } from "@/lib/commercial";
import {
  MODE_APPROVISIONNEMENT_LABELS,
  STATUT_LIGNE_FABRICATION,
  STATUT_LIGNE_SUR_STOCK,
  lignesFabricationSansNomenclature,
  ligneEstFabricationCommande,
  manquesMatieresCommande,
  modeApprovisionnementLigne,
  ofsLiesALaLigne,
  statutLigneFabrication,
  statutLigneSurStock,
} from "@/lib/mode-approvisionnement";
import { siteEstAtelier } from "@/lib/sites";
import { stockDisponible } from "@/lib/calculations";
import { useStore } from "@/lib/store";
import type { Commande, LigneDocument } from "@/lib/types";

function useContexteAppro() {
  const produits = useStore((s) => s.produits);
  const categoriesProduits = useStore((s) => s.categoriesProduits);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const entrees = useStore((s) => s.entrees);
  const ventes = useStore((s) => s.ventes);
  const inventaires = useStore((s) => s.inventaires);
  const ordresFabrication = useStore((s) => s.ordresFabrication);
  const bonsDeLivraison = useStore((s) => s.bonsDeLivraison);
  const creerBesoinAchat = useStore((s) => s.creerBesoinAchat);
  const creerOrdreFabrication = useStore((s) => s.creerOrdreFabrication);
  return {
    produits,
    categoriesProduits,
    pointsDeVente,
    entrees,
    ventes,
    inventaires,
    ordresFabrication,
    bonsDeLivraison,
    creerBesoinAchat,
    creerOrdreFabrication,
  };
}

export function AlerteMatieresCommande({
  lignes,
  pointDeVenteId,
}: {
  lignes: LigneDocument[];
  pointDeVenteId: string;
}) {
  const router = useRouter();
  const ctx = useContexteAppro();
  const [erreur, setErreur] = useState<string | null>(null);
  const commande = useMemo(
    () => ({ lignes, pointDeVenteId }),
    [lignes, pointDeVenteId],
  );
  const manques = manquesMatieresCommande({
    commande,
    produits: ctx.produits,
    categories: ctx.categoriesProduits,
    sites: ctx.pointsDeVente,
    entrees: ctx.entrees,
    ventes: ctx.ventes,
    inventaires: ctx.inventaires,
  });
  const sansNomenclature = lignesFabricationSansNomenclature(
    commande,
    ctx.produits,
  );
  if (manques.length === 0 && sansNomenclature.length === 0) return null;

  const siteOk = Boolean(pointDeVenteId) && pointDeVenteId !== "tous";

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
      <p className="font-semibold">Matières manquantes</p>
      <p className="mt-1 text-muted">
        La commande peut être validée. Les articles ci-dessous se traitent dans
        Achats.
      </p>
      {sansNomenclature.length > 0 && (
        <p className="mt-2">
          Nomenclature absente pour {sansNomenclature.join(", ")}. Le contrôle
          des matières ne peut pas se faire.
        </p>
      )}
      {manques.length > 0 && (
        <ul className="mt-2 space-y-2">
          {manques.map((m) => (
            <li
              key={m.composantId}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                {m.code ? `${m.code} — ` : ""}
                {m.libelle} : manque {formatNumber(m.manque)} {m.unite} (besoin{" "}
                {formatNumber(m.besoin)}, disponible {formatNumber(m.disponible)}
                )
              </span>
              {m.achetable ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!siteOk}
                  title={
                    siteOk
                      ? "Créer une demande d'achat"
                      : "Choisissez le site de la commande"
                  }
                  onClick={() => {
                    const res = ctx.creerBesoinAchat({
                      produitId: m.composantId,
                      quantiteNecessaire: m.manque,
                      pointDeVenteId,
                      note: "Matières manquantes — fabrication sur commande",
                    });
                    if (!res.ok) {
                      setErreur(res.reason);
                      return;
                    }
                    router.push(`/besoins-achat/${res.id}`);
                  }}
                >
                  Demande d&apos;achat
                </button>
              ) : (
                <Link href="/fabrication" className="text-sm font-semibold text-sea-800">
                  À fabriquer en amont
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2">
        <Link href="/achats" className="font-semibold text-sea-800">
          Ouvrir Achats
        </Link>
      </p>
      {erreur && <p className="mt-2 text-xs font-medium text-danger">{erreur}</p>}
    </div>
  );
}

export function PanneauApprovisionnementCommande({
  commande,
}: {
  commande: Commande;
}) {
  const ctx = useContexteAppro();
  const ateliers = ctx.pointsDeVente.filter(
    (s) => s.actif && siteEstAtelier(s),
  );
  const [atelierId, setAtelierId] = useState(ateliers[0]?.id ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const lignes = commande.lignes.filter((l) => isLigneProduit(l) && l.produitId);
  if (lignes.length === 0) return null;

  const atelierChoisi = ateliers.some((a) => a.id === atelierId)
    ? atelierId
    : (ateliers[0]?.id ?? "");

  return (
    <div className="mt-3 rounded-[var(--radius)] border border-line bg-card px-4 py-3 text-sm no-print">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Approvisionnement des lignes
      </p>
      {lignes.some((l) =>
        ligneEstFabricationCommande(
          l,
          ctx.produits.find((p) => p.id === l.produitId),
        ),
      ) && (
        <div className="mb-3">
          {ateliers.length === 0 ? (
            <p className="text-muted">
              Créez un site de type atelier dans Paramètres → Sites pour lancer
              un ordre de fabrication.
            </p>
          ) : ateliers.length > 1 ? (
            <label className="block text-xs">
              Atelier
              <select
                className="select mt-1 max-w-xs"
                value={atelierChoisi}
                onChange={(e) => setAtelierId(e.target.value)}
              >
                {ateliers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs text-muted">Atelier : {ateliers[0]?.nom}</p>
          )}
        </div>
      )}
      <ul className="space-y-2">
        {lignes.map((l) => {
          const produit = ctx.produits.find((p) => p.id === l.produitId);
          const mode = modeApprovisionnementLigne(l, produit);
          if (!mode) return null;
          const fabrication = mode === "fabrication_commande";
          const ofs = fabrication
            ? ofsLiesALaLigne(l, commande.id, ctx.ordresFabrication)
            : [];
          const statutFab = fabrication
            ? statutLigneFabrication(l, commande.id, ctx.ordresFabrication)
            : null;
          const statutStock = !fabrication
            ? statutLigneSurStock({
                ligne: l,
                commande,
                bons: ctx.bonsDeLivraison,
                stockDispo: stockDisponible(
                  l.produitId ?? "",
                  commande.pointDeVenteId,
                  ctx.entrees,
                  ctx.ventes,
                  ctx.inventaires,
                ),
              })
            : null;
          return (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                <span className="font-medium">{l.designation}</span>
                <span className="ml-2 text-xs text-muted">
                  {MODE_APPROVISIONNEMENT_LABELS[mode]}
                </span>
                {statutFab && (
                  <span className="badge badge-sand ml-2">
                    {STATUT_LIGNE_FABRICATION[statutFab]}
                  </span>
                )}
                {statutStock && (
                  <span
                    className={`badge ml-2 ${
                      statutStock === "livree"
                        ? "badge-success"
                        : statutStock === "stock_insuffisant"
                          ? "badge-danger"
                          : "badge-sea"
                    }`}
                  >
                    {STATUT_LIGNE_SUR_STOCK[statutStock]}
                  </span>
                )}
              </span>
              {fabrication && ofs.length > 0 && (
                <span className="flex flex-wrap gap-2">
                  {ofs.map((o) => (
                    <Link
                      key={o.id}
                      href={`/fabrication/${o.id}`}
                      className="font-semibold text-sea-800"
                    >
                      {o.numero}
                    </Link>
                  ))}
                </span>
              )}
              {fabrication && ofs.length === 0 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!atelierChoisi || !l.produitId}
                  onClick={() => {
                    if (!atelierChoisi || !l.produitId) return;
                    const res = ctx.creerOrdreFabrication({
                      atelierId: atelierChoisi,
                      produitId: l.produitId,
                      quantitePrevue: l.quantite,
                      commandeId: commande.id,
                      ligneCommandeId: l.id,
                      dimensionLargeur: l.largeurM,
                      dimensionHauteur: l.hauteurM,
                    });
                    if (!res.ok) setErreur(res.reason);
                  }}
                >
                  Créer l&apos;ordre de fabrication
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {erreur && <p className="mt-2 text-xs font-medium text-danger">{erreur}</p>}
      <div className="mt-3">
        <AlerteMatieresCommande
          lignes={commande.lignes}
          pointDeVenteId={commande.pointDeVenteId}
        />
      </div>
    </div>
  );
}

/** Pastilles des lignes à fabriquer, à côté des badges de livraison. */
export function ResumeLignesFabrication({ commande }: { commande: Commande }) {
  const produits = useStore((s) => s.produits);
  const ofs = useStore((s) => s.ordresFabrication);
  const comptes = new Map<string, number>();
  for (const l of commande.lignes) {
    if (!isLigneProduit(l)) continue;
    const produit = produits.find((p) => p.id === l.produitId);
    if (!ligneEstFabricationCommande(l, produit)) continue;
    const label =
      STATUT_LIGNE_FABRICATION[
        statutLigneFabrication(l, commande.id, ofs)
      ];
    comptes.set(label, (comptes.get(label) ?? 0) + 1);
  }
  if (comptes.size === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {[...comptes.entries()].map(([label, n]) => (
        <span key={label} className="badge badge-sand">
          {n > 1 ? `${n} × ` : ""}
          {label}
        </span>
      ))}
    </div>
  );
}
