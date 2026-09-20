"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import {
  affectationsInitialesParArticle,
  dpPeutEtreTransformee,
  offreLigneFournisseur,
  regrouperAffectationsEnCommandes,
} from "@/lib/demandes-prix";
import { libelleProduit } from "@/lib/produits";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import { VALIDITE_JOURS_DEFAUT, normaliserValiditeJours } from "@/lib/validite-document";
import { motifDestinationAchatManquante } from "@/lib/achats";
import { SelecteurDestinationAchat } from "@/components/selecteur-destination-achat";
import type { DemandePrix, DestinationAchat, Produit } from "@/lib/types";

type PartEdit = {
  fournisseurId: string;
  quantite: string;
  prixAchatUnitaire: string;
};

type LigneEdit = {
  ligneId: string;
  produitId: string;
  designation: string;
  quantiteDemandee: number;
  parts: PartEdit[];
};

function toEdit(dp: DemandePrix, produits: Produit[]): LigneEdit[] {
  return affectationsInitialesParArticle(dp, produits ?? []).map((a) => ({
    ligneId: a.ligneId,
    produitId: a.produitId,
    designation: a.designation,
    quantiteDemandee: a.quantiteDemandee,
    parts: a.parts.map((p) => ({
      fournisseurId: p.fournisseurId,
      quantite: String(p.quantite),
      prixAchatUnitaire: p.prixAchatUnitaire > 0 ? String(p.prixAchatUnitaire) : "",
    })),
  }));
}

