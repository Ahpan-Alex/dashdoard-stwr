"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { FileUp, Stamp } from "lucide-react";
import { IndicateurInfo } from "@/components/indicateur-info";
import { LignesCommandeBat } from "@/components/lignes-commande-bat";
import {
  actorPeutValiderBat,
  BAT_FICHIER,
  BAT_MOTIFS_REFUS,
  BAT_STATUTS,
  badgeBat,
  batAFichier,
  batCourantCycle,
  batEnRetardRelance,
  batEstLectureSeule,
  batsCourantsCommande,
  batsGabaritPourProduit,
  batsPourCycle,
  batsValidesMemeClientProduit,
  cycleIdBat,
  fileToBatDataUrl,
  libelleLignesBat,
  lignesProduitCommande,
  motifCreationBatImpossible,
} from "@/lib/bat";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";
import type { BatMotifRefus, BonATirer, Commande } from "@/lib/types";

function ApercuFichier({
  mime,
  dataUrl,
  nom,
}: {
  mime?: string;
  dataUrl?: string;
  nom?: string;
}) {
  if (!dataUrl) {
    return <p className="text-xs text-muted">Aucun fichier joint.</p>;
  }
  if (mime?.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dataUrl}
        alt={nom ?? "BAT"}
        className="mt-2 max-h-56 w-auto max-w-full rounded border border-line object-contain"
      />
    );
  }
  return (
    <a
      href={dataUrl}
      download={nom ?? "bat.pdf"}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-block text-sm text-sea-800 underline"
    >
      Ouvrir {nom ?? "le PDF"}
    </a>
  );
}

