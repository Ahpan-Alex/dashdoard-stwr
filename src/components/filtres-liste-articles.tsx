"use client";

import { useState } from "react";
import { ChevronDown, Download, X } from "lucide-react";
import {
  FILTRES_ARTICLES_VIDE,
  badgesFiltresArticles,
  nombreFiltresSecondaires,
  patchFiltresArticles,
  retirerFiltreArticle,
  type FiltreArticleEnregistre,
  type FiltresArticles,
} from "@/lib/articles-filtres";
import { MODE_APPROVISIONNEMENT_LABELS } from "@/lib/mode-approvisionnement";
import { NATURES_STOCK, NATURE_STOCK_LABELS } from "@/lib/nature-stock";
import { enfantsCategorie } from "@/lib/produits";
import { TYPE_ACHAT_LABELS, TYPES_ACHAT_PRODUIT } from "@/lib/type-achat";
import type { CategorieProduit, PointDeVente } from "@/lib/types";

type Props = {
  filtres: FiltresArticles;
  onChange: (filtres: FiltresArticles) => void;
  categories: CategorieProduit[];
  sites: PointDeVente[];
  fournisseurs: { id: string; nom: string; actif?: boolean }[];
  enregistres: FiltreArticleEnregistre[];
  onEnregistrer: (nom: string, filtres: FiltresArticles) => { ok: boolean; reason?: string };
  onRenommer: (id: string, nom: string) => { ok: boolean; reason?: string };
  onSupprimer: (id: string) => void;
  total: number;
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
};