export function TransformerDpAchat({
  dp,
  nomFrn,
}: {
  dp: DemandePrix;
  nomFrn: (id: string) => string;
}) {
  const produits = useStore((s) => s.produits ?? []);
  const transformer = useStore((s) => s.transformerDemandePrixEnAchats);
  const commandesClient = useStore((s) => s.commandes ?? []);
  const clients = useStore((s) => s.clients ?? []);
  const { visibles } = useSitesVisibles();
  const sites = visibles.filter((s) => s.actif);
  const consultes = dp.fournisseurIds ?? [];

  const [ouvert, setOuvert] = useState(false);
  const [etape, setEtape] = useState<"edition" | "validation">("edition");
  const [siteId, setSiteId] = useState(dp.pointDeVenteId || sites[0]?.id || "");
  const [date, setDate] = useState(jourLocalISO());
  const [validiteJours, setValiditeJours] = useState(
    String(dp.validiteJours ?? VALIDITE_JOURS_DEFAUT),
  );
  const [lignes, setLignes] = useState<LigneEdit[]>(() => toEdit(dp, produits));
  const [destinationAchat, setDestinationAchat] = useState<DestinationAchat | "">(
    dp.destinationAchat ??
      (dp.origine === "alerte_stock" ? "approvisionnement_stock" : ""),
  );
  const [commandeId, setCommandeId] = useState(dp.commandeId ?? "");

  const commandesPrevues = useMemo(
    () =>
      regrouperAffectationsEnCommandes(
        lignes.map((l) => ({
          produitId: l.produitId,
          parts: l.parts.map((p) => ({
            fournisseurId: p.fournisseurId,
            quantite: Number(p.quantite) || 0,
            prixAchatUnitaire: Number(p.prixAchatUnitaire) || 0,
          })),
        })),
      ),
    [lignes],
  );

  if (!dpPeutEtreTransformee(dp)) {
    return (
      <p className="text-sm text-muted">
        Ajoutez au moins un article et un fournisseur consulté pour transformer
        cette DP en un ou plusieurs achats.
      </p>
    );
  }

  function resetFormulaire() {
    setLignes(toEdit(dp, produits));
    setSiteId(dp.pointDeVenteId || sites[0]?.id || "");
    setDate(jourLocalISO());
    setValiditeJours(String(dp.validiteJours ?? VALIDITE_JOURS_DEFAUT));
    setDestinationAchat(
      dp.destinationAchat ??
        (dp.origine === "alerte_stock" ? "approvisionnement_stock" : ""),
    );
    setCommandeId(dp.commandeId ?? "");
    setEtape("edition");
    setOuvert(true);
  }

  function patchPart(ligneId: string, index: number, patch: Partial<PartEdit>) {
    setLignes((prev) =>
      prev.map((l) =>
        l.ligneId === ligneId
          ? {
              ...l,
              parts: l.parts.map((p, i) => (i === index ? { ...p, ...patch } : p)),
            }
          : l,
      ),
    );
  }

  function retirerPart(ligneId: string, index: number) {
    setLignes((prev) =>
      prev.map((l) =>
        l.ligneId === ligneId
          ? { ...l, parts: l.parts.filter((_, i) => i !== index) }
          : l,
      ),
    );
  }

  function ajouterPart(ligneId: string, fournisseurId: string) {
    if (!fournisseurId) return;
    setLignes((prev) =>
      prev.map((l) => {
        if (l.ligneId !== ligneId) return l;
        const deja = l.parts.reduce((s, p) => s + (Number(p.quantite) || 0), 0);
        const reste = Math.max(0, l.quantiteDemandee - deja);
        const offre = offreLigneFournisseur(dp, l.ligneId, fournisseurId);
        return {
          ...l,
          parts: [
            ...l.parts,
            {
              fournisseurId,
              quantite: String(reste || l.quantiteDemandee),
              prixAchatUnitaire:
                offre && offre.prixUnitaire > 0 ? String(offre.prixUnitaire) : "",
            },
          ],
        };
      }),
    );
  }

  function validerFormulaire() {
    if (!siteId) {
      alert("Choisissez un site de destination.");
      return false;
    }
    const motifDest = motifDestinationAchatManquante({
      destinationAchat: destinationAchat || undefined,
      commandeId: commandeId || undefined,
    });
    if (motifDest) {
      alert(motifDest);
      return false;
    }
    if (commandesPrevues.length === 0) {
      alert("Attribuez au moins un article à un fournisseur, avec une quantité positive.");
      return false;
    }
    for (const l of lignes) {
      if (l.parts.some((p) => p.fournisseurId && !(Number(p.quantite) >= 0))) {
        alert("Les quantités doivent être positives.");
        return false;
      }
      if (l.parts.some((p) => p.fournisseurId && Number(p.prixAchatUnitaire) < 0)) {
        alert("Les prix ne peuvent pas être négatifs.");
        return false;
      }
    }
    return true;
  }

  function lancer() {
    if (!validerFormulaire()) return;
    const commandes = commandesPrevues.map((c) => ({
      fournisseurId: c.fournisseurId,
      lignes: c.lignes,
    }));
    const res = transformer(dp.id, {
      pointDeVenteId: siteId,
      date: isoMidiDepuisJour(date),
      validiteJours: normaliserValiditeJours(validiteJours),
      destinationAchat: destinationAchat || undefined,
      commandeId:
        destinationAchat === "projet_client" ? commandeId || undefined : undefined,
      commandes,
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    setOuvert(false);
    setEtape("edition");
  }

  return (
    <div>
      {!ouvert ? (
        <button type="button" className="btn btn-primary" onClick={resetFormulaire}>
          {(dp.achatIds ?? []).length > 0
            ? "Créer d’autres achats"
            : "Transformer en achat"}
        </button>
      ) : etape === "validation" ? (
        <div className="space-y-4">
          <p className="text-sm font-semibold">Confirmer la transformation</p>
          <p className="text-sm text-muted">
            {commandesPrevues.length > 1
              ? `${commandesPrevues.length} achats validés seront créés.`
              : "1 achat validé sera créé."}{" "}
            La DP passera en statut Clôturée. Chaque achat génère une écriture
            d&apos;achat (charges / fournisseur), distincte du paiement.
          </p>
          <ul className="space-y-1 text-sm">
            {commandesPrevues.map((c) => (
              <li key={c.fournisseurId}>
                <span className="font-semibold">{nomFrn(c.fournisseurId)}</span>
                {" · "}
                {c.lignes.length} article{c.lignes.length > 1 ? "s" : ""}
                {" · "}
                {formatCurrency(
                  c.lignes.reduce((s, l) => s + l.quantite * l.prixAchatUnitaire, 0),
                )}{" "}
                HT
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={lancer}>
              Confirmer
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOuvert(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEtape("edition")}
            >
              Retour à l&apos;édition
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Répartissez chaque article entre un ou plusieurs fournisseurs : un
            achat réel (validé) est créé par fournisseur, avec écriture
            d&apos;achat au journal. Le paiement se saisit ensuite sur l&apos;achat.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-muted">
              Site de destination
              <select
                className="select mt-1"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="">— Choisir —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Date de commande
              <input
                type="date"
                className="input mt-1"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Validité (jours)
              <input
                type="number"
                min={1}
                className="input mt-1"
                value={validiteJours}
                onChange={(e) => setValiditeJours(e.target.value)}
              />
            </label>
          </div>
          <SelecteurDestinationAchat
            name="destination-achat-dp-transform"
            destination={destinationAchat}
            commandeId={commandeId}
            commandes={commandesClient}
            clients={clients}
            onChange={(next) => {
              setDestinationAchat(next.destinationAchat);
              setCommandeId(next.commandeId);
            }}
          />

          <div className="space-y-4">
            {lignes.map((l) => {
              const p = produits.find((x) => x.id === l.produitId);
              const affecte = l.parts.reduce((s, part) => s + (Number(part.quantite) || 0), 0);
              const restants = consultes.filter(
                (fid) => !l.parts.some((part) => part.fournisseurId === fid),
              );
              const ecart = Math.abs(affecte - l.quantiteDemandee) > 0.0001;
              return (
                <div key={l.ligneId} className="rounded-[var(--radius)] border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-semibold">
                      {p ? `${p.code} — ${libelleProduit(p)}` : l.designation}
                    </h4>
                    <p className={`text-xs ${ecart ? "text-amber-800" : "text-muted"}`}>
                      Demandé {formatNumber(l.quantiteDemandee)}
                      {p?.unite ? ` ${p.unite}` : ""} · affecté {formatNumber(affecte)}
                      {ecart ? " (différent de la DP)" : ""}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {l.parts.map((part, i) => (
                      <div
                        key={`${l.ligneId}-${i}`}
                        className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]"
                      >
                        <select
                          className="select"
                          value={part.fournisseurId}
                          onChange={(e) =>
                            patchPart(l.ligneId, i, { fournisseurId: e.target.value })
                          }
                        >
                          <option value="">— Fournisseur —</option>
                          {consultes.map((fid) => (
                            <option
                              key={fid}
                              value={fid}
                              disabled={
                                fid !== part.fournisseurId &&
                                l.parts.some((x) => x.fournisseurId === fid)
                              }
                            >
                              {nomFrn(fid)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="input"
                          value={part.quantite}
                          onChange={(e) =>
                            patchPart(l.ligneId, i, { quantite: e.target.value })
                          }
                          aria-label="Quantité"
                        />
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="input"
                          value={part.prixAchatUnitaire}
                          onChange={(e) =>
                            patchPart(l.ligneId, i, { prixAchatUnitaire: e.target.value })
                          }
                          aria-label="Prix unitaire"
                          placeholder="Prix HT"
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => retirerPart(l.ligneId, i)}
                          aria-label="Retirer ce fournisseur"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {restants.length > 0 && (
                    <AjouterFournisseurLigne
                      options={restants.map((fid) => ({ id: fid, nom: nomFrn(fid) }))}
                      onAdd={(fid) => ajouterPart(l.ligneId, fid)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {commandesPrevues.length > 0 && (
            <div className="rounded-[var(--radius)] border border-sea-200 bg-sea-50/40 p-3">
              <p className="mb-2 text-xs font-semibold text-muted">
                {commandesPrevues.length > 1
                  ? `${commandesPrevues.length} achats validés seront créés`
                  : "1 achat validé sera créé"}
              </p>
              <ul className="space-y-1 text-sm">
                {commandesPrevues.map((c) => (
                  <li key={c.fournisseurId}>
                    <span className="font-semibold">{nomFrn(c.fournisseurId)}</span>
                    {" · "}
                    {c.lignes.length} article{c.lignes.length > 1 ? "s" : ""}
                    {" · "}
                    {formatCurrency(
                      c.lignes.reduce((s, l) => s + l.quantite * l.prixAchatUnitaire, 0),
                    )}{" "}
                    HT
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!validerFormulaire()) return;
                setEtape("validation");
              }}
            >
              Continuer vers la validation
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOuvert(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AjouterFournisseurLigne({
  options,
  onAdd,
}: {
  options: { id: string; nom: string }[];
  onAdd: (fournisseurId: string) => void;
}) {
  const [id, setId] = useState(options[0]?.id ?? "");
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="block min-w-[14rem] flex-1 text-xs font-semibold text-muted">
        Partager avec un autre fournisseur
        <select className="select mt-1" value={id} onChange={(e) => setId(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nom}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          if (!id) return;
          onAdd(id);
          const next = options.find((o) => o.id !== id);
          setId(next?.id ?? "");
        }}
      >
        <Plus className="h-4 w-4" />
        Ajouter
      </button>
    </div>
  );
}
