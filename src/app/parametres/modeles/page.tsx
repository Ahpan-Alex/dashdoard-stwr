"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, Check, Copy, Eye, FileText, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { DocumentPreview } from "@/components/document-preview";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { useAuthStore } from "@/lib/auth-store";
import {
  COLONNES_ARTICLE_CATALOGUE,
  DEFAULT_RUBRIQUES,
  MAX_COLONNES_ARTICLE,
  PALETTES,
  colonnesParDefaut,
  ensureZones,
  paletteParId,
  zonesParDefaut,
  type DispositionEntete,
  type ModeleDocument,
  type ModeleZones,
  type TypeDocumentCommercial,
} from "@/lib/document-templates";
import { useStore } from "@/lib/store";
import { calculerTotaux } from "@/lib/commercial";
import type { Client, LigneDocument } from "@/lib/types";

const TYPE_LABELS: Record<TypeDocumentCommercial, string> = {
  devis: "Devis",
  commande: "Commande",
  bon_de_livraison: "Bon de livraison",
  facture: "Facture",
};

const DISPOSITIONS: { id: DispositionEntete; label: string }[] = [
  { id: "logo_only", label: "Logo uniquement" },
  { id: "entreprise_only", label: "Entreprise uniquement" },
  { id: "logo_gauche", label: "Logo à gauche — Entreprise à droite" },
  { id: "logo_droite", label: "Logo à droite — Entreprise à gauche" },
];

const SAMPLE_CLIENT: Client = {
  id: "sample",
  code: "CLI-0001",
  nom: "Client exemple SARL",
  telephone: "020 22 000 00",
  email: "contact@client.mg",
  adresse: "Lot II A 12 Antananarivo",
  ville: "Antananarivo",
  nif: "1234567890",
  type: "restaurant",
  actif: true,
};

const SAMPLE_LIGNES: LigneDocument[] = [
  {
    id: "s1",
    type: "produit",
    codeProduit: "ART-001",
    designation: "Poisson frais (exemple)",
    quantite: 3,
    prixUnitaire: 50000,
    unite: "kg",
    tauxTVA: 20,
    remisePercent: 10,
  },
  {
    id: "s2",
    type: "produit",
    codeProduit: "ART-002",
    designation: "Crevettes (exemple)",
    quantite: 2,
    prixUnitaire: 75000,
    unite: "kg",
    tauxTVA: 20,
  },
];

const APERCU_DATE = new Date().toISOString();
const APERCU_ECHEANCE = new Date(Date.now() + 30 * 86400000).toISOString();

function sampleTotaux() {
  return calculerTotaux(SAMPLE_LIGNES, 20, 0, true, 0);
}

function snapshotModele(m: ModeleDocument): ModeleDocument {
  return {
    ...m,
    rubriques: [...m.rubriques],
    zones: structuredClone(ensureZones(m)),
  };
}

function ApercuDocument({ modele }: { modele: ModeleDocument }) {
  const parametres = useStore((s) => s.parametres);
  const totaux = sampleTotaux();
  const z = ensureZones(modele);
  return (
    <DocumentPreview
      type={modele.type}
      numero={`${z.document.nomDocument.slice(0, 3).toUpperCase()}-2026-0001`}
      date={APERCU_DATE}
      echeance={APERCU_ECHEANCE}
      client={SAMPLE_CLIENT}
      parametres={parametres}
      modele={modele}
      lignes={SAMPLE_LIGNES}
      totaux={totaux}
      modePaiement="virement"
      apercuModele
    />
  );
}

