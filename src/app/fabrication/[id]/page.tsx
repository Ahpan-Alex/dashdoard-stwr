"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PastilleCompteManquant } from "@/components/avertissement-compte-produit";
import { PageHeader } from "@/components/page-header";
import {
  atelierSansTauxMod,
  coutMod,
  coutsNonAffectes,
  depassementNomenclature,
  lignesMainOeuvre,
  OF_STATUT_LABELS,
  ofEstVerrouille,
  ofPeutMouvementer,
  quantiteProduite,
  quantiteSortieComposant,
  quantiteTheoriqueComposantOf,
  reliquatsMatieres,
  stockDisponibleComposant,
  tauxHoraireModAtelier,
} from "@/lib/fabrication";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { createId } from "@/lib/id";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import { natureStockDuProduit, produitEstAchetable } from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import { siteEstAtelier, sitesMagasin } from "@/lib/sites";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import { resoudreDemarrageOf } from "@/lib/of-derogation-bat";
import {
  BAT_STATUTS,
  batCourant,
  commandeABatValide,
  motifBatOfManquant,
} from "@/lib/bat";
import { fournisseurPrioritaireId } from "@/lib/classement-fournisseurs";
import type {
  NatureStock,
  OfNomenclatureLigne,
  OrdreFabricationStatut,
  PointDeVente,
} from "@/lib/types";

function badgeOf(statut: OrdreFabricationStatut) {
  if (statut === "cloture") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  if (statut === "annule" || statut === "cloture_annule") return "badge-danger";
  return "badge-sea";
}

const VALIDATION_LABELS: Record<string, string> = {
  demarrer: "Démarrage",
  confirmer_cloture: "Clôture confirmée",
  annuler_cloture: "Clôture annulée",
  retour_edition: "Retour à l'édition",
  annuler_document: "Annulation",
};

