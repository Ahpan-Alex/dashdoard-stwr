"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import { primaryRole, rolesFromStored } from "@/lib/auth/rbac";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  libelleSoldeMission,
  MISSION_REGLEMENT_LABELS,
  MISSION_STATUT_LABELS,
  missionsFiltrees,
  missionsVisiblesPour,
  soldeMission,
  syntheseAvancesParAcheteur,
  totalDepenseMission,
  triMissionsSuivi,
} from "@/lib/missions";
import { useAffichageTable } from "@/lib/use-affichage-table";
import { useStore } from "@/lib/store";
import type { MissionAchatStatut, MissionReglementStatut } from "@/lib/types";
import { Banknote } from "lucide-react";

function badgeMission(statut: MissionAchatStatut) {
  if (statut === "cloture") return "badge-success";
  if (statut === "brouillon" || statut === "soumise" || statut === "validee") {
    return "badge-sea";
  }
  if (
    statut === "en_cours" ||
    statut === "fonds_remis" ||
    statut === "a_regulariser"
  ) {
    return "badge-sand";
  }
  return "badge-danger";
}

export default function SuiviAvancesPage() {
  return (
    <RequirePermission permission={["missions.lire", "missions.gerer"]}>
      <SuiviContent />
    </RequirePermission>
  );
}