export default function ParametresModelesPage() {
  const {
    modelesDocuments,
    preferencesModeles,
    addModeleDocument,
    updateModeleDocument,
    deleteModeleDocument,
    setModelePreference,
  } = useStore();
  const userId = useAuthStore((s) => s.user?.id);

  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [nouveauType, setNouveauType] = useState<TypeDocumentCommercial>("facture");
  const [filtreType, setFiltreType] = useState<TypeDocumentCommercial | "tous">("tous");

  const modeleEnEdition = modelesDocuments.find((m) => m.id === editId);
  const modeleApercu = modelesDocuments.find((m) => m.id === previewId);
  const mesPrefs = userId ? (preferencesModeles[userId] ?? {}) : {};

  const listes = modelesDocuments.filter(
    (m) => filtreType === "tous" || m.type === filtreType,
  );

  function creerModele() {
    if (!userId) return;
    const id = addModeleDocument({
      nom: `Nouveau modèle ${TYPE_LABELS[nouveauType].toLowerCase()}`,
      type: nouveauType,
      rubriques: [...DEFAULT_RUBRIQUES[nouveauType]],
      mentionsLegales:
        modelesDocuments.find((m) => m.type === nouveauType)?.mentionsLegales ?? "",
      piedDePage: "Merci de votre confiance",
      actif: false,
      createur: "personnalisé",
      ownerUserId: userId,
      source: "Modèle " + TYPE_LABELS[nouveauType].toLowerCase(),
      zones: zonesParDefaut(nouveauType),
    });
    setModelePreference(userId, nouveauType, id);
    setEditId(id);
  }

  function dupliquer(m: ModeleDocument) {
    const id = addModeleDocument({
      nom: `${m.nom} (copie)`,
      type: m.type,
      rubriques: [...m.rubriques],
      mentionsLegales: m.mentionsLegales,
      piedDePage: m.piedDePage,
      actif: false,
      createur: "personnalisé",
      ownerUserId: userId,
      source: m.nom,
      nomFichierExport: m.nomFichierExport,
      zones: ensureZones(m),
    });
    setEditId(id);
  }

  function definirParDefautEntreprise(m: ModeleDocument) {
    modelesDocuments
      .filter((x) => x.type === m.type && x.actif && x.id !== m.id)
      .forEach((x) => updateModeleDocument(x.id, { actif: false }));
    updateModeleDocument(m.id, { actif: true });
  }

  function definirMonModele(m: ModeleDocument) {
    if (!userId) return;
    setModelePreference(userId, m.type, m.id);
  }

  if (modeleEnEdition) {
    return (
      <ModeleEditor
        modele={modeleEnEdition}
        estMonModele={mesPrefs[modeleEnEdition.type] === modeleEnEdition.id}
        onBack={() => setEditId(null)}
        onSave={(data) => updateModeleDocument(modeleEnEdition.id, data)}
        onSetMyDefault={() => definirMonModele(modeleEnEdition)}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Modèles de documents"
        description="Choisissez le modèle que vous utilisez, masquez ou affichez chaque zone, et prévisualisez avant d'enregistrer."
        showPosSelector={false}
        actions={
          <div className="flex items-center gap-2">
            <select
              className="select"
              value={nouveauType}
              onChange={(e) =>
                setNouveauType(e.target.value as TypeDocumentCommercial)
              }
            >
              {(Object.keys(TYPE_LABELS) as TypeDocumentCommercial[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={creerModele} disabled={!userId}>
              <Plus className="h-4 w-4" />
              Créer un modèle personnalisé
            </button>
          </div>
        }
      />
      <ParametresSubnav />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn ${filtreType === "tous" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setFiltreType("tous")}
        >
          Tous
        </button>
        {(Object.keys(TYPE_LABELS) as TypeDocumentCommercial[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn ${filtreType === t ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltreType(t)}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Type</th>
              <th>Créateur</th>
              <th>Couleur</th>
              <th>Mon modèle</th>
              <th>Entreprise</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listes.map((m) => {
              const palette = paletteParId(ensureZones(m).couleurId);
              const estLeMien = mesPrefs[m.type] === m.id;
              return (
                <tr key={m.id}>
                  <td className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sea-600" />
                      {m.nom}
                    </span>
                  </td>
                  <td>{TYPE_LABELS[m.type]}</td>
                  <td className="capitalize text-muted">{m.createur ?? "éditeur"}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className="h-4 w-4 rounded-full border border-line"
                        style={{ backgroundColor: palette.primary }}
                      />
                      {palette.nom}
                    </span>
                  </td>
                  <td>
                    {estLeMien ? (
                      <span className="badge badge-success inline-flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Mon modèle
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => definirMonModele(m)}
                        disabled={!userId}
                      >
                        Utiliser par défaut
                      </button>
                    )}
                  </td>
                  <td>
                    {m.actif ? (
                      <span className="badge badge-sand">Par défaut</span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-muted underline-offset-2 hover:underline"
                        onClick={() => definirParDefautEntreprise(m)}
                      >
                        Définir
                      </button>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        className="btn btn-ghost"
                        onClick={() => setPreviewId(m.id)}
                        title="Visualiser"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditId(m.id)}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => dupliquer(m)}
                        title="Dupliquer"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {!m.id.includes("defaut") && (
                        <button
                          className="btn btn-ghost text-danger"
                          title="Supprimer"
                          onClick={() => {
                            if (confirm(`Supprimer le modèle « ${m.nom} » ?`)) {
                              deleteModeleDocument(m.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modeleApercu && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="my-8 w-full max-w-3xl rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">
                Aperçu — {modeleApercu.nom}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPreviewId(null);
                    setEditId(modeleApercu.id);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Modifier
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setPreviewId(null)}
                >
                  Fermer
                </button>
              </div>
            </div>
            <ApercuDocument modele={modeleApercu} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ModeleEditor({
  modele,
  estMonModele,
  onBack,
  onSave,
  onSetMyDefault,
}: {
  modele: ModeleDocument;
  estMonModele: boolean;
  onBack: () => void;
  onSave: (data: Partial<ModeleDocument>) => void;
  onSetMyDefault: () => void;
}) {
  const parametres = useStore((s) => s.parametres);
  const [draft, setDraft] = useState(() => snapshotModele(modele));
  const [savedSnap, setSavedSnap] = useState(() => snapshotModele(modele));

  const zones = ensureZones(draft);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedSnap);

  const setZones = (fn: (z: ModeleZones) => ModeleZones) =>
    setDraft((d) => ({ ...d, zones: fn(ensureZones(d)) }));

  const enregistrer = () => {
    onSave({
      nom: draft.nom,
      mentionsLegales: draft.mentionsLegales,
      piedDePage: draft.piedDePage,
      nomFichierExport: draft.nomFichierExport,
      zones: ensureZones(draft),
    });
    setSavedSnap(snapshotModele(draft));
  };

  const quitter = () => {
    if (dirty && !confirm("Modifications non enregistrées. Quitter sans enregistrer ?")) {
      return;
    }
    onBack();
  };

  const nbColonnesVisibles = zones.articles.colonnes.filter((c) => c.visible).length;

  return (
    <div>
      <button
        type="button"
        onClick={quitter}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux modèles
      </button>

      <PageHeader
        title={draft.nom || "Modèle"}
        description={`Modèle ${TYPE_LABELS[draft.type].toLowerCase()} — l'aperçu se met à jour en direct. Enregistrez pour appliquer.`}
        showPosSelector={false}
        actions={
          <div className="flex items-center gap-2">
            {estMonModele ? (
              <span className="badge badge-success inline-flex items-center gap-1">
                <Check className="h-3 w-3" />
                Mon modèle
              </span>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onSetMyDefault}>
                Utiliser par défaut
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={enregistrer}
              disabled={!dirty}
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        {/* Colonne configuration */}
        <div className="space-y-5">
          {/* Identité modèle */}
          <Section titre="Modèle">
            <Field label="Nom du modèle">
              <input
                className="input"
                value={draft.nom}
                onChange={(e) => setDraft((d) => ({ ...d, nom: e.target.value }))}
              />
            </Field>
            <Field label="Nom du fichier à l'export (facultatif)">
              <input
                className="input"
                value={draft.nomFichierExport ?? ""}
                placeholder="Ex. Facture_{numero}"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, nomFichierExport: e.target.value }))
                }
              />
            </Field>
          </Section>

          <Section titre="Couleurs du document">
            <p className="mb-2 text-xs text-muted">
              Dix palettes prédéfinies. L&apos;aperçu à droite applique la couleur
              choisie avant enregistrement.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PALETTES.map((p) => {
                const selected = zones.couleurId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`rounded-lg border p-2 text-left transition ${
                      selected
                        ? "border-ink ring-2 ring-ink/20"
                        : "border-line hover:border-sea-400"
                    }`}
                    onClick={() => setZones((z) => ({ ...z, couleurId: p.id }))}
                  >
                    <span className="mb-1.5 flex h-7 overflow-hidden rounded">
                      <span className="w-1/2" style={{ backgroundColor: p.primary }} />
                      <span className="w-1/3" style={{ backgroundColor: p.accent }} />
                      <span className="w-1/6" style={{ backgroundColor: p.soft }} />
                    </span>
                    <span className="text-[11px] font-semibold">{p.nom}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Zone 1 */}
          <Section titre="Zone 1 · En-tête">
            <Field label="Disposition">
              <select
                className="select"
                value={zones.entete.disposition}
                onChange={(e) =>
                  setZones((z) => ({
                    ...z,
                    entete: {
                      ...z.entete,
                      disposition: e.target.value as DispositionEntete,
                    },
                  }))
                }
              >
                {DISPOSITIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <Toggle
              label="Afficher les informations sur l'entreprise"
              checked={zones.entete.afficherInfosEntreprise}
              onChange={(v) =>
                setZones((z) => ({
                  ...z,
                  entete: { ...z.entete, afficherInfosEntreprise: v },
                }))
              }
            />
            <div className="grid grid-cols-2 gap-1 pl-2">
              {(
                [
                  ["adresse", "Adresse"],
                  ["ville", "Ville"],
                  ["telephone", "Téléphone"],
                  ["email", "E-mail"],
                  ["reseauSocial", "Réseau social"],
                  ["nif", "NIF"],
                  ["stat", "STAT"],
                  ["rcs", "RCS"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={zones.entete[key]}
                  onChange={(v) =>
                    setZones((z) => ({
                      ...z,
                      entete: { ...z.entete, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
          </Section>

          {/* Zone 2 */}
          <Section titre="Zone 2 · Informations sur le document">
            <Field label="Nom du document">
              <input
                className="input"
                value={zones.document.nomDocument}
                onChange={(e) =>
                  setZones((z) => ({
                    ...z,
                    document: { ...z.document, nomDocument: e.target.value },
                  }))
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ["numero", "Numéro du document"],
                  ["date", "Date du document"],
                  ["delaiPaiement", "Délai de paiement"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={zones.document[key]}
                  onChange={(v) =>
                    setZones((z) => ({
                      ...z,
                      document: { ...z.document, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
          </Section>

          {/* Zone 3 */}
          <Section titre="Zone 3 · Informations sur le client">
            <p className="mb-1 text-xs font-semibold text-sea-700">Cadre client</p>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ["cadreClient", "Afficher le cadre"],
                  ["codeClient", "Code client"],
                  ["nomClient", "Nom client"],
                  ["emailClient", "E-mail client"],
                  ["telClient", "Tél. client"],
                  ["immatriculation", "Immatriculation (NIF/STAT/RCS)"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={zones.client[key]}
                  onChange={(v) =>
                    setZones((z) => ({ ...z, client: { ...z.client, [key]: v } }))
                  }
                />
              ))}
            </div>
            <p className="mb-1 mt-3 text-xs font-semibold text-sea-700">
              Cadres d&apos;adresses
            </p>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ["cadreAdresseEtablissement", "Cadre adresse établissement"],
                  ["adresseEtablissement", "Adresse établissement"],
                  ["cadreEntrepriseFacturee", "Cadre entreprise facturée"],
                  ["adresseEntrepriseFacturee", "Adresse entreprise facturée"],
                  ["cadreAdresseLivraison", "Cadre adresse livraison"],
                  ["adresseLivraison", "Adresse de livraison"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={zones.client[key]}
                  onChange={(v) =>
                    setZones((z) => ({ ...z, client: { ...z.client, [key]: v } }))
                  }
                />
              ))}
            </div>
          </Section>

          {/* Zone 4 */}
          <Section titre="Zone 4 · Traçabilité">
            <Toggle
              label="Afficher la traçabilité"
              checked={zones.tracabilite.afficher}
              onChange={(v) =>
                setZones((z) => ({
                  ...z,
                  tracabilite: { ...z.tracabilite, afficher: v },
                }))
              }
            />
            <div className="grid grid-cols-2 gap-1 pl-2">
              {(
                [
                  ["refCommandeClient", "Réf. commande client"],
                  ["destinataire", "Destinataire"],
                  ["vendeur", "Vendeur"],
                  ["intervenant", "Intervenant"],
                  ["dateIntervention", "Date d'intervention"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={zones.tracabilite[key]}
                  onChange={(v) =>
                    setZones((z) => ({
                      ...z,
                      tracabilite: { ...z.tracabilite, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
          </Section>

          {/* Zone 5 */}
          <Section titre="Zone 5 · Tableau des articles vendus">
            <Toggle
              label="Afficher la ligne Total"
              checked={zones.articles.afficherLigneTotal}
              onChange={(v) =>
                setZones((z) => ({
                  ...z,
                  articles: { ...z.articles, afficherLigneTotal: v },
                }))
              }
            />
            <p className="mb-1 mt-2 text-xs text-muted">
              Colonnes à afficher ({nbColonnesVisibles}/{MAX_COLONNES_ARTICLE}) —
              nom de colonne personnalisable.
            </p>
            <div className="space-y-1.5 rounded-lg border border-line p-2">
              {zones.articles.colonnes.map((col) => {
                const meta = COLONNES_ARTICLE_CATALOGUE.find((c) => c.id === col.id);
                const disabled =
                  !col.visible && nbColonnesVisibles >= MAX_COLONNES_ARTICLE;
                return (
                  <div key={col.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      disabled={disabled}
                      onChange={(e) =>
                        setZones((z) => ({
                          ...z,
                          articles: {
                            ...z.articles,
                            colonnes: z.articles.colonnes.map((c) =>
                              c.id === col.id
                                ? { ...c, visible: e.target.checked }
                                : c,
                            ),
                          },
                        }))
                      }
                    />
                    <span
                      className={`w-40 shrink-0 text-xs ${disabled ? "text-muted" : ""}`}
                    >
                      {meta?.label ?? col.id}
                    </span>
                    <input
                      className="input flex-1 py-1 text-xs"
                      value={col.label}
                      onChange={(e) =>
                        setZones((z) => ({
                          ...z,
                          articles: {
                            ...z.articles,
                            colonnes: z.articles.colonnes.map((c) =>
                              c.id === col.id ? { ...c, label: e.target.value } : c,
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="btn btn-ghost mt-2 text-xs"
              onClick={() =>
                setZones((z) => ({
                  ...z,
                  articles: { ...z.articles, colonnes: colonnesParDefaut() },
                }))
              }
            >
              Réinitialiser les colonnes
            </button>
          </Section>

          {/* Zone 6 */}
          <Section titre="Zone 6 · Totaux">
            <Toggle
              label="Afficher la zone financière"
              checked={zones.totaux.afficher}
              onChange={(v) =>
                setZones((z) => ({ ...z, totaux: { ...z.totaux, afficher: v } }))
              }
            />
            <div className="grid grid-cols-2 gap-1 pl-2">
              {(
                [
                  ["totalHT", "Total HT"],
                  ["totalTVA", "Total TVA"],
                  ["totalTTC", "Total TTC"],
                  ["tauxIMP", "Taux IMP"],
                  ["modePaiementIMP", "Mode de paiement IMP"],
                  ["montantIMP", "Montant IMP"],
                  ["taxesAdditionnelles", "Taxes additionnelles"],
                  ["cautionConsigne", "Caution et consigne"],
                  ["totalAPayer", "Total à payer"],
                  ["paiementEffectue", "Paiement effectué"],
                  ["netAPayer", "Net à payer"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={zones.totaux[key]}
                  onChange={(v) =>
                    setZones((z) => ({ ...z, totaux: { ...z.totaux, [key]: v } }))
                  }
                />
              ))}
            </div>
          </Section>

          {/* Zone 7 */}
          <Section titre="Zone 7 · Mode de règlement et échéance">
            <Toggle
              label="Afficher la zone"
              checked={zones.reglement.afficher}
              onChange={(v) =>
                setZones((z) => ({
                  ...z,
                  reglement: { ...z.reglement, afficher: v },
                }))
              }
            />
            <div className="grid grid-cols-2 gap-1 pl-2">
              {(
                [
                  ["mode", "Mode de règlement"],
                  ["description", "Description du règlement"],
                  ["delai", "Délai de paiement"],
                  ["compteBancaire", "Compte bancaire de l'entreprise"],
                ] as const
              ).map(([key, label]) => (
                <Toggle
                  key={key}
                  label={label}
                  checked={zones.reglement[key]}
                  onChange={(v) =>
                    setZones((z) => ({
                      ...z,
                      reglement: { ...z.reglement, [key]: v },
                    }))
                  }
                />
              ))}
            </div>
          </Section>

          {/* Zone 8 */}
          <Section titre="Zone 8 · Montant en lettres">
            <Toggle
              label="Afficher la zone"
              checked={zones.montantEnLettres.afficher}
              onChange={(v) =>
                setZones((z) => ({
                  ...z,
                  montantEnLettres: { ...z.montantEnLettres, afficher: v },
                }))
              }
            />
            <Field label="Titre de la zone">
              <input
                className="input"
                value={zones.montantEnLettres.titre}
                onChange={(e) =>
                  setZones((z) => ({
                    ...z,
                    montantEnLettres: {
                      ...z.montantEnLettres,
                      titre: e.target.value,
                    },
                  }))
                }
              />
            </Field>
          </Section>

          {/* Zone 9 */}
          <Section titre="Zone 9 · Signataire">
            <Toggle
              label="Afficher la zone"
              checked={zones.signataire.afficher}
              onChange={(v) =>
                setZones((z) => ({
                  ...z,
                  signataire: { ...z.signataire, afficher: v },
                }))
              }
            />
            <Field label="Choix du signataire (nom affiché)">
              <input
                className="input"
                value={zones.signataire.nom}
                placeholder={parametres.signatureNom || "Ex. Le Gérant"}
                onChange={(e) =>
                  setZones((z) => ({
                    ...z,
                    signataire: { ...z.signataire, nom: e.target.value },
                  }))
                }
              />
            </Field>
          </Section>

          {/* Mentions & pied de page */}
          <Section titre="Mentions légales & pied de page">
            <Field label="Mentions légales">
              <textarea
                className="textarea"
                rows={3}
                value={draft.mentionsLegales}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, mentionsLegales: e.target.value }))
                }
              />
            </Field>
            <Field label="Pied de page">
              <input
                className="input"
                value={draft.piedDePage}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, piedDePage: e.target.value }))
                }
              />
            </Field>
          </Section>
        </div>

        {/* Colonne aperçu */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <span className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Aperçu avant enregistrement
            </span>
            {dirty && <span className="normal-case font-normal text-amber-700">Non enregistré</span>}
          </div>
          <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
            <ApercuDocument modele={draft} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius)] border border-line bg-card p-4">
      <h2 className="mb-3 font-display text-sm font-semibold text-ink">{titre}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-muted">
      {label}
      <div className="mt-1 font-normal">{children}</div>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
