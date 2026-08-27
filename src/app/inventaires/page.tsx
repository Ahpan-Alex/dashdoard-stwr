"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardCheck,
  Info,
  Plus,
  Save,
  Store,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { InfoButton } from "@/components/info-button";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  CATEGORIES_BONI,
  CATEGORIES_ECART,
  CATEGORIES_MALI,
  ecartJustifie,
  ecartLigne,
  lignesInventaireInitiales,
  nextNumeroInventaire,
  syntheseInventaire,
  typeEcart,
  valeurEcartLigne,
} from "@/lib/inventaire";
import { libelleProduit } from "@/lib/produits";
import { useStore } from "@/lib/store";
import type {
  CategorieEcartInventaire,
  Inventaire,
  InventaireLigne,
} from "@/lib/types";

export default function InventairesPage() {
  return (
    <RequirePermission permission="produits.lire">
      <InventairesContent />
    </RequirePermission>
  );
}

function InventairesContent() {
  const {
    inventaires,
    produits,
    entrees,
    ventes,
    pointsDeVente,
    pointDeVenteActifId,
    addInventaire,
    deleteInventaire,
  } = useStore();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const peutGerer = hasPermission("produits.gerer");

  const [selectionId, setSelectionId] = useState<string | null>(null);

  const inventaireSelectionne = inventaires.find((i) => i.id === selectionId);

  const nomPdv = (id: string) =>
    pointsDeVente.find((p) => p.id === id)?.nom ?? "Point de vente";

  const inventairesVisibles = useMemo(() => {
    const list =
      pointDeVenteActifId === "tous"
        ? inventaires
        : inventaires.filter((i) => i.pointDeVenteId === pointDeVenteActifId);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [inventaires, pointDeVenteActifId]);

  const creerInventaire = () => {
    if (pointDeVenteActifId === "tous") return;
    const lignes = lignesInventaireInitiales({
      produits,
      entrees,
      ventes,
      pointDeVenteId: pointDeVenteActifId,
      pointsDeVente,
    });
    const id = addInventaire({
      numero: nextNumeroInventaire(inventaires),
      pointDeVenteId: pointDeVenteActifId,
      date: new Date().toISOString(),
      statut: "brouillon",
      lignes,
    });
    setSelectionId(id);
  };

  if (inventaireSelectionne) {
    return (
      <InventaireEditor
        inventaire={inventaireSelectionne}
        nomPdv={nomPdv(inventaireSelectionne.pointDeVenteId)}
        readOnly={!peutGerer || inventaireSelectionne.statut === "valide"}
        onBack={() => setSelectionId(null)}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Inventaires"
        description="Inventaires physiques par point de vente et justification des écarts (bonis / malis)."
        actions={
          <div className="flex items-center gap-2">
            <InfoButton title="Inventaire & justification des écarts">
              <p>
                L&apos;inventaire compare le <strong>stock théorique</strong>{" "}
                (calculé en CUMP : entrées − sorties) au{" "}
                <strong>stock physique</strong> réellement compté.
              </p>
              <p>
                L&apos;écart constaté est valorisé au coût unitaire moyen
                pondéré :
              </p>
              <ul className="list-disc pl-5">
                <li>
                  <strong>Boni</strong> : stock physique &gt; théorique
                  (excédent).
                </li>
                <li>
                  <strong>Mali</strong> : stock physique &lt; théorique (manque).
                </li>
              </ul>
              <p>
                Chaque écart doit être <strong>justifié</strong> (casse, vol,
                perte de fraîcheur, erreur de saisie, surplus réception…) avant
                de pouvoir clôturer l&apos;inventaire.
              </p>
            </InfoButton>
            {peutGerer && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={creerInventaire}
                disabled={pointDeVenteActifId === "tous"}
                title={
                  pointDeVenteActifId === "tous"
                    ? "Sélectionnez un point de vente pour lancer un inventaire"
                    : undefined
                }
              >
                <Plus className="h-4 w-4" />
                Nouvel inventaire
              </button>
            )}
          </div>
        }
      />

      {pointDeVenteActifId === "tous" && (
        <div className="mb-6 flex items-start gap-3 rounded-[var(--radius)] border border-sea-200 bg-sea-50/60 p-4 text-sm text-sea-900">
          <Store className="mt-0.5 h-5 w-5 shrink-0 text-sea-600" />
          <p>
            Sélectionnez un <strong>point de vente</strong> précis dans le
            sélecteur en haut à droite pour lancer un nouvel inventaire. La liste
            ci-dessous affiche tous les inventaires, tous points de vente
            confondus.
          </p>
        </div>
      )}

      {inventairesVisibles.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="Aucun inventaire"
          description="Lancez un inventaire par point de vente pour comparer le stock physique au stock théorique et justifier les écarts."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Point de vente</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Écarts</th>
                <th>Valeur nette</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventairesVisibles.map((inv) => {
                const s = syntheseInventaire(inv);
                return (
                  <tr key={inv.id}>
                    <td className="font-medium">{inv.numero}</td>
                    <td>{nomPdv(inv.pointDeVenteId)}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td>
                      <span
                        className={`badge ${
                          inv.statut === "valide"
                            ? "badge-success"
                            : "badge-sand"
                        }`}
                      >
                        {inv.statut === "valide" ? "Validé" : "Brouillon"}
                      </span>
                    </td>
                    <td>
                      {s.nbEcarts === 0 ? (
                        <span className="text-muted">Aucun</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {s.nbBonis > 0 && (
                            <span className="badge badge-success">
                              {s.nbBonis} boni{s.nbBonis > 1 ? "s" : ""}
                            </span>
                          )}
                          {s.nbMalis > 0 && (
                            <span className="badge badge-danger">
                              {s.nbMalis} mali{s.nbMalis > 1 ? "s" : ""}
                            </span>
                          )}
                          {s.nbNonJustifies > 0 && (
                            <span className="badge badge-sand">
                              {s.nbNonJustifies} à justifier
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td
                      className={`font-semibold ${
                        s.valeurNette < 0
                          ? "text-danger"
                          : s.valeurNette > 0
                            ? "text-success"
                            : ""
                      }`}
                    >
                      {formatCurrency(s.valeurNette)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setSelectionId(inv.id)}
                        >
                          Ouvrir
                        </button>
                        {peutGerer && inv.statut === "brouillon" && (
                          <button
                            type="button"
                            className="btn btn-ghost text-danger"
                            title="Supprimer l'inventaire"
                            onClick={() => {
                              if (
                                confirm(
                                  `Supprimer l'inventaire ${inv.numero} ?`,
                                )
                              ) {
                                deleteInventaire(inv.id);
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
      )}
    </div>
  );
}

function InventaireEditor({
  inventaire,
  nomPdv,
  readOnly,
  onBack,
}: {
  inventaire: Inventaire;
  nomPdv: string;
  readOnly: boolean;
  onBack: () => void;
}) {
  const { produits, updateInventaire, validerInventaire } = useStore();
  const [lignes, setLignes] = useState<InventaireLigne[]>(inventaire.lignes);
  const [note, setNote] = useState(inventaire.note ?? "");
  const [dirty, setDirty] = useState(false);

  const nomProduit = (id: string) => {
    const p = produits.find((x) => x.id === id);
    return p ? libelleProduit(p) : "Produit supprimé";
  };
  const uniteProduit = (id: string) =>
    produits.find((x) => x.id === id)?.unite ?? "";

  const majLigne = (produitId: string, patch: Partial<InventaireLigne>) => {
    setLignes((prev) =>
      prev.map((l) => (l.produitId === produitId ? { ...l, ...patch } : l)),
    );
    setDirty(true);
  };

  const synthese = useMemo(
    () => syntheseInventaire({ ...inventaire, lignes }),
    [inventaire, lignes],
  );

  const lignesEcart = lignes.filter((l) => typeEcart(l) !== "conforme");

  const enregistrer = () => {
    updateInventaire(inventaire.id, { lignes, note: note.trim() || undefined });
    setDirty(false);
  };

  const valider = () => {
    if (!synthese.toutJustifie) {
      alert(
        "Tous les écarts (bonis et malis) doivent être justifiés avant de clôturer l'inventaire.",
      );
      return;
    }
    updateInventaire(inventaire.id, { lignes, note: note.trim() || undefined });
    validerInventaire(inventaire.id);
    setDirty(false);
    onBack();
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux inventaires
      </button>

      <PageHeader
        title={inventaire.numero}
        description={`Inventaire — ${nomPdv} · ${formatDate(inventaire.date)}`}
        showPosSelector={false}
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`badge ${
                inventaire.statut === "valide" ? "badge-success" : "badge-sand"
              }`}
            >
              {inventaire.statut === "valide" ? "Validé" : "Brouillon"}
            </span>
            {!readOnly && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={enregistrer}
                  disabled={!dirty}
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={valider}
                  disabled={!synthese.toutJustifie}
                  title={
                    synthese.toutJustifie
                      ? undefined
                      : "Justifiez tous les écarts pour clôturer"
                  }
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Valider l&apos;inventaire
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Écarts constatés"
          value={String(synthese.nbEcarts)}
          hint={`${synthese.nbBonis} boni(s) · ${synthese.nbMalis} mali(s)`}
        />
        <StatCard
          label="Valeur des bonis"
          value={formatCurrency(synthese.valeurBoni)}
          hint="Excédents valorisés (CUMP)"
        />
        <StatCard
          label="Valeur des malis"
          value={formatCurrency(synthese.valeurMali)}
          hint="Manques valorisés (CUMP)"
        />
        <StatCard
          label="Écart net"
          value={formatCurrency(synthese.valeurNette)}
          hint={
            synthese.nbNonJustifies > 0
              ? `${synthese.nbNonJustifies} écart(s) à justifier`
              : "Tous les écarts sont justifiés"
          }
        />
      </div>

      {!readOnly && (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius)] border border-line bg-card p-3 text-xs text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sea-600" />
          <span>
            Saisissez le <strong>stock physique compté</strong> pour chaque
            article. Les écarts apparaissent automatiquement et doivent être
            justifiés à l&apos;aide des boutons dédiés.
          </span>
        </div>
      )}

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Article</th>
              <th className="text-right">Stock théorique</th>
              <th className="text-right">Stock physique</th>
              <th className="text-right">Écart</th>
              <th className="text-right">Valeur écart</th>
              <th>Justification</th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  Aucun article en stock pour ce point de vente.
                </td>
              </tr>
            ) : (
              lignes.map((l) => {
                const e = ecartLigne(l);
                const t = typeEcart(l);
                const unite = uniteProduit(l.produitId);
                return (
                  <tr key={l.produitId}>
                    <td className="font-medium">{nomProduit(l.produitId)}</td>
                    <td className="text-right">
                      {formatNumber(l.stockTheorique)} {unite}
                    </td>
                    <td className="text-right">
                      {readOnly ? (
                        <span>
                          {formatNumber(l.stockPhysique)} {unite}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          className="input w-28 text-right"
                          value={l.stockPhysique}
                          onChange={(ev) =>
                            majLigne(l.produitId, {
                              stockPhysique: Number(ev.target.value),
                            })
                          }
                        />
                      )}
                    </td>
                    <td
                      className={`text-right font-semibold ${
                        t === "mali"
                          ? "text-danger"
                          : t === "boni"
                            ? "text-success"
                            : "text-muted"
                      }`}
                    >
                      {e > 0 ? "+" : ""}
                      {formatNumber(e)} {unite}
                    </td>
                    <td
                      className={`text-right ${
                        t === "mali"
                          ? "text-danger"
                          : t === "boni"
                            ? "text-success"
                            : "text-muted"
                      }`}
                    >
                      {t === "conforme"
                        ? "—"
                        : formatCurrency(valeurEcartLigne(l))}
                    </td>
                    <td>
                      {t === "conforme" ? (
                        <span className="text-xs text-muted">Conforme</span>
                      ) : (
                        <JustificationCell
                          ligne={l}
                          type={t}
                          readOnly={readOnly}
                          onCategorie={(categorieEcart) =>
                            majLigne(l.produitId, { categorieEcart })
                          }
                          onMotif={(motif) => majLigne(l.produitId, { motif })}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {lignesEcart.length > 0 && !synthese.toutJustifie && !readOnly && (
        <p className="mt-3 text-xs text-danger">
          {synthese.nbNonJustifies} écart(s) restent à justifier avant de pouvoir
          clôturer l&apos;inventaire.
        </p>
      )}

      <div className="mt-6 rounded-[var(--radius)] border border-line bg-card p-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
          Note d&apos;inventaire
        </label>
        {readOnly ? (
          <p className="text-sm text-ink">
            {note.trim() ? note : "Aucune note."}
          </p>
        ) : (
          <textarea
            className="input min-h-[80px] w-full"
            placeholder="Commentaire général sur l'inventaire (conditions de comptage, remarques…)"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setDirty(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

function JustificationCell({
  ligne,
  type,
  readOnly,
  onCategorie,
  onMotif,
}: {
  ligne: InventaireLigne;
  type: "boni" | "mali";
  readOnly: boolean;
  onCategorie: (c: CategorieEcartInventaire) => void;
  onMotif: (motif: string) => void;
}) {
  const categories = type === "mali" ? CATEGORIES_MALI : CATEGORIES_BONI;
  const justifie = ecartJustifie(ligne);

  if (readOnly) {
    return (
      <div className="text-xs">
        {ligne.categorieEcart ? (
          <span className="badge badge-sea">
            {CATEGORIES_ECART[ligne.categorieEcart]}
          </span>
        ) : (
          <span className="text-muted">Non catégorisé</span>
        )}
        {ligne.motif && <p className="mt-1 text-muted">{ligne.motif}</p>}
      </div>
    );
  }

  return (
    <div className="min-w-[260px] space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`badge cursor-pointer transition-opacity hover:opacity-90 ${
              ligne.categorieEcart === cat ? "badge-sea" : "badge-muted"
            }`}
            onClick={() => onCategorie(cat)}
          >
            {CATEGORIES_ECART[cat]}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="input w-full text-xs"
        placeholder="Précision (facultatif)"
        value={ligne.motif ?? ""}
        onChange={(e) => onMotif(e.target.value)}
      />
      {!justifie && (
        <p className="text-[11px] text-danger">Écart à justifier</p>
      )}
    </div>
  );
}
