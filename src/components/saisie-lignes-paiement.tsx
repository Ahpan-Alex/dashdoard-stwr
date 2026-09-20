"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import {
  compteCompatibleOuVide,
  comptesTresoreriePourMode,
  libelleModePaiement,
  modeNecessiteEcheance,
  modesPaiementActifs,
  TYPE_COMPTE_TRESORERIE_LABELS,
} from "@/lib/tresorerie";
import { useStore } from "@/lib/store";
import type { SaisieLignePaiement } from "@/lib/tresorerie";

const LIGNE_VIDE = (): {
  montant: string;
  modePaiement: string;
  compteTresorerieId: string;
  reference: string;
  dateEffet: string;
} => ({
  montant: "",
  modePaiement: "",
  compteTresorerieId: "",
  reference: "",
  dateEffet: "",
});

export function SaisieLignesPaiement({
  siteId,
  onValider,
  disabled,
  submitLabel = "Enregistrer",
  montantPropose,
}: {
  siteId?: string;
  onValider: (lignes: SaisieLignePaiement[]) => void;
  disabled?: boolean;
  submitLabel?: string;
  /** Préremplit la première ligne (paiement groupé). */
  montantPropose?: number;
}) {
  const modes = useStore((s) => s.modesPaiement ?? []);
  const comptes = useStore((s) => s.comptesTresorerie ?? []);
  const actifs = modesPaiementActifs(modes);
  const [date, setDate] = useState(jourLocalISO());
  const [lignes, setLignes] = useState(() => [
    {
      ...LIGNE_VIDE(),
      montant:
        montantPropose && montantPropose > 0 ? String(Math.round(montantPropose)) : "",
    },
  ]);

  const defautMode = actifs.find((m) => m.id === "especes")?.id ?? actifs[0]?.id ?? "";

  const lignesHydratees = useMemo(
    () =>
      lignes.map((l) => {
        const modePaiement = l.modePaiement || defautMode;
        const compatibles = comptesTresoreriePourMode(
          comptes,
          modePaiement,
          modes,
          siteId,
        );
        const compteTresorerieId =
          compteCompatibleOuVide(l.compteTresorerieId, modePaiement, comptes, modes) ||
          compatibles[0]?.id ||
          "";
        return { ...l, modePaiement, compteTresorerieId };
      }),
    [lignes, defautMode, comptes, modes, siteId],
  );

  function patch(i: number, next: Partial<(typeof lignes)[0]>) {
    setLignes((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        const merged = { ...l, ...next };
        if (next.modePaiement) {
          merged.compteTresorerieId = compteCompatibleOuVide(
            merged.compteTresorerieId,
            next.modePaiement,
            comptes,
            modes,
          );
        }
        return merged;
      }),
    );
  }

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-sea-200 bg-card p-4">
      <label className="block text-xs font-semibold text-muted">
        Date de saisie
        <input
          type="date"
          className="input mt-1 max-w-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      {lignesHydratees.map((l, i) => {
        const echeance = modeNecessiteEcheance(modes, l.modePaiement);
        const comptesMode = comptesTresoreriePourMode(
          comptes,
          l.modePaiement,
          modes,
          siteId,
        );
        return (
          <div
            key={i}
            className="grid gap-2 rounded-lg border border-line/80 p-3 sm:grid-cols-2 lg:grid-cols-6"
          >
            <label className="text-xs font-semibold text-muted">
              Montant (Ar)
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={l.montant}
                onChange={(e) => patch(i, { montant: e.target.value })}
              />
            </label>
            <label className="text-xs font-semibold text-muted">
              Mode
              <select
                className="select mt-1"
                value={l.modePaiement}
                onChange={(e) => patch(i, { modePaiement: e.target.value })}
              >
                {actifs.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.libelle}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              Compte
              <select
                className="select mt-1"
                value={l.compteTresorerieId}
                onChange={(e) => patch(i, { compteTresorerieId: e.target.value })}
              >
                <option value="">—</option>
                {comptesMode.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.libelle} ({TYPE_COMPTE_TRESORERIE_LABELS[c.type]})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted">
              Référence
              <input
                className="input mt-1"
                value={l.reference}
                onChange={(e) => patch(i, { reference: e.target.value })}
                placeholder="N° chèque, id…"
              />
            </label>
            {echeance && (
              <label className="text-xs font-semibold text-muted">
                Date d&apos;échéance
                <input
                  type="date"
                  className="input mt-1"
                  value={l.dateEffet}
                  onChange={(e) => patch(i, { dateEffet: e.target.value })}
                  required
                />
              </label>
            )}
            <div className="flex items-end">
              {lignes.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setLignes((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setLignes((prev) => [...prev, LIGNE_VIDE()])}
        >
          <Plus className="h-4 w-4" />
          Autre mode
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled}
          onClick={() => {
            const payload: SaisieLignePaiement[] = [];
            for (const l of lignesHydratees) {
              const n = Number(l.montant);
              if (!(n > 0)) continue;
              payload.push({
                date: isoMidiDepuisJour(date),
                montant: n,
                modePaiement: l.modePaiement,
                compteTresorerieId: l.compteTresorerieId || undefined,
                reference: l.reference.trim() || undefined,
                dateEffet: l.dateEffet
                  ? isoMidiDepuisJour(l.dateEffet)
                  : undefined,
              });
            }
            if (!payload.length) return;
            onValider(payload);
            setLignes([LIGNE_VIDE()]);
          }}
        >
          {submitLabel}
        </button>
      </div>
      {actifs.length === 0 && (
        <p className="text-xs text-muted">
          Aucun mode de paiement actif. Configurez-les dans Paramètres → Trésorerie.
        </p>
      )}
    </div>
  );
}

export function LibelleMode({ id }: { id?: string }) {
  const modes = useStore((s) => s.modesPaiement ?? []);
  return <>{libelleModePaiement(id, modes)}</>;
}
