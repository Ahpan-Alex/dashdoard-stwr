"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { createId } from "@/lib/id";
import { jourLocalISO } from "@/lib/inventaire";
import {
  libelleSoldeMission,
  missionEstVerrouillee,
  MISSION_REGLEMENT_LABELS,
  MISSION_STATUT_LABELS,
  montantLigneRealisee,
  peutSaisirMission,
  soldeMission,
  TIERS_DIVERS_MARCHE_ID,
  TIERS_DIVERS_MARCHE_NOM,
  totalAchatsRealises,
  totalDepenseMission,
  totalDepensesDiverses,
} from "@/lib/missions";
import { produitEstAchetable } from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import { estFournisseur } from "@/lib/tiers";
import { useStore } from "@/lib/store";
import type { MissionAchatStatut, MissionValidationAction } from "@/lib/types";

function badgeMission(statut: MissionAchatStatut) {
  if (statut === "cloture") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  return "badge-danger";
}

const VALIDATION_LABELS: Record<MissionValidationAction, string> = {
  confirmer_cloture: "Clôture confirmée",
  annuler_cloture: "Clôture annulée",
  retour_edition: "Retour à l'édition",
  annuler_document: "Annulation",
  regler: "Règlement",
};

export default function MissionAchatDetailPage() {
  return (
    <RequirePermission permission={["missions.lire", "missions.gerer"]}>
      <MissionDetail />
    </RequirePermission>
  );
}

