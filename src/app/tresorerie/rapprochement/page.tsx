"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  mouvementEstRapproche,
} from "@/lib/rapprochement-bancaire";
import { comptesTresorerieTries, tousMouvementsTresorerie } from "@/lib/tresorerie";
import { useStore } from "@/lib/store";

export default function RapprochementBancairePage() {
  return (
    <RequirePermission
      permission={["factures.encaisser", "achats.lire", "comptabilite.lire"]}
    >
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const comptes = useStore((s) => s.comptesTresorerie ?? []);
  const lignes = useStore((s) => s.lignesReleveBancaire ?? []);
  const achats = useStore((s) => s.achats);
  const factures = useStore((s) => s.factures);
  const acomptes = useStore((s) => s.acomptes);
  const missionsAchat = useStore((s) => s.missionsAchat);
  const modesPaiement = useStore((s) => s.modesPaiement ?? []);
  const importer = useStore((s) => s.importerReleveBancaire);
  const pointer = useStore((s) => s.pointerLigneReleve);
  const supprimer = useStore((s) => s.supprimerLigneReleve);
  const banques = useMemo(
    () => comptesTresorerieTries(comptes).filter((c) => c.actif),
    [comptes],
  );
  const [compteId, setCompteId] = useState(banques[0]?.id ?? "");
  const [texte, setTexte] = useState("");
  const [fichierNom, setFichierNom] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "non" | "oui">("non");
  const [message, setMessage] = useState<string | null>(null);

  const mouvements = useMemo(
    () =>
      tousMouvementsTresorerie({
        achats,
        factures,
        acomptes,
        missions: missionsAchat,
        modes: modesPaiement,
      }),
    [achats, factures, acomptes, missionsAchat, modesPaiement],
  );

  const duCompte = lignes.filter((l) =>
    compteId ? l.compteTresorerieId === compteId : true,
  );
  const visibles = duCompte.filter((l) => {
    if (filtre === "oui") return Boolean(l.mouvementId);
    if (filtre === "non") return !l.mouvementId;
    return true;
  });

  function onImport(e: FormEvent) {
    e.preventDefault();
    if (!compteId) {
      setMessage("Choisissez un compte.");
      return;
    }
    const res = importer({ compteTresorerieId: compteId, texte, fichierNom });
    if (!res.ok) {
      setMessage(res.reason);
      return;
    }
    setTexte("");
    setMessage(`${res.imported} ligne(s) importée(s). Pointage manuel ci-dessous.`);
  }

  return (
    <div>
      <PageHeader
        title="Rapprochement bancaire"
        description="Import CSV d'un relevé, puis pointage manuel des mouvements de trésorerie. Pas de matching automatique."
      />
      <form
        onSubmit={onImport}
        className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">
            Compte
            <select
              className="select mt-1"
              value={compteId}
              onChange={(e) => setCompteId(e.target.value)}
            >
              {banques.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">
            Fichier CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="input mt-1"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFichierNom(f.name);
                void f.text().then(setTexte);
              }}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">
          Colonnes : date, libellé, montant — ou date, libellé, débit, crédit
          (séparateur virgule ou point-virgule).
        </p>
        <button type="submit" className="btn btn-primary mt-3" disabled={!texte}>
          Importer le relevé
        </button>
        {message && <p className="mt-2 text-sm">{message}</p>}
      </form>

      <label className="mb-3 block max-w-xs text-xs font-semibold text-muted">
        Afficher
        <select
          className="select mt-1"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value as typeof filtre)}
        >
          <option value="non">Non rapprochés</option>
          <option value="oui">Rapprochés</option>
          <option value="tous">Tous</option>
        </select>
      </label>

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Mouvement Négoo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  Aucune ligne de relevé.
                </td>
              </tr>
            ) : (
              visibles.map((l) => {
                const candidats = mouvements.filter((m) => {
                  if (m.compteTresorerieId !== l.compteTresorerieId) return false;
                  if (mouvementEstRapproche(m.id, lignes) && l.mouvementId !== m.id) {
                    return false;
                  }
                  return true;
                });
                return (
                  <tr key={l.id}>
                    <td>{formatDate(l.date)}</td>
                    <td>{l.libelle}</td>
                    <td className="font-semibold">{formatCurrency(l.montant)}</td>
                    <td>
                      <span
                        className={`badge ${l.mouvementId ? "badge-success" : "badge-sand"}`}
                      >
                        {l.mouvementId ? "Rapproché" : "Non rapproché"}
                      </span>
                    </td>
                    <td>
                      <select
                        className="select min-w-[14rem]"
                        value={l.mouvementId ?? ""}
                        onChange={(e) => {
                          const res = pointer(l.id, e.target.value || null);
                          if (!res.ok) alert(res.reason);
                        }}
                      >
                        <option value="">— Pointer —</option>
                        {candidats.map((m) => (
                          <option key={m.id} value={m.id}>
                            {formatDate(m.date)} · {m.libelle} ·{" "}
                            {formatCurrency(m.montant)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => supprimer(l.id)}
                      >
                        Retirer
                      </button>
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
