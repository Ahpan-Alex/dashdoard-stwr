"use client";

import { Component, FormEvent, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PastilleCompteManquant } from "@/components/avertissement-compte-produit";
import { DocumentPrintActions } from "@/components/document-print-actions";
import { MissionRapportDocument } from "@/components/mission-rapport";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { SelecteurArticle } from "@/components/selecteur-article";
import { CompteTresorerieSelect } from "@/components/compte-tresorerie-select";
import { useAuthStore } from "@/lib/auth-store";
import { MODES_PAIEMENT } from "@/lib/commercial";
import {
  compteCompatibleOuVide,
  modesPaiementActifs,
} from "@/lib/tresorerie";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { createId } from "@/lib/id";
import { jourLocalISO } from "@/lib/inventaire";
import {
  achatEstJustifie,
  anomaliesMission,
  budgetPrevisionnelMission,
  depenseEstJustifiee,
  indicateurMission,
  libelleSoldeMission,
  missionEstVerrouillee,
  MISSION_JUSTIFICATIF_LABELS,
  MISSION_FONDS_TYPE_LABELS,
  MISSION_REGLEMENT_LABELS,
  MISSION_STATUT_LABELS,
  montantLignePrevisionnelle,
  montantLigneRealisee,
  nbJustificatifsManquants,
  peutModifierDossierMission,
  peutSaisirMission,
  quantiteManquanteLigne,
  quantiteReceptionneeLigne,
  soldeMission,
  statutReceptionLigne,
  syntheseFinanciereMission,
  TIERS_DIVERS_MARCHE_ID,
  TIERS_DIVERS_MARCHE_NOM,
  totauxArticlesMission,
  totalAchatsRealises,
  totalDepenseMission,
  totalDepensesDiverses,
} from "@/lib/missions";
import {
  depenseEstNatureLibre,
  naturesDepenseActives,
} from "@/lib/natures-depense-mission";
import { depenseEnAttenteReclassement } from "@/lib/comptabilite";
import { produitEstAchetable } from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import { estFournisseur } from "@/lib/tiers";
import { useStore } from "@/lib/store";
import type {
  MissionAchatStatut,
  MissionJustificatifType,
  MissionValidationAction,
} from "@/lib/types";

function badgeMission(statut: MissionAchatStatut) {
  if (statut === "cloture") return "badge-success";
  if (statut === "brouillon" || statut === "soumise") return "badge-sea";
  if (statut === "validee" || statut === "fonds_remis" || statut === "en_cours") {
    return "badge-sand";
  }
  if (statut === "a_regulariser") return "badge-sand";
  return "badge-danger";
}

const VALIDATION_LABELS: Record<MissionValidationAction, string> = {
  creer: "Création",
  soumettre: "Soumission",
  valider: "Validation",
  rejeter: "Rejet",
  remettre_fonds: "Remise des fonds",
  ajouter_achat: "Achat enregistré",
  ajouter_justificatif: "Justificatif",
  reception: "Réception",
  confirmer_cloture: "Clôture confirmée",
  annuler_cloture: "Clôture annulée",
  retour_edition: "À régulariser",
  annuler_document: "Annulation",
  regler: "Règlement",
  exception_justificatifs: "Exception justificatifs",
};

export default function MissionAchatDetailPage() {
  return (
    <RequirePermission permission={["missions.lire", "missions.gerer"]}>
      <MissionDetailGuard>
        <MissionDetail />
      </MissionDetailGuard>
    </RequirePermission>
  );
}

function MissionDetailGuard({ children }: { children: ReactNode }) {
  return <MissionDetailBoundary>{children}</MissionDetailBoundary>;
}

class MissionDetailBoundary extends Component<
  { children: ReactNode },
  { erreur: string | null }
