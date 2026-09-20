"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DemandePrixDocument } from "@/components/demande-prix-document";
import { DocumentPrintActions } from "@/components/document-print-actions";
import { DpComparatif } from "@/components/dp-comparatif";
import { PageHeader } from "@/components/page-header";
import { SelecteurArticle } from "@/components/selecteur-article";
import { SelecteurApercuCommandesFournisseur } from "@/components/apercu-bon-commande-fournisseur";
import { TransformerDpAchat } from "@/components/transformer-dp-achat";
import { SelecteurDestinationAchat } from "@/components/selecteur-destination-achat";
import { DESTINATION_ACHAT_LABELS } from "@/lib/achats";
import { formatDate } from "@/lib/format";
import { createId } from "@/lib/id";
import {
  badgeClasseDp,
  consultationsDp,
  DP_CONSULTATION_STATUT_LABELS,
  dpEstVerrouillee,
  libelleStatutGlobalDp,
  statutConsultationEffective,
  statutGlobalDp,
} from "@/lib/demandes-prix";
import { produitEstAchetable } from "@/lib/nature-stock";
import { libelleProduit } from "@/lib/produits";
import { TIERS_DIVERS_MARCHE_ID } from "@/lib/missions";
import { assurerTiers, estFournisseur } from "@/lib/tiers";
import { useStore } from "@/lib/store";
import type { DemandePrixConsultationStatut } from "@/lib/types";