function SuiviContent() {
  const missionsAchat = useStore((s) => s.missionsAchat ?? []);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);
  const gerer = hasPermission("missions.gerer");
  const { visible: visibleHist } = useAffichageTable("missions_suivi");
  const { visible: visibleSyn } = useAffichageTable("missions_synthese");

  const [acheteurUserId, setAcheteurUserId] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [statut, setStatut] = useState<MissionAchatStatut | "tous">("tous");
  const [reglement, setReglement] = useState<MissionReglementStatut | "tous">("tous");

  const visibles = useMemo(
    () =>
      missionsVisiblesPour(missionsAchat, {
        userId: user?.id,
        gerer,
        lectureSeule:
          user
            ? primaryRole(rolesFromStored(user.role, user.roles)) ===
              "lecture_seule"
            : false,
      }),
    [missionsAchat, user, gerer],
  );

  const filtrees = useMemo(
    () =>
      triMissionsSuivi(
        missionsFiltrees(visibles, {
          acheteurUserId: acheteurUserId || undefined,
          debut: debut || undefined,
          fin: fin || undefined,
          statut,
          reglement,
        }),
      ),
    [visibles, acheteurUserId, debut, fin, statut, reglement],
  );

  const synthese = useMemo(() => syntheseAvancesParAcheteur(filtrees), [filtrees]);
  const acheteurs = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of visibles) map.set(m.acheteurUserId, m.acheteurNom);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [visibles]);

  const lignesSynthese = useMemo(
    () =>
      synthese.map((s) => ({
        acheteur: s.acheteurNom,
        nbEnCours: String(s.nbEnCours),
        nbNonReglees: String(s.nbClotureesNonReglees),
        avancesEnCours: formatCurrency(s.totalAvancesEnCours),
        soldesNonRegles: formatCurrency(s.totalSoldesNonRegles),
      })),
    [synthese],
  );

  const lignesHisto = useMemo(
    () =>
      filtrees.map((m) => ({
        numero: m.numero,
        acheteur: m.acheteurNom,
        date: formatDate(m.date),
        avance: formatCurrency(m.montantAvance),
        depense: formatCurrency(totalDepenseMission(m)),
        solde: formatCurrency(soldeMission(m)),
        statut: MISSION_STATUT_LABELS[m.statut],
        reglement: MISSION_REGLEMENT_LABELS[m.statutReglement],
        dateReglement: m.dateReglement ? formatDate(m.dateReglement) : "—",
      })),
    [filtrees],
  );

  return (
    <div>
      <PageHeader
        title="Suivi des avances par acheteur"
        description="Situation dans le temps des avances de caisse. Sans compte de trésorerie renseigné à la remise, le solde reste informatif. Sinon, le mouvement est porté au journal de trésorerie."
        actions={
          <Link href="/missions" className="btn btn-secondary">
            Missions
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-semibold text-muted">
          Acheteur
          <select
            className="select mt-1"
            value={acheteurUserId}
            onChange={(e) => setAcheteurUserId(e.target.value)}
          >
            <option value="">Tous</option>
            {acheteurs.map(([id, nom]) => (
              <option key={id} value={id}>
                {nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Du
          <input
            type="date"
            className="input mt-1"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Statut mission
          <select
            className="select mt-1"
            value={statut}
            onChange={(e) => setStatut(e.target.value as MissionAchatStatut | "tous")}
          >
            <option value="tous">Tous</option>
            <option value="en_cours">En cours</option>
            <option value="cloture">Clôturé</option>
            <option value="annule">Annulé</option>
            <option value="cloture_annule">Clôturé — Annulé</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Statut de règlement
          <select
            className="select mt-1"
            value={reglement}
            onChange={(e) => setReglement(e.target.value as MissionReglementStatut | "tous")}
          >
            <option value="tous">Tous</option>
            <option value="non_regle">Non réglé</option>
            <option value="regle">Réglé</option>
          </select>
        </label>
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold">Vue synthèse</h2>
      {synthese.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-5 w-5" />}
          title="Aucun acheteur"
          description="Aucune mission ne correspond aux filtres."
        />
      ) : (
        <>
          <TableAffichageBarre
            tableId="missions_synthese"
            lignes={lignesSynthese}
            fichier="avances-synthese"
            titre="Suivi des avances — synthèse"
          />
          <div className="table-shell mb-10">
            <table className="data">
              <thead>
                <tr>
                  <ThCol id="acheteur" show={visibleSyn}>Acheteur</ThCol>
                  <ThCol id="nbEnCours" show={visibleSyn}>Nb missions en cours</ThCol>
                  <ThCol id="nbNonReglees" show={visibleSyn}>
                    Nb missions clôturées non réglées
                  </ThCol>
                  <ThCol id="avancesEnCours" show={visibleSyn}>
                    Total des avances en cours
                  </ThCol>
                  <ThCol id="soldesNonRegles" show={visibleSyn}>
                    Total des soldes non réglés
                  </ThCol>
                </tr>
              </thead>
              <tbody>
                {synthese.map((s) => (
                  <tr key={s.acheteurUserId}>
                    <TdCol id="acheteur" show={visibleSyn} className="font-medium">
                      {s.acheteurNom}
                    </TdCol>
                    <TdCol id="nbEnCours" show={visibleSyn}>{s.nbEnCours}</TdCol>
                    <TdCol id="nbNonReglees" show={visibleSyn}>{s.nbClotureesNonReglees}</TdCol>
                    <TdCol id="avancesEnCours" show={visibleSyn}>
                      {formatCurrency(s.totalAvancesEnCours)}
                    </TdCol>
                    <TdCol id="soldesNonRegles" show={visibleSyn}>
                      {formatCurrency(s.totalSoldesNonRegles)}
                    </TdCol>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mb-3 font-display text-lg font-semibold">Historique détaillé</h2>
      {filtrees.length === 0 ? (
        <p className="text-sm text-muted">Aucune mission pour ces filtres.</p>
      ) : (
        <>
          <TableAffichageBarre
            tableId="missions_suivi"
            lignes={lignesHisto}
            fichier="avances-historique"
            titre="Suivi des avances — historique"
          />
          <div className="table-shell">
            <table className="data">
              <thead>
                <tr>
                  <ThCol id="numero" show={visibleHist}>N° mission</ThCol>
                  <ThCol id="acheteur" show={visibleHist}>Acheteur</ThCol>
                  <ThCol id="date" show={visibleHist}>Date</ThCol>
                  <ThCol id="avance" show={visibleHist}>Avance remise</ThCol>
                  <ThCol id="depense" show={visibleHist}>Total dépensé</ThCol>
                  <ThCol id="solde" show={visibleHist}>Solde</ThCol>
                  <ThCol id="statut" show={visibleHist}>Statut mission</ThCol>
                  <ThCol id="reglement" show={visibleHist}>Statut de règlement</ThCol>
                  <ThCol id="dateReglement" show={visibleHist}>Date de règlement</ThCol>
                </tr>
              </thead>
              <tbody>
                {filtrees.map((m) => (
                  <tr key={m.id}>
                    <TdCol id="numero" show={visibleHist}>
                      <Link href={`/missions/${m.id}`} className="font-semibold text-sea-800">
                        {m.numero}
                      </Link>
                    </TdCol>
                    <TdCol id="acheteur" show={visibleHist}>{m.acheteurNom}</TdCol>
                    <TdCol id="date" show={visibleHist}>{formatDate(m.date)}</TdCol>
                    <TdCol id="avance" show={visibleHist}>{formatCurrency(m.montantAvance)}</TdCol>
                    <TdCol id="depense" show={visibleHist}>
                      {formatCurrency(totalDepenseMission(m))}
                    </TdCol>
                    <TdCol id="solde" show={visibleHist}>
                      {formatCurrency(soldeMission(m))}
                      <span className="ml-1 text-xs text-muted">
                        {libelleSoldeMission(soldeMission(m))}
                      </span>
                    </TdCol>
                    <TdCol id="statut" show={visibleHist}>
                      <span className={`badge ${badgeMission(m.statut)}`}>
                        {MISSION_STATUT_LABELS[m.statut]}
                      </span>
                    </TdCol>
                    <TdCol id="reglement" show={visibleHist}>
                      {MISSION_REGLEMENT_LABELS[m.statutReglement]}
                    </TdCol>
                    <TdCol id="dateReglement" show={visibleHist}>
                      {m.dateReglement ? formatDate(m.dateReglement) : "—"}
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