> {
  state: { erreur: string | null } = { erreur: null };

  static getDerivedStateFromError(erreur: Error) {
    return { erreur: erreur.message || "Erreur d’affichage de la mission." };
  }

  render() {
    if (this.state.erreur) {
      return (
        <div className="rounded-[var(--radius)] border border-red-200 bg-red-50 p-6">
          <h1 className="font-display text-xl font-semibold text-red-900">
            Impossible d’afficher cette mission d’achat
          </h1>
          <p className="mt-2 text-sm text-red-800">{this.state.erreur}</p>
          <a href="/missions" className="btn btn-secondary mt-4">
            Retour à la liste
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

function MissionDetail() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const mission = useStore((s) => (s.missionsAchat ?? []).find((m) => m.id === id));
  const produits = useStore((s) => (Array.isArray(s.produits) ? s.produits : []));
  const categoriesProduits = useStore((s) =>
    Array.isArray(s.categoriesProduits) ? s.categoriesProduits : [],
  );
  const tiers = useStore((s) => s.tiers ?? []);
  const naturesDepenseMission = useStore((s) => s.naturesDepenseMission ?? []);
  const pointsDeVente = useStore((s) =>
    Array.isArray(s.pointsDeVente) ? s.pointsDeVente : [],
  );
  const comptesTresorerie = useStore((s) => s.comptesTresorerie ?? []);
  const modesPaiement = useStore((s) => s.modesPaiement ?? []);
  const parametres = useStore((s) => s.parametres);
  const journal = useStore((s) =>
    (s.journalActivites ?? []).filter(
      (j) => j.entite === "mission_achat" && j.entiteId === id,
    ),
  );
  const modifierMissionAchat = useStore((s) => s.modifierMissionAchat);
  const soumettreMissionAchat = useStore((s) => s.soumettreMissionAchat);
  const validerMissionAchat = useStore((s) => s.validerMissionAchat);
  const rejeterMissionAchat = useStore((s) => s.rejeterMissionAchat);
  const remettreFondsMissionAchat = useStore((s) => s.remettreFondsMissionAchat);
  const cloturerMissionAchat = useStore((s) => s.cloturerMissionAchat);
  const annulerMissionAchat = useStore((s) => s.annulerMissionAchat);
  const reglerMissionAchat = useStore((s) => s.reglerMissionAchat);
  const addTiers = useStore((s) => s.addTiers);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const gerer = hasPermission("missions.gerer");
  const rapportRef = useRef<HTMLDivElement>(null);

  const [clotureOpen, setClotureOpen] = useState(false);
  const [exceptionJustificatifs, setExceptionJustificatifs] = useState(false);
  const [nouveauFrnLigneId, setNouveauFrnLigneId] = useState<string | null>(null);
  const [fondsForm, setFondsForm] = useState({
    montant: "",
    date: jourLocalISO(),
    modePaiement: "especes",
    compteSource: "",
    compteTresorerieId: "",
    reference: "",
  });

  if (!mission) {
    return (
      <div>
        <PageHeader title="Mission introuvable" showPosSelector={false} />
        <Link href="/missions" className="text-sm text-sea-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const doc = mission;
  const verrouille = missionEstVerrouillee(doc);
  const dossierEditable = gerer && peutModifierDossierMission(doc);
  const saisie = peutSaisirMission(doc, { gerer, userId: user?.id });
  const achetable = produits.filter(
    (p) => p?.actif && produitEstAchetable(p, categoriesProduits),
  );
  const fournisseurs = (Array.isArray(tiers) ? tiers : []).filter(
    (t) => t && t.actif !== false && estFournisseur(t),
  );
  const nomSite =
    pointsDeVente.find((s) => s.id === doc.siteDestinataireId)?.nom ?? "Site";
  const fin = syntheseFinanciereMission(doc);
  const arts = totauxArticlesMission(doc);
  const solde = soldeMission(doc);
  const ano = anomaliesMission(doc);
  const voyant = indicateurMission(doc);

  function nomFrn(fid: string) {
    return tiers.find((t) => t.id === fid)?.nom ?? TIERS_DIVERS_MARCHE_NOM;
  }

  function patchRealises(
    updater: (lignes: typeof doc.achatsRealises) => typeof doc.achatsRealises,
  ) {
    const res = modifierMissionAchat(doc.id, {
      achatsRealises: updater(doc.achatsRealises),
    });
    if (!res.ok) alert(res.reason);
  }

  function patchDepenses(
    updater: (lignes: typeof doc.depensesDiverses) => typeof doc.depensesDiverses,
  ) {
    const res = modifierMissionAchat(doc.id, {
      depensesDiverses: updater(doc.depensesDiverses),
    });
    if (!res.ok) alert(res.reason);
  }

  function patchPrevus(
    updater: (
      lignes: typeof doc.lignesPrevisionnelles,
    ) => typeof doc.lignesPrevisionnelles,
  ) {
    const res = modifierMissionAchat(doc.id, {
      lignesPrevisionnelles: updater(doc.lignesPrevisionnelles),
    });
    if (!res.ok) alert(res.reason);
  }

  function run(res: { ok: boolean; reason?: string }) {
    if (!res.ok) alert(res.reason);
    return res.ok;
  }

  function annuler() {
    const msg =
      doc.statut === "cloture"
        ? "Annuler cette mission clôturée par contre-mouvement ? Les mouvements d'origine restent tracés."
        : "Annuler cette mission d'achat ?";
    if (!confirm(msg)) return;
    run(annulerMissionAchat(doc.id));
  }

  function confirmerCloture() {
    const res = cloturerMissionAchat(doc.id, {
      exceptionJustificatifs,
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    setClotureOpen(false);
  }

  return (
    <div>
      <PageHeader
        title={mission.numero}
        description="Dossier unique : planning, fonds, achats, réception, justificatifs et stock à la clôture."
        showPosSelector={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <DocumentPrintActions
              sheetRef={rapportRef}
              filename={`${mission.numero}-rapport`}
            />
            <Link href="/missions" className="btn btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              Liste
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`badge ${badgeMission(mission.statut)}`}>
          {MISSION_STATUT_LABELS[mission.statut]}
        </span>
        <span className="badge badge-sea">
          {MISSION_REGLEMENT_LABELS[mission.statutReglement]}
        </span>
        <span
          className={`badge ${
            voyant === "conforme"
              ? "badge-success"
              : voyant === "ecart"
                ? "badge-sand"
                : "badge-danger"
          }`}
        >
          {voyant === "conforme"
            ? "🟢 Mission conforme"
            : voyant === "ecart"
              ? "🟠 Écart à contrôler"
              : "🔴 Dépense ou article problématique"}
        </span>
      </div>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Synthèse de la mission
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Acheteur</span>
            <br />
            {mission.acheteurNom}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Objet</span>
            <br />
            {mission.objet?.trim() || "—"}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Budget</span>
            <br />
            {formatCurrency(fin.budget)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Fonds remis</span>
            <br />
            {formatCurrency(fin.fondsRemis)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Dépenses</span>
            <br />
            {formatCurrency(fin.totalDepenses)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Solde</span>
            <br />
            {formatCurrency(solde)}{" "}
            <span className="text-xs text-muted">{libelleSoldeMission(solde)}</span>
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Articles</span>
            <br />
            Prévus {arts.prevu} · Achetés {arts.achete} · Réceptionnés {arts.recu}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">
              Justificatifs manquants
            </span>
            <br />
            {nbJustificatifsManquants(mission)}
          </p>
        </div>
      </section>

      {ano.length > 0 && (
        <section className="mb-6 rounded-[var(--radius)] border border-amber-300 bg-amber-50 p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">Contrôles</h2>
          <ul className="space-y-1 text-sm">
            {ano.map((a) => (
              <li key={a.code}>
                {a.gravite === "danger" ? "● " : "○ "}
                {a.libelle}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">En-tête</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Acheteur</span>
            <br />
            {mission.acheteurNom}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Création</span>
            <br />
            {formatDate(mission.date)}
          </p>
          <label className="block text-xs font-semibold text-muted">
            Date prévue
            {dossierEditable ? (
              <input
                type="date"
                className="input mt-1"
                value={String(mission.datePrevue || mission.date || "").slice(0, 10)}
                onChange={(e) =>
                  modifierMissionAchat(mission.id, { datePrevue: e.target.value })
                }
              />
            ) : (
              <span className="mt-1 block text-sm font-normal text-ink">
                {formatDate(mission.datePrevue ?? mission.date)}
              </span>
            )}
          </label>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">
              Site destinataire (stock)
            </span>
            <br />
            {nomSite}
          </p>
          <label className="block text-xs font-semibold text-muted">
            Service / département
            {dossierEditable ? (
              <input
                className="input mt-1"
                value={mission.service ?? ""}
                onChange={(e) =>
                  modifierMissionAchat(mission.id, { service: e.target.value })
                }
              />
            ) : (
              <span className="mt-1 block text-sm font-normal text-ink">
                {mission.service?.trim() || "—"}
              </span>
            )}
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Objet
            {dossierEditable ? (
              <input
                className="input mt-1"
                value={mission.objet ?? ""}
                onChange={(e) =>
                  modifierMissionAchat(mission.id, { objet: e.target.value })
                }
              />
            ) : (
              <span className="mt-1 block text-sm font-normal text-ink">
                {mission.objet?.trim() || "—"}
              </span>
            )}
          </label>
          <label className="block text-xs font-semibold text-muted sm:col-span-2">
            Fournisseurs prévus
            {dossierEditable ? (
              <input
                className="input mt-1"
                value={mission.fournisseursPrevus ?? ""}
                onChange={(e) =>
                  modifierMissionAchat(mission.id, {
                    fournisseursPrevus: e.target.value,
                  })
                }
              />
            ) : (
              <span className="mt-1 block text-sm font-normal text-ink">
                {mission.fournisseursPrevus?.trim() || "—"}
              </span>
            )}
          </label>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">
              Validée par
            </span>
            <br />
            {mission.valideurNom || "—"}
          </p>
          <label className="block text-xs font-semibold text-muted sm:col-span-3">
            Observations
            {dossierEditable || (saisie && !verrouille) ? (
              <textarea
                className="input mt-1 min-h-[4rem]"
                value={mission.note ?? ""}
                onChange={(e) =>
                  modifierMissionAchat(mission.id, { note: e.target.value })
                }
              />
            ) : (
              <span className="mt-1 block text-sm font-normal text-ink">
                {mission.note?.trim() || "—"}
              </span>
            )}
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Articles à acheter</h2>
          {dossierEditable && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                patchPrevus((lignes) => [
                  ...lignes,
                  {
                    id: createId("misp"),
                    produitId: achetable[0]?.id ?? "",
                    quantiteSouhaitee: 1,
                    prixUnitaireEstime: 0,
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Article
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-muted">
          Budget prévisionnel : {formatCurrency(budgetPrevisionnelMission(mission))}
        </p>
        {(mission.lignesPrevisionnelles ?? []).length === 0 ? (
          <p className="text-sm text-muted">Aucun article prévu.</p>
        ) : (
          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <th>Réf. / désignation</th>
                  <th>Qté prévue</th>
                  <th>PU estimatif</th>
                  <th>Montant</th>
                  <th>Fournisseur prévu</th>
                  <th>Commentaire</th>
                  {dossierEditable && <th />}
                </tr>
              </thead>
              <tbody>
                {(mission.lignesPrevisionnelles ?? []).map((l) => {
                  const p = produits.find((x) => x?.id === l.produitId);
                  return (
                    <tr key={l.id}>
                      <td className="min-w-[14rem]">
                        {dossierEditable ? (
                          <SelecteurArticle
                            compact
                            allowEmpty
                            emptyLabel="— Choisir un article —"
                            produits={achetable}
                            value={l.produitId}
                            onChange={(produitId) =>
                              patchPrevus((lignes) =>
                                lignes.map((x) =>
                                  x.id === l.id ? { ...x, produitId } : x,
                                ),
                              )
                            }
                          />
                        ) : p ? (
                          `${p.code} — ${libelleProduit(p)}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {dossierEditable ? (
                          <input
                            type="number"
                            min={0}
                            className="input w-24"
                            value={l.quantiteSouhaitee}
                            onChange={(e) =>
                              patchPrevus((lignes) =>
                                lignes.map((x) =>
                                  x.id === l.id
                                    ? {
                                        ...x,
                                        quantiteSouhaitee:
                                          Number(e.target.value) || 0,
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        ) : (
                          l.quantiteSouhaitee
                        )}
                      </td>
                      <td>
                        {dossierEditable ? (
                          <input
                            type="number"
                            min={0}
                            className="input w-28"
                            value={l.prixUnitaireEstime ?? 0}
                            onChange={(e) =>
                              patchPrevus((lignes) =>
                                lignes.map((x) =>
                                  x.id === l.id
                                    ? {
                                        ...x,
                                        prixUnitaireEstime:
                                          Number(e.target.value) || 0,
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        ) : (
                          formatCurrency(l.prixUnitaireEstime ?? 0)
                        )}
                      </td>
                      <td className="font-semibold">
                        {formatCurrency(montantLignePrevisionnelle(l))}
                      </td>
                      <td>
                        {dossierEditable ? (
                          <select
                            className="select min-w-[8rem]"
                            value={l.fournisseurId ?? ""}
                            onChange={(e) =>
                              patchPrevus((lignes) =>
                                lignes.map((x) =>
                                  x.id === l.id
                                    ? { ...x, fournisseurId: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          >
                            <option value="">—</option>
                            {fournisseurs.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.nom}
                              </option>
                            ))}
                          </select>
                        ) : l.fournisseurId ? (
                          nomFrn(l.fournisseurId)
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {dossierEditable ? (
                          <input
                            className="input w-40"
                            value={l.commentaire ?? ""}
                            onChange={(e) =>
                              patchPrevus((lignes) =>
                                lignes.map((x) =>
                                  x.id === l.id
                                    ? { ...x, commentaire: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        ) : (
                          l.commentaire || "—"
                        )}
                      </td>
                      {dossierEditable && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                              patchPrevus((lignes) =>
                                lignes.filter((x) => x.id !== l.id),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Fonds remis à l&apos;acheteur</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <p>
            Demandés
            <br />
            <span className="font-semibold">{formatCurrency(fin.fondsDemandes)}</span>
          </p>
          <p>
            Validés
            <br />
            <span className="font-semibold">{formatCurrency(fin.fondsValides)}</span>
          </p>
          <p>
            Remis
            <br />
            <span className="font-semibold">{formatCurrency(fin.fondsRemis)}</span>
          </p>
          <p>
            Avance (fiche)
            <br />
            <span className="font-semibold">{formatCurrency(mission.montantAvance)}</span>
          </p>
        </div>
        {(mission.mouvementsFonds ?? []).length > 0 && (
          <div className="table-shell mb-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Mode</th>
                  <th>Compte / source</th>
                  <th>Réf.</th>
                  <th>Par</th>
                </tr>
              </thead>
              <tbody>
                {(mission.mouvementsFonds ?? []).map((mv) => (
                  <tr key={mv.id}>
                    <td>{formatDate(mv.date)}</td>
                    <td>{MISSION_FONDS_TYPE_LABELS[mv.type] ?? mv.type}</td>
                    <td>{formatCurrency(mv.montant)}</td>
                    <td>
                      {mv.modePaiement
                        ? MODES_PAIEMENT[mv.modePaiement] ?? mv.modePaiement
                        : "—"}
                    </td>
                    <td>{mv.compteSource || "—"}</td>
                    <td>{mv.reference || "—"}</td>
                    <td>{mv.responsableNom || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {gerer &&
          (mission.statut === "validee" ||
            mission.statut === "fonds_remis" ||
            mission.statut === "en_cours") && (
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              run(
                remettreFondsMissionAchat(mission.id, {
                  montant: Number(fondsForm.montant) || 0,
                  date: fondsForm.date,
                  modePaiement: fondsForm.modePaiement,
                  compteSource: fondsForm.compteSource || undefined,
                  compteTresorerieId: fondsForm.compteTresorerieId || undefined,
                  reference: fondsForm.reference || undefined,
                }),
              );
            }}
          >
            <label className="block text-xs font-semibold text-muted">
              Montant remis
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={fondsForm.montant}
                onChange={(e) =>
                  setFondsForm({ ...fondsForm, montant: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Date de remise
              <input
                type="date"
                className="input mt-1"
                value={fondsForm.date}
                onChange={(e) =>
                  setFondsForm({ ...fondsForm, date: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Mode
              <select
                className="select mt-1"
                value={fondsForm.modePaiement}
                onChange={(e) => {
                  const modePaiement = e.target.value;
                  setFondsForm({
                    ...fondsForm,
                    modePaiement,
                    compteTresorerieId: compteCompatibleOuVide(
                      fondsForm.compteTresorerieId,
                      modePaiement,
                      comptesTresorerie,
                      modesPaiement,
                    ),
                  });
                }}
              >
                {modesPaiementActifs(modesPaiement).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.libelle}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Compte de trésorerie (optionnel)
              <CompteTresorerieSelect
                modePaiement={fondsForm.modePaiement}
                value={fondsForm.compteTresorerieId}
                onChange={(compteTresorerieId) =>
                  setFondsForm({ ...fondsForm, compteTresorerieId })
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Source / compte de trésorerie
              <input
                className="input mt-1"
                value={fondsForm.compteSource}
                onChange={(e) =>
                  setFondsForm({ ...fondsForm, compteSource: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Référence du paiement
              <input
                className="input mt-1"
                value={fondsForm.reference}
                onChange={(e) =>
                  setFondsForm({ ...fondsForm, reference: e.target.value })
                }
              />
            </label>
            <div className="flex items-end">
              <button type="submit" className="btn btn-primary">
                Enregistrer la remise
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Achats réalisés</h2>
          {saisie && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                patchRealises((lignes) => [
                  ...lignes,
                  {
                    id: createId("misr"),
                    produitId: achetable[0]?.id ?? "",
                    quantite: 0,
                    prixUnitaire: 0,
                    fournisseurId: TIERS_DIVERS_MARCHE_ID,
                    dateAchat: jourLocalISO(),
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Achat imprévu
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-muted">
          Prévu {formatCurrency(fin.budget)} vs dépensé{" "}
          {formatCurrency(totalDepenseMission(mission))} · Achats{" "}
          {formatCurrency(totalAchatsRealises(mission))}
        </p>
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Article</th>
                <th>Qté ach.</th>
                <th>PU réel</th>
                <th>Montant</th>
                <th>Fournisseur</th>
                <th>Date</th>
                <th>N° justificatif</th>
                <th>Type</th>
                <th>Paiement</th>
                <th>Commentaire</th>
                {saisie && <th />}
              </tr>
            </thead>
            <tbody>
              {(mission.achatsRealises ?? []).map((l) => {
                const p = produits.find((x) => x?.id === l.produitId);
                const prev = (mission.lignesPrevisionnelles ?? []).find(
                  (x) => x.id === l.previsionId,
                );
                const ecartQte =
                  prev && l.quantite > prev.quantiteSouhaitee + 1e-9;
                const justifie = achatEstJustifie(mission, l);
                return (
                  <tr
                    key={l.id}
                    className={
                      (l.quantite > 0 && !justifie) || ecartQte
                        ? "bg-amber-50"
                        : undefined
                    }
                  >
                    <td className="min-w-[14rem]">
                      {saisie ? (
                        <SelecteurArticle
                          compact
                          allowEmpty
                          emptyLabel="— Choisir un article —"
                          produits={achetable}
                          value={l.produitId}
                          onChange={(produitId) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id ? { ...x, produitId } : x,
                              ),
                            )
                          }
                        />
                      ) : p ? (
                        `${p.code} — ${libelleProduit(p)}`
                      ) : (
                        "—"
                      )}
                      {prev ? (
                        <span className="mt-0.5 block text-[11px] text-muted">
                          Prévu {prev.quantiteSouhaitee}
                          {ecartQte ? " · qté dépassée" : ""}
                        </span>
                      ) : l.quantite > 0 ? (
                        <span className="mt-0.5 block text-[11px] text-amber-800">
                          Non prévu
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {saisie ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="input w-20"
                          value={l.quantite}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? { ...x, quantite: Number(e.target.value) || 0 }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        l.quantite
                      )}
                    </td>
                    <td>
                      {saisie ? (
                        <input
                          type="number"
                          min={0}
                          className="input w-24"
                          value={l.prixUnitaire}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? {
                                      ...x,
                                      prixUnitaire: Number(e.target.value) || 0,
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        formatCurrency(l.prixUnitaire)
                      )}
                    </td>
                    <td className="font-semibold">
                      {formatCurrency(montantLigneRealisee(l))}
                    </td>
                    <td>
                      {saisie ? (
                        <select
                          className="select min-w-[8rem]"
                          value={l.fournisseurId}
                          onChange={(e) => {
                            if (e.target.value === "__nouveau__") {
                              setNouveauFrnLigneId(l.id);
                              return;
                            }
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? { ...x, fournisseurId: e.target.value }
                                  : x,
                              ),
                            );
                          }}
                        >
                          {fournisseurs.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.id === TIERS_DIVERS_MARCHE_ID
                                ? TIERS_DIVERS_MARCHE_NOM
                                : f.nom}
                            </option>
                          ))}
                          <option value="__nouveau__">+ Nouveau…</option>
                        </select>
                      ) : (
                        nomFrn(l.fournisseurId)
                      )}
                    </td>
                    <td>
                      {saisie ? (
                        <input
                          type="date"
                          className="input w-36"
                          value={(l.dateAchat ?? "").slice(0, 10)}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? { ...x, dateAchat: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        l.dateAchat ? formatDate(l.dateAchat) : "—"
                      )}
                    </td>
                    <td>
                      {saisie ? (
                        <input
                          className="input w-32"
                          placeholder="N° facture / reçu"
                          value={l.numeroJustificatif ?? ""}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? { ...x, numeroJustificatif: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        l.numeroJustificatif || (justifie ? "—" : "Manquant")
                      )}
                    </td>
                    <td>
                      {saisie ? (
                        <select
                          className="select w-32"
                          value={l.typeJustificatif ?? "facture"}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? {
                                      ...x,
                                      typeJustificatif: e.target
                                        .value as MissionJustificatifType,
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          {Object.entries(MISSION_JUSTIFICATIF_LABELS).map(
                            ([k, lab]) => (
                              <option key={k} value={k}>
                                {lab}
                              </option>
                            ),
                          )}
                        </select>
                      ) : l.typeJustificatif ? (
                        MISSION_JUSTIFICATIF_LABELS[l.typeJustificatif]
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {saisie ? (
                        <select
                          className="select w-32"
                          value={l.modePaiement ?? ""}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? { ...x, modePaiement: e.target.value || undefined }
                                  : x,
                              ),
                            )
                          }
                        >
                          <option value="">—</option>
                          {Object.entries(MODES_PAIEMENT).map(([k, lab]) => (
                            <option key={k} value={k}>
                              {lab}
                            </option>
                          ))}
                        </select>
                      ) : l.modePaiement ? (
                        MODES_PAIEMENT[l.modePaiement] ?? l.modePaiement
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {saisie ? (
                        <input
                          className="input w-36"
                          value={l.commentaire ?? ""}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? { ...x, commentaire: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        l.commentaire || "—"
                      )}
                    </td>
                    {saisie && (
                      <td>
                        {!l.previsionId && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                              patchRealises((lignes) =>
                                lignes.filter((x) => x.id !== l.id),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Contrôle de réception
        </h2>
        <p className="mb-3 text-xs text-muted">
          L&apos;entrée en stock à la clôture utilise la quantité réceptionnée
          (à défaut, la quantité achetée).
        </p>
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Article</th>
                <th>Prévu</th>
                <th>Acheté</th>
                <th>Réceptionné</th>
                <th>Manquant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(mission.achatsRealises ?? []).map((l) => {
                const p = produits.find((x) => x?.id === l.produitId);
                const prev = (mission.lignesPrevisionnelles ?? []).find(
                  (x) => x.id === l.previsionId,
                );
                const st = statutReceptionLigne(l);
                return (
                  <tr key={`rec-${l.id}`}>
                    <td>{p ? `${p.code} — ${libelleProduit(p)}` : "—"}</td>
                    <td>{prev?.quantiteSouhaitee ?? "—"}</td>
                    <td>{l.quantite}</td>
                    <td>
                      {saisie ? (
                        <input
                          type="number"
                          min={0}
                          className="input w-24"
                          value={
                            l.quantiteReceptionnee ??
                            (l.quantite > 0 ? l.quantite : 0)
                          }
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? {
                                      ...x,
                                      quantiteReceptionnee:
                                        Number(e.target.value) || 0,
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        quantiteReceptionneeLigne(l)
                      )}
                    </td>
                    <td>{quantiteManquanteLigne(l)}</td>
                    <td>
                      {st === "complet"
                        ? "Complet"
                        : st === "partiel"
                          ? "Partiel"
                          : st === "non_receptionne"
                            ? "Non réceptionné"
                            : "Non acheté"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">
            Dépenses et justificatifs
          </h2>
          {saisie && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                patchDepenses((lignes) => [
                  ...lignes,
                  {
                    id: createId("misd"),
                    nature: "",
                    fournisseurId: TIERS_DIVERS_MARCHE_ID,
                    montant: 0,
                  },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Dépense
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-muted">
          Fournisseur obligatoire (fiche Tiers ou Divers / Fournitures). Nature
          catalogue ou saisie libre (imputation automatique au compte 471).
          Total divers : {formatCurrency(totalDepensesDiverses(mission))}
        </p>
        {(mission.depensesDiverses ?? []).length === 0 ? (
          <p className="text-sm text-muted">Aucune dépense diverse.</p>
        ) : (
          <div className="space-y-2">
            {(mission.depensesDiverses ?? []).map((d) => {
              const ok = depenseEstJustifiee(mission, d);
              const naturesActives = naturesDepenseActives(naturesDepenseMission);
              const selectNature = d.natureId
                ? d.natureId
                : (d.nature ?? "").trim()
                  ? "__libre__"
                  : "";
              const attente471 = depenseEnAttenteReclassement(
                d,
                naturesDepenseMission,
              );
              const libre = depenseEstNatureLibre(d, naturesDepenseMission);
              return (
                <div
                  key={d.id}
                  className={`grid gap-2 rounded-[var(--radius)] border p-3 sm:grid-cols-2 lg:grid-cols-6 ${
                    d.montant > 0 && !ok ? "border-amber-300 bg-amber-50" : "border-line"
                  }`}
                >
                  {saisie ? (
                    <>
                      <label className="text-xs font-semibold text-muted">
                        Fournisseur
                        <select
                          className="select mt-1"
                          required
                          value={d.fournisseurId ?? ""}
                          onChange={(e) =>
                            patchDepenses((lignes) =>
                              lignes.map((x) =>
                                x.id === d.id
                                  ? { ...x, fournisseurId: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        >
                          <option value="">Choisir…</option>
                          {fournisseurs.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.id === TIERS_DIVERS_MARCHE_ID
                                ? TIERS_DIVERS_MARCHE_NOM
                                : f.nom}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-muted">
                        Nature
                        <select
                          className="select mt-1"
                          value={selectNature}
                          onChange={(e) => {
                            const v = e.target.value;
                            patchDepenses((lignes) =>
                              lignes.map((x) => {
                                if (x.id !== d.id) return x;
                                if (!v) return { ...x, natureId: undefined, nature: "" };
                                if (v === "__libre__") {
                                  return { ...x, natureId: undefined, nature: x.nature };
                                }
                                const n = naturesActives.find((y) => y.id === v);
                                return {
                                  ...x,
                                  natureId: v,
                                  nature: n?.libelle ?? x.nature,
                                };
                              }),
                            );
                          }}
                        >
                          <option value="">Choisir…</option>
                          {naturesActives.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.libelle}
                              {n.compteChargeId ? "" : " (compte à renseigner)"}
                            </option>
                          ))}
                          <option value="__libre__">
                            Autre (saisie libre → compte 471)
                          </option>
                        </select>
                      </label>
                      {selectNature === "__libre__" && (
                        <input
                          className="input lg:col-span-2"
                          placeholder="Nature libre"
                          value={d.nature}
                          onChange={(e) =>
                            patchDepenses((lignes) =>
                              lignes.map((x) =>
                                x.id === d.id
                                  ? {
                                      ...x,
                                      natureId: undefined,
                                      nature: e.target.value,
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                      )}
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="Montant"
                        value={d.montant}
                        onChange={(e) =>
                          patchDepenses((lignes) =>
                            lignes.map((x) =>
                              x.id === d.id
                                ? { ...x, montant: Number(e.target.value) || 0 }
                                : x,
                            ),
                          )
                        }
                      />
                      <input
                        className="input"
                        placeholder="N° justificatif"
                        value={d.numeroJustificatif ?? ""}
                        onChange={(e) =>
                          patchDepenses((lignes) =>
                            lignes.map((x) =>
                              x.id === d.id
                                ? { ...x, numeroJustificatif: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <div className="flex items-center gap-2">
                        {attente471 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-800">
                            <PastilleCompteManquant />
                            471
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() =>
                            patchDepenses((lignes) =>
                              lignes.filter((x) => x.id !== d.id),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">
                        {nomFrn(d.fournisseurId)}
                      </p>
                      <p className="text-sm sm:col-span-2">
                        {d.nature}
                        {libre ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-800">
                            <PastilleCompteManquant />
                            471 — à reclasser
                          </span>
                        ) : null}
                        {d.compteReclasseId ? (
                          <span className="ml-2 text-xs text-sea-800">
                            reclassée
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(d.montant)}
                      </p>
                      <p className="text-sm">
                        {d.numeroJustificatif || (ok ? "—" : "Sans justificatif")}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">
            Justificatifs de la mission
          </h2>
          {(saisie || dossierEditable) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const res = modifierMissionAchat(doc.id, {
                  justificatifs: [
                    ...(doc.justificatifs ?? []),
                    {
                      id: createId("misj"),
                      type: "facture",
                      date: jourLocalISO(),
                    },
                  ],
                });
                if (!res.ok) alert(res.reason);
              }}
            >
              <Plus className="h-4 w-4" />
              Justificatif
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-muted">
          Pièces rattachées au dossier (en plus des n° saisis sur chaque dépense).
        </p>
        {(mission.justificatifs ?? []).length === 0 ? (
          <p className="text-sm text-muted">Aucun justificatif de mission.</p>
        ) : (
          <div className="space-y-2">
            {(mission.justificatifs ?? []).map((j) => {
              const editable = saisie || dossierEditable;
              return (
                <div
                  key={j.id}
                  className="grid gap-2 rounded-[var(--radius)] border border-line p-3 sm:grid-cols-4"
                >
                  {editable ? (
                    <>
                      <select
                        className="select"
                        value={j.type}
                        onChange={(e) =>
                          modifierMissionAchat(doc.id, {
                            justificatifs: (doc.justificatifs ?? []).map((x) =>
                              x.id === j.id
                                ? {
                                    ...x,
                                    type: e.target.value as MissionJustificatifType,
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        {Object.entries(MISSION_JUSTIFICATIF_LABELS).map(
                          ([k, lab]) => (
                            <option key={k} value={k}>
                              {lab}
                            </option>
                          ),
                        )}
                      </select>
                      <input
                        className="input"
                        placeholder="N°"
                        value={j.numero ?? ""}
                        onChange={(e) =>
                          modifierMissionAchat(doc.id, {
                            justificatifs: (doc.justificatifs ?? []).map((x) =>
                              x.id === j.id ? { ...x, numero: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <input
                        className="input"
                        placeholder="Libellé"
                        value={j.libelle ?? ""}
                        onChange={(e) =>
                          modifierMissionAchat(doc.id, {
                            justificatifs: (doc.justificatifs ?? []).map((x) =>
                              x.id === j.id ? { ...x, libelle: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          modifierMissionAchat(doc.id, {
                            justificatifs: (doc.justificatifs ?? []).filter(
                              (x) => x.id !== j.id,
                            ),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">{MISSION_JUSTIFICATIF_LABELS[j.type]}</p>
                      <p className="text-sm">{j.numero || "—"}</p>
                      <p className="text-sm sm:col-span-2">{j.libelle || "—"}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Situation des fonds
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <p>Demandés : {formatCurrency(fin.fondsDemandes)}</p>
          <p>Validés : {formatCurrency(fin.fondsValides)}</p>
          <p>Remis : {formatCurrency(fin.fondsRemis)}</p>
          <p>Dépenses : {formatCurrency(fin.totalDepenses)}</p>
          <p>Justifiées : {formatCurrency(fin.depensesJustifiees)}</p>
          <p>Non justifiées : {formatCurrency(fin.depensesNonJustifiees)}</p>
          <p>
            Solde : {formatCurrency(fin.solde)} ({libelleSoldeMission(fin.solde)})
          </p>
          <p>À restituer : {formatCurrency(fin.aRestituer)}</p>
          <p>À rembourser à l&apos;acheteur : {formatCurrency(fin.aRembourser)}</p>
        </div>
        <p className="mt-3 text-xs text-muted">
          Solde = fonds remis − dépenses justifiées. Aucun mouvement de
          trésorerie n&apos;est généré automatiquement.
        </p>

        {gerer &&
          (mission.statut === "cloture" ||
            mission.statut === "a_regulariser" ||
            mission.statut === "en_cours" ||
            mission.statut === "fonds_remis") && (
            <form
              className="mt-4 grid gap-3 sm:grid-cols-3"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const statut = (
                  form.elements.namedItem("reglement") as HTMLSelectElement
                ).value as "non_regle" | "regle";
                const dateReglement = (
                  form.elements.namedItem("dateReglement") as HTMLInputElement
                ).value;
                run(
                  reglerMissionAchat(mission.id, {
                    statutReglement: statut,
                    dateReglement: statut === "regle" ? dateReglement : undefined,
                  }),
                );
              }}
            >
              <label className="block text-xs font-semibold text-muted">
                Régularisation des fonds
                <select
                  name="reglement"
                  className="select mt-1"
                  defaultValue={mission.statutReglement}
                >
                  <option value="non_regle">Non réglé</option>
                  <option value="regle">Réglé (restitution / remboursement fait)</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-muted">
                Date
                <input
                  name="dateReglement"
                  type="date"
                  className="input mt-1"
                  defaultValue={
                    mission.dateReglement?.slice(0, 10) ?? jourLocalISO()
                  }
                />
              </label>
              <div className="flex items-end">
                <button type="submit" className="btn btn-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          )}
      </section>

      {gerer && (
        <div className="mb-6 flex flex-wrap gap-2">
          {mission.statut === "brouillon" && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => run(soumettreMissionAchat(mission.id))}
              >
                Soumettre
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const motif = prompt("Motif du rejet ?") ?? "";
                  run(rejeterMissionAchat(mission.id, motif || undefined));
                }}
              >
                Rejeter
              </button>
            </>
          )}
          {mission.statut === "soumise" && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => run(validerMissionAchat(mission.id))}
              >
                Valider
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const motif = prompt("Motif du rejet ?") ?? "";
                  run(rejeterMissionAchat(mission.id, motif || undefined));
                }}
              >
                Rejeter
              </button>
            </>
          )}
          {(mission.statut === "en_cours" ||
            mission.statut === "fonds_remis" ||
            mission.statut === "a_regulariser") && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setClotureOpen(true)}
            >
              Clôturer
            </button>
          )}
          {!verrouille && mission.statut !== "rejetee" && (
            <button type="button" className="btn btn-secondary" onClick={annuler}>
              Annuler
            </button>
          )}
          {mission.statut === "cloture" && (
            <button type="button" className="btn btn-secondary" onClick={annuler}>
              Annuler (contre-mouvement stock)
            </button>
          )}
        </div>
      )}

      {((mission.validations ?? []).length > 0 || journal.length > 0) && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">
            Historique et traçabilité
          </h2>
          <ul className="space-y-2 text-sm">
            {(mission.validations ?? []).map((v) => (
              <li key={v.id}>
                <span className="font-medium">
                  {VALIDATION_LABELS[v.action] ?? v.action}
                </span>
                {" — "}
                {v.userNom ?? "Utilisateur"} · {formatDateTime(v.date)}
                {v.detail ? ` · ${v.detail}` : ""}
              </li>
            ))}
            {journal.map((j) => (
              <li key={j.id} className="text-muted">
                {j.action} — {j.userNom ?? "Utilisateur"} · {formatDateTime(j.date)}
                {j.detail ? ` · ${j.detail}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Rapport de mission
        </h2>
        <MissionRapportDocument
          ref={rapportRef}
          mission={mission}
          parametres={parametres}
          produits={produits}
          nomSite={nomSite}
          nomFrn={nomFrn}
        />
      </div>

      {clotureOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius)] bg-card p-5 shadow-lg">
            <h2 className="font-display text-lg font-semibold">Confirmer la clôture</h2>
            <p className="mt-2 text-sm text-muted">
              Entrée en stock au site destinataire sur les quantités
              réceptionnées, recalcul du CUMP, écritures 401 si la comptabilité
              est active.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>Fonds remis : {formatCurrency(fin.fondsRemis)}</li>
              <li>Total dépensé : {formatCurrency(fin.totalDepenses)}</li>
              <li>
                Solde : {formatCurrency(solde)} ({libelleSoldeMission(solde)})
              </li>
              <li>Justificatifs manquants : {nbJustificatifsManquants(mission)}</li>
            </ul>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={exceptionJustificatifs}
                onChange={(e) => setExceptionJustificatifs(e.target.checked)}
              />
              Autoriser la clôture malgré des justificatifs manquants
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={confirmerCloture}>
                Confirmer
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClotureOpen(false)}
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {nouveauFrnLigneId && (
        <ModalNouveauFournisseur
          onClose={() => setNouveauFrnLigneId(null)}
          onCreate={(nom) => {
            const res = addTiers({
              nom,
              actif: true,
              roles: ["fournisseur"],
              type: "autre",
            });
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            patchRealises((lignes) =>
              lignes.map((x) =>
                x.id === nouveauFrnLigneId ? { ...x, fournisseurId: res.id } : x,
              ),
            );
            setNouveauFrnLigneId(null);
          }}
        />
      )}
    </div>
  );
}

function ModalNouveauFournisseur({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (nom: string) => void;
}) {
  const [nom, setNom] = useState("");
  function onForm(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    onCreate(nom.trim());
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onForm}
        className="w-full max-w-sm rounded-[var(--radius)] bg-card p-5 shadow-lg"
      >
        <h2 className="font-display text-lg font-semibold">Nouveau fournisseur</h2>
        <label className="mt-3 block text-xs font-semibold text-muted">
          Nom
          <input
            className="input mt-1"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
            required
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn btn-primary">
            Créer
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
