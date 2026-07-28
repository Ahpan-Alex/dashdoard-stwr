"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import {
  DEFAULT_RUBRIQUES,
  RUBRIQUES_CATALOGUE,
  type DocumentRubriqueId,
  type TypeDocumentCommercial,
} from "@/lib/document-templates";
import { useStore } from "@/lib/store";

export default function ParametresModelesPage() {
  const {
    parametres,
    modelesDocuments,
    addModeleDocument,
    updateModeleDocument,
    deleteModeleDocument,
  } = useStore();

  const [modeleType, setModeleType] =
    useState<TypeDocumentCommercial>("facture");
  const [modeleNom, setModeleNom] = useState("");
  const [modeleRubriques, setModeleRubriques] = useState<DocumentRubriqueId[]>(
    [...DEFAULT_RUBRIQUES.facture],
  );
  const [modeleMentions, setModeleMentions] = useState(
    modelesDocuments.find((m) => m.type === "facture")?.mentionsLegales ?? "",
  );

  function toggleRubrique(id: DocumentRubriqueId) {
    const meta = RUBRIQUES_CATALOGUE.find((r) => r.id === id);
    if (meta?.obligatoire) return;
    setModeleRubriques((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  function createModele(e: FormEvent) {
    e.preventDefault();
    if (!modeleNom.trim()) return;
    modelesDocuments
      .filter((m) => m.type === modeleType && m.actif)
      .forEach((m) => updateModeleDocument(m.id, { actif: false }));

    addModeleDocument({
      nom: modeleNom.trim(),
      type: modeleType,
      rubriques: modeleRubriques,
      mentionsLegales: modeleMentions,
      piedDePage: `${parametres.nomEntreprise} — Merci de votre confiance`,
      actif: true,
    });
    setModeleNom("");
    alert("Modèle créé et activé.");
  }

  return (
    <div>
      <PageHeader
        title="Modèles documents"
        description="Personnalisez les rubriques des devis, commandes, bons de livraison et factures."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">
            Créer / personnaliser un modèle
          </h2>
          <p className="mb-4 text-xs text-muted">
            Choisissez les rubriques à afficher sur devis, commande, BL ou facture.
          </p>
          <form onSubmit={createModele} className="grid gap-3">
            <label className="block text-xs font-semibold text-muted">
              Type de document
              <select
                className="select mt-1"
                value={modeleType}
                onChange={(e) => {
                  const t = e.target.value as TypeDocumentCommercial;
                  setModeleType(t);
                  setModeleRubriques([...DEFAULT_RUBRIQUES[t]]);
                }
                }
              >
                <option value="devis">Devis</option>
                <option value="commande">Commande</option>
                <option value="bon_de_livraison">Bon de livraison</option>
                <option value="facture">Facture</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              Nom du modèle
              <input
                className="input mt-1"
                value={modeleNom}
                onChange={(e) => setModeleNom(e.target.value)}
                placeholder="Ex. Facture restaurant MG"
                required
              />
            </label>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
                Rubriques
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-line p-3">
                {RUBRIQUES_CATALOGUE.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-start gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={modeleRubriques.includes(r.id)}
                      disabled={r.obligatoire}
                      onChange={() => toggleRubrique(r.id)}
                    />
                    <span>
                      <span className="font-medium">{r.label}</span>
                      {r.obligatoire && (
                        <span className="ml-1 text-[10px] text-coral">
                          obligatoire
                        </span>
                      )}
                      <span className="block text-xs text-muted">
                        {r.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <label className="block text-xs font-semibold text-muted">
              Mentions légales
              <textarea
                className="textarea mt-1"
                rows={3}
                value={modeleMentions}
                onChange={(e) => setModeleMentions(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              Créer et activer ce modèle
            </button>
          </form>
        </section>

        <section className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">
            Modèles enregistrés
          </h2>
          <div className="space-y-3">
            {modelesDocuments.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-line p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{m.nom}</p>
                    <p className="text-xs capitalize text-muted">
                      {m.type} · {m.rubriques.length} rubriques
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className={`badge ${m.actif ? "badge-success" : "badge-sand"}`}
                      onClick={() => {
                        if (!m.actif) {
                          modelesDocuments
                            .filter((x) => x.type === m.type && x.actif)
                            .forEach((x) =>
                              updateModeleDocument(x.id, { actif: false }),
                            );
                          updateModeleDocument(m.id, { actif: true });
                        }
                      }}
                    >
                      {m.actif ? "Actif" : "Activer"}
                    </button>
                    {!m.id.includes("defaut") && (
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          if (confirm(`Supprimer « ${m.nom} » ?`)) {
                            deleteModeleDocument(m.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
