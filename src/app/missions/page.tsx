"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Banknote, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SelecteurArticle } from "@/components/selecteur-article";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, formatDate } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import {
  libelleSoldeMission,
  MISSION_REGLEMENT_LABELS,
  MISSION_STATUT_LABELS,
  missionsVisiblesPour,
  soldeMission,
  totalDepenseMission,
} from "@/lib/missions";
import { produitEstAchetable } from "@/lib/nature-stock";
import { useAffichageTable } from "@/lib/use-affichage-table";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import type { MissionAchatStatut } from "@/lib/types";

function badgeMission(statut: MissionAchatStatut) {
  if (statut === "cloture") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  return "badge-danger";
}

export default function MissionsPage() {
  return (
    <RequirePermission permission={["missions.lire", "missions.gerer"]}>
      <MissionsContent />
    </RequirePermission>
  );
}

function MissionsContent() {
  const router = useRouter();
  const missionsAchat = useStore((s) => s.missionsAchat ?? []);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const creerMissionAchat = useStore((s) => s.creerMissionAchat);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const users = useAuthStore((s) => s.users);
  const refreshUsers = useAuthStore((s) => s.refreshUsers);
  const { visibles, actif } = useSitesVisibles();
  const gerer = hasPermission("missions.gerer");
  const { visible } = useAffichageTable("missions");
  const [creer, setCreer] = useState(false);

  useEffect(() => {
    if (gerer) void refreshUsers();
  }, [gerer, refreshUsers]);

  const visiblesMissions = useMemo(() => {
    const base = missionsVisiblesPour(missionsAchat, {
      userId: user?.id,
      gerer,
      lectureSeule: user?.role === "lecture_seule",
    });
    return [...base]
      .filter((m) => {
        if (actif === "tous") return true;
        if (m.acheteurUserId === user?.id) return true;
        return m.siteDestinataireId === actif;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [missionsAchat, user, gerer, actif]);

  const nomSite = (id: string) =>
    visibles.find((s) => s.id === id)?.nom ??
    pointsDeVente.find((s) => s.id === id)?.nom ??
    "Site";

  const lignesExport = useMemo(
    () =>
      visiblesMissions.map((m) => ({
        numero: m.numero,
        acheteur: m.acheteurNom,
        date: formatDate(m.date),
        site: nomSite(m.siteDestinataireId),
        avance: formatCurrency(m.montantAvance),
        depense: formatCurrency(totalDepenseMission(m)),
        solde: formatCurrency(soldeMission(m)),
        statut: MISSION_STATUT_LABELS[m.statut],
        reglement: MISSION_REGLEMENT_LABELS[m.statutReglement],
      })),
    [visiblesMissions, visibles, pointsDeVente],
  );

  return (
    <div>
      <PageHeader
        title="Missions d'achat"
        description="Avance de caisse, achats terrain (formels ou marché) et rapprochement informatif au retour. Aucun mouvement de trésorerie n'est généré."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/missions/suivi" className="btn btn-secondary">
              Suivi des avances
            </Link>
            {gerer && (
              <button type="button" className="btn btn-primary" onClick={() => setCreer(true)}>
                <Plus className="h-4 w-4" />
                Nouvelle mission
              </button>
            )}
          </div>
        }
      />

      {creer && gerer && (
        <FormulaireMission
          sites={visibles.length ? visibles : pointsDeVente.filter((s) => s.actif)}
          defautSite={actif !== "tous" ? actif : ""}
          acheteurs={
            users.filter((u) => u.actif).length
              ? users.filter((u) => u.actif)
              : user
                ? [user]
                : []
          }
          onClose={() => setCreer(false)}
          onSubmit={(payload) => {
            const res = creerMissionAchat(payload);
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setCreer(false);
            router.push(`/missions/${res.id}`);
          }}
        />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          label="En cours"
          value={String(visiblesMissions.filter((m) => m.statut === "en_cours").length)}
        />
        <StatCard
          label="Clôturées"
          value={String(visiblesMissions.filter((m) => m.statut === "cloture").length)}
        />
        <StatCard
          label="Non réglées"
          value={String(
            visiblesMissions.filter(
              (m) => m.statut === "cloture" && m.statutReglement === "non_regle",
            ).length,
          )}
        />
        <StatCard
          label="Annulées"
          value={String(
            visiblesMissions.filter(
              (m) => m.statut === "annule" || m.statut === "cloture_annule",
            ).length,
          )}
        />
      </div>

      {visiblesMissions.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-5 w-5" />}
          title="Aucune mission d'achat"
          description="Le responsable achats assigne un acheteur, une liste prévisionnelle et une avance en espèces."
        />
      ) : (
        <>
          <TableAffichageBarre
            tableId="missions"
            lignes={lignesExport}
            fichier="missions-achat"
            titre="Missions d'achat"
          />
          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <ThCol id="numero" show={visible}>N°</ThCol>
                  <ThCol id="acheteur" show={visible}>Acheteur</ThCol>
                  <ThCol id="date" show={visible}>Date</ThCol>
                  <ThCol id="site" show={visible}>Site</ThCol>
                  <ThCol id="avance" show={visible}>Avance</ThCol>
                  <ThCol id="depense" show={visible}>Dépensé</ThCol>
                  <ThCol id="solde" show={visible}>Solde</ThCol>
                  <ThCol id="statut" show={visible}>Statut</ThCol>
                  <ThCol id="reglement" show={visible}>Règlement</ThCol>
                </tr>
              </thead>
              <tbody>
                {visiblesMissions.map((m) => (
                  <tr key={m.id}>
                    <TdCol id="numero" show={visible}>
                      <Link href={`/missions/${m.id}`} className="font-semibold text-sea-800">
                        {m.numero}
                      </Link>
                    </TdCol>
                    <TdCol id="acheteur" show={visible}>{m.acheteurNom}</TdCol>
                    <TdCol id="date" show={visible}>{formatDate(m.date)}</TdCol>
                    <TdCol id="site" show={visible}>{nomSite(m.siteDestinataireId)}</TdCol>
                    <TdCol id="avance" show={visible}>{formatCurrency(m.montantAvance)}</TdCol>
                    <TdCol id="depense" show={visible}>{formatCurrency(totalDepenseMission(m))}</TdCol>
                    <TdCol id="solde" show={visible}>
                      {formatCurrency(soldeMission(m))}
                      <span className="ml-1 text-xs text-muted">
                        {libelleSoldeMission(soldeMission(m))}
                      </span>
                    </TdCol>
                    <TdCol id="statut" show={visible}>
                      <span className={`badge ${badgeMission(m.statut)}`}>
                        {MISSION_STATUT_LABELS[m.statut]}
                      </span>
                    </TdCol>
                    <TdCol id="reglement" show={visible}>
                      {MISSION_REGLEMENT_LABELS[m.statutReglement]}
                    </TdCol>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function FormulaireMission({
  sites,
  defautSite,
  acheteurs,
  onClose,
  onSubmit,
}: {
  sites: { id: string; nom: string }[];
  defautSite: string;
  acheteurs: { id: string; nom: string }[];
  onClose: () => void;
  onSubmit: (data: {
    acheteurUserId: string;
    acheteurNom: string;
    date: string;
    siteDestinataireId: string;
    montantAvance: number;
    lignesPrevisionnelles: { produitId: string; quantiteSouhaitee: number }[];
  }) => void;
}) {
  const produits = useStore((s) => s.produits.filter((p) => p.actif && produitEstAchetable(p)));
  const [acheteurId, setAcheteurId] = useState(acheteurs[0]?.id ?? "");
  const [date, setDate] = useState(jourLocalISO());
  const [siteId, setSiteId] = useState(defautSite || sites[0]?.id || "");
  const [avance, setAvance] = useState("");
  const [lignes, setLignes] = useState<{ produitId: string; quantiteSouhaitee: string }[]>([
    { produitId: produits[0]?.id ?? "", quantiteSouhaitee: "1" },
  ]);

  function onForm(e: FormEvent) {
    e.preventDefault();
    const acheteur = acheteurs.find((a) => a.id === acheteurId);
    if (!acheteur || !siteId) return;
    onSubmit({
      acheteurUserId: acheteur.id,
      acheteurNom: acheteur.nom,
      date: isoMidiDepuisJour(date),
      siteDestinataireId: siteId,
      montantAvance: Number(avance) || 0,
      lignesPrevisionnelles: lignes
        .filter((l) => l.produitId)
        .map((l) => ({
          produitId: l.produitId,
          quantiteSouhaitee: Number(l.quantiteSouhaitee) || 0,
        })),
    });
  }

  return (
    <form
      onSubmit={onForm}
      className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5"
    >
      <h2 className="mb-4 font-display text-lg font-semibold">Nouvelle mission d&apos;achat</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-muted">
          Acheteur
          <select
            className="select mt-1"
            value={acheteurId}
            onChange={(e) => setAcheteurId(e.target.value)}
            required
          >
            <option value="">—</option>
            {acheteurs.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Date de la mission
          <input
            type="date"
            className="input mt-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Site destinataire (entrée en stock)
          <select
            className="select mt-1"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            required
          >
            <option value="">—</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Montant de l&apos;avance remise
          <input
            type="number"
            min={0}
            step="1"
            className="input mt-1"
            value={avance}
            onChange={(e) => setAvance(e.target.value)}
            required
          />
        </label>
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold">Liste prévisionnelle</h3>
      <div className="space-y-2">
          {lignes.map((l, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-line p-3">
            <SelecteurArticle
              produits={produits}
              value={l.produitId}
              onChange={(produitId) =>
                setLignes(lignes.map((x, j) => (j === i ? { ...x, produitId } : x)))
              }
              allowEmpty
              emptyLabel="— Choisir un article —"
            />
            <div className="mt-2 flex flex-wrap items-end gap-2">
            <input
              type="number"
              min={0}
              step="any"
              className="input w-32"
              value={l.quantiteSouhaitee}
              onChange={(e) =>
                setLignes(
                  lignes.map((x, j) =>
                    j === i ? { ...x, quantiteSouhaitee: e.target.value } : x,
                  ),
                )
              }
              placeholder="Qté souhaitée"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setLignes(lignes.filter((_, j) => j !== i))}
              disabled={lignes.length === 1}
            >
              Retirer
            </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary mt-2"
        onClick={() =>
          setLignes([...lignes, { produitId: produits[0]?.id ?? "", quantiteSouhaitee: "1" }])
        }
      >
        Ajouter un article
      </button>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary">
          Créer la mission
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
