"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { useAuthStore } from "@/lib/auth-store";
import { motifBatOfManquant } from "@/lib/bat";
import { OF_STATUT_LABELS, quantiteProduite } from "@/lib/fabrication";
import { formatDate, formatNumber } from "@/lib/format";
import { imprimerFicheOf } from "@/lib/of-fiche-impression";
import {
  ACTION_MENU_OF_LABELS,
  FILTRES_LISTE_OF_VIDE,
  actionsMenuOf,
  filtrerListeOf,
  manquesMatiereOf,
  messageVerrouEdition,
  modifierOfVisible,
  ofAUnEnfantLie,
  ofEnRetard,
  ofEstMto,
  texteAvancementOf,
  type ActionMenuOf,
  type FiltresListeOf,
  type SignalOf,
} from "@/lib/of-liste";
import { actionRuptureComposant } from "@/lib/of-chaine";
import { libelleProduit } from "@/lib/produits";
import { stockDisponiblePourOf } from "@/lib/repartition-achat-of";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";
import type { OrdreFabrication, PointDeVente } from "@/lib/types";

function badgeOf(statut: OrdreFabrication["statut"]) {
  if (statut === "cloture") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  if (statut === "annule" || statut === "cloture_annule") return "badge-danger";
  return "badge-sea";
}