export function BatCommandePanel({ commandeId }: { commandeId: string }) {
  const tousBats = useStore((s) => s.bonsATirer ?? []);
  const commande = useStore((s) => s.commandes.find((c) => c.id === commandeId));
  const commandes = useStore((s) => s.commandes);
  const parametres = useStore((s) => s.parametres);
  const delaiRelance = useStore(
    (s) => s.parametresAlertes.batRelance?.delaiJours ?? 7,
  );
  const creerBonATirer = useStore((s) => s.creerBonATirer);
  const completerFichierBat = useStore((s) => s.completerFichierBat);
  const enregistrerRetourBat = useStore((s) => s.enregistrerRetourBat);
  const dupliquerBatValide = useStore((s) => s.dupliquerBatValide);
  const creerBatDepuisGabarit = useStore((s) => s.creerBatDepuisGabarit);
  const marquerGabaritBat = useStore((s) => s.marquerGabaritBat);
  const user = useAuthStore((s) => s.user);
  const peutGerer = useAuthStore((s) => s.hasPermission("commercial.gerer"));
  const peutValider = actorPeutValiderBat(user, parametres);
  const [busy, setBusy] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [motifRefus, setMotifRefus] = useState<BatMotifRefus | "">("");
  const [fichierSuivant, setFichierSuivant] = useState<File | null>(null);
  const [ligneIds, setLigneIds] = useState<string[]>([]);
  const [cycleCompare, setCycleCompare] = useState<string | null>(null);
  const [vGauche, setVGauche] = useState("");
  const [vDroite, setVDroite] = useState("");
  const [sourceDup, setSourceDup] = useState("");
  const [sourceGabarit, setSourceGabarit] = useState("");

  const courants = useMemo(
    () => (commande ? batsCourantsCommande(tousBats, commande.id) : []),
    [tousBats, commande],
  );
  const lignesProd = commande ? lignesProduitCommande(commande) : [];
  const produitPrincipal = lignesProd[0]?.produitId;
  const dupliables =
    commande && produitPrincipal
      ? batsValidesMemeClientProduit(
          tousBats,
          commandes,
          commande.clientId,
          produitPrincipal,
          commande.id,
        )
      : [];
  const gabarits =
    commande && produitPrincipal
      ? batsGabaritPourProduit(tousBats, commandes, produitPrincipal)
      : [];

  const motifNouveau = commande
    ? motifCreationBatImpossible(tousBats, commande, ligneIds)
    : "Commande introuvable.";

  async function lireFichier(file: File | null) {
    if (!file) throw new Error("Choisissez un fichier.");
    return fileToBatDataUrl(file);
  }

  async function creer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!commande) return;
    const input = e.currentTarget.elements.namedItem("fichier") as HTMLInputElement;
    setBusy(true);
    try {
      const fichier = await lireFichier(input.files?.[0] ?? null);
      const res = creerBonATirer({
        commandeId,
        ligneIds,
        fichierNom: fichier.nom,
        fichierMime: fichier.mime,
        fichierDataUrl: fichier.dataUrl,
        commentaire: commentaire.trim() || undefined,
      });
      if (!res.ok) {
        alert(res.reason);
        return;
      }
      setCommentaire("");
      input.value = "";
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fichier illisible.");
    } finally {
      setBusy(false);
    }
  }

  async function joindre(id: string, file: File | null) {
    setBusy(true);
    try {
      const fichier = await lireFichier(file);
      const res = completerFichierBat(id, {
        nom: fichier.nom,
        mime: fichier.mime,
        dataUrl: fichier.dataUrl,
      });
      if (!res.ok) alert(res.reason);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fichier illisible.");
    } finally {
      setBusy(false);
    }
  }

  async function retour(id: string, decision: "valide" | "modifications_demandees") {
    setBusy(true);
    try {
      let suivant:
        | { nom: string; mime: string; dataUrl: string }
        | undefined;
      if (decision === "modifications_demandees" && fichierSuivant) {
        const f = await fileToBatDataUrl(fichierSuivant);
        suivant = { nom: f.nom, mime: f.mime, dataUrl: f.dataUrl };
      }
      const res = enregistrerRetourBat(id, {
        decision,
        commentaire: commentaire.trim() || undefined,
        motifRefus: decision === "modifications_demandees" && motifRefus
          ? motifRefus
          : undefined,
        fichierSuivant: suivant,
      });
      if (!res.ok) {
        alert(res.reason);
        return;
      }
      setCommentaire("");
      setMotifRefus("");
      setFichierSuivant(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fichier illisible.");
    } finally {
      setBusy(false);
    }
  }

  if (!commande) return null;

  const versionsCompare = cycleCompare
    ? batsPourCycle(tousBats, cycleCompare)
    : [];
  const gauche = versionsCompare.find((b) => b.id === vGauche);
  const droite = versionsCompare.find((b) => b.id === vDroite);

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-line bg-card px-4 py-3 text-sm no-print">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Stamp className="h-3.5 w-3.5" />
        Bons à tirer
        <IndicateurInfo titre="Bon à tirer">
          Le BAT valide le visuel client avant fabrication. Chaque cycle
          (sélection de lignes) conserve toutes ses versions. Seule la dernière
          version bloque ou débloque l&apos;OF sur ces lignes. Aucune écriture
          comptable n&apos;est générée.
        </IndicateurInfo>
      </p>

      <LignesCommandeBat
        commande={commande}
        bats={tousBats}
        delaiRelanceJours={delaiRelance}
      />

      {courants.length === 0 ? (
        <p className="mt-3 text-xs text-muted">
          Aucun BAT pour {commande.numero}.
        </p>
      ) : (
        courants.map((courant) => (
          <CycleBat
            key={cycleIdBat(courant)}
            courant={courant}
            versions={batsPourCycle(tousBats, cycleIdBat(courant))}
            commande={commande}
            delaiRelance={delaiRelance}
            peutGerer={peutGerer}
            peutValider={peutValider}
            busy={busy}
            commentaire={commentaire}
            setCommentaire={setCommentaire}
            motifRefus={motifRefus}
            setMotifRefus={setMotifRefus}
            setFichierSuivant={setFichierSuivant}
            onJoindre={joindre}
            onRetour={retour}
            onGabarit={(v) => {
              const res = marquerGabaritBat(courant.id, v);
              if (!res.ok) alert(res.reason);
            }}
            onComparer={() => {
              const vers = batsPourCycle(tousBats, cycleIdBat(courant));
              setCycleCompare(cycleIdBat(courant));
              setVGauche(vers[0]?.id ?? "");
              setVDroite(vers[vers.length - 1]?.id ?? "");
            }}
          />
        ))
      )}

      {cycleCompare && versionsCompare.length >= 2 && (
        <div className="mt-4 rounded-lg border border-sea-200 bg-white p-3">
          <p className="mb-2 font-semibold">Comparatif de versions</p>
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted">
              Version A
              <select
                className="select mt-1"
                value={vGauche}
                onChange={(e) => setVGauche(e.target.value)}
              >
                {versionsCompare.map((b) => (
                  <option key={b.id} value={b.id}>
                    V{b.version} · {BAT_STATUTS[b.statut]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              Version B
              <select
                className="select mt-1"
                value={vDroite}
                onChange={(e) => setVDroite(e.target.value)}
              >
                {versionsCompare.map((b) => (
                  <option key={b.id} value={b.id}>
                    V{b.version} · {BAT_STATUTS[b.statut]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColonneCompare bat={gauche} />
            <ColonneCompare bat={droite} />
          </div>
        </div>
      )}

      {peutGerer && (
        <div className="mt-4 space-y-3 border-t border-line pt-3">
          {dupliables.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-semibold text-muted">
                Dupliquer un BAT déjà validé (même client)
                <select
                  className="select mt-1 min-w-[16rem]"
                  value={sourceDup}
                  onChange={(e) => setSourceDup(e.target.value)}
                >
                  <option value="">—</option>
                  {dupliables.map((b) => {
                    const src = commandes.find((c) => c.id === b.commandeId);
                    return (
                      <option key={b.id} value={b.id}>
                        {src?.numero ?? b.commandeId} V{b.version}
                      </option>
                    );
                  })}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || !sourceDup || !peutValider}
                onClick={() => {
                  const res = dupliquerBatValide({
                    sourceId: sourceDup,
                    commandeId,
                    ligneIds,
                  });
                  if (!res.ok) alert(res.reason);
                  else setSourceDup("");
                }}
              >
                Dupliquer et valider
              </button>
            </div>
          )}
          {gabarits.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-semibold text-muted">
                Gabarit multi-clients (même support)
                <select
                  className="select mt-1 min-w-[16rem]"
                  value={sourceGabarit}
                  onChange={(e) => setSourceGabarit(e.target.value)}
                >
                  <option value="">—</option>
                  {gabarits.map((b) => {
                    const src = commandes.find((c) => c.id === b.commandeId);
                    return (
                      <option key={b.id} value={b.id}>
                        {src?.numero ?? b.commandeId} V{b.version} (gabarit)
                      </option>
                    );
                  })}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || !sourceGabarit}
                onClick={() => {
                  const res = creerBatDepuisGabarit({
                    gabaritId: sourceGabarit,
                    commandeId,
                    ligneIds,
                  });
                  if (!res.ok) alert(res.reason);
                  else setSourceGabarit("");
                }}
              >
                Reprendre le fichier
              </button>
            </div>
          )}

          {!motifNouveau && (
            <form onSubmit={creer} className="grid gap-2 sm:grid-cols-2">
              {lignesProd.length > 0 && (
                <fieldset className="sm:col-span-2">
                  <legend className="text-xs font-semibold text-muted">
                    Lignes couvertes (vide = toutes les lignes produit)
                  </legend>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {lignesProd.map((l) => (
                      <label key={l.id} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={ligneIds.includes(l.id)}
                          onChange={(e) =>
                            setLigneIds((ids) =>
                              e.target.checked
                                ? [...ids, l.id]
                                : ids.filter((x) => x !== l.id),
                            )
                          }
                        />
                        {l.designation || l.codeProduit}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="block text-xs font-semibold text-muted">
                Nouveau BAT (fichier)
                <input
                  name="fichier"
                  type="file"
                  className="input mt-1"
                  accept={BAT_FICHIER.accept}
                  required
                  disabled={busy}
                />
                <span className="mt-0.5 block font-normal">
                  PNG, JPG, WebP ou PDF — max {BAT_FICHIER.maxBytesLabel}. Envoi au
                  client hors logiciel.
                </span>
              </label>
              <label className="block text-xs font-semibold text-muted">
                Commentaire
                <input
                  className="input mt-1"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                />
              </label>
              <div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  <FileUp className="h-4 w-4" />
                  Créer V1
                </button>
              </div>
            </form>
          )}
          {motifNouveau && courants.length > 0 && (
            <p className="text-xs text-muted">{motifNouveau}</p>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted">
        <Link href="/commandes/bat" className="underline">
          Voir tous les BAT
        </Link>
        {" · "}
        <Link href="/parametres/bat" className="underline">
          Paramètres BAT
        </Link>
      </p>
    </div>
  );
}

function ColonneCompare({ bat }: { bat?: BonATirer }) {
  if (!bat) return <p className="text-xs text-muted">Choisissez une version.</p>;
  return (
    <div className="rounded-lg border border-line p-2">
      <p className="font-semibold">
        V{bat.version}{" "}
        <span className={`badge ${badgeBat(bat.statut)}`}>
          {BAT_STATUTS[bat.statut]}
        </span>
      </p>
      <p className="text-[11px] text-muted">
        {formatDateTime(bat.dateEnvoi)}
        {bat.dateValidation ? ` · validé ${formatDateTime(bat.dateValidation)}` : ""}
      </p>
      {bat.motifRefus && (
        <p className="mt-1 text-xs">
          Motif : {BAT_MOTIFS_REFUS[bat.motifRefus]}
        </p>
      )}
      {bat.commentaire && (
        <p className="mt-1 text-xs italic text-muted">{bat.commentaire}</p>
      )}
      <ApercuFichier
        mime={bat.fichierMime}
        dataUrl={bat.fichierDataUrl}
        nom={bat.fichierNom}
      />
    </div>
  );
}

function CycleBat({
  courant,
  versions,
  commande,
  delaiRelance,
  peutGerer,
  peutValider,
  busy,
  commentaire,
  setCommentaire,
  motifRefus,
  setMotifRefus,
  setFichierSuivant,
  onJoindre,
  onRetour,
  onGabarit,
  onComparer,
}: {
  courant: BonATirer;
  versions: BonATirer[];
  commande: Commande;
  delaiRelance: number;
  peutGerer: boolean;
  peutValider: boolean;
  busy: boolean;
  commentaire: string;
  setCommentaire: (v: string) => void;
  motifRefus: BatMotifRefus | "";
  setMotifRefus: (v: BatMotifRefus | "") => void;
  setFichierSuivant: (f: File | null) => void;
  onJoindre: (id: string, file: File | null) => void;
  onRetour: (id: string, d: "valide" | "modifications_demandees") => void;
  onGabarit: (v: boolean) => void;
  onComparer: () => void;
}) {
  const retard = batEnRetardRelance(courant, delaiRelance);
  return (
    <div className="mt-3 rounded-lg border border-line bg-white px-3 py-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          Cycle · {libelleLignesBat(courant, commande)}
          <span className={`badge ml-2 ${badgeBat(courant.statut)}`}>
            V{courant.version} · {BAT_STATUTS[courant.statut]}
          </span>
          {retard && <span className="badge badge-danger ml-1">Relance</span>}
          {courant.gabarit && (
            <span className="badge badge-sea ml-1">Gabarit</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {versions.length >= 2 && (
            <button type="button" className="btn btn-secondary !py-1" onClick={onComparer}>
              Comparer
            </button>
          )}
          {peutGerer && courant.statut === "valide" && (
            <button
              type="button"
              className="btn btn-secondary !py-1"
              onClick={() => onGabarit(!courant.gabarit)}
            >
              {courant.gabarit ? "Retirer le gabarit" : "Marquer gabarit"}
            </button>
          )}
        </div>
      </div>
      <ul className="space-y-3">
        {versions.map((b) => (
          <li key={b.id} className="rounded-lg border border-line px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                V{b.version}
                <span className={`badge ml-2 ${badgeBat(b.statut)}`}>
                  {BAT_STATUTS[b.statut]}
                </span>
                {batEstLectureSeule(b) && (
                  <span className="ml-2 text-[10px] uppercase text-muted">
                    Archivée
                  </span>
                )}
              </p>
              <p className="text-[11px] text-muted">
                Envoi {formatDateTime(b.dateEnvoi)}
              </p>
            </div>
            {b.motifRefus && (
              <p className="mt-1 text-xs">
                Motif : {BAT_MOTIFS_REFUS[b.motifRefus]}
              </p>
            )}
            {b.commentaire && (
              <p className="mt-1 text-xs italic text-muted">{b.commentaire}</p>
            )}
            {b.statut === "valide" && (
              <p className="mt-1 text-xs">
                Validé le {b.dateValidation ? formatDateTime(b.dateValidation) : "—"}{" "}
                par {b.validateurUserNom || b.validateurNom || "—"}
              </p>
            )}
            <ApercuFichier
              mime={b.fichierMime}
              dataUrl={b.fichierDataUrl}
              nom={b.fichierNom}
            />
            {peutGerer && b.statut === "en_attente" && !batAFichier(b) && (
              <label className="mt-2 block text-xs font-semibold text-muted">
                Joindre le fichier de V{b.version}
                <input
                  type="file"
                  className="input mt-1"
                  accept={BAT_FICHIER.accept}
                  disabled={busy}
                  onChange={(e) => onJoindre(b.id, e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            {b.statut === "en_attente" &&
              batAFichier(b) &&
              b.id === batCourantCycle(versions, cycleIdBat(courant))?.id && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-muted">
                    Commentaire
                    <input
                      className="input mt-1"
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-muted">
                    Motif (si modifications)
                    <select
                      className="select mt-1"
                      value={motifRefus}
                      onChange={(e) =>
                        setMotifRefus(e.target.value as BatMotifRefus | "")
                      }
                    >
                      <option value="">—</option>
                      {(Object.keys(BAT_MOTIFS_REFUS) as BatMotifRefus[]).map(
                        (k) => (
                          <option key={k} value={k}>
                            {BAT_MOTIFS_REFUS[k]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-muted sm:col-span-2">
                    Fichier de la version suivante (si modifications)
                    <input
                      type="file"
                      className="input mt-1"
                      accept={BAT_FICHIER.accept}
                      onChange={(e) =>
                        setFichierSuivant(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {peutValider && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={busy}
                        onClick={() => onRetour(b.id, "valide")}
                      >
                        Valider
                      </button>
                    )}
                    {peutGerer && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => onRetour(b.id, "modifications_demandees")}
                      >
                        Modifications demandées → V{b.version + 1}
                      </button>
                    )}
                    {!peutValider && (
                      <p className="text-xs text-muted">
                        La validation est réservée au rôle habilité (Paramètres
                        BAT).
                      </p>
                    )}
                  </div>
                </div>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}
