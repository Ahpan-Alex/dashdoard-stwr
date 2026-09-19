"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { PastilleCompteManquant } from "@/components/avertissement-compte-produit";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { longueurNumeroCompteEffective } from "@/lib/comptabilite";
import {
  analyserLignesImportTiers,
  appliquerFusionTiers,
  CHAMPS_FUSION_TIERS,
  COLONNES_IMPORT_TIERS,
  defautsImportTiers,
  libelleRolesImport,
  libelleStatutImport,
  LIMITE_LIGNES_IMPORT_TIERS,
  ligneImportEligible,
  lignesDepuisGrille,
  lignesSimilairesDoublon,
  parseCsvPointVirgule,
  parseRolesImport,
  payloadDepuisLigneImport,
  telechargerModeleImportTiers,
  telechargerRapportImportTiers,
  valeurFusionAffichee,
  type ChampFusionTiers,
  type ChampsImportTiers,
  type ChoixDoublonTiers,
  type CleColonneImportTiers,
  type LigneImportTiers,
  type RapportLigneImportTiers,
  type StatutLigneImportTiers,
} from "@/lib/import-tiers";
import { useStore } from "@/lib/store";
import { assurerTiers } from "@/lib/tiers";
import { parseXlsx } from "@/lib/xlsx-parse";

type FiltreStatut = "tous" | StatutLigneImportTiers;
type Etape = "upload" | "preview" | "rapport";

const BADGE_STATUT: Record<StatutLigneImportTiers, string> = {
  ok: "badge-success",
  erreur: "badge-danger",
  avertissement: "badge-warning",
  doublon: "badge-coral",
};

export default function ImportTiersPage() {
  return (
    <RequirePermission permission="clients.gerer">
      <ImportTiersContent />
    </RequirePermission>
  );
}

