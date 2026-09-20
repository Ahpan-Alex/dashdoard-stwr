"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  TYPE_COMPTE_TRESORERIE_LABELS,
  comptesTresorerieTries,
  lignesSuiviCompteTresorerie,
  tousMouvementsTresorerie,
  type LigneSuiviTresorerie,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";
import type { TypeCompteTresorerie } from "@/lib/types";

const TYPES: TypeCompteTresorerie[] = ["caisse", "banque", "mobile_monnaie"];

export default function MouvementsTresoreriePage() {
  return (
    <RequirePermission
      permission={["factures.encaisser", "achats.lire", "comptabilite.lire"]}
    >
      <Contenu />
    </RequirePermission>
  );
}

function montantCellule(n: number) {
  if (!(n > 0)) return "";
  return formatCurrency(n);
}

function TableauSuivi({ lignes }: { lignes: LigneSuiviTresorerie[] }) {
  const totaux = lignes.reduce(
    (acc, l) => {
      if (l.nature === "operation") {
        acc.debit += l.debit;
        acc.credit += l.credit;
      }
      return acc;
    },
    { debit: 0, credit: 0 },
  );
  const soldeFinal = lignes[lignes.length - 1]?.solde ?? 0;

  return (
    <div className="table-shell">
      <table className="data">
        <thead>
          <tr>
            <th>Date opération</th>
            <th>Libellé</th>
            <th className="text-right">Débit</th>
            <th className="text-right">Crédit</th>
            <th className="text-right">Solde</th>
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-sm text-muted">
                Aucun mouvement sur cette période.
              </td>
            </tr>
          ) : (
            lignes.map((l) => (
              <tr
                key={l.id}
                className={
                  l.nature === "operation" ? undefined : "bg-sea-50/60 font-medium"
                }
              >
                <td>{formatDate(l.date)}</td>
                <td>{l.libelle}</td>
                <td className="text-right tabular-nums">
                  {montantCellule(l.debit)}
                </td>
                <td className="text-right tabular-nums">
                  {montantCellule(l.credit)}
                </td>
                <td
                  className={`text-right tabular-nums font-semibold ${
                    l.solde < 0 ? "text-danger" : ""
                  }`}
                >
                  {formatCurrency(l.solde)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {lignes.length > 0 && (
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={2}>Totaux des opérations</td>
              <td className="text-right tabular-nums">
                {montantCellule(totaux.debit) || formatCurrency(0)}
              </td>
              <td className="text-right tabular-nums">
                {montantCellule(totaux.credit) || formatCurrency(0)}
              </td>
              <td
                className={`text-right tabular-nums ${
                  soldeFinal < 0 ? "text-danger" : ""
                }`}
              >
                {formatCurrency(soldeFinal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Contenu() {
  const searchParams = useSearchParams();
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
  const comptes = comptesTresorerieTries(comptesTresorerie ?? []);
  const compteQuery = searchParams.get("compte") ?? "";
  const compteDepuisLien = comptes.find((c) => c.id === compteQuery);

  const [typeCompte, setTypeCompte] = useState<TypeCompteTresorerie>(
    () => compteDepuisLien?.type ?? comptes[0]?.type ?? "caisse",
  );
  const [compteId, setCompteId] = useState(
    () => compteDepuisLien?.id ?? comptes.find((c) => c.type === (compteDepuisLien?.type ?? comptes[0]?.type))?.id ?? "",
  );
  const [modeId, setModeId] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");

  const comptesDuType = useMemo(
    () => comptes.filter((c) => c.type === typeCompte),
    [comptes, typeCompte],
  );
  const compte =
    comptesDuType.find((c) => c.id === compteId) ?? comptesDuType[0];

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

  const lignes = useMemo(
    () =>
      compte
        ? lignesSuiviCompteTresorerie(compte, tous, {
            du: du || undefined,
            au: au || undefined,
            modePaiementId: modeId || undefined,
          })
        : [],
    [compte, tous, du, au, modeId],
  );

  function changerType(next: TypeCompteTresorerie) {
    setTypeCompte(next);
    const liste = comptes.filter((c) => c.type === next);
    setCompteId(liste[0]?.id ?? "");
  }

  return (
    <div>
      <PageHeader
        title="Suivi de trésorerie"
        description="Un compte à la fois : solde initial, puis débit, crédit et solde après chaque opération."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold text-muted">
          Type de compte
          <select
            className="select mt-1"
            value={typeCompte}
            onChange={(e) => changerType(e.target.value as TypeCompteTresorerie)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_COMPTE_TRESORERIE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Compte
          <select
            className="select mt-1"
            value={compte?.id ?? ""}
            onChange={(e) => setCompteId(e.target.value)}
            disabled={comptesDuType.length === 0}
          >
            {comptesDuType.length === 0 ? (
              <option value="">Aucun compte de ce type</option>
            ) : (
              comptesDuType.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))
            )}
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
            max={au || undefined}
            onChange={(e) => setDu(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={au}
            min={du || undefined}
            onChange={(e) => setAu(e.target.value)}
          />
        </label>
      </div>
      {!compte ? (
        <p className="text-sm text-muted">
          Aucun compte {TYPE_COMPTE_TRESORERIE_LABELS[typeCompte].toLowerCase()}.
          Créez-le dans Paramètres → Trésorerie.
        </p>
      ) : (
        <TableauSuivi lignes={lignes} />
      )}
    </div>
  );
}
