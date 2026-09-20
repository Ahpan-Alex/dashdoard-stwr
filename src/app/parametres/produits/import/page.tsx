"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import {
  analyserLignesImportArticles,
  analyserLignesImportNomenc,
  COLONNES_IMPORT_ARTICLES,
  COLONNES_IMPORT_NOMENCLATURES,
  detecterKindImportCatalogue,
  libelleStatutImportCatalogue,
  LIMITE_LIGNES_IMPORT_CATALOGUE,
  ligneArticleEligible,
  lignesArticlesDepuisGrille,
  lignesNomencDepuisGrille,
  nomenclaturesDepuisLignesImport,
  parseCsvPointVirgule,
  payloadDepuisLigneArticle,
  telechargerModeleImportArticles,
  telechargerModeleImportNomenc,
  telechargerRapportImportCatalogue,
  type ChoixDoublonArticle,
  type KindImportCatalogue,
  type LigneImportArticle,
  type LigneImportNomenc,
  type RapportLigneImportCatalogue,
  type StatutLigneImportCatalogue,
} from "@/lib/import-produits";
import { useStore } from "@/lib/store";
import { parseXlsx } from "@/lib/xlsx-parse";

type FiltreStatut = "tous" | StatutLigneImportCatalogue;
type Etape = "upload" | "preview" | "rapport";

const BADGE_STATUT: Record<StatutLigneImportCatalogue, string> = {
  ok: "badge-success",
  erreur: "badge-danger",
  avertissement: "badge-warning",
  doublon: "badge-coral",
};

export default function ImportCataloguePage() {
  return (
    <RequirePermission permission="produits.gerer">
      <ImportCatalogueContent />
    </RequirePermission>
  );
}