function ImportTiersContent() {
  const clients = useStore((s) => s.clients);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);
  const parametres = useStore((s) => s.parametres);
  const importerLigneTiers = useStore((s) => s.importerLigneTiers);
  const existants = useMemo(
    () => assurerTiers({ clients, fournisseurs, tiers }),
    [clients, fournisseurs, tiers],
  );
  const defauts = useMemo(() => defautsImportTiers(parametres), [parametres]);
  const planComptablePret = longueurNumeroCompteEffective(parametres) != null;

  const inputRef = useRef<HTMLInputElement>(null);
  const [etape, setEtape] = useState<Etape>("upload");
  const [fichierNom, setFichierNom] = useState("");
  const [lignes, setLignes] = useState<LigneImportTiers[]>([]);
  const [filtre, setFiltre] = useState<FiltreStatut>("tous");
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [etenduId, setEtenduId] = useState<string | null>(null);
  const [fusionId, setFusionId] = useState<string | null>(null);
  const [appliquerSimilaires, setAppliquerSimilaires] = useState(false);
  const [progress, setProgress] = useState<{
    phase: "analyse" | "import";
    current: number;
    total: number;
  } | null>(null);
  const [rapport, setRapport] = useState<RapportLigneImportTiers[]>([]);

  const counts = useMemo(() => {
    const c = { ok: 0, erreur: 0, avertissement: 0, doublon: 0 };
    for (const l of lignes) c[l.statut] += 1;
    return c;
  }, [lignes]);

  const visibles = useMemo(
    () => (filtre === "tous" ? lignes : lignes.filter((l) => l.statut === filtre)),
    [lignes, filtre],
  );

  const fusionLigne = lignes.find((l) => l.id === fusionId) ?? null;
  const fusionCible = fusionLigne?.doublonTiersId
    ? existants.find((t) => t.id === fusionLigne.doublonTiersId)
    : undefined;

  function reanalyser(nextChamps: ChampsImportTiers[], conserver: LigneImportTiers[]) {
    return analyserLignesImportTiers(nextChamps, existants, {
      defauts,
      planComptablePret,
      conserver,
    });
  }

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
      const brouillons = lignesDepuisGrille(grille);
      if (brouillons.length === 0) {
        throw new Error("Aucune ligne de données dans le fichier.");
      }
      if (brouillons.length > LIMITE_LIGNES_IMPORT_TIERS) {
        throw new Error(
          `Trop de lignes (${brouillons.length}). Maximum ${LIMITE_LIGNES_IMPORT_TIERS}.`,
        );
      }
      const analysed = analyserLignesImportTiers(brouillons, existants, {
        defauts,
        planComptablePret,
      });
      setFichierNom(file.name);
      setLignes(analysed);
      setFiltre("tous");
      setEtape("preview");
    } catch (e) {
      setErreurFichier(e instanceof Error ? e.message : "Lecture du fichier impossible.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function patchChamps(id: string, patch: Partial<ChampsImportTiers>) {
    setLignes((prev) => {
      const nextChamps = prev.map((l) =>
        l.id === id ? { ...l.champs, ...patch } : l.champs,
      );
      return reanalyser(nextChamps, prev);
    });
  }

  function appliquerChoix(
    reference: LigneImportTiers,
    choix: ChoixDoublonTiers | undefined,
    champsFusion: ChampFusionTiers[],
    tousSimilaires: boolean,
  ) {
    const ids = new Set<string>([reference.id]);
    if (tousSimilaires) {
      for (const l of lignesSimilairesDoublon(lignes, reference)) ids.add(l.id);
    }
    setLignes((prev) =>
      prev.map((l) => {
        if (!ids.has(l.id) || l.statut !== "doublon") return l;
        if (choix === "fusionner" && !l.doublonTiersId) return l;
        return {
          ...l,
          choixDoublon: choix,
          champsFusion: choix === "fusionner" ? champsFusion : [],
        };
      }),
    );
  }

  async function lancerImport() {
    const total = lignes.length;
    setProgress({ phase: "import", current: 0, total });
    const out: RapportLigneImportTiers[] = [];
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      const elig = ligneImportEligible(ligne);
      if (!elig.ok) {
        out.push({
          numeroLigne: ligne.numeroLigne,
          nom: ligne.champs.nom,
          resultat: ligne.choixDoublon === "ignorer" ? "ignore" : "rejete",
          motif: elig.motif,
          compteManquant: false,
        });
      } else {
        const payload = payloadDepuisLigneImport(ligne, defauts);
        const res = importerLigneTiers({
          mode: elig.mode,
          payload,
          fusionId: ligne.doublonTiersId,
          champsFusion: ligne.champsFusion,
        });
        if (!res.ok) {
          out.push({
            numeroLigne: ligne.numeroLigne,
            nom: ligne.champs.nom,
            resultat: "rejete",
            motif: res.reason ?? "Échec de l’import.",
            compteManquant: false,
          });
        } else {
          out.push({
            numeroLigne: ligne.numeroLigne,
            nom: ligne.champs.nom,
            resultat: elig.mode === "fusionner" ? "fusionne" : "importe",
            motif: res.compteManquant ? "Compte 401/411 manquant." : "",
            compteManquant: res.compteManquant,
          });
        }
      }
      if (i % 10 === 0 || i === lignes.length - 1) {
        setProgress({ phase: "import", current: i + 1, total });
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    setRapport(out);
    setEtape("rapport");
    setProgress(null);
  }

  const aImporter = lignes.filter((l) => ligneImportEligible(l).ok).length;
  const doublonsSansChoix = lignes.filter(
    (l) => l.statut === "doublon" && !l.choixDoublon,
  ).length;

  return (
    <div>
      <PageHeader
        title="Import initial des tiers"
        description="Excel ou CSV (;). Contrôle ligne par ligne, correction dans l’aperçu, puis import synchrone."
        showPosSelector={false}
        actions={
          <Link href="/tiers" className="btn btn-secondary">
            Retour aux tiers
          </Link>
        }
      />

      {progress && (
        <div className="mb-4 rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-sm font-semibold text-ink">
            {progress.phase === "analyse" ? "Analyse du fichier…" : "Import en cours…"}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sea-100">
            <div
              className="h-full bg-sea-600 transition-all"
              style={{
                width: `${Math.max(4, Math.round((progress.current / Math.max(progress.total, 1)) * 100))}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {progress.current} / {progress.total}
          </p>
        </div>
      )}

      {etape === "upload" && (
        <section className="rounded-[var(--radius)] border border-line bg-card p-6">
          <h2 className="font-display text-lg text-ink">1. Fichier</h2>
          <p className="mt-1 text-sm text-muted">
            Formats : Excel (.xlsx) ou CSV séparateur point-virgule. Téléchargez le
            modèle (colonnes pré-remplies + commentaires d’en-tête).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => telechargerModeleImportTiers("xlsx")}
            >
              <Download className="h-4 w-4" />
              Modèle Excel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => telechargerModeleImportTiers("csv")}
            >
              <Download className="h-4 w-4" />
              Modèle CSV
            </button>
          </div>
          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-sea-300 bg-sea-100/40 px-6 py-10 text-center">
            <Upload className="h-8 w-8 text-sea-700" />
            <span className="mt-2 text-sm font-semibold text-ink">
              Choisir un fichier
            </span>
            <span className="mt-1 text-xs text-muted">.xlsx ou .csv — quelques centaines de lignes</span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void chargerFichier(f);
              }}
            />
          </label>
          {erreurFichier && (
            <p className="mt-3 text-sm text-danger">{erreurFichier}</p>
          )}
          {!planComptablePret && (
            <p className="mt-4 text-sm text-amber-800">
              Plan comptable : longueur des numéros non fixée. Les tiers seront
              créés, les comptes 401/411 resteront vides (indicateur « compte
              manquant »).
            </p>
          )}
        </section>
      )}

      {etape === "preview" && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg text-ink">2. Contrôle</h2>
              <p className="text-sm text-muted">
                {fichierNom} — {lignes.length} ligne(s). Corrigez dans le tableau,
                sans réenvoyer le fichier.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEtape("upload");
                  setLignes([]);
                }}
              >
                Autre fichier
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={Boolean(progress) || lignes.length === 0}
                onClick={() => void lancerImport()}
              >
                Importer {aImporter} ligne(s)
              </button>
            </div>
          </div>

          {doublonsSansChoix > 0 && (
            <p className="mb-3 text-sm text-amber-800">
              {doublonsSansChoix} doublon(s) sans choix : Ignorer, Fusionner ou
              Créer quand même. Sinon la ligne sera rejetée.
            </p>
          )}

          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["tous", `Toutes (${lignes.length})`],
                ["ok", `OK (${counts.ok})`],
                ["avertissement", `Avertissement (${counts.avertissement})`],
                ["doublon", `Doublon (${counts.doublon})`],
                ["erreur", `Erreur (${counts.erreur})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`btn ${filtre === id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFiltre(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Statut</th>
                  <th>Nom / Raison sociale</th>
                  <th>Rôles</th>
                  <th>NIF</th>
                  <th>STAT</th>
                  <th>Ville</th>
                  <th>Délai</th>
                  <th>Plafond</th>
                  <th>Contrôle</th>
                  <th>Doublon</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((ligne) => (
                  <LignePreview
                    key={ligne.id}
                    ligne={ligne}
                    etendu={etenduId === ligne.id}
                    onToggle={() =>
                      setEtenduId((id) => (id === ligne.id ? null : ligne.id))
                    }
                    onPatch={(patch) => patchChamps(ligne.id, patch)}
                    onChoix={(choix) => {
                      if (choix === "fusionner") {
                        setFusionId(ligne.id);
                        return;
                      }
                      appliquerChoix(
                        ligne,
                        choix,
                        [],
                        appliquerSimilaires,
                      );
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={appliquerSimilaires}
              onChange={(e) => setAppliquerSimilaires(e.target.checked)}
            />
            Appliquer le choix de doublon à toutes les lignes similaires
          </label>
        </section>
      )}

      {etape === "rapport" && (
        <section className="rounded-[var(--radius)] border border-line bg-card p-6">
          <h2 className="font-display text-lg text-ink">3. Rapport</h2>
          <p className="mt-1 text-sm text-muted">
            {rapport.filter((r) => r.resultat === "importe").length} importé(s) ·{" "}
            {rapport.filter((r) => r.resultat === "fusionne").length} fusionné(s) ·{" "}
            {rapport.filter((r) => r.resultat === "ignore").length} ignoré(s) ·{" "}
            {rapport.filter((r) => r.resultat === "rejete").length} rejeté(s)
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => telechargerRapportImportTiers(rapport)}
            >
              <Download className="h-4 w-4" />
              Télécharger le rapport
            </button>
            <Link href="/tiers" className="btn btn-secondary">
              Voir les tiers
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setEtape("upload");
                setLignes([]);
                setRapport([]);
              }}
            >
              Nouvel import
            </button>
          </div>
          <div className="table-shell mt-4">
            <table className="data">
              <thead>
                <tr>
                  <th>Ligne</th>
                  <th>Nom</th>
                  <th>Résultat</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {rapport.map((r) => (
                  <tr key={r.numeroLigne}>
                    <td>{r.numeroLigne}</td>
                    <td>{r.nom || "—"}</td>
                    <td>
                      <span className="inline-flex items-center gap-1">
                        {r.resultat === "importe"
                          ? "Importé"
                          : r.resultat === "fusionne"
                            ? "Fusionné"
                            : r.resultat === "ignore"
                              ? "Ignoré"
                              : "Rejeté"}
                        {r.compteManquant && <PastilleCompteManquant />}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{r.motif || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {fusionLigne && fusionCible && (
        <FusionModal
          key={fusionLigne.id}
          ligne={fusionLigne}
          actuel={fusionCible}
          defauts={defauts}
          appliquerSimilaires={appliquerSimilaires}
          onAppliquerSimilaires={setAppliquerSimilaires}
          onClose={() => setFusionId(null)}
          onValider={(champs, tous) => {
            appliquerChoix(fusionLigne, "fusionner", champs, tous);
            setFusionId(null);
          }}
        />
      )}
    </div>
  );
}

function LignePreview({
  ligne,
  etendu,
  onToggle,
  onPatch,
  onChoix,
}: {
  ligne: LigneImportTiers;
  etendu: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<ChampsImportTiers>) => void;
  onChoix: (choix: ChoixDoublonTiers | undefined) => void;
}) {
  const roles = parseRolesImport(ligne.champs.roles);
  const messages = [...ligne.erreurs, ...ligne.avertissements];
  return (
    <>
      <tr className={ligne.statut === "erreur" ? "bg-red-50/60" : undefined}>
        <td>
          <button type="button" className="text-sea-700 underline" onClick={onToggle}>
            {ligne.numeroLigne}
          </button>
        </td>
        <td>
          <span className={`badge ${BADGE_STATUT[ligne.statut]}`}>
            {libelleStatutImport(ligne.statut)}
          </span>
          {ligne.compteManquant && (
            <PastilleCompteManquant className="ml-1 inline-flex align-middle" />
          )}
        </td>
        <td>
          <input
            className="input min-w-[10rem]"
            value={ligne.champs.nom}
            onChange={(e) => onPatch({ nom: e.target.value })}
          />
        </td>
        <td>
          <div className="flex flex-col gap-1 text-xs">
            {(["client", "fournisseur"] as const).map((role) => (
              <label key={role} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={() => {
                    const next = roles.includes(role)
                      ? roles.filter((r) => r !== role)
                      : [...roles, role];
                    onPatch({ roles: libelleRolesImport(next) });
                  }}
                />
                {role === "client" ? "Client" : "Fournisseur"}
              </label>
            ))}
          </div>
        </td>
        <td>
          <input
            className="input w-28"
            value={ligne.champs.nif}
            onChange={(e) => onPatch({ nif: e.target.value })}
          />
        </td>
        <td>
          <input
            className="input w-28"
            value={ligne.champs.stat}
            onChange={(e) => onPatch({ stat: e.target.value })}
          />
        </td>
        <td>
          <input
            className="input w-28"
            value={ligne.champs.ville}
            onChange={(e) => onPatch({ ville: e.target.value })}
          />
        </td>
        <td>
          <input
            className="input w-16"
            value={ligne.champs.delaiPaiement}
            onChange={(e) => onPatch({ delaiPaiement: e.target.value })}
          />
        </td>
        <td>
          <input
            className="input w-24"
            value={ligne.champs.plafondCredit}
            onChange={(e) => onPatch({ plafondCredit: e.target.value })}
          />
        </td>
        <td className="max-w-[16rem] text-xs text-muted">
          {messages.length ? messages.join(" ") : "—"}
        </td>
        <td>
          {ligne.statut === "doublon" ? (
            <div className="min-w-[11rem]">
              <p className="mb-1 text-[11px] text-muted">
                {ligne.doublonTiersId
                  ? `Fiche existante : ${ligne.doublonNom}`
                  : `Déjà dans le fichier : ${ligne.doublonNom}`}
                {ligne.doublonSource === "nif" ? " (NIF)" : " (Nom+STAT)"}
              </p>
              <select
                className="select"
                value={ligne.choixDoublon ?? ""}
                onChange={(e) => {
                  const v = e.target.value as ChoixDoublonTiers | "";
                  onChoix(v || undefined);
                }}
              >
                <option value="">Choisir…</option>
                <option value="ignorer">Ignorer</option>
                {ligne.doublonTiersId && (
                  <option value="fusionner">Fusionner</option>
                )}
                <option value="creer">Créer quand même</option>
              </select>
              {ligne.doublonTiersId && (
                <button
                  type="button"
                  className="mt-1 text-[11px] text-sea-700 underline"
                  onClick={() => onChoix("fusionner")}
                >
                  Comparer les champs
                </button>
              )}
            </div>
          ) : (
            "—"
          )}
        </td>
      </tr>
      {etendu && (
        <tr>
          <td colSpan={11} className="bg-sea-100/40 p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {COLONNES_IMPORT_TIERS.filter(
                (c) =>
                  ![
                    "nom",
                    "roles",
                    "nif",
                    "stat",
                    "ville",
                    "delaiPaiement",
                    "plafondCredit",
                  ].includes(c.key),
              ).map((col) => (
                <label key={col.key} className="text-xs font-semibold text-muted">
                  {col.header}
                  <input
                    className="input mt-1"
                    value={ligne.champs[col.key as CleColonneImportTiers]}
                    onChange={(e) => onPatch({ [col.key]: e.target.value })}
                    title={col.comment}
                  />
                </label>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function FusionModal({
  ligne,
  actuel,
  defauts,
  appliquerSimilaires,
  onAppliquerSimilaires,
  onClose,
  onValider,
}: {
  ligne: LigneImportTiers;
  actuel: import("@/lib/types").Tiers;
  defauts: ReturnType<typeof defautsImportTiers>;
  appliquerSimilaires: boolean;
  onAppliquerSimilaires: (v: boolean) => void;
  onClose: () => void;
  onValider: (champs: ChampFusionTiers[], tousSimilaires: boolean) => void;
}) {
  const incoming = payloadDepuisLigneImport(ligne, defauts);
  const [choisis, setChoisis] = useState<ChampFusionTiers[]>(
    ligne.champsFusion ?? [],
  );
  const patchPreview = appliquerFusionTiers(actuel, incoming, choisis);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fusion-titre"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg">
        <h2 id="fusion-titre" className="font-display text-xl text-ink">
          Fusion — {actuel.nom}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Aucun écrasement automatique. Cochez uniquement les champs à mettre à
          jour depuis le fichier.
        </p>
        <div className="table-shell mt-4">
          <table className="data">
            <thead>
              <tr>
                <th></th>
                <th>Champ</th>
                <th>Valeur actuelle</th>
                <th>Valeur du fichier</th>
              </tr>
            </thead>
            <tbody>
              {CHAMPS_FUSION_TIERS.map((champ) => {
                const actuelTxt = valeurFusionAffichee(actuel, champ.key);
                const fichierTxt = valeurFusionAffichee(incoming, champ.key);
                const different = actuelTxt !== fichierTxt;
                return (
                  <tr key={champ.key} className={different ? "bg-amber-50/80" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={choisis.includes(champ.key)}
                        onChange={() =>
                          setChoisis((prev) =>
                            prev.includes(champ.key)
                              ? prev.filter((k) => k !== champ.key)
                              : [...prev, champ.key],
                          )
                        }
                      />
                    </td>
                    <td className="font-medium">{champ.label}</td>
                    <td className="text-sm">{actuelTxt}</td>
                    <td className="text-sm">{fichierTxt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {Object.keys(patchPreview).length === 0 && (
          <p className="mt-3 text-sm text-muted">
            Aucun champ coché : la fiche existante ne sera pas modifiée (hors
            comptes 401/411 manquants, générés si le plan le permet).
          </p>
        )}
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={appliquerSimilaires}
            onChange={(e) => onAppliquerSimilaires(e.target.checked)}
          />
          Appliquer cette sélection à toutes les lignes similaires
        </label>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onValider(choisis, appliquerSimilaires)}
          >
            Valider la fusion
          </button>
        </div>
      </div>
    </div>
  );
}
