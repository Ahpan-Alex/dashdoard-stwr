"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { CouvertureBarre } from "@/components/couverture-besoin";
import {
  badgeClasseBesoin,
  BESOIN_ACHAT_STATUT_LABELS,
  couvertureBesoin,
  lignesDuBesoin,
  modePaiementAchatVisible,
  statutBesoinAchat,
} from "@/lib/besoins-achat";
import {
  quantiteLivreeProduit,
  STATUT_ACHAT_LABELS,
  STATUT_LIVRAISON_LABELS,
  STATUT_PAIEMENT_LABELS,
  statutLivraisonAchat,
  statutPaiementAchat,
} from "@/lib/achats";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { libelleProduit } from "@/lib/produits";
import { TIERS_DIVERS_MARCHE_ID } from "@/lib/missions";
import { assurerTiers, estFournisseur } from "@/lib/tiers";
import { useStore } from "@/lib/store";
import { libelleModePaiement, modesPaiementActifs } from "@/lib/tresorerie";
import type { ModePaiement } from "@/lib/types";

export default function BesoinAchatDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const besoin = useStore((s) => (s.besoinsAchat ?? []).find((b) => b.id === id));
  const achats = useStore((s) => s.achats);
  const produits = useStore((s) => s.produits);
  const ofs = useStore((s) => s.ordresFabrication);
  const modesPaiement = useStore((s) => s.modesPaiement ?? []);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const clients = useStore((s) => s.clients);
  const fournisseursLegacy = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);
  const creerAchatDepuisBesoin = useStore((s) => s.creerAchatDepuisBesoin);
  const annulerBesoinAchat = useStore((s) => s.annulerBesoinAchat);
  const [ajouter, setAjouter] = useState(false);

  const fournisseurs = useMemo(
    () =>
      assurerTiers({
        clients,
        fournisseurs: fournisseursLegacy,
        tiers,
      }).filter(
        (t) =>
          t.actif !== false &&
          estFournisseur(t) &&
          t.id !== TIERS_DIVERS_MARCHE_ID &&
          !t.systeme,
      ),
    [clients, fournisseursLegacy, tiers],
  );

  if (!besoin) {
    return (
      <div>
        <PageHeader title="Besoin introuvable" showPosSelector={false} />
        <Link href="/besoins-achat" className="text-sm text-sea-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const produit = produits.find((p) => p.id === besoin.produitId);
  const cov = couvertureBesoin(besoin, achats);
  const st = statutBesoinAchat(besoin, achats);
  const rattachees = lignesDuBesoin(besoin, achats);
  const nomOf = (ofId: string) => ofs.find((o) => o.id === ofId)?.numero ?? "OF";
  const nomFrn = (fid: string) =>
    fournisseurs.find((f) => f.id === fid)?.nom ??
    fournisseursLegacy.find((f) => f.id === fid)?.nom ??
    "Fournisseur";

  return (
    <div>
      <Link
        href="/besoins-achat"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux besoins
      </Link>

      <PageHeader
        title={besoin.numero}
        description={`${produit ? `${produit.code} — ${libelleProduit(produit)}` : "Article"} · ${pointsDeVente.find((s) => s.id === besoin.pointDeVenteId)?.nom ?? "Site"}`}
        showPosSelector={false}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${badgeClasseBesoin(st)}`}>
              {BESOIN_ACHAT_STATUT_LABELS[st]}
            </span>
            {st !== "annule" && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setAjouter(true)}
              >
                <Plus className="h-4 w-4" />
                Ajouter une commande fournisseur
              </button>
            )}
            {st !== "annule" && st !== "couvert" && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (!confirm("Annuler ce besoin ? Les commandes déjà créées restent.")) return;
                  const res = annulerBesoinAchat(besoin.id);
                  if (!res.ok) alert(res.reason);
                }}
              >
                Annuler le besoin
              </button>
            )}
          </div>
        }
      />

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Couverture</h2>
        <CouvertureBarre
          commandee={cov.commandee}
          necessaire={cov.necessaire}
          unite={produit?.unite ?? ""}
        />
        <p className="mt-2 text-sm text-muted">
          Reliquat à trouver : {formatNumber(cov.reliquat)} {produit?.unite ?? ""}
          {cov.livree > 0
            ? ` · Livré ${formatNumber(cov.livree)} ${produit?.unite ?? ""}`
            : ""}
          {cov.nbFournisseurs > 0
            ? ` · ${cov.nbFournisseurs} fournisseur${cov.nbFournisseurs > 1 ? "s" : ""}`
            : ""}
        </p>
        {(besoin.repartitionsOf ?? []).length > 0 && (
          <ul className="mt-3 text-sm">
            {(besoin.repartitionsOf ?? []).map((r) => (
              <li key={r.id}>
                <Link href={`/fabrication/${r.ofId}`} className="text-sea-800 hover:underline">
                  {nomOf(r.ofId)}
                </Link>
                {" · "}
                {formatNumber(r.quantite)} {produit?.unite ?? ""}
              </li>
            ))}
          </ul>
        )}
        {besoin.note && <p className="mt-2 text-sm text-muted">{besoin.note}</p>}
      </section>

      {ajouter && st !== "annule" && (
        <FormulaireCommandeBesoin
          reliquat={cov.reliquat || besoin.quantiteNecessaire}
          unite={produit?.unite ?? ""}
          prixDefaut={produit?.prixAchat ?? 0}
          siteDefaut={besoin.pointDeVenteId}
          sites={pointsDeVente.filter((s) => s.actif)}
          fournisseurs={fournisseurs.map((f) => ({ id: f.id, nom: f.nom }))}
          onClose={() => setAjouter(false)}
          onSubmit={(payload) => {
            const res = creerAchatDepuisBesoin({ besoinId: besoin.id, ...payload });
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setAjouter(false);
          }}
        />
      )}

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Commandes rattachées
        </h2>
        {rattachees.length === 0 ? (
          <p className="text-sm text-muted">
            Aucune commande. Ajoutez un fournisseur, un PU et un mode de paiement pour
            couvrir une partie du besoin.
          </p>
        ) : (
          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Fournisseur</th>
                  <th>Quantité</th>
                  <th>PU HT</th>
                  <th>Mode de paiement</th>
                  <th>Paiement</th>
                  <th>Livraison</th>
                  <th>Facture</th>
                </tr>
              </thead>
              <tbody>
                {rattachees.map(({ achat, ligne }) => {
                  const mode = modePaiementAchatVisible(achat);
                  const liv = ligne.produitId
                    ? quantiteLivreeProduit(achat, ligne.produitId)
                    : 0;
                  return (
                    <tr key={`${achat.id}-${ligne.id}`}>
                      <td>
                        <Link
                          href={`/achats?id=${achat.id}`}
                          className="font-semibold text-sea-800 hover:underline"
                        >
                          {achat.numero}
                        </Link>
                        <p className="text-[11px] text-muted">
                          {STATUT_ACHAT_LABELS[achat.statut]} · {formatDate(achat.date)}
                        </p>
                      </td>
                      <td>{nomFrn(achat.fournisseurId)}</td>
                      <td>
                        {formatNumber(ligne.quantite)} {produit?.unite ?? ""}
                        {liv > 0 && (
                          <p className="text-[11px] text-muted">
                            livré {formatNumber(liv)}
                          </p>
                        )}
                      </td>
                      <td>{formatCurrency(ligne.prixAchatUnitaire)}</td>
                      <td>
                        {mode ? libelleModePaiement(mode, modesPaiement) : "—"}
                      </td>
                      <td>{STATUT_PAIEMENT_LABELS[statutPaiementAchat(achat)]}</td>
                      <td>{STATUT_LIVRAISON_LABELS[statutLivraisonAchat(achat)]}</td>
                      <td>{achat.numeroFactureFournisseur || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FormulaireCommandeBesoin({
  reliquat,
  unite,
  prixDefaut,
  siteDefaut,
  sites,
  fournisseurs,
  onClose,
  onSubmit,
}: {
  reliquat: number;
  unite: string;
  prixDefaut: number;
  siteDefaut: string;
  sites: { id: string; nom: string }[];
  fournisseurs: { id: string; nom: string }[];
  onClose: () => void;
  onSubmit: (data: {
    fournisseurId: string;
    quantite: number;
    prixAchatUnitaire: number;
    modePaiement: ModePaiement;
    pointDeVenteId?: string;
    note?: string;
  }) => void;
}) {
  const [fournisseurId, setFournisseurId] = useState(fournisseurs[0]?.id ?? "");
  const [quantite, setQuantite] = useState(String(reliquat));
  const [pu, setPu] = useState(String(prixDefaut));
  const [mode, setMode] = useState<ModePaiement>("virement");
  const modesPaiement = useStore((s) => s.modesPaiement ?? []);
  const [siteId, setSiteId] = useState(siteDefaut);
  const [note, setNote] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!fournisseurId) return;
    onSubmit({
      fournisseurId,
      quantite: Number(quantite) || 0,
      prixAchatUnitaire: Number(pu) || 0,
      modePaiement: mode,
      pointDeVenteId: siteId,
      note: note.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5"
    >
      <h2 className="mb-3 font-display text-lg font-semibold">
        Nouvelle commande fournisseur
      </h2>
      <p className="mb-3 text-xs text-muted">
        Commande indépendante : fournisseur, PU, mode de paiement et facture propres.
        Reliquat actuel {formatNumber(reliquat)} {unite}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted">
          Fournisseur
          <select
            className="select mt-1"
            value={fournisseurId}
            onChange={(e) => setFournisseurId(e.target.value)}
            required
          >
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Quantité
          <input
            type="number"
            min={0}
            step="any"
            className="input mt-1"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          PU HT (Ar)
          <input
            type="number"
            min={0}
            step="any"
            className="input mt-1"
            value={pu}
            onChange={(e) => setPu(e.target.value)}
            required
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Mode de paiement
          <select
            className="select mt-1"
            value={mode}
            onChange={(e) => setMode(e.target.value as ModePaiement)}
          >
            {modesPaiementActifs(modesPaiement).map((m) => (
              <option key={m.id} value={m.id}>
                {m.libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Site
          <select
            className="select mt-1"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Note
          <input
            className="input mt-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={!fournisseurId}>
          Créer la commande
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