function ImportCatalogueContent() {
  const produits = useStore((s) => s.produits);
  const categoriesProduits = useStore((s) => s.categoriesProduits);
  const unitesMesure = useStore((s) => s.unitesMesure);
  const parametres = useStore((s) => s.parametres);
  const importerLigneArticle = useStore((s) => s.importerLigneArticle);
  const importerNomenclaturesProduit = useStore((s) => s.importerNomenclaturesProduit);

  const ctxArticles = useMemo(
    () => ({
      produits,
      categories: categoriesProduits,
      unites: unitesMesure,
      tauxTVADefaut: parametres.tauxTVA,
    }),
    [produits, categoriesProduits, unitesMesure, parametres.tauxTVA],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<KindImportCatalogue>("articles");
  const [etape, setEtape] = useState<Etape>("upload");
  const [fichierNom, setFichierNom] = useState("");
  const [articles, setArticles] = useState<LigneImportArticle[]>([]);
  const [nomencs, setNomencs] = useState<LigneImportNomenc[]>([]);
  const [filtre, setFiltre] = useState<FiltreStatut>("tous");
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    phase: "analyse" | "import";
    current: number;
    total: number;
  } | null>(null);
  const [rapport, setRapport] = useState<RapportLigneImportCatalogue[]>([]);

  const counts = useMemo(() => {
    const c = { ok: 0, erreur: 0, avertissement: 0, doublon: 0 };
    const src = kind === "articles" ? articles : nomencs;
    for (const l of src) c[l.statut] += 1;
    return c;
  }, [kind, articles, nomencs]);

  const visiblesArticles = useMemo(
    () => (filtre === "tous" ? articles : articles.filter((l) => l.statut === filtre)),
    [articles, filtre],
  );
  const visiblesNomencs = useMemo(
    () => (filtre === "tous" ? nomencs : nomencs.filter((l) => l.statut === filtre)),
    [nomencs, filtre],
  );

  async function chargerFichier(file: File) {
    setErreurFichier(null);
    setProgress({ phase: "analyse", current: 0, total: 1 });
    try {
      const nom = file.name.toLowerCase();
      const buf = await file.arrayBuffer();
      let grille: string[][];
      if (nom.endsWith(".xlsx")) {
        grille = await parseXlsx(buf);
      } else if (nom.endsWith(".csv") || nom.endsWith(".txt")) {
        grille = parseCsvPointVirgule(new TextDecoder("utf-8").decode(buf));
      } else {
        throw new Error("Formats acceptés : Excel (.xlsx) ou CSV (séparateur ;).");
      }
      const detected = detecterKindImportCatalogue(grille);
      if (!detected) {
        throw new Error(
          "En-têtes introuvables. Utilisez un modèle Articles (Code, Libellé court) ou Nomenclatures (Code produit, Code composant).",
        );
      }
      if (detected === "articles") {
        const brouillons = lignesArticlesDepuisGrille(grille);
        if (brouillons.length === 0) throw new Error("Aucune ligne de données.");
        if (brouillons.length > LIMITE_LIGNES_IMPORT_CATALOGUE) {
          throw new Error(`Trop de lignes (${brouillons.length}). Maximum ${LIMITE_LIGNES_IMPORT_CATALOGUE}.`);
        }
        setKind("articles");
        setArticles(analyserLignesImportArticles(brouillons, ctxArticles));
        setNomencs([]);
      } else {
        const brouillons = lignesNomencDepuisGrille(grille);
        if (brouillons.length === 0) throw new Error("Aucune ligne de données.");
        if (brouillons.length > LIMITE_LIGNES_IMPORT_CATALOGUE) {
          throw new Error(`Trop de lignes (${brouillons.length}). Maximum ${LIMITE_LIGNES_IMPORT_CATALOGUE}.`);
        }
        setKind("nomenclatures");
        setNomencs(analyserLignesImportNomenc(brouillons, produits));
        setArticles([]);
      }
      setFichierNom(file.name);
      setFiltre("tous");
      setEtape("preview");
    } catch (e) {
      setErreurFichier(e instanceof Error ? e.message : "Lecture du fichier impossible.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function lancerImport() {
    if (kind === "articles") {
      const total = articles.length;
      setProgress({ phase: "import", current: 0, total });
      const out: RapportLigneImportCatalogue[] = [];
      for (let i = 0; i < articles.length; i++) {
        const ligne = articles[i];
        const elig = ligneArticleEligible(ligne);
        if (!elig.ok) {
          out.push({
            numeroLigne: ligne.numeroLigne,
            nom: ligne.champs.code || ligne.champs.libelleCourt,
            resultat: ligne.choixDoublon === "ignorer" ? "ignore" : "rejete",
            motif: elig.motif,
          });
        } else {
          const payload = payloadDepuisLigneArticle(ligne, ctxArticles);
          if (!payload) {
            out.push({
              numeroLigne: ligne.numeroLigne,
              nom: ligne.champs.code,
              resultat: "rejete",
              motif: "Famille introuvable.",
            });
          } else {
            const res = importerLigneArticle({
              mode: elig.mode,
              payload,
              fusionId: ligne.doublonProduitId,
            });
            out.push({
              numeroLigne: ligne.numeroLigne,
              nom: payload.code,
              resultat: res.ok ? (elig.mode === "fusionner" ? "fusionne" : "importe") : "rejete",
              motif: res.ok ? "" : (res.reason ?? "Échec"),
            });
          }
        }
        setProgress({ phase: "import", current: i + 1, total });
      }
      setRapport(out);
      setEtape("rapport");
      setProgress(null);
      return;
    }

    const okLignes = nomencs.filter((l) => l.statut !== "erreur");
    const parProduit = nomenclaturesDepuisLignesImport(okLignes, useStore.getState().produits);
    const total = parProduit.size;
    setProgress({ phase: "import", current: 0, total: Math.max(1, total) });
    const out: RapportLigneImportCatalogue[] = [];
    let i = 0;
    for (const [produitId, nomenclatures] of parProduit) {
      const p = useStore.getState().produits.find((x) => x.id === produitId);
      const res = importerNomenclaturesProduit(produitId, nomenclatures);
      out.push({
        numeroLigne: i + 1,
        nom: p?.code ?? produitId,
        resultat: res.ok ? "importe" : "rejete",
        motif: res.ok ? `${nomenclatures.reduce((s, n) => s + n.lignes.length, 0)} ligne(s)` : (res.reason ?? "Échec"),
      });
      i += 1;
      setProgress({ phase: "import", current: i, total: Math.max(1, total) });
    }
    for (const l of nomencs.filter((x) => x.statut === "erreur")) {
      out.push({
        numeroLigne: l.numeroLigne,
        nom: l.champs.codeProduit,
        resultat: "rejete",
        motif: l.erreurs[0] ?? "Erreur",
      });
    }
    setRapport(out);
    setEtape("rapport");
    setProgress(null);
  }

  return (
    <div>
      <PageHeader
        title="Import catalogue"
        description="Articles (CSV / Excel) puis nomenclatures. Les familles et unités doivent déjà exister. Les codes en doublon se fusionnent ou s'ignorent."
        showPosSelector={false}
        actions={
          <Link href="/parametres/produits" className="btn btn-secondary">
            Retour au catalogue
          </Link>
        }
      />
      <ParametresSubnav />

      {etape === "upload" && (
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <p className="mb-3 text-sm text-muted">
            Téléchargez un modèle, remplissez-le, puis importez. Le fichier est
            reconnu automatiquement (articles ou nomenclatures).
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => telechargerModeleImportArticles("xlsx")}
            >
              <Download className="h-4 w-4" />
              Modèle articles
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => telechargerModeleImportNomenc("xlsx")}
            >
              <Download className="h-4 w-4" />
              Modèle nomenclatures
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void chargerFichier(f);
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Choisir un fichier
          </button>
          {erreurFichier && (
            <p className="mt-3 text-sm text-rose-800">{erreurFichier}</p>
          )}
          <details className="mt-6 text-sm">
            <summary className="cursor-pointer font-semibold">Colonnes articles</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              {COLONNES_IMPORT_ARTICLES.map((c) => (
                <li key={c.key}>
                  <span className="font-medium text-fg">{c.header}</span> — {c.comment}
                </li>
              ))}
            </ul>
          </details>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Colonnes nomenclatures</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              {COLONNES_IMPORT_NOMENCLATURES.map((c) => (
                <li key={c.key}>
                  <span className="font-medium text-fg">{c.header}</span> — {c.comment}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {etape === "preview" && (
        <div>
          <p className="mb-3 text-sm text-muted">
            {fichierNom} · {kind === "articles" ? "Articles" : "Nomenclatures"} ·{" "}
            {kind === "articles" ? articles.length : nomencs.length} ligne(s)
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["tous", "ok", "avertissement", "doublon", "erreur"] as const).map((id) => (
              <button
                key={id}
                type="button"
                className={`btn ${filtre === id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFiltre(id)}
              >
                {id === "tous"
                  ? "Toutes"
                  : libelleStatutImportCatalogue(id)}
                {id !== "tous" ? ` (${counts[id]})` : ""}
              </button>
            ))}
          </div>
          <div className="table-shell mb-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Ligne</th>
                  <th>Statut</th>
                  {kind === "articles" ? (
                    <>
                      <th>Code</th>
                      <th>Libellé</th>
                      <th>Famille</th>
                      <th>Action doublon</th>
                    </>
                  ) : (
                    <>
                      <th>Produit</th>
                      <th>Composant</th>
                      <th>Qté / taux</th>
                    </>
                  )}
                  <th>Messages</th>
                </tr>
              </thead>
              <tbody>
                {kind === "articles"
                  ? visiblesArticles.map((l) => (
                      <tr key={l.id}>
                        <td>{l.numeroLigne}</td>
                        <td>
                          <span className={`badge ${BADGE_STATUT[l.statut]}`}>
                            {libelleStatutImportCatalogue(l.statut)}
                          </span>
                        </td>
                        <td className="font-mono">{l.champs.code}</td>
                        <td>{l.champs.libelleCourt}</td>
                        <td>{l.champs.categorie}</td>
                        <td>
                          {l.statut === "doublon" && (
                            <select
                              className="select"
                              value={l.choixDoublon ?? ""}
                              onChange={(e) => {
                                const choix = (e.target.value || undefined) as
                                  | ChoixDoublonArticle
                                  | undefined;
                                setArticles((prev) =>
                                  prev.map((x) =>
                                    x.id === l.id ? { ...x, choixDoublon: choix } : x,
                                  ),
                                );
                              }}
                            >
                              <option value="">Choisir…</option>
                              <option value="fusionner">Fusionner</option>
                              <option value="ignorer">Ignorer</option>
                            </select>
                          )}
                        </td>
                        <td className="text-xs text-muted">
                          {[...l.erreurs, ...l.avertissements].join(" ")}
                        </td>
                      </tr>
                    ))
                  : visiblesNomencs.map((l) => (
                      <tr key={l.id}>
                        <td>{l.numeroLigne}</td>
                        <td>
                          <span className={`badge ${BADGE_STATUT[l.statut]}`}>
                            {libelleStatutImportCatalogue(l.statut)}
                          </span>
                        </td>
                        <td className="font-mono">{l.champs.codeProduit}</td>
                        <td className="font-mono">{l.champs.codeComposant}</td>
                        <td>{l.champs.quantite || l.champs.taux}</td>
                        <td className="text-xs text-muted">
                          {[...l.erreurs, ...l.avertissements].join(" ")}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => void lancerImport()}>
              Importer
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEtape("upload");
                setArticles([]);
                setNomencs([]);
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {etape === "rapport" && (
        <div className="rounded-[var(--radius)] border border-line bg-card p-5">
          <p className="mb-3 font-semibold">
            {rapport.filter((r) => r.resultat === "importe" || r.resultat === "fusionne").length}{" "}
            importé(s) · {rapport.filter((r) => r.resultat === "ignore").length} ignoré(s) ·{" "}
            {rapport.filter((r) => r.resultat === "rejete").length} rejeté(s)
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => telechargerRapportImportCatalogue(rapport)}
            >
              <Download className="h-4 w-4" />
              Rapport CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEtape("upload");
                setRapport([]);
              }}
            >
              Nouvel import
            </button>
          </div>
          <ul className="space-y-1 text-sm">
            {rapport.map((r) => (
              <li key={`${r.numeroLigne}-${r.nom}`}>
                Ligne {r.numeroLigne} · {r.nom} · {r.resultat}
                {r.motif ? ` — ${r.motif}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {progress && (
        <p className="mt-4 text-sm text-muted">
          {progress.phase === "analyse" ? "Analyse" : "Import"} {progress.current}/{progress.total}
        </p>
      )}
    </div>
  );
}