export function FiltresListeArticles({
  filtres,
  onChange,
  categories,
  sites,
  fournisseurs,
  enregistres,
  onEnregistrer,
  onRenommer,
  onSupprimer,
  total,
  page,
  pages,
  onPage,
  onExportCsv,
  onExportPdf,
}: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [selection, setSelection] = useState("");
  const secondaires = nombreFiltresSecondaires(filtres);
  const familles = enfantsCategorie(undefined, categories).filter((c) => c.actif);
  const sousFamilles = filtres.familleId
    ? enfantsCategorie(filtres.familleId, categories).filter((c) => c.actif)
    : [];
  const fournisseursActifs = fournisseurs.filter((f) => f.actif !== false);

  function nomCategorie(id: string) {
    return categories.find((c) => c.id === id)?.libelle ?? id;
  }

  const badges = badgesFiltresArticles(filtres, {
    nomCategorie,
    nomSite: (id) => sites.find((s) => s.id === id)?.nom ?? id,
    nomFournisseur: (id) =>
      fournisseurs.find((f) => f.id === id)?.nom ?? id,
  });

  function patch(partiel: Partial<FiltresArticles>) {
    onChange(patchFiltresArticles(filtres, partiel));
  }

  function enregistrer() {
    const res = onEnregistrer(nom, filtres);
    if (!res.ok) {
      setErreur(res.reason ?? "Enregistrement impossible.");
      return;
    }
    setErreur(null);
    setNom("");
  }

  function rappeler(id: string) {
    setSelection(id);
    const trouve = enregistres.find((f) => f.id === id);
    if (!trouve) return;
    onChange({ ...FILTRES_ARTICLES_VIDE, ...trouve.filtres });
  }

  function renommer() {
    const courant = enregistres.find((f) => f.id === selection);
    if (!courant) return;
    const suivant = window.prompt("Nouveau nom", courant.nom);
    if (suivant == null) return;
    const res = onRenommer(courant.id, suivant);
    if (!res.ok) setErreur(res.reason ?? "Renommage impossible.");
    else setErreur(null);
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 rounded-[var(--radius)] border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Champ texte="Recherche" value={filtres.recherche} onChange={(recherche) => patch({ recherche })} placeholder="Code ou libellé" />
        <Champ texte="Code" value={filtres.code} onChange={(code) => patch({ code })} placeholder="Correspondance partielle" />
        <Champ texte="Libellé" value={filtres.libelle} onChange={(libelle) => patch({ libelle })} placeholder="Correspondance partielle" />
        <label className="text-xs font-semibold text-muted">
          Famille
          <select
            className="select mt-1"
            value={filtres.familleId}
            onChange={(e) => patch({ familleId: e.target.value })}
          >
            <option value="">Toutes</option>
            {familles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Sous-famille
          <select
            className="select mt-1"
            value={filtres.sousFamilleId}
            disabled={!filtres.familleId}
            onChange={(e) => patch({ sousFamilleId: e.target.value })}
          >
            <option value="">
              {filtres.familleId ? "Toutes" : "Choisissez une famille"}
            </option>
            {sousFamilles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Nature de stock
          <select
            className="select mt-1"
            value={filtres.natureStock}
            onChange={(e) =>
              patch({
                natureStock: e.target.value as FiltresArticles["natureStock"],
              })
            }
          >
            <option value="">Toutes</option>
            {NATURES_STOCK.map((n) => (
              <option key={n} value={n}>
                {NATURE_STOCK_LABELS[n]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Mode d&apos;approvisionnement
          <select
            className="select mt-1"
            value={filtres.modeApprovisionnement}
            onChange={(e) =>
              patch({
                modeApprovisionnement: e.target
                  .value as FiltresArticles["modeApprovisionnement"],
              })
            }
          >
            <option value="">Tous</option>
            {(
              Object.entries(MODE_APPROVISIONNEMENT_LABELS) as [
                FiltresArticles["modeApprovisionnement"],
                string,
              ][]
            ).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Site
          <select
            className="select mt-1"
            value={filtres.siteId}
            onChange={(e) => patch({ siteId: e.target.value })}
          >
            <option value="">Tous les sites visibles</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${ouvert ? "rotate-180" : ""}`}
          />
          Plus de filtres{secondaires > 0 ? ` (${secondaires})` : ""}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onChange(FILTRES_ARTICLES_VIDE)}
        >
          Réinitialiser
        </button>
        <button type="button" className="btn btn-secondary" onClick={onExportCsv}>
          <Download className="h-4 w-4" />
          CSV
        </button>
        <button type="button" className="btn btn-secondary" onClick={onExportPdf}>
          <Download className="h-4 w-4" />
          PDF
        </button>
        <p className="ml-auto text-sm text-muted">
          {total} article{total > 1 ? "s" : ""}
          {pages > 1 ? ` · page ${page} / ${pages}` : ""}
        </p>
      </div>

      {ouvert && (
        <div className="grid gap-3 rounded-[var(--radius)] border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-muted">
            Statut
            <select
              className="select mt-1"
              value={filtres.statut}
              onChange={(e) =>
                patch({ statut: e.target.value as FiltresArticles["statut"] })
              }
            >
              <option value="">Tous</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Situation de stock
            <select
              className="select mt-1"
              value={filtres.situationStock}
              onChange={(e) =>
                patch({
                  situationStock: e.target
                    .value as FiltresArticles["situationStock"],
                })
              }
            >
              <option value="">Toutes</option>
              <option value="rupture">En rupture</option>
              <option value="seuil">Sous le seuil d&apos;alerte</option>
              <option value="disponible">Stock disponible</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Type d&apos;achat
            <select
              className="select mt-1"
              value={filtres.typeAchat}
              onChange={(e) =>
                patch({
                  typeAchat: e.target.value as FiltresArticles["typeAchat"],
                })
              }
            >
              <option value="">Tous</option>
              {TYPES_ACHAT_PRODUIT.map((t) => (
                <option key={t} value={t}>
                  {TYPE_ACHAT_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Fournisseur prioritaire
            <select
              className="select mt-1"
              value={filtres.fournisseurId}
              onChange={(e) => patch({ fournisseurId: e.target.value })}
            >
              <option value="">Tous</option>
              {fournisseursActifs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Créé du
            <input
              type="date"
              className="input mt-1"
              value={filtres.dateDebut}
              onChange={(e) => patch({ dateDebut: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Créé au
            <input
              type="date"
              className="input mt-1"
              value={filtres.dateFin}
              onChange={(e) => patch({ dateFin: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-1">
            <input
              type="checkbox"
              checked={filtres.sansFamille}
              onChange={(e) => patch({ sansFamille: e.target.checked })}
            />
            Sans famille
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtres.compteManquant}
              onChange={(e) => patch({ compteManquant: e.target.checked })}
            />
            Compte comptable manquant
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={filtres.sansNomenclature}
              onChange={(e) => patch({ sansNomenclature: e.target.checked })}
            />
            Sans nomenclature (fabrication sur commande)
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">
          Filtres enregistrés
          <select
            className="select mt-1 min-w-[12rem]"
            value={selection}
            onChange={(e) => rappeler(e.target.value)}
          >
            <option value="">— Rappeler —</option>
            {enregistres.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Nom
          <input
            className="input mt-1"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom du filtre"
          />
        </label>
        <button type="button" className="btn btn-secondary" onClick={enregistrer}>
          Enregistrer
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!selection}
          onClick={renommer}
        >
          Renommer
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!selection}
          onClick={() => {
            if (!selection) return;
            onSupprimer(selection);
            setSelection("");
          }}
        >
          Supprimer
        </button>
      </div>
      {erreur && <p className="text-xs font-medium text-danger">{erreur}</p>}

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <button
              key={b.cle}
              type="button"
              className="badge badge-sea inline-flex items-center gap-1"
              onClick={() => onChange(retirerFiltreArticle(filtres, b.cle))}
            >
              {b.libelle}
              <X className="h-3 w-3" />
              <span className="sr-only">Retirer</span>
            </button>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Précédent
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

function Champ({
  texte,
  value,
  onChange,
  placeholder,
}: {
  texte: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-xs font-semibold text-muted">
      {texte}
      <input
        className="input mt-1"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
