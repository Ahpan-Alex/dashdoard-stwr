"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  libelleCompteTresorerie,
  libelleModePaiement,
  tousMouvementsTresorerie,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";

export default function MouvementsTresoreriePage() {
  return (
    <RequirePermission
      permission={["factures.encaisser", "achats.lire", "comptabilite.lire"]}
    >
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const {
    achats,
    factures,
    acomptes,
    missionsAchat,
    lotsPaiementFournisseur,
    modesPaiement,
    comptesTresorerie,
  } = useStore();
  const modes = modesPaiement ?? [];
  const comptes = comptesTresorerie ?? [];
  const [compteId, setCompteId] = useState("");
  const [modeId, setModeId] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");

  const tous = useMemo(
    () =>
      tousMouvementsTresorerie({
        achats,
        factures,
        acomptes,
        missions: missionsAchat,
        lotsPaiement: lotsPaiementFournisseur,
        modes,
      }),
    [achats, factures, acomptes, missionsAchat, lotsPaiementFournisseur, modes],
  );

  const filtrés = tous.filter((m) => {
    if (compteId && m.compteTresorerieId !== compteId) return false;
    if (modeId && m.modePaiementId !== modeId) return false;
    const d = m.date.slice(0, 10);
    if (du && d < du) return false;
    if (au && d > au) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Mouvements de trésorerie"
        description="Journal des encaissements et décaissements, à la date d'effet réelle."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-semibold text-muted">
          Compte
          <select
            className="select mt-1"
            value={compteId}
            onChange={(e) => setCompteId(e.target.value)}
          >
            <option value="">Tous</option>
            {comptes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Mode
          <select
            className="select mt-1"
            value={modeId}
            onChange={(e) => setModeId(e.target.value)}
          >
            <option value="">Tous</option>
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Du
          <input
            type="date"
            className="input mt-1"
            value={du}
            onChange={(e) => setDu(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={au}
            onChange={(e) => setAu(e.target.value)}
          />
        </label>
      </div>
      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Date d&apos;effet</th>
              <th>Compte</th>
              <th>Libellé</th>
              <th>Mode</th>
              <th>Réf.</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {filtrés.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-sm text-muted">
                  Aucun mouvement sur cette période.
                </td>
              </tr>
            ) : (
              filtrés.map((m) => (
                <tr key={m.id}>
                  <td>{formatDate(m.date)}</td>
                  <td>{libelleCompteTresorerie(m.compteTresorerieId, comptes)}</td>
                  <td>{m.libelle}</td>
                  <td>{libelleModePaiement(m.modePaiementId, modes)}</td>
                  <td>{m.reference ?? "—"}</td>
                  <td className={m.montant < 0 ? "text-danger font-semibold" : "font-semibold"}>
                    {formatCurrency(m.montant)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