export function OfListeTableau({
  ofs,
  ateliers,
  sites,
}: {
  ofs: OrdreFabrication[];
  ateliers: { id: string; nom: string }[];
  sites: PointDeVente[];
}) {
  const router = useRouter();
  const { visible } = useAffichageTable("ordres_fabrication");
  const peutModifier = useAuthStore((s) => s.hasPermission("fabrication.modifier"));
  const peutAcheter = useAuthStore((s) => s.hasPermission("achats.gerer"));
  const userId = useAuthStore((s) => s.user?.id);
  const produits = useStore((s) => s.produits);
  const commandes = useStore((s) => s.commandes ?? []);
  const bats = useStore((s) => s.bonsATirer ?? []);
  const categories = useStore((s) => s.categoriesProduits);
  const entrees = useStore((s) => s.entrees);
  const ventes = useStore((s) => s.ventes);
  const inventaires = useStore((s) => s.inventaires);
  const achats = useStore((s) => s.achats);
  const transferts = useStore((s) => s.transfertsMatiereOf ?? []);
  const tousOfs = useStore((s) => s.ordresFabrication);
  const dupliquer = useStore((s) => s.dupliquerOrdreFabrication);
  const [filtres, setFiltres] = useState<FiltresListeOf>(FILTRES_LISTE_OF_VIDE);
  const [plus, setPlus] = useState(false);

  const catalogueSites = useStore((s) => s.pointsDeVente);
  const nomSite = (id: string) =>
    sites.find((s) => s.id === id)?.nom ??
    catalogueSites.find((s) => s.id === id)?.nom ??
    "Site";

  function dispo(of: OrdreFabrication, composantId: string) {
    return stockDisponiblePourOf(
      composantId,
      of.atelierId,
      of.id,
      entrees,
      ventes,
      inventaires,
      { achats, ordresFabrication: tousOfs, transfertsMatiereOf: transferts },
    );
  }

  function signal(of: OrdreFabrication): SignalOf & { achat: boolean } {
    const ouvert = of.statut === "brouillon" || of.statut === "en_cours";
    const manques = ouvert ? manquesMatiereOf(of, (id) => dispo(of, id)) : [];
    const achat = manques.some((m) => {
      const p = produits.find((x) => x.id === m.composantId);
      return actionRuptureComposant(p, categories) === "demande_achat";
    });
    return {
      retard: ofEnRetard(of),
      matiereManquante: manques.length > 0,
      batBloquant: ouvert && Boolean(motifBatOfManquant(of, bats, commandes)),
      ofEnfant: ofAUnEnfantLie(of.id, tousOfs),
      achat,
    };
  }

  const lignes = useMemo(
    () =>
      filtrerListeOf(ofs, filtres, {
        signal,
        siteId: (of) => {
          const cmd = commandes.find((c) => c.id === of.commandeId);
          return cmd?.pointDeVenteId || of.atelierId;
        },
      }),
    // signal se recalcule avec le stock ; les deps métier suffisent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ofs, filtres, produits, commandes, bats, categories, entrees, ventes, inventaires, achats, transferts, tousOfs],
  );

  const exportLignes = lignes.map((of) => {
    const p = produits.find((x) => x.id === of.produitId);
    const cmd = commandes.find((c) => c.id === of.commandeId);
    const s = signal(of);
    const alertes = [
      s.retard ? "Retard" : "",
      s.matiereManquante ? "Matière manquante" : "",
      s.batBloquant ? "BAT non validé" : "",
      s.ofEnfant ? "OF enfant" : "",
    ].filter(Boolean);
    return {
      numero: of.numero,
      produit: p ? `${p.code} — ${libelleProduit(p)}` : "—",
      commande: cmd?.numero ?? "Stock",
      atelier: nomSite(of.atelierId),
      avancement: texteAvancementOf(of),
      echeance: of.dateCloturePrevue ? formatDate(of.dateCloturePrevue) : "—",
      site: nomSite(cmd?.pointDeVenteId || of.atelierId),
      statut: [OF_STATUT_LABELS[of.statut], ...alertes].filter(Boolean).join(" · "),
    };
  });

  function ouvrir(id: string, mode: "voir" | "modifier", extra = "") {
    router.push(`/fabrication/${id}?mode=${mode}${extra}`);
  }

  function agir(of: OrdreFabrication, action: ActionMenuOf) {
    if (action === "sortie") ouvrir(of.id, "modifier", "#sorties");
    else if (action === "mod") ouvrir(of.id, "modifier", "#mod");
    else if (action === "cloturer") ouvrir(of.id, "modifier", "&action=cloturer");
    else if (action === "demande_achat") ouvrir(of.id, "modifier", "&action=demande-achat");
    else if (action === "dupliquer") {
      const res = dupliquer(of.id);
      if (!res.ok) alert(res.reason);
      else ouvrir(res.id, "modifier");
    } else if (action === "imprimer") {
      const p = produits.find((x) => x.id === of.produitId);
      const cmd = commandes.find((c) => c.id === of.commandeId);
      void imprimerFicheOf(of, {
        produit: p ? `${p.code} — ${libelleProduit(p)}` : "—",
        atelier: nomSite(of.atelierId),
        commande: cmd ? `Commande ${cmd.numero}` : "Stock",
        composant: (id) => {
          const c = produits.find((x) => x.id === id);
          return c ? `${c.code} — ${libelleProduit(c)}` : id;
        },
      }).catch((err) => {
        alert(err instanceof Error ? err.message : "Impression impossible.");
      });
    }
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-semibold text-muted">
          Statut
          <select
            className="select mt-1"
            value={filtres.statut}
            onChange={(e) =>
              setFiltres((f) => ({ ...f, statut: e.target.value as FiltresListeOf["statut"] }))
            }
          >
            <option value="">Tous</option>
            {Object.entries(OF_STATUT_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Atelier
          <select
            className="select mt-1"
            value={filtres.atelierId}
            onChange={(e) => setFiltres((f) => ({ ...f, atelierId: e.target.value }))}
          >
            <option value="">Tous</option>
            {ateliers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Type
          <select
            className="select mt-1"
            value={filtres.type}
            onChange={(e) =>
              setFiltres((f) => ({ ...f, type: e.target.value as FiltresListeOf["type"] }))
            }
          >
            <option value="">Tous</option>
            <option value="mto">MTO — commande client</option>
            <option value="mts">MTS — stock</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        className="btn btn-secondary mb-4"
        onClick={() => setPlus((v) => !v)}
      >
        Plus de filtres
      </button>
      {plus && (
        <div className="mb-4 grid gap-3 rounded-[var(--radius)] border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtres.retard}
              onChange={(e) => setFiltres((f) => ({ ...f, retard: e.target.checked }))}
            />
            En retard
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtres.matiereManquante}
              onChange={(e) =>
                setFiltres((f) => ({ ...f, matiereManquante: e.target.checked }))
              }
            />
            Matière manquante
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtres.batNonValide}
              onChange={(e) =>
                setFiltres((f) => ({ ...f, batNonValide: e.target.checked }))
              }
            />
            BAT non validé
          </label>
          <label className="block text-xs font-semibold text-muted">
            Site
            <select
              className="select mt-1"
              value={filtres.siteId}
              onChange={(e) => setFiltres((f) => ({ ...f, siteId: e.target.value }))}
            >
              <option value="">Tous</option>
              {sites.filter((s) => s.actif).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">
            Créé à partir du
            <input
              type="date"
              className="input mt-1"
              value={filtres.periodeDebut}
              onChange={(e) => setFiltres((f) => ({ ...f, periodeDebut: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Créé jusqu&apos;au
            <input
              type="date"
              className="input mt-1"
              value={filtres.periodeFin}
              onChange={(e) => setFiltres((f) => ({ ...f, periodeFin: e.target.value }))}
            />
          </label>
        </div>
      )}

      <TableAffichageBarre
        tableId="ordres_fabrication"
        lignes={exportLignes}
        fichier="ordres-de-fabrication"
        titre="Ordres de fabrication"
      />

      {lignes.length === 0 ? (
        <p className="text-sm text-muted">Aucun ordre de fabrication pour ces filtres.</p>
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                {visible("numero") && <th>N° OF</th>}
                {visible("produit") && <th>Produit fini</th>}
                {visible("commande") && <th>Commande client</th>}
                {visible("atelier") && <th>Atelier en cours</th>}
                {visible("avancement") && <th>Avancement</th>}
                {visible("echeance") && <th>Date d&apos;échéance</th>}
                {visible("site") && <th>Site</th>}
                {visible("statut") && <th>Statut</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((of) => {
                const p = produits.find((x) => x.id === of.produitId);
                const cmd = commandes.find((c) => c.id === of.commandeId);
                const s = signal(of);
                const verrou = messageVerrouEdition(of.verrouEdition, userId);
                const actions = actionsMenuOf({
                  of,
                  peutModifier,
                  peutAcheter,
                  matiereManquanteAchat: s.achat,
                  verrouAutre: Boolean(verrou),
                });
                return (
                  <tr
                    key={of.id}
                    className="cursor-pointer"
                    onClick={() => ouvrir(of.id, "voir")}
                  >
                    {visible("numero") && (
                      <td className="font-semibold text-sea-800">{of.numero}</td>
                    )}
                    {visible("produit") && (
                      <td>{p ? `${p.code} — ${libelleProduit(p)}` : "—"}</td>
                    )}
                    {visible("commande") && <td>{cmd?.numero ?? "Stock"}</td>}
                    {visible("atelier") && <td>{nomSite(of.atelierId)}</td>}
                    {visible("avancement") && (
                      <td>
                        {formatNumber(quantiteProduite(of))} / {formatNumber(of.quantitePrevue)}
                        <span className="mt-0.5 block text-xs text-muted">
                          {(of.sorties ?? []).length} sorties · {(of.entreesProduction ?? []).length} entrées
                        </span>
                      </td>
                    )}
                    {visible("echeance") && (
                      <td className={s.retard ? "font-semibold text-red-700" : ""}>
                        {of.dateCloturePrevue ? formatDate(of.dateCloturePrevue) : "—"}
                      </td>
                    )}
                    {visible("site") && (
                      <td>{nomSite(cmd?.pointDeVenteId || of.atelierId)}</td>
                    )}
                    {visible("statut") && (
                      <td>
                        <span className={`badge ${badgeOf(of.statut)}`}>
                          {OF_STATUT_LABELS[of.statut]}
                        </span>
                        {s.retard && (
                          <span className="badge badge-danger ml-1">Retard</span>
                        )}
                        {s.matiereManquante && (
                          <span className="badge badge-sand ml-1">Matière manquante</span>
                        )}
                        {s.batBloquant && (
                          <span className="badge badge-danger ml-1">BAT non validé</span>
                        )}
                        {s.ofEnfant && (
                          <span className="badge badge-sea ml-1">OF enfant</span>
                        )}
                        {verrou && (
                          <span className="mt-1 block text-xs text-amber-900">{verrou}</span>
                        )}
                      </td>
                    )}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => ouvrir(of.id, "voir")}
                        >
                          Visualiser
                        </button>
                        {peutModifier && modifierOfVisible(of) && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={Boolean(verrou)}
                            title={verrou ?? "Ouvrir en édition"}
                            onClick={() => ouvrir(of.id, "modifier")}
                          >
                            Modifier
                          </button>
                        )}
                        <MenuActions actions={actions} onPick={(a) => agir(of, a)} />
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

function MenuActions({
  actions,
  onPick,
}: {
  actions: ActionMenuOf[];
  onPick: (action: ActionMenuOf) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    function fermer(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [ouvert]);
  if (actions.length === 0) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost"
        aria-label="Autres actions"
        aria-expanded={ouvert}
        onClick={() => setOuvert((v) => !v)}
      >
        ⋯
      </button>
      {ouvert && (
        <div className="absolute right-0 z-20 mt-1 min-w-56 rounded-[var(--radius)] border border-line bg-card py-1 shadow">
          {actions.map((a) => (
            <button
              key={a}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-sea-50"
              onClick={() => {
                setOuvert(false);
                onPick(a);
              }}
            >
              {ACTION_MENU_OF_LABELS[a]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
