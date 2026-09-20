"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Mail } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { TableAffichageBarre } from "@/components/table-affichage-barre";
import { TdCol, ThCol } from "@/components/table-col";
import { libelleClient } from "@/lib/commercial";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  RELANCE_CANAUX,
  RELANCE_CANAL_LABELS,
  corpsMailtoRelance,
  fileRelancesImpayes,
  jourCivilLocal,
  relancesDuneFacture,
  type FileRelance,
} from "@/lib/relances-impayes";
import { useStore } from "@/lib/store";
import { useAffichageTable } from "@/lib/use-affichage-table";
import type { RelanceImpayeeCanal } from "@/lib/types";

type FiltreFile = "aujourdhui" | "toutes" | "retard" | "jamais";

const FILTRES: { id: FiltreFile; label: string }[] = [
  { id: "aujourdhui", label: "À relancer aujourd'hui" },
  { id: "retard", label: "En retard" },
  { id: "jamais", label: "Jamais relancées" },
  { id: "toutes", label: "Toutes les impayées" },
];

function ouvrirMailto(email: string | undefined, sujet: string, corps: string) {
  if (!email?.trim()) {
    alert("Aucun e-mail renseigné sur la fiche client.");
    return false;
  }
  const href = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
  window.location.href = href;
  return true;
}

export default function RelancesPage() {
  return (
    <RequirePermission permission="factures.lire">
      <RelancesContent />
    </RequirePermission>
  );
}

