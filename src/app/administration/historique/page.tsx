"use client";

import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { AdminSubnav } from "@/components/admin-subnav";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { useStore } from "@/lib/store";
import type { ActiviteAction, ActiviteEntite } from "@/lib/types";

const ENTITE_LABELS: Record<ActiviteEntite, string> = {
  client: "Client",
  produit: "Produit",
  categorie: "Catégorie",
  fournisseur: "Fournisseur",
  point_de_vente: "Point de vente",
  charge: "Charge",
  tarif_client: "Tarif client",
  immobilisation: "Immobilisation",
  devis: "Devis",
  commande: "Commande",
  bon_de_livraison: "Bon de livraison",
  facture: "Facture",
  acompte: "Acompte",
  inventaire: "Inventaire",
  parametres: "Paramètres",
  bilan: "Bilan",
  compte_courant: "Compte courant d'associé",
  autre: "Autre",
};

const ACTION_LABELS: Record<ActiviteAction, string> = {
  creation: "Création",
  modification: "Modification",
  suppression: "Suppression",
  annulation: "Annulation",
  validation: "Validation",
  activation: "Activation",
  desactivation: "Désactivation",
  autre: "Autre",
};

const ACTION_BADGE: Record<ActiviteAction, string> = {
  creation: "badge-success",
  modification: "badge-sea",
  suppression: "badge-danger",
  annulation: "badge-danger",
  validation: "badge-success",
  activation: "badge-success",
  desactivation: "badge-sand",
  autre: "badge-muted",
};

export default function HistoriquePage() {
  return (
    <RequirePermission permission="audit.lire">
      <HistoriqueContent />
    </RequirePermission>
  );
}

function HistoriqueContent() {
  const journalActivites = useStore((s) => s.journalActivites);

  const [recherche, setRecherche] = useState("");
  const [filtreEntite, setFiltreEntite] = useState<ActiviteEntite | "toutes">(
    "toutes",
  );
  const [filtreAction, setFiltreAction] = useState<ActiviteAction | "toutes">(
    "toutes",
  );
  const [filtreUser, setFiltreUser] = useState<string>("tous");

  const utilisateurs = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of journalActivites) {
      const key = a.userId ?? a.userNom ?? "inconnu";
      map.set(key, a.userNom ?? "Utilisateur inconnu");
    }
    return [...map.entries()].map(([id, nom]) => ({ id, nom }));
  }, [journalActivites]);

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return journalActivites
      .filter((a) => filtreEntite === "toutes" || a.entite === filtreEntite)
      .filter((a) => filtreAction === "toutes" || a.action === filtreAction)
      .filter((a) => {
        if (filtreUser === "tous") return true;
        const key = a.userId ?? a.userNom ?? "inconnu";
        return key === filtreUser;
      })
      .filter((a) => {
        if (!q) return true;
        return (
          (a.libelle ?? "").toLowerCase().includes(q) ||
          (a.detail ?? "").toLowerCase().includes(q) ||
          (a.userNom ?? "").toLowerCase().includes(q) ||
          (ENTITE_LABELS[a.entite] ?? a.entite).toLowerCase().includes(q)
        );
      })
      .slice(0, 500);
  }, [journalActivites, recherche, filtreEntite, filtreAction, filtreUser]);

  return (
    <div>
      <PageHeader
        title="Historique des actions"
        description="Traçabilité des actions majeures : créations, modifications, suppressions, annulations et validations, avec leur auteur."
        showPosSelector={false}
      />
      <AdminSubnav />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            className="input w-64 pl-9"
            placeholder="Rechercher (libellé, auteur…)"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
        <select
          className="select"
          value={filtreEntite}
          onChange={(e) =>
            setFiltreEntite(e.target.value as ActiviteEntite | "toutes")
          }
        >
          <option value="toutes">Toutes les entités</option>
          {(Object.keys(ENTITE_LABELS) as ActiviteEntite[]).map((k) => (
            <option key={k} value={k}>
              {ENTITE_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={filtreAction}
          onChange={(e) =>
            setFiltreAction(e.target.value as ActiviteAction | "toutes")
          }
        >
          <option value="toutes">Toutes les actions</option>
          {(Object.keys(ACTION_LABELS) as ActiviteAction[]).map((k) => (
            <option key={k} value={k}>
              {ACTION_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={filtreUser}
          onChange={(e) => setFiltreUser(e.target.value)}
        >
          <option value="tous">Tous les utilisateurs</option>
          {utilisateurs.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nom}
            </option>
          ))}
        </select>
      </div>

      {lignes.length === 0 ? (
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title="Aucune action enregistrée"
          description="Les actions majeures réalisées par les utilisateurs (créations, modifications, suppressions, annulations…) apparaîtront ici."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date & heure</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Entité</th>
                <th>Élément</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-muted">
                    {new Date(a.date).toLocaleString("fr-FR")}
                  </td>
                  <td className="font-medium">{a.userNom ?? "—"}</td>
                  <td>
                    <span className={`badge ${ACTION_BADGE[a.action]}`}>
                      {ACTION_LABELS[a.action] ?? a.action}
                    </span>
                  </td>
                  <td>{ENTITE_LABELS[a.entite] ?? a.entite}</td>
                  <td className="font-medium">{a.libelle ?? "—"}</td>
                  <td className="text-sm text-muted">{a.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        {journalActivites.length} action(s) enregistrée(s) · 500 plus récentes
        affichées.
      </p>
    </div>
  );
}