function MissionDetail() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const mission = useStore((s) => (s.missionsAchat ?? []).find((m) => m.id === id));
  const produits = useStore((s) => s.produits);
  const tiers = useStore((s) => s.tiers ?? []);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const {
    modifierMissionAchat,
    cloturerMissionAchat,
    annulerMissionAchat,
    reglerMissionAchat,
    addTiers,
  } = useStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const gerer = hasPermission("missions.gerer");

  const [clotureOpen, setClotureOpen] = useState(false);
  const [nouveauFrnLigneId, setNouveauFrnLigneId] = useState<string | null>(null);

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
  const saisie = peutSaisirMission(doc, { gerer, userId: user?.id });
  const achetable = produits.filter((p) => p.actif && produitEstAchetable(p));
  const fournisseurs = tiers.filter((t) => t.actif !== false && estFournisseur(t));
  const nomSite =
    pointsDeVente.find((s) => s.id === doc.siteDestinataireId)?.nom ?? "Site";
  const totAchats = totalAchatsRealises(doc);
  const totDivers = totalDepensesDiverses(doc);
  const totDepense = totalDepenseMission(doc);
  const solde = soldeMission(doc);

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

  function annuler() {
    const msg =
      doc.statut === "cloture"
        ? "Annuler cette mission clôturée par contre-mouvement ? Les mouvements d'origine restent tracés."
        : "Annuler cette mission d'achat ?";
    if (!confirm(msg)) return;
    const res = annulerMissionAchat(doc.id);
    if (!res.ok) alert(res.reason);
  }

  function confirmerCloture() {
    const res = cloturerMissionAchat(doc.id);
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
        description="Achats réellement effectués, dépenses diverses sans justificatif, rapprochement de caisse informatif."
        showPosSelector={false}
        actions={
          <Link href="/missions" className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Liste
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`badge ${badgeMission(mission.statut)}`}>
          {MISSION_STATUT_LABELS[mission.statut]}
        </span>
        <span className="badge badge-sea">
          {MISSION_REGLEMENT_LABELS[mission.statutReglement]}
        </span>
        {mission.statut === "cloture_annule" && (
          <span className="text-xs text-muted">
            Contre-mouvement enregistré — rien n&apos;a été supprimé.
          </span>
        )}
      </div>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">En-tête</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Acheteur</span>
            <br />
            {mission.acheteurNom}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Date</span>
            <br />
            {formatDate(mission.date)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Site destinataire</span>
            <br />
            {nomSite}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Avance remise</span>
            <br />
            {gerer && !verrouille ? (
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={mission.montantAvance}
                onChange={(e) =>
                  modifierMissionAchat(mission.id, {
                    montantAvance: Number(e.target.value) || 0,
                  })
                }
              />
            ) : (
              formatCurrency(mission.montantAvance)
            )}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Liste prévisionnelle</h2>
        {mission.lignesPrevisionnelles.length === 0 ? (
          <p className="text-sm text-muted">Aucun article prévu.</p>
        ) : (
          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Qté souhaitée</th>
                </tr>
              </thead>
              <tbody>
                {mission.lignesPrevisionnelles.map((l) => {
                  const p = produits.find((x) => x.id === l.produitId);
                  return (
                    <tr key={l.id}>
                      <td>{p ? `${p.code} — ${libelleProduit(p)}` : "—"}</td>
                      <td>{l.quantiteSouhaitee}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
          Quantité 0 acceptée si l&apos;article n&apos;a pas été trouvé. Fournisseur par défaut :
          Divers / Marché (vendeurs informels).
        </p>
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Article</th>
                <th>Qté achetée</th>
                <th>PU réel</th>
                <th>Montant</th>
                <th>Fournisseur</th>
                {saisie && <th />}
              </tr>
            </thead>
            <tbody>
              {mission.achatsRealises.map((l) => {
                const p = produits.find((x) => x.id === l.produitId);
                return (
                  <tr key={l.id}>
                    <td>
                      {saisie ? (
                        <select
                          className="select"
                          value={l.produitId}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id ? { ...x, produitId: e.target.value } : x,
                              ),
                            )
                          }
                        >
                          {achetable.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.code} — {libelleProduit(prod)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        p ? `${p.code} — ${libelleProduit(p)}` : "—"
                      )}
                    </td>
                    <td>
                      {saisie ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="input w-24"
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
                          step="1"
                          className="input w-28"
                          value={l.prixUnitaire}
                          onChange={(e) =>
                            patchRealises((lignes) =>
                              lignes.map((x) =>
                                x.id === l.id
                                  ? { ...x, prixUnitaire: Number(e.target.value) || 0 }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        formatCurrency(l.prixUnitaire)
                      )}
                    </td>
                    <td className="font-semibold">{formatCurrency(montantLigneRealisee(l))}</td>
                    <td>
                      {saisie ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <select
                            className="select min-w-[10rem]"
                            value={l.fournisseurId}
                            onChange={(e) => {
                              if (e.target.value === "__nouveau__") {
                                setNouveauFrnLigneId(l.id);
                                return;
                              }
                              patchRealises((lignes) =>
                                lignes.map((x) =>
                                  x.id === l.id ? { ...x, fournisseurId: e.target.value } : x,
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
                            <option value="__nouveau__">+ Nouveau fournisseur…</option>
                          </select>
                        </div>
                      ) : (
                        nomFrn(l.fournisseurId)
                      )}
                    </td>
                    {saisie && (
                      <td>
                        {!l.previsionId && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                              patchRealises((lignes) => lignes.filter((x) => x.id !== l.id))
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Dépenses diverses</h2>
          {saisie && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                patchDepenses((lignes) => [
                  ...lignes,
                  { id: createId("misd"), nature: "", montant: 0 },
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Ligne libre
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-muted">
          Nature en texte libre, sans pièce justificative, sans écriture comptable.
        </p>
        {mission.depensesDiverses.length === 0 ? (
          <p className="text-sm text-muted">Aucune dépense diverse.</p>
        ) : (
          <div className="space-y-2">
            {mission.depensesDiverses.map((d) => (
              <div key={d.id} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
                {saisie ? (
                  <>
                    <input
                      className="input"
                      placeholder="Nature (ex. taxi, sac, pourboire)"
                      value={d.nature}
                      onChange={(e) =>
                        patchDepenses((lignes) =>
                          lignes.map((x) =>
                            x.id === d.id ? { ...x, nature: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={d.montant}
                      onChange={(e) =>
                        patchDepenses((lignes) =>
                          lignes.map((x) =>
                            x.id === d.id ? { ...x, montant: Number(e.target.value) || 0 } : x,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        patchDepenses((lignes) => lignes.filter((x) => x.id !== d.id))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm">{d.nature}</p>
                    <p className="text-sm font-semibold">{formatCurrency(d.montant)}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Rapprochement de caisse</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Achats réalisés</span>
            <br />
            {formatCurrency(totAchats)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Dépenses diverses</span>
            <br />
            {formatCurrency(totDivers)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Total dépensé</span>
            <br />
            {formatCurrency(totDepense)}
          </p>
          <p>
            <span className="text-xs font-semibold uppercase text-muted">Solde</span>
            <br />
            <span className="font-semibold">{formatCurrency(solde)}</span>
            <span className="ml-1 text-xs text-muted">{libelleSoldeMission(solde)}</span>
          </p>
        </div>
        <p className="mt-3 text-xs text-muted">
          Solde positif = à rendre par l&apos;acheteur ; négatif = à rembourser par l&apos;entreprise.
          Informatif uniquement — aucun mouvement de trésorerie.
        </p>

        {mission.statut === "cloture" && gerer && (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const statut = (form.elements.namedItem("reglement") as HTMLSelectElement).value as
                | "non_regle"
                | "regle";
              const dateReglement = (form.elements.namedItem("dateReglement") as HTMLInputElement)
                .value;
              const res = reglerMissionAchat(mission.id, {
                statutReglement: statut,
                dateReglement: statut === "regle" ? dateReglement : undefined,
              });
              if (!res.ok) alert(res.reason);
            }}
          >
            <label className="block text-xs font-semibold text-muted">
              Statut de règlement
              <select
                name="reglement"
                className="select mt-1"
                defaultValue={mission.statutReglement}
              >
                <option value="non_regle">Non réglé</option>
                <option value="regle">Réglé</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Date de règlement
              <input
                name="dateReglement"
                type="date"
                className="input mt-1"
                defaultValue={mission.dateReglement?.slice(0, 10) ?? jourLocalISO()}
              />
            </label>
            <div className="flex items-end">
              <button type="submit" className="btn btn-primary">
                Enregistrer le règlement
              </button>
            </div>
          </form>
        )}
      </section>

      {gerer && (
        <div className="mb-6 flex flex-wrap gap-2">
          {mission.statut === "en_cours" && (
            <button type="button" className="btn btn-primary" onClick={() => setClotureOpen(true)}>
              Clôturer
            </button>
          )}
          {(mission.statut === "en_cours" || mission.statut === "cloture") && (
            <button type="button" className="btn btn-secondary" onClick={annuler}>
              Annuler
            </button>
          )}
        </div>
      )}

      {mission.validations.length > 0 && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Historique de validation</h2>
          <ul className="space-y-2 text-sm">
            {mission.validations.map((v) => (
              <li key={v.id}>
                <span className="font-medium">{VALIDATION_LABELS[v.action]}</span>
                {" — "}
                {v.userNom ?? "Utilisateur"} · {formatDateTime(v.date)}
                {v.detail ? ` · ${v.detail}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {clotureOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius)] bg-card p-5 shadow-lg">
            <h2 className="font-display text-lg font-semibold">Confirmer la clôture</h2>
            <p className="mt-2 text-sm text-muted">
              Entrée en stock au site destinataire, recalcul du CUMP, et écritures 401 si la
              comptabilité est active. Les dépenses diverses ne génèrent pas d&apos;écriture.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>Avance : {formatCurrency(mission.montantAvance)}</li>
              <li>Total dépensé : {formatCurrency(totDepense)}</li>
              <li>
                Solde : {formatCurrency(solde)} ({libelleSoldeMission(solde)})
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={confirmerCloture}>
                Confirmer
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setClotureOpen(false)}
              >
                Retour édition
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setClotureOpen(false);
                  annuler();
                }}
              >
                Annuler la mission
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
        <h2 className="font-display text-lg font-semibold">Nouveau fournisseur formel</h2>
        <p className="mt-1 text-xs text-muted">
          Création rapide sans quitter la saisie de la mission.
        </p>
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