function RelancesContent() {
  const factures = useStore((s) => s.factures);
  const acomptes = useStore((s) => s.acomptes);
  const parametres = useStore((s) => s.parametres);
  const clients = useStore((s) => s.clients);
  const relances = useStore((s) => s.relancesImpayes ?? []);
  const ajouterRelanceImpayee = useStore((s) => s.ajouterRelanceImpayee);
  const { visible, colSpan } = useAffichageTable("relances");

  const file = useMemo(
    () =>
      fileRelancesImpayes({
        factures,
        acomptes,
        parametres,
        relances,
      }),
    [factures, acomptes, parametres, relances],
  );

  const [filtre, setFiltre] = useState<FiltreFile>("aujourdhui");
  const [ouvertId, setOuvertId] = useState<string | null>(null);
  const [canal, setCanal] = useState<RelanceImpayeeCanal>("telephone");
  const [note, setNote] = useState("");
  const [prochaine, setProchaine] = useState("");

  const visibles = useMemo(() => {
    if (filtre === "toutes") return file;
    if (filtre === "aujourdhui") return file.filter((l) => l.aRelancerAujourdhui);
    if (filtre === "retard") return file.filter((l) => l.joursRetard > 0);
    return file.filter((l) => l.jamaisRelancee);
  }, [file, filtre]);

  const lignesExport = useMemo(
    () =>
      visibles.map((l) => ({
        facture: l.facture.numero,
        client: (() => {
          const c = clients.find((x) => x.id === l.facture.clientId);
          return c ? libelleClient(c) : l.facture.clientId;
        })(),
        reste: formatCurrency(l.reste),
        echeance: l.echeanceJour,
        retard: l.joursRetard > 0 ? `${l.joursRetard} j` : "",
        tranche: l.trancheLabel,
        derniere: l.derniere
          ? `${formatDate(l.derniere.date)} ${RELANCE_CANAL_LABELS[l.derniere.canal]}`
          : "",
        prochaine: l.prochaine ?? "",
      })),
    [visibles, clients],
  );

  const counts = useMemo(
    () => ({
      aujourdhui: file.filter((l) => l.aRelancerAujourdhui).length,
      retard: file.filter((l) => l.joursRetard > 0).length,
      jamais: file.filter((l) => l.jamaisRelancee).length,
      toutes: file.length,
    }),
    [file],
  );

  function ouvrir(ligne: FileRelance) {
    setOuvertId(ligne.facture.id);
    setCanal("telephone");
    setNote("");
    const plusSept = new Date();
    plusSept.setDate(plusSept.getDate() + 7);
    setProchaine(jourCivilLocal(plusSept));
  }

  function enregistrer(ligne: FileRelance, avecMailto: boolean) {
    const res = ajouterRelanceImpayee({
      factureId: ligne.facture.id,
      canal,
      note,
      prochaineRelance: prochaine || undefined,
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    if (avecMailto || canal === "email") {
      const client = clients.find((c) => c.id === ligne.facture.clientId);
      ouvrirMailto(
        client?.email,
        `Relance facture ${ligne.facture.numero}`,
        corpsMailtoRelance({
          numero: ligne.facture.numero,
          date: formatDate(ligne.facture.date),
          reste: formatCurrency(ligne.reste),
          echeance: ligne.echeanceJour
            ? formatDate(`${ligne.echeanceJour}T12:00:00`)
            : undefined,
        }),
      );
    }
    setOuvertId(null);
  }

  return (
    <div>
      <PageHeader
        title="Relances impayés"
        description="File des factures encore dues, avec historique qui / quand / canal. L'envoi e-mail ouvre le client messagerie ; la relance est toujours enregistrée dans Négoo."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">À relancer aujourd'hui</p>
          <p className="font-display text-lg font-semibold">{counts.aujourdhui}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">En retard</p>
          <p className="font-display text-lg font-semibold">{counts.retard}</p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card px-4 py-3">
          <p className="text-[11px] text-muted">Jamais relancées</p>
          <p className="font-display text-lg font-semibold">{counts.jamais}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn ${filtre === f.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltre(f.id)}
          >
            {f.label}
            {f.id === "aujourdhui" ? ` (${counts.aujourdhui})` : ""}
          </button>
        ))}
      </div>

      <TableAffichageBarre tableId="relances" lignes={lignesExport} fichier="relances-impayes" />

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <ThCol id="facture" show={visible}>Facture</ThCol>
              <ThCol id="client" show={visible}>Client</ThCol>
              <ThCol id="reste" show={visible}>Reste dû</ThCol>
              <ThCol id="echeance" show={visible}>Échéance</ThCol>
              <ThCol id="retard" show={visible}>Retard</ThCol>
              <ThCol id="tranche" show={visible}>Tranche</ThCol>
              <ThCol id="derniere" show={visible}>Dernière relance</ThCol>
              <ThCol id="prochaine" show={visible}>Prochaine</ThCol>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={colSpan(true)} className="text-muted">
                  Aucune facture dans cette file.
                </td>
              </tr>
            ) : (
              visibles.map((ligne) => {
                const f = ligne.facture;
                const client = clients.find((c) => c.id === f.clientId);
                const hist = relancesDuneFacture(relances, f.id);
                const ouvert = ouvertId === f.id;
                return (
                  <tr key={f.id}>
                    <TdCol id="facture" show={visible} className="font-medium">
                      <Link href="/factures/liste" className="text-sea-800 underline">
                        {f.numero}
                      </Link>
                    </TdCol>
                    <TdCol id="client" show={visible}>
                      {client ? libelleClient(client) : "—"}
                    </TdCol>
                    <TdCol id="reste" show={visible}>
                      {formatCurrency(ligne.reste)}
                    </TdCol>
                    <TdCol id="echeance" show={visible}>
                      {ligne.echeanceJour
                        ? formatDate(`${ligne.echeanceJour}T12:00:00`)
                        : "—"}
                    </TdCol>
                    <TdCol id="retard" show={visible}>
                      {ligne.joursRetard > 0 ? (
                        <span className="badge badge-sand bg-rose-100 text-rose-800">
                          {ligne.joursRetard} j
                        </span>
                      ) : (
                        "—"
                      )}
                    </TdCol>
                    <TdCol id="tranche" show={visible}>{ligne.trancheLabel}</TdCol>
                    <TdCol id="derniere" show={visible}>
                      {ligne.derniere
                        ? `${formatDate(ligne.derniere.date)} · ${RELANCE_CANAL_LABELS[ligne.derniere.canal]}`
                        : "—"}
                    </TdCol>
                    <TdCol id="prochaine" show={visible}>
                      {ligne.prochaine
                        ? formatDate(`${ligne.prochaine}T12:00:00`)
                        : "—"}
                    </TdCol>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => (ouvert ? setOuvertId(null) : ouvrir(ligne))}
                      >
                        <Bell className="h-4 w-4" />
                        {ouvert ? "Fermer" : "Relancer"}
                      </button>
                      {ouvert && (
                        <div className="mt-3 min-w-[16rem] space-y-2 rounded-[var(--radius)] border border-line bg-card p-3 text-sm">
                          <label className="block text-xs font-semibold text-muted">
                            Canal
                            <select
                              className="input mt-1"
                              value={canal}
                              onChange={(e) =>
                                setCanal(e.target.value as RelanceImpayeeCanal)
                              }
                            >
                              {RELANCE_CANAUX.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-xs font-semibold text-muted">
                            Note
                            <textarea
                              className="input mt-1"
                              rows={2}
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                            />
                          </label>
                          <label className="block text-xs font-semibold text-muted">
                            Prochaine relance
                            <input
                              type="date"
                              className="input mt-1"
                              value={prochaine}
                              onChange={(e) => setProchaine(e.target.value)}
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => enregistrer(ligne, false)}
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => enregistrer(ligne, true)}
                            >
                              <Mail className="h-4 w-4" />
                              + e-mail
                            </button>
                          </div>
                          {hist.length > 0 && (
                            <ul className="space-y-1 border-t border-line pt-2 text-xs text-muted">
                              {hist.map((h) => (
                                <li key={h.id}>
                                  {formatDate(h.date)} · {RELANCE_CANAL_LABELS[h.canal]}
                                  {h.userNom ? ` · ${h.userNom}` : ""}
                                  {h.note ? ` — ${h.note}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                          {!client?.email && (
                            <p className="text-xs text-muted">
                              Pas d&apos;e-mail sur la fiche client.
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