export default function OrdreFabricationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const of = useStore((s) => s.ordresFabrication.find((o) => o.id === id));
  const produits = useStore((s) => s.produits);
  const commandes = useStore((s) => s.commandes);
  const bats = useStore((s) => s.bonsATirer ?? []);
  const achats = useStore((s) => s.achats.filter((a) => a.ofId === id));
  const fournisseurs = useStore((s) => s.fournisseurs);
  const entrees = useStore((s) => s.entrees);
  const ventes = useStore((s) => s.ventes);
  const inventaires = useStore((s) => s.inventaires);
  const {
    demarrerOrdreFabrication,
    modifierOrdreFabrication,
    ajouterSortieOf,
    supprimerSortieOf,
    ajouterFraisOf,
    supprimerFraisOf,
    ajouterMainOeuvreOf,
    supprimerMainOeuvreOf,
    enregistrerEntreeProductionOf,
    cloturerOrdreFabrication,
    annulerOrdreFabrication,
    creerDemandeAchatDepuisOf,
  } = useStore();
  const { visibles, rattache } = useSitesVisibles();
  const tousSites = useStore((s) => s.pointsDeVente);
  const magasins = sitesMagasin(tousSites);
  const ateliers = tousSites.filter((s) => s.actif && siteEstAtelier(s) && rattache(s.id));
  const lignesMod = of ? lignesMainOeuvre(of) : [];

  const [clotureOpen, setClotureOpen] = useState(false);
  const [da, setDa] = useState<{ composantId: string; manquant: number } | null>(null);

  const nomSite = (sid: string) =>
    tousSites.find((s) => s.id === sid)?.nom ?? visibles.find((s) => s.id === sid)?.nom ?? "Site";

  if (!of) {
    return (
      <div>
        <PageHeader title="OF introuvable" showPosSelector={false} />
        <Link href="/fabrication" className="text-sm text-sea-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const produit = produits.find((p) => p.id === of.produitId);
  const commande = commandes.find((c) => c.id === of.commandeId);
  const pot = coutsNonAffectes(of);
  const produite = quantiteProduite(of);
  const verrouille = ofEstVerrouille(of);
  const enCours = ofPeutMouvementer(of);
  const brouillon = of.statut === "brouillon";
  const depassements = depassementNomenclature(of);

  function lancer() {
    const premier = demarrerOrdreFabrication(of!.id);
    resoudreDemarrageOf(premier, () =>
      demarrerOrdreFabrication(of!.id, { derogationBat: true }),
    );
  }

  function annuler() {
    const msg =
      of!.statut === "cloture"
        ? "Annuler cet OF clôturé par contre-mouvement ? Les mouvements d'origine restent tracés."
        : "Annuler cet ordre de fabrication ?";
    if (!confirm(msg)) return;
    const res = annulerOrdreFabrication(of!.id);
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title={of.numero}
        description="Sorties de matières valorisées au CUMP du site source, pot de coûts non affectés, entrées de production progressives. Aucune écriture comptable."
        showPosSelector={false}
        actions={
          <Link href="/fabrication" className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Liste
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`badge ${badgeOf(of.statut)}`}>{OF_STATUT_LABELS[of.statut]}</span>
        {commande && (
          <Link href="/commandes/liste" className="badge badge-sea">
            Commande {commande.numero}
          </Link>
        )}
        {commande && (
          <Link href="/commandes/bat" className={`badge ${commandeABatValide(bats, commande.id) ? "badge-success" : "badge-sand"}`}>
            BAT{" "}
            {commandeABatValide(bats, commande.id)
              ? "validé"
              : batCourant(bats, commande.id)
                ? BAT_STATUTS[batCourant(bats, commande.id)!.statut]
                : "manquant"}
          </Link>
        )}
        {of.derogationBat && (
          <span className="badge badge-sand" title={of.derogationBatUserNom}>
            Dérogation BAT
            {of.derogationBatUserNom ? ` · ${of.derogationBatUserNom}` : ""}
          </span>
        )}
        {of.statut === "cloture_annule" && (
          <span className="text-xs text-muted">Contre-mouvement enregistré — rien n&apos;a été supprimé.</span>
        )}
      </div>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">En-tête</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Atelier</span>
            <br />
            {nomSite(of.atelierId)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Produit</span>
            <br />
            {produit ? `${produit.code} — ${libelleProduit(produit)}` : "—"}
          </p>
          <label className="block text-xs font-semibold text-muted">
            Quantité prévue
            <input
              type="number"
              min={0}
              step="any"
              className="input mt-1"
              disabled={!brouillon && !enCours}
              value={of.quantitePrevue}
              onChange={(e) =>
                modifierOrdreFabrication(of.id, { quantitePrevue: Number(e.target.value) || 0 })
              }
            />
          </label>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Nomenclature</span>
            <br />
            {of.nomenclatureNom} ({of.nomenclatureSource === "alternative" ? "alternative" : "standard"})
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Créé</span>
            <br />
            {formatDateTime(of.dateCreation)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Clôture prévue / réelle</span>
            <br />
            {of.dateCloturePrevue ? formatDate(of.dateCloturePrevue) : "—"}
            {" / "}
            {of.dateClotureReelle ? formatDateTime(of.dateClotureReelle) : "—"}
          </p>
        </div>
        {brouillon && motifBatOfManquant(of, bats) && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {motifBatOfManquant(of, bats)}{" "}
            <Link href="/commandes/bat" className="underline">
              Ouvrir les BAT
            </Link>
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {brouillon && (
            <button type="button" className="btn btn-primary" onClick={lancer}>
              Démarrer l&apos;OF
            </button>
          )}
          {enCours && (
            <button type="button" className="btn btn-primary" onClick={() => setClotureOpen(true)}>
              Clôturer
            </button>
          )}
          {!verrouille && (
            <button type="button" className="btn btn-secondary" onClick={annuler}>
              Annuler l&apos;OF
            </button>
          )}
          {of.statut === "cloture" && (
            <button type="button" className="btn btn-secondary" onClick={annuler}>
              Annuler par contre-mouvement
            </button>
          )}
        </div>
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Nomenclature de cet OF</h2>
        <p className="mb-3 text-xs text-muted">
          Éditable pour cet OF uniquement — la fiche produit n&apos;est pas modifiée.
        </p>
        <NomenclatureOf
          lignes={of.nomenclatureLignes}
          disabled={verrouille}
          produits={produits.filter((p) => p.id !== of.produitId && p.actif)}
          onChange={(nomenclatureLignes) =>
            modifierOrdreFabrication(of.id, { nomenclatureLignes })
          }
        />
      </section>

      <div className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-sea-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-sea-800">
          Pot de coûts non affectés
        </p>
        <p className="mt-1 font-display text-2xl font-semibold">
          {formatCurrency(pot.total)}
        </p>
        <p className="text-xs text-muted">
          Matières {formatCurrency(pot.totalSorties)} + frais{" "}
          {formatCurrency(pot.totalFrais)} + MOD {formatCurrency(pot.totalMod)} depuis
          la dernière entrée de production. Produit : {formatNumber(produite)} /{" "}
          {formatNumber(of.quantitePrevue)}.
        </p>
      </div>

      {depassements.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Les sorties dépassent la nomenclature × quantité prévue
          {depassements
            .map((d) => {
              const p = produits.find((x) => x.id === d.composantId);
              return ` (${p?.code ?? d.composantId} : ${formatNumber(d.sorti)} / ${formatNumber(d.prevu)})`;
            })
            .join("")}
          . Alerte non bloquante.
        </p>
      )}

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Sorties de matières</h2>
        {enCours && (
          <FormSortie
            composants={produits.filter(
              (p) =>
                p.actif &&
                p.id !== of.produitId &&
                natureStockDuProduit(p) !== "fini",
            )}
            sites={tousSites.filter((s) => s.actif && rattache(s.id))}
            ateliers={ateliers}
            defaultSite={of.atelierId}
            defaultAtelier={of.atelierId}
            onAjouter={(data) => {
              const res = ajouterSortieOf(of.id, data);
              if (!res.ok) alert(res.reason);
            }}
          />
        )}
        <div className="table-shell mt-3">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Composant</th>
                <th>Site source</th>
                <th>Quantité</th>
                <th>CUMP sortie</th>
                <th>Valeur</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {of.sorties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-sm text-muted">
                    Aucune sortie.
                  </td>
                </tr>
              ) : (
                of.sorties.map((s) => {
                  const c = produits.find((p) => p.id === s.composantId);
                  return (
                    <tr key={s.id}>
                      <td>{formatDate(s.date)}</td>
                      <td>{c ? `${c.code} — ${libelleProduit(c)}` : s.composantId}</td>
                      <td>{nomSite(s.siteSourceId)}</td>
                      <td>{formatNumber(s.quantite)}</td>
                      <td>{formatCurrency(s.cumpSortie)}</td>
                      <td>{formatCurrency(s.valeur)}</td>
                      <td>
                        {enCours && !s.affecteEntreeId && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => {
                              const res = supprimerSortieOf(of.id, s.id);
                              if (!res.ok) alert(res.reason);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {enCours && (
          <div className="mt-4 space-y-2">
            {of.nomenclatureLignes.map((l) => {
              const c = produits.find((p) => p.id === l.composantId);
              if (!c) return null;
              const besoin = quantiteTheoriqueComposantOf(of, l.composantId);
              const sorti = quantiteSortieComposant(of, l.composantId);
              const manquant = Math.max(0, besoin - sorti);
              const dispo = stockDisponibleComposant({
                produitId: l.composantId,
                siteId: of.atelierId,
                entrees,
                ventes,
                inventaires,
              });
              if (dispo + 1e-9 >= manquant || manquant <= 0) return null;
              return (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
                >
                  <span>
                    Stock insuffisant pour {c.code} (besoin restant {formatNumber(manquant)},
                    dispo atelier {formatNumber(dispo)}).
                  </span>
                  {produitEstAchetable(c) ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDa({ composantId: c.id, manquant })}
                    >
                      Créer une demande d&apos;achat
                    </button>
                  ) : (
                    <span className="text-xs text-muted">
                      Semi-fini : créez un OF amont ou un transfert.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Frais additionnels</h2>
        {enCours && (
          <FormFrais
            onAjouter={(data) => {
              const res = ajouterFraisOf(of.id, data);
              if (!res.ok) alert(res.reason);
            }}
          />
        )}
        <ul className="mt-3 space-y-1 text-sm">
          {of.frais.length === 0 && <li className="text-muted">Aucun frais.</li>}
          {of.frais.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 border-b border-line/50 py-1">
              <span>
                {formatDate(f.date)} — {f.libelle} — {formatCurrency(f.montant)}
                {f.affecteEntreeId ? " · affecté" : ""}
              </span>
              {enCours && !f.affecteEntreeId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const res = supprimerFraisOf(of.id, f.id);
                    if (!res.ok) alert(res.reason);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Main d&apos;œuvre directe (MOD)
        </h2>
        <p className="mb-3 text-xs text-muted">
          Coût = temps passé × taux horaire de l&apos;atelier, figé à la saisie.
          Un OF multi-ateliers additionne les lignes.
        </p>
        {enCours && (
          <FormMainOeuvre
            ateliers={ateliers}
            defaultAtelier={of.atelierId}
            onAjouter={(data) => {
              const res = ajouterMainOeuvreOf(of.id, data);
              if (!res.ok) alert(res.reason);
            }}
          />
        )}
        <ul className="mt-3 space-y-1 text-sm">
          {lignesMod.length === 0 && <li className="text-muted">Aucune saisie MOD.</li>}
          {lignesMod.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 border-b border-line/50 py-1"
            >
              <span>
                {formatDate(m.date)} — {nomSite(m.atelierId)} —{" "}
                {formatNumber(m.heures, 2)} h × {formatCurrency(m.tauxHoraire)}
                {" = "}
                {formatCurrency(m.montant)}
                {m.tauxHoraire <= 0 ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-800">
                    <PastilleCompteManquant />
                    taux à 0
                  </span>
                ) : null}
                {m.affecteEntreeId ? " · affecté" : ""}
              </span>
              {enCours && !m.affecteEntreeId && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const res = supprimerMainOeuvreOf(of.id, m.id);
                    if (!res.ok) alert(res.reason);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Entrées de production</h2>
        <p className="mb-3 text-xs text-muted">
          Coût unitaire = pot de coûts non affectés (matières + frais + MOD) ÷ quantité de l&apos;entrée. Une ou plusieurs
          entrées, sans configuration. Une fois validée, l&apos;entrée est figée et le CUMP de
          l&apos;atelier est recalculé.
        </p>
        {enCours && (
          <FormProduction
            pot={pot.total}
            onAjouter={(data) => {
              const res = enregistrerEntreeProductionOf(of.id, data);
              if (!res.ok) alert(res.reason);
            }}
          />
        )}
        <div className="table-shell mt-3">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Quantité</th>
                <th>Coût unitaire</th>
                <th>Coût total</th>
              </tr>
            </thead>
            <tbody>
              {of.entreesProduction.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-sm text-muted">
                    Aucune entrée. Vous pouvez tout entrer à la clôture, ou progressivement.
                  </td>
                </tr>
              ) : (
                of.entreesProduction.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.date)}</td>
                    <td>{formatNumber(e.quantite)}</td>
                    <td>{formatCurrency(e.coutUnitaire)}</td>
                    <td>{formatCurrency(e.coutTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {of.ecart && of.ecart.montant > 0 && (
        <section className="mb-6 rounded-[var(--radius)] border border-amber-300 bg-amber-50 p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">Écart de fabrication</h2>
          <p className="text-lg font-semibold">{formatCurrency(of.ecart.montant)}</p>
          <p className="text-sm text-muted">
            {of.ecart.raison || "Aucune raison saisie (rebut, casse, erreur de sortie…)."}
          </p>
        </section>
      )}

      {of.retoursMatieres.length > 0 && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Matières non consommées</h2>
          <ul className="space-y-1 text-sm">
            {of.retoursMatieres.map((r) => {
              const c = produits.find((p) => p.id === r.composantId);
              return (
                <li key={r.id}>
                  {c?.code} · {formatNumber(r.quantite)} · {formatCurrency(r.cumpOrigine)} / u. →{" "}
                  {r.destination === "magasin" ? "magasin" : "atelier"} ({nomSite(r.siteDestinataireId)})
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {achats.length > 0 && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Achats liés</h2>
          <ul className="text-sm">
            {achats.map((a) => (
              <li key={a.id}>
                <Link href="/achats" className="text-sea-800">
                  {a.numero}
                </Link>{" "}
                — {a.statut}
              </li>
            ))}
          </ul>
        </section>
      )}

      {of.validations.length > 0 && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Historique de validation</h2>
          <ul className="space-y-1 text-sm">
            {of.validations.map((v) => (
              <li key={v.id}>
                {VALIDATION_LABELS[v.action] ?? v.action} — {v.userNom || "utilisateur"} le{" "}
                {formatDateTime(v.date)}
                {v.detail ? ` · ${v.detail}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {clotureOpen && (
        <ClotureModal
          reliquats={reliquatsMatieres(of)}
          produits={produits}
          atelierId={of.atelierId}
          magasins={magasins}
          nomSite={nomSite}
          potRestant={pot.total}
          onClose={() => setClotureOpen(false)}
          onConfirmer={(payload) => {
            const res = cloturerOrdreFabrication(of.id, payload);
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setClotureOpen(false);
          }}
        />
      )}

      {da && (
        <DemandeAchatModal
          composant={produits.find((p) => p.id === da.composantId)}
          manquant={da.manquant}
          fournisseurs={fournisseurs.filter((f) => f.actif)}
          fournisseurDefaut={
            fournisseurPrioritaireId(produits.find((p) => p.id === da.composantId), {
              achats: useStore.getState().achats,
              demandesPrix: useStore.getState().demandesPrix,
            }) ?? fournisseurs.filter((f) => f.actif)[0]?.id
          }
          siteDefaut={magasins[0]?.id ?? of.atelierId}
          sites={tousSites.filter((s) => s.actif)}
          onClose={() => setDa(null)}
          onCreer={(payload) => {
            const res = creerDemandeAchatDepuisOf(of.id, {
              composantId: da.composantId,
              ...payload,
            });
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setDa(null);
            router.push("/achats");
          }}
        />
      )}
    </div>
  );
}

function NomenclatureOf({
  lignes,
  disabled,
  produits,
  onChange,
}: {
  lignes: OfNomenclatureLigne[];
  disabled: boolean;
  produits: {
    id: string;
    code: string;
    libelleCourt: string;
    libelleLong: string;
    natureStock?: NatureStock;
  }[];
  onChange: (lignes: OfNomenclatureLigne[]) => void;
}) {
  const composants = produits.filter((p) => {
    const n = natureStockDuProduit(p);
    return n === "matiere_premiere" || n === "semi_fini";
  });
  return (
    <div>
      <table className="data">
        <thead>
          <tr>
            <th>Composant</th>
            <th>Qté / unité fabriquée</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id}>
              <td>
                <select
                  className="select"
                  disabled={disabled}
                  value={l.composantId}
                  onChange={(e) =>
                    onChange(lignes.map((x) => (x.id === l.id ? { ...x, composantId: e.target.value } : x)))
                  }
                >
                  {composants.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {libelleProduit(c)}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="input"
                  disabled={disabled}
                  value={l.quantiteUnitaire}
                  onChange={(e) =>
                    onChange(
                      lignes.map((x) =>
                        x.id === l.id ? { ...x, quantiteUnitaire: Number(e.target.value) || 0 } : x,
                      ),
                    )
                  }
                />
              </td>
              <td>
                {!disabled && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onChange(lignes.filter((x) => x.id !== l.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!disabled && (
        <button
          type="button"
          className="btn btn-secondary mt-2"
          onClick={() => {
            const premier = composants.find((c) => !lignes.some((l) => l.composantId === c.id));
            if (!premier) return;
            onChange([
              ...lignes,
              { id: createId("ofnl"), composantId: premier.id, quantiteUnitaire: 1 },
            ]);
          }}
        >
          <Plus className="h-4 w-4" />
          Ajouter un composant
        </button>
      )}
    </div>
  );
}

function FormSortie({
  composants,
  sites,
  ateliers,
  defaultSite,
  defaultAtelier,
  onAjouter,
}: {
  composants: { id: string; code: string; libelleCourt: string; libelleLong: string }[];
  sites: PointDeVente[];
  ateliers: PointDeVente[];
  defaultSite: string;
  defaultAtelier: string;
  onAjouter: (data: {
    date: string;
    composantId: string;
    siteSourceId: string;
    quantite: number;
    heures?: number;
    atelierIdMod?: string;
  }) => void;
}) {
  const [composantId, setComposantId] = useState(composants[0]?.id ?? "");
  const [siteSourceId, setSiteSourceId] = useState(defaultSite);
  const [quantite, setQuantite] = useState("1");
  const [heures, setHeures] = useState("");
  const [atelierId, setAtelierId] = useState(defaultAtelier);
  const [date, setDate] = useState(jourLocalISO());

  const siteSource = sites.find((s) => s.id === siteSourceId);
  const atelierEffectifId =
    siteSource && siteEstAtelier(siteSource) ? siteSourceId : atelierId;
  const atelier = ateliers.find((s) => s.id === atelierEffectifId);
  const taux = tauxHoraireModAtelier(atelier);
  const heuresNum = Number(heures) || 0;
  const manqueTaux = heuresNum > 0 && atelierSansTauxMod(atelier);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!composantId || !siteSourceId) return;
    onAjouter({
      date: isoMidiDepuisJour(date),
      composantId,
      siteSourceId,
      quantite: Number(quantite) || 0,
      heures: heuresNum > 0 ? heuresNum : undefined,
      atelierIdMod: heuresNum > 0 ? atelierEffectifId : undefined,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold text-muted">
        Date
        <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="text-xs font-semibold text-muted">
        Composant
        <select className="select mt-1" value={composantId} onChange={(e) => setComposantId(e.target.value)}>
          {composants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {libelleProduit(c)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-muted">
        Site source
        <select className="select mt-1" value={siteSourceId} onChange={(e) => setSiteSourceId(e.target.value)}>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
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
          className="input mt-1 w-28"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
        />
      </label>
      <label className="text-xs font-semibold text-muted">
        Temps atelier (h)
        <input
          type="number"
          min={0}
          step="0.25"
          className="input mt-1 w-28"
          value={heures}
          onChange={(e) => setHeures(e.target.value)}
          placeholder="0"
        />
      </label>
      {!(siteSource && siteEstAtelier(siteSource)) && ateliers.length > 1 && (
        <label className="text-xs font-semibold text-muted">
          Atelier MOD
          <select
            className="select mt-1"
            value={atelierId}
            onChange={(e) => setAtelierId(e.target.value)}
          >
            {ateliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
      )}
      {heuresNum > 0 && (
        <p className="text-xs text-muted">
          MOD {formatCurrency(coutMod(heuresNum, taux))}
          {manqueTaux ? (
            <span className="ml-1 inline-flex items-center gap-1 text-amber-800">
              <PastilleCompteManquant />
              taux à 0
            </span>
          ) : null}
        </p>
      )}
      {manqueTaux && <AvertissementTauxMod />}
      <button type="submit" className="btn btn-secondary">
        <Plus className="h-4 w-4" />
        Sortir
      </button>
    </form>
  );
}

function FormMainOeuvre({
  ateliers,
  defaultAtelier,
  onAjouter,
}: {
  ateliers: PointDeVente[];
  defaultAtelier: string;
  onAjouter: (data: { date: string; atelierId: string; heures: number }) => void;
}) {
  const [date, setDate] = useState(jourLocalISO());
  const [atelierId, setAtelierId] = useState(defaultAtelier || ateliers[0]?.id || "");
  const [heures, setHeures] = useState("1");
  const atelier = ateliers.find((s) => s.id === atelierId);
  const taux = tauxHoraireModAtelier(atelier);
  const heuresNum = Number(heures) || 0;
  const manqueTaux = atelierSansTauxMod(atelier);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!atelierId) return;
    onAjouter({
      date: isoMidiDepuisJour(date),
      atelierId,
      heures: heuresNum,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">
          Date
          <input
            type="date"
            className="input mt-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Atelier
          <select
            className="select mt-1"
            value={atelierId}
            onChange={(e) => setAtelierId(e.target.value)}
          >
            {ateliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Temps passé (h)
          <input
            type="number"
            min={0}
            step="0.25"
            className="input mt-1 w-28"
            value={heures}
            onChange={(e) => setHeures(e.target.value)}
          />
        </label>
        <p className="text-xs text-muted">
          Taux {formatCurrency(taux)} / h → {formatCurrency(coutMod(heuresNum, taux))}
        </p>
        <button type="submit" className="btn btn-secondary">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>
      {manqueTaux && <AvertissementTauxMod />}
    </form>
  );
}

function AvertissementTauxMod() {
  return (
    <p className="flex w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 sm:col-span-2">
      <PastilleCompteManquant className="mt-0.5" />
      <span>
        Taux horaire MOD non renseigné pour cet atelier : le coût sera à 0.
        Renseignez-le dans Paramètres → Fabrication. La saisie n&apos;est pas
        bloquée.
      </span>
    </p>
  );
}

function FormFrais({
  onAjouter,
}: {
  onAjouter: (data: { date: string; libelle: string; montant: number }) => void;
}) {
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState(jourLocalISO());
  function submit(e: FormEvent) {
    e.preventDefault();
    onAjouter({
      date: isoMidiDepuisJour(date),
      libelle,
      montant: Number(montant) || 0,
    });
    setLibelle("");
    setMontant("");
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold text-muted">
        Date
        <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="text-xs font-semibold text-muted">
        Libellé
        <input
          className="input mt-1"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder="Main d'œuvre, énergie, sous-traitance…"
        />
      </label>
      <label className="text-xs font-semibold text-muted">
        Montant (Ar)
        <input
          type="number"
          min={0}
          className="input mt-1 w-36"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-secondary">
        Ajouter
      </button>
    </form>
  );
}

function FormProduction({
  pot,
  onAjouter,
}: {
  pot: number;
  onAjouter: (data: { date: string; quantite: number }) => void;
}) {
  const [quantite, setQuantite] = useState("");
  const [date, setDate] = useState(jourLocalISO());
  const q = Number(quantite) || 0;
  const cu = q > 0 ? pot / q : 0;
  function submit(e: FormEvent) {
    e.preventDefault();
    onAjouter({ date: isoMidiDepuisJour(date), quantite: q });
    setQuantite("");
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold text-muted">
        Date
        <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="text-xs font-semibold text-muted">
        Quantité produite
        <input
          type="number"
          min={0}
          step="any"
          className="input mt-1 w-32"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
        />
      </label>
      <p className="text-xs text-muted">
        Coût unitaire estimé : <strong>{formatCurrency(cu)}</strong>
      </p>
      <button type="submit" className="btn btn-primary">
        Entrer en stock
      </button>
    </form>
  );
}

function ClotureModal({
  reliquats,
  produits,
  atelierId,
  magasins,
  nomSite,
  potRestant,
  onClose,
  onConfirmer,
}: {
  reliquats: { composantId: string; reliquat: number }[];
  produits: { id: string; code: string; libelleCourt: string; libelleLong: string }[];
  atelierId: string;
  magasins: { id: string; nom: string }[];
  nomSite: (id: string) => string;
  potRestant: number;
  onClose: () => void;
  onConfirmer: (data: {
    retours: {
      composantId: string;
      destination: "magasin" | "atelier";
      siteDestinataireId: string;
    }[];
    raisonEcart?: string;
  }) => void;
}) {
  const [choix, setChoix] = useState<
    Record<string, { destination: "magasin" | "atelier"; siteDestinataireId: string }>
  >(() => {
    const init: Record<string, { destination: "magasin" | "atelier"; siteDestinataireId: string }> = {};
    for (const r of reliquats) {
      init[r.composantId] = {
        destination: magasins[0] ? "magasin" : "atelier",
        siteDestinataireId: magasins[0]?.id ?? atelierId,
      };
    }
    return init;
  });
  const [raison, setRaison] = useState("");
  const [etape, setEtape] = useState<"saisie" | "confirmer">("saisie");

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] bg-card p-5 shadow-lg">
        <h2 className="font-display text-lg font-semibold">
          {etape === "saisie" ? "Clôture de l'OF" : "Confirmer la clôture"}
        </h2>
        {etape === "saisie" ? (
          <>
            {reliquats.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucune matière non consommée à réaffecter.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {reliquats.map((r) => {
                  const p = produits.find((x) => x.id === r.composantId);
                  const c = choix[r.composantId];
                  return (
                    <li key={r.composantId} className="rounded-lg border border-line p-3 text-sm">
                      <p className="font-medium">
                        {p?.code} — reliquat {formatNumber(r.reliquat)}
                      </p>
                      <label className="mt-2 flex items-center gap-2">
                        <input
                          type="radio"
                          checked={c?.destination === "magasin"}
                          onChange={() =>
                            setChoix({
                              ...choix,
                              [r.composantId]: {
                                destination: "magasin",
                                siteDestinataireId: magasins[0]?.id ?? atelierId,
                              },
                            })
                          }
                        />
                        Retourner au magasin
                      </label>
                      {c?.destination === "magasin" && (
                        <select
                          className="select mt-1"
                          value={c.siteDestinataireId}
                          onChange={(e) =>
                            setChoix({
                              ...choix,
                              [r.composantId]: {
                                destination: "magasin",
                                siteDestinataireId: e.target.value,
                              },
                            })
                          }
                        >
                          {(magasins.length ? magasins : [{ id: atelierId, nom: nomSite(atelierId) }]).map(
                            (s) => (
                              <option key={s.id} value={s.id}>
                                {s.nom}
                              </option>
                            ),
                          )}
                        </select>
                      )}
                      <label className="mt-2 flex items-center gap-2">
                        <input
                          type="radio"
                          checked={c?.destination === "atelier"}
                          onChange={() =>
                            setChoix({
                              ...choix,
                              [r.composantId]: {
                                destination: "atelier",
                                siteDestinataireId: atelierId,
                              },
                            })
                          }
                        />
                        Garder sur l&apos;atelier
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {potRestant > 1 && (
              <label className="mt-4 block text-xs font-semibold text-muted">
                Écart de fabrication restant (~ coûts non affectés à une production). Raison
                optionnelle
                <input
                  className="input mt-1"
                  value={raison}
                  onChange={(e) => setRaison(e.target.value)}
                  placeholder="Rebut, casse, erreur de sortie…"
                />
              </label>
            )}
            <div className="mt-4 flex gap-2">
              <button type="button" className="btn btn-primary" onClick={() => setEtape("confirmer")}>
                Continuer
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Retour à l&apos;édition
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm">
              Confirmer la clôture ? L&apos;OF sera verrouillé. Aucune écriture comptable
              n&apos;est générée.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  onConfirmer({
                    retours: reliquats.map((r) => ({
                      composantId: r.composantId,
                      destination: choix[r.composantId]?.destination ?? "atelier",
                      siteDestinataireId:
                        choix[r.composantId]?.siteDestinataireId ?? atelierId,
                    })),
                    raisonEcart: raison.trim() || undefined,
                  })
                }
              >
                Confirmer
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEtape("saisie")}>
                Retour
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DemandeAchatModal({
  composant,
  manquant,
  fournisseurs,
  fournisseurDefaut,
  siteDefaut,
  sites,
  onClose,
  onCreer,
}: {
  composant?: { code: string; libelleCourt: string; libelleLong: string };
  manquant: number;
  fournisseurs: { id: string; nom: string }[];
  fournisseurDefaut?: string;
  siteDefaut: string;
  sites: { id: string; nom: string }[];
  onClose: () => void;
  onCreer: (data: { fournisseurId: string; quantite: number; pointDeVenteId: string }) => void;
}) {
  const [fournisseurId, setFournisseurId] = useState(
    fournisseurDefaut && fournisseurs.some((f) => f.id === fournisseurDefaut)
      ? fournisseurDefaut
      : (fournisseurs[0]?.id ?? ""),
  );
  const [quantite, setQuantite] = useState(String(manquant));
  const [siteId, setSiteId] = useState(siteDefaut);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[var(--radius)] bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Demande d&apos;achat</h2>
        <p className="mt-1 text-sm text-muted">
          {composant ? `${composant.code} — ${libelleProduit(composant)}` : "Composant"} · commande
          fournisseur en brouillon, liée à l&apos;OF.
        </p>
        <label className="mt-3 block text-xs font-semibold text-muted">
          Fournisseur
          <select
            className="select mt-1"
            value={fournisseurId}
            onChange={(e) => setFournisseurId(e.target.value)}
          >
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-xs font-semibold text-muted">
          Quantité manquante
          <input
            type="number"
            min={0}
            step="any"
            className="input mt-1"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-xs font-semibold text-muted">
          Site de réception prévu
          <select className="select mt-1" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!fournisseurId}
            onClick={() =>
              onCreer({
                fournisseurId,
                quantite: Number(quantite) || 0,
                pointDeVenteId: siteId,
              })
            }
          >
            Créer le brouillon
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