export default function DemandePrixDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");
  const dp = useStore((s) => (s.demandesPrix ?? []).find((d) => d.id === id));
  const produits = useStore((s) => s.produits ?? []);
  const categoriesProduits = useStore((s) => s.categoriesProduits);
  const clients = useStore((s) => s.clients);
  const fournisseursLegacy = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);
  const modifierDemandePrix = useStore((s) => s.modifierDemandePrix);
  const changerStatutDemandePrix = useStore((s) => s.changerStatutDemandePrix);
  const majConsultationDemandePrix = useStore((s) => s.majConsultationDemandePrix);
  const parametres = useStore((s) => s.parametres);
  const achats = useStore((s) => s.achats);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const commandes = useStore((s) => s.commandes ?? []);
  const [nouvelArticleId, setNouvelArticleId] = useState("");
  const [nouvelleQte, setNouvelleQte] = useState("1");
  const [nouvellesSpecs, setNouvellesSpecs] = useState("");
  const [frnDocument, setFrnDocument] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

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

  const nomFrn = (fid: string) =>
    fournisseurs.find((f) => f.id === fid)?.nom ??
    fournisseursLegacy.find((f) => f.id === fid)?.nom ??
    "Fournisseur";

  const destinaireDoc = (fid: string) => {
    const t = fournisseurs.find((f) => f.id === fid);
    const legacy = fournisseursLegacy.find((f) => f.id === fid);
    return {
      nom: t?.nom ?? legacy?.nom ?? "Fournisseur",
      telephone: t?.telephone ?? legacy?.telephone,
      email: t?.email ?? legacy?.email,
      adresse: t?.adresse ?? legacy?.adresse,
      ville: t?.ville ?? legacy?.ville,
      nif: t?.nif ?? legacy?.nif,
      stat: t?.stat ?? legacy?.stat,
    };
  };

  const articles = useMemo(
    () =>
      (produits ?? []).filter(
        (p) => p?.actif && produitEstAchetable(p, categoriesProduits),
      ),
    [produits, categoriesProduits],
  );

  if (!dp) {
    return (
      <div>
        <PageHeader title="Demande de prix introuvable" showPosSelector={false} />
        <Link href="/demandes-prix" className="text-sm text-sea-800">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const verrouille = dpEstVerrouillee(dp);
  const brouillon = dp.statut === "brouillon";
  const global = statutGlobalDp(dp);

  function ajouterArticle() {
    if (!nouvelArticleId) {
      alert("Choisissez un article.");
      return;
    }
    const qte = Number(nouvelleQte);
    if (!(qte > 0)) {
      alert("Indiquez une quantité positive.");
      return;
    }
    if ((dp!.lignes ?? []).some((l) => l.produitId === nouvelArticleId)) {
      alert("Cet article est déjà dans la demande.");
      return;
    }
    const res = modifierDemandePrix(dp!.id, {
      lignes: [
        ...(dp!.lignes ?? []),
        { id: createId("dpl"), produitId: nouvelArticleId, quantite: qte, specifications: nouvellesSpecs.trim() || undefined },
      ],
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    setNouvelArticleId("");
    setNouvelleQte("1");
    setNouvellesSpecs("");
  }

  function retirerArticle(ligneId: string) {
    const res = modifierDemandePrix(dp!.id, {
      lignes: (dp!.lignes ?? []).filter((l) => l.id !== ligneId),
    });
    if (!res.ok) alert(res.reason);
  }

  function toggleFrn(fid: string) {
    const actuel = dp!.fournisseurIds ?? [];
    const next = actuel.includes(fid)
      ? actuel.filter((x) => x !== fid)
      : [...actuel, fid];
    const res = modifierDemandePrix(dp!.id, { fournisseurIds: next });
    if (!res.ok) alert(res.reason);
  }

  function setConsultation(fid: string, statut: DemandePrixConsultationStatut) {
    const res = majConsultationDemandePrix(dp!.id, fid, statut);
    if (!res.ok) alert(res.reason);
  }

  return (
    <div>
      <PageHeader
        title={dp.numero}
        description="Une DP par consultation fournisseur : mêmes articles, réponses et statuts distincts. Comparatif ligne à ligne, puis commande(s)."
        showPosSelector={false}
        actions={
          <Link href="/demandes-prix" className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Liste
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={`badge ${badgeClasseDp(global)}`}>{libelleStatutGlobalDp(dp)}</span>
        <span className="text-sm text-muted">{formatDate(dp.date)}</span>
        {dp.origine === "alerte_stock" && (
          <span className="badge badge-sand">Depuis alerte stock</span>
        )}
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          Validité (jours)
          <input
            type="number"
            min={1}
            className="input w-24"
            value={dp.validiteJours ?? 15}
            disabled={dp.statut === "annulee"}
            onChange={(e) => {
              const res = modifierDemandePrix(dp.id, {
                validiteJours: Number(e.target.value) || 15,
              });
              if (!res.ok) alert(res.reason);
            }}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          Site destinataire
          <select
            className="select w-48"
            value={dp.pointDeVenteId ?? ""}
            disabled={verrouille}
            onChange={(e) => {
              const res = modifierDemandePrix(dp.id, { pointDeVenteId: e.target.value });
              if (!res.ok) alert(res.reason);
            }}
          >
            <option value="">—</option>
            {pointsDeVente.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">
          Livraison souhaitée
          <input
            type="date"
            className="input"
            value={(dp.dateLivraisonSouhaitee ?? "").slice(0, 10)}
            disabled={verrouille}
            onChange={(e) => {
              const res = modifierDemandePrix(dp.id, {
                dateLivraisonSouhaitee: e.target.value,
              });
              if (!res.ok) alert(res.reason);
            }}
          />
        </label>
      </div>
      <div className="mb-6 max-w-3xl rounded-[var(--radius)] border border-line bg-card p-4">
        {verrouille ? (
          <p className="text-sm">
            Destination :{" "}
            <span className="font-semibold">
              {dp.destinationAchat
                ? DESTINATION_ACHAT_LABELS[dp.destinationAchat]
                : "Non renseignée"}
            </span>
            {dp.commandeId
              ? ` · ${commandes.find((c) => c.id === dp.commandeId)?.numero ?? dp.commandeId}`
              : ""}
          </p>
        ) : (
          <SelecteurDestinationAchat
            destination={dp.destinationAchat ?? ""}
            commandeId={dp.commandeId ?? ""}
            commandes={commandes}
            clients={clients}
            onChange={(next) => {
              const res = modifierDemandePrix(dp.id, {
                destinationAchat: next.destinationAchat || undefined,
                commandeId:
                  next.destinationAchat === "projet_client"
                    ? next.commandeId || undefined
                    : undefined,
              });
              if (!res.ok) alert(res.reason);
            }}
          />
        )}
      </div>
      {!verrouille && (
        <div className="mb-6 flex flex-wrap gap-2">
          {dp.statut === "brouillon" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const res = changerStatutDemandePrix(dp.id, "en_cours");
                if (!res.ok) alert(res.reason);
              }}
            >
              Passer en cours
            </button>
          )}
          {dp.statut === "en_cours" && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const res = changerStatutDemandePrix(dp.id, "cloturee");
                  if (!res.ok) alert(res.reason);
                }}
              >
                Clôturer
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!confirm("Clôturer cette DP sans suite (aucun fournisseur retenu) ?")) return;
                  const res = changerStatutDemandePrix(dp.id, "cloturee_sans_suite");
                  if (!res.ok) alert(res.reason);
                }}
              >
                Clôturer sans suite
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (!confirm("Annuler cette demande de prix ?")) return;
              const res = changerStatutDemandePrix(dp.id, "annulee");
              if (!res.ok) alert(res.reason);
            }}
          >
            Annuler
          </button>
        </div>
      )}

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Articles et fournisseurs consultés</h2>
          <div className="mb-4 space-y-2">
            {(dp.lignes ?? []).map((ligne) => {
              const p = produits.find((x) => x.id === ligne.produitId);
              return (
                <div key={ligne.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {p ? `${p.code} — ${libelleProduit(p)}` : "Article"} · qté {ligne.quantite}
                    {ligne.specifications ? ` · ${ligne.specifications}` : ""}
                  </span>
                  {brouillon && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => retirerArticle(ligne.id)}
                    >
                      Retirer
                    </button>
                  )}
                </div>
              );
            })}
            {(dp.lignes ?? []).length === 0 && (
              <p className="text-sm text-muted">Aucun article.</p>
            )}
          </div>
          {brouillon && (
            <div className="grid gap-3 lg:grid-cols-[1fr_8rem_1fr_auto]">
              <SelecteurArticle
                produits={articles}
                value={nouvelArticleId}
                onChange={setNouvelArticleId}
                allowEmpty
                emptyLabel="— Ajouter un article —"
              />
              <label className="block text-xs font-semibold text-muted">
                Quantité
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="input mt-1"
                  value={nouvelleQte}
                  onChange={(e) => setNouvelleQte(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Spécifications
                <input
                  className="input mt-1"
                  value={nouvellesSpecs}
                  onChange={(e) => setNouvellesSpecs(e.target.value)}
                />
              </label>
              <button type="button" className="btn btn-secondary self-end" onClick={ajouterArticle}>
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>
          )}
          <h3 className="mb-2 mt-5 text-sm font-semibold">Fournisseurs consultés</h3>
          <div className="flex flex-wrap gap-2">
            {brouillon
              ? fournisseurs.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={(dp.fournisseurIds ?? []).includes(f.id)}
                      onChange={() => toggleFrn(f.id)}
                    />
                    {f.nom}
                  </label>
                ))
              : (dp.fournisseurIds ?? []).map((fid) => (
                  <span
                    key={fid}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm"
                  >
                    {nomFrn(fid)}
                  </span>
                ))}
          </div>
        </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-2 font-display text-lg font-semibold">
          Suivi des fournisseurs consultés
        </h2>
        <p className="mb-3 text-xs text-muted">
          La DP est dupliquée virtuellement : mêmes lignes, statut et réponse propres à
          chaque fournisseur. Le statut global se calcule à partir de ces suivis.
        </p>
        {(dp.fournisseurIds ?? []).length === 0 ? (
          <p className="text-sm text-muted">Aucun fournisseur consulté.</p>
        ) : (
          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {consultationsDp(dp).map((c) => {
                  const effectif = statutConsultationEffective(dp, c.fournisseurId);
                  return (
                    <tr key={c.fournisseurId}>
                      <td className="font-medium">{nomFrn(c.fournisseurId)}</td>
                      <td>
                        <span className="badge badge-sea">
                          {DP_CONSULTATION_STATUT_LABELS[effectif]}
                        </span>
                      </td>
                      <td>
                        {!verrouille && (
                          <div className="flex flex-wrap gap-1">
                            {(
                              [
                                "envoyee",
                                "en_attente",
                                "relancee",
                                "sans_reponse",
                              ] as DemandePrixConsultationStatut[]
                            ).map((st) => (
                              <button
                                key={st}
                                type="button"
                                className={`btn !px-2 !py-1 text-xs ${
                                  effectif === st ? "btn-primary" : "btn-secondary"
                                }`}
                                onClick={() => setConsultation(c.fournisseurId, st)}
                              >
                                {DP_CONSULTATION_STATUT_LABELS[st]}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-2 font-display text-lg font-semibold">Comparatif article par article</h2>
        <p className="mb-4 text-xs text-muted">
          Prix et délai côte à côte. Le plus bas est mis en évidence. Une alerte apparaît
          si le prix net dépasse le dernier achat connu. Retenez un fournisseur par ligne.
        </p>
        <DpComparatif dp={dp} nomFrn={nomFrn} verrouille={verrouille} />
      </section>

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-2 font-display text-lg font-semibold">Document commercial</h2>
        <p className="mb-3 text-xs text-muted">
          Téléchargez ou imprimez la demande de prix adressée à un fournisseur consulté.
        </p>
        {(dp.fournisseurIds ?? []).length === 0 ? (
          <p className="text-sm text-muted">Ajoutez un fournisseur consulté pour générer le document.</p>
        ) : (
          <>
            <label className="mb-3 block max-w-md text-xs font-semibold text-muted">
              Destinataire
              <select
                className="select mt-1"
                value={frnDocument || (dp.fournisseurIds ?? [])[0] || ""}
                onChange={(e) => setFrnDocument(e.target.value)}
              >
                {(dp.fournisseurIds ?? []).map((fid) => (
                  <option key={fid} value={fid}>
                    {nomFrn(fid)}
                  </option>
                ))}
              </select>
            </label>
            <DocumentPrintActions
              sheetRef={sheetRef}
              filename={`${dp.numero}-${nomFrn(frnDocument || (dp.fournisseurIds ?? [])[0] || "")}.pdf`}
              className="mb-4"
            />
            <DemandePrixDocument
              ref={sheetRef}
              dp={dp}
              parametres={parametres}
              produits={produits}
              destinataire={destinaireDoc(frnDocument || (dp.fournisseurIds ?? [])[0] || "")}
            />
          </>
        )}
      </section>

      {dp.statut !== "annulee" && dp.statut !== "cloturee_sans_suite" && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">
            Transformer en achat réel
          </h2>
          <p className="mb-3 text-xs text-muted">
            Retenez un fournisseur par ligne, puis confirmez. Un achat validé est
            créé par fournisseur, avec écriture d&apos;achat au journal (charges /
            fournisseur). Le paiement se saisit ensuite, séparément.
          </p>
          <TransformerDpAchat dp={dp} nomFrn={nomFrn} />
        </section>
      )}

      {(dp.achatIds ?? []).length > 0 && (
        <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">Achats générés</h2>
          <p className="mb-3 text-xs text-muted">
            Achats validés issus de cette DP. L&apos;écriture d&apos;achat est
            déjà au journal ; le paiement se saisit sur chaque achat.
          </p>
          <SelecteurApercuCommandesFournisseur
            achats={(dp.achatIds ?? [])
              .map((aid) => achats.find((x) => x.id === aid))
              .filter((a): a is NonNullable<typeof a> => Boolean(a))}
          />
        </section>
      )}
    </div>
  );
}
