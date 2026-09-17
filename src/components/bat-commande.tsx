"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FileUp, Stamp } from "lucide-react";
import { IndicateurInfo } from "@/components/indicateur-info";
import {
  BAT_FICHIER,
  BAT_STATUTS,
  badgeBat,
  batAFichier,
  batEstLectureSeule,
  batsPourCommande,
  commandeABatValide,
  fileToBatDataUrl,
  motifCreationBatImpossible,
} from "@/lib/bat";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

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
  const bats = useStore((s) => batsPourCommande(s.bonsATirer ?? [], commandeId));
  const tousBats = useStore((s) => s.bonsATirer ?? []);
  const commande = useStore((s) => s.commandes.find((c) => c.id === commandeId));
  const creerBonATirer = useStore((s) => s.creerBonATirer);
  const completerFichierBat = useStore((s) => s.completerFichierBat);
  const enregistrerRetourBat = useStore((s) => s.enregistrerRetourBat);
  const peutGerer = useAuthStore((s) => s.hasPermission("commercial.gerer"));
  const [busy, setBusy] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [validateur, setValidateur] = useState("");
  const [fichierSuivant, setFichierSuivant] = useState<File | null>(null);

  const courant = bats[bats.length - 1];
  const motifNouveau = motifCreationBatImpossible(tousBats, commandeId);
  const valide = commandeABatValide(tousBats, commandeId);

  async function lireFichier(file: File | null) {
    if (!file) throw new Error("Choisissez un fichier.");
    return fileToBatDataUrl(file);
  }

  async function creer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("fichier") as HTMLInputElement;
    setBusy(true);
    try {
      const fichier = await lireFichier(input.files?.[0] ?? null);
      const res = creerBonATirer({
        commandeId,
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
        validateurNom: validateur,
        commentaire: commentaire.trim() || undefined,
        fichierSuivant: suivant,
      });
      if (!res.ok) {
        alert(res.reason);
        return;
      }
      setCommentaire("");
      setValidateur("");
      setFichierSuivant(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fichier illisible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-line bg-card px-4 py-3 text-sm no-print">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Stamp className="h-3.5 w-3.5" />
        Bons à tirer
        <IndicateurInfo titre="Bon à tirer">
          Le BAT est la validation visuelle du visuel par le client avant
          fabrication. Chaque version (V1, V2…) conserve son fichier. Un OF lié
          à cette commande ne peut démarrer sans BAT validé, sauf dérogation
          administrateur / comptable.
        </IndicateurInfo>
        {valide ? (
          <span className="badge badge-success">BAT validé</span>
        ) : (
          <span className="badge badge-sand">Pas de BAT validé</span>
        )}
      </p>

      {bats.length === 0 ? (
        <p className="text-xs text-muted">
          Aucun BAT pour {commande?.numero ?? "cette commande"}.
        </p>
      ) : (
        <ul className="space-y-3">
          {bats.map((b) => (
            <li
              key={b.id}
              className="rounded-lg border border-line bg-white px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  V{b.version}
                  <span className={`badge ml-2 ${badgeBat(b.statut)}`}>
                    {BAT_STATUTS[b.statut]}
                  </span>
                  {batEstLectureSeule(b) && (
                    <span className="ml-2 text-[10px] uppercase text-muted">
                      Lecture seule
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted">
                  Envoi {formatDateTime(b.dateEnvoi)}
                </p>
              </div>
              {b.commentaire && (
                <p className="mt-1 text-xs italic text-muted">{b.commentaire}</p>
              )}
              {b.statut === "valide" && (
                <p className="mt-1 text-xs">
                  Validé le {b.dateValidation ? formatDateTime(b.dateValidation) : "—"}{" "}
                  par {b.validateurNom ?? "—"}
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
                    onChange={(e) => joindre(b.id, e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              {peutGerer && b.statut === "en_attente" && batAFichier(b) && b.id === courant?.id && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-muted">
                    Contact client (si validé)
                    <input
                      className="input mt-1"
                      value={validateur}
                      onChange={(e) => setValidateur(e.target.value)}
                      placeholder="Nom de la personne côté client"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-muted">
                    Commentaire
                    <input
                      className="input mt-1"
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                    />
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
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => retour(b.id, "valide")}
                    >
                      Validé
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => retour(b.id, "modifications_demandees")}
                    >
                      Modifications demandées → V{b.version + 1}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {peutGerer && !motifNouveau && (
        <form onSubmit={creer} className="mt-3 grid gap-2 sm:grid-cols-2">
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
              client hors logiciel (e-mail).
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
              Créer V{bats.length + 1}
            </button>
          </div>
        </form>
      )}
      {peutGerer && motifNouveau && bats.length > 0 && (
        <p className="mt-2 text-xs text-muted">{motifNouveau}</p>
      )}
      <p className="mt-2 text-[11px] text-muted">
        <Link href="/commandes/bat" className="underline">
          Voir tous les BAT
        </Link>
      </p>
    </div>
  );
}
