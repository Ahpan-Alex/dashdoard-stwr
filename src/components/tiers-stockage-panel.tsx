"use client";

import { useState } from "react";
import { Download, Eye, FolderOpen, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { createId } from "@/lib/id";
import {
  apercuFichierPossible,
  dossiersStockageTiers,
  motifFichierStockageTiers,
  tailleMaxFichierTiersOctets,
} from "@/lib/tiers-fiche";
import type {
  DossierStockageTiers,
  FichierStockageTiers,
  Parametres,
  Tiers,
} from "@/lib/types";

type Props = {
  tiers: Tiers;
  parametres: Parametres;
  onSave: (patch: Partial<Tiers>) => { ok: boolean; reason?: string };
};

export function TiersStockagePanel({ tiers, parametres, onSave }: Props) {
  const dossiers = dossiersStockageTiers(tiers);
  const [dossierId, setDossierId] = useState(dossiers[0]?.id ?? "stk-autres");
  const [nouveauDossier, setNouveauDossier] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [apercuId, setApercuId] = useState<string | null>(null);
  const max = tailleMaxFichierTiersOctets(parametres);
  const fichiers = (tiers.fichiersStockage ?? []).filter(
    (f) => f.dossierId === dossierId,
  );
  const apercu = (tiers.fichiersStockage ?? []).find((f) => f.id === apercuId);

  function enregistrer(
    fichiersStockage: FichierStockageTiers[],
    dossiersStockage?: DossierStockageTiers[],
  ) {
    const res = onSave({
      fichiersStockage,
      ...(dossiersStockage ? { dossiersStockage } : {}),
    });
    if (!res.ok) alert(res.reason ?? "Enregistrement impossible.");
    return res.ok;
  }

  function creerDossier() {
    const nom = nouveauDossier.trim();
    if (!nom) return;
    const dossier: DossierStockageTiers = { id: createId("dos"), nom };
    const dossiersStockage = [...(tiers.dossiersStockage ?? []), dossier];
    if (enregistrer(tiers.fichiersStockage ?? [], dossiersStockage)) {
      setNouveauDossier("");
      setDossierId(dossier.id);
    }
  }

  function supprimerDossier(id: string) {
    const restants = (tiers.fichiersStockage ?? []).filter((f) => f.dossierId !== id);
    const dossiersStockage = (tiers.dossiersStockage ?? []).filter((d) => d.id !== id);
    if (
      (tiers.fichiersStockage ?? []).some((f) => f.dossierId === id) &&
      !confirm("Ce dossier contient des fichiers. Les supprimer avec le dossier ?")
    ) {
      return;
    }
    if (enregistrer(restants, dossiersStockage)) {
      setDossierId(dossiers[0]?.id ?? "stk-autres");
    }
  }

  async function ajouterFichier(file: File) {
    const motif = motifFichierStockageTiers(
      { nom: file.name, taille: file.size },
      max,
    );
    if (motif) {
      alert(motif);
      return;
    }
    const dataUrl = await lireDataUrl(file);
    const fichier: FichierStockageTiers = {
      id: createId("fic"),
      dossierId,
      nom: file.name,
      mime: file.type || "application/octet-stream",
      dataUrl,
      taille: file.size,
      dateAjout: new Date().toISOString(),
      commentaire: commentaire.trim() || undefined,
    };
    if (enregistrer([fichier, ...(tiers.fichiersStockage ?? [])])) {
      setCommentaire("");
    }
  }

  function renommer(f: FichierStockageTiers) {
    const nom = prompt("Nouveau nom", f.nom);
    if (!nom?.trim()) return;
    const motif = motifFichierStockageTiers({ nom, taille: f.taille }, max);
    if (motif) {
      alert(motif);
      return;
    }
    enregistrer(
      (tiers.fichiersStockage ?? []).map((x) =>
        x.id === f.id ? { ...x, nom: nom.trim() } : x,
      ),
    );
  }

  function supprimer(f: FichierStockageTiers) {
    if (!confirm(`Supprimer « ${f.nom} » ?`)) return;
    enregistrer((tiers.fichiersStockage ?? []).filter((x) => x.id !== f.id));
    if (apercuId === f.id) setApercuId(null);
  }

  const dossierCourant = dossiers.find((d) => d.id === dossierId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Documents de cette fiche uniquement. Un tiers client et fournisseur
        partage le même espace. Taille maximale : {Math.round(max / (1024 * 1024))} Mo
        par fichier.
      </p>
      <div className="flex flex-wrap gap-2">
        {dossiers.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`btn ${dossierId === d.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setDossierId(d.id)}
          >
            {d.nom}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">
          Nouveau dossier
          <input
            className="input mt-1"
            value={nouveauDossier}
            onChange={(e) => setNouveauDossier(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-secondary" onClick={creerDossier}>
          Créer
        </button>
        {dossierCourant && !dossierCourant.systeme && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => supprimerDossier(dossierCourant.id)}
          >
            Supprimer le dossier
          </button>
        )}
      </div>

      <section className="rounded-[var(--radius)] border border-line bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">
            Commentaire (facultatif)
            <input
              className="input mt-1"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Fichier (PDF, image, Word, Excel)
            <input
              type="file"
              className="input mt-1"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void ajouterFichier(file);
              }}
            />
          </label>
        </div>
      </section>

      {fichiers.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-5 w-5" />}
          title="Dossier vide"
          description="Ajoutez un fichier dans ce dossier."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Ajout</th>
                <th>Utilisateur</th>
                <th>Commentaire</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fichiers.map((f) => (
                <tr key={f.id}>
                  <td className="font-medium">{f.nom}</td>
                  <td>{formatDate(f.dateAjout)}</td>
                  <td>{f.userNom || "—"}</td>
                  <td>{f.commentaire || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {apercuFichierPossible(f.nom, f.mime) && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setApercuId(f.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <a className="btn btn-secondary" href={f.dataUrl} download={f.nom}>
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => renommer(f)}
                      >
                        Renommer
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => supprimer(f)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {apercu && (
        <section className="rounded-[var(--radius)] border border-line bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">{apercu.nom}</h3>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setApercuId(null)}
            >
              Fermer
            </button>
          </div>
          {apercuFichierPossible(apercu.nom, apercu.mime) === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={apercu.dataUrl} alt={apercu.nom} className="max-h-[28rem]" />
          ) : (
            <iframe title={apercu.nom} src={apercu.dataUrl} className="h-[28rem] w-full" />
          )}
        </section>
      )}
    </div>
  );
}

function lireDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
