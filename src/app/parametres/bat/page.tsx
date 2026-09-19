"use client";

import { FormEvent, useMemo, useState } from "react";
import { IndicateurInfo } from "@/components/indicateur-info";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import { ROLE_IDS, ROLE_LABELS, type RoleId } from "@/lib/auth/rbac";
import { rolesValiderBat } from "@/lib/bat";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

export default function ParametresBatPage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const parametresAlertes = useStore((s) => s.parametresAlertes);
  const updateParametresAlertes = useStore((s) => s.updateParametresAlertes);
  const peutGerer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const [delai, setDelai] = useState(
    String(parametresAlertes.batRelance?.delaiJours ?? 7),
  );
  const [roles, setRoles] = useState<RoleId[]>(() =>
    rolesValiderBat(parametres),
  );
  const [saved, setSaved] = useState(false);

  const rolesChoisis = useMemo(() => new Set(roles), [roles]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Math.max(0, Math.floor(Number(delai) || 0));
    updateParametresAlertes({
      batRelance: {
        ...parametresAlertes.batRelance,
        actif: parametresAlertes.batRelance?.actif ?? true,
        delaiJours: n,
      },
    });
    updateParametres({ rolesValiderBat: roles });
    setSaved(true);
  }

  function toggleRole(id: RoleId) {
    if (id === "admin_entreprise") return;
    setRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
    setSaved(false);
  }

  return (
    <div>
      <PageHeader
        title="Paramètres — Bons à tirer"
        description="Délai de relance client (même principe que les seuils d'alerte) et rôle habilité à valider un BAT — ce qui débloque l'OF."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <form
        onSubmit={onSubmit}
        className="max-w-xl space-y-6 rounded-[var(--radius)] border border-line bg-card p-5"
      >
        <fieldset>
          <legend className="mb-2 flex items-center gap-1.5 font-display text-lg font-semibold">
            Relance
            <IndicateurInfo>
              Un BAT resté « En attente » au-delà de ce délai affiche un badge
              Relance et alimente les alertes in-app. Réglable aussi dans
              Paramètres → Alertes → Ventes.
            </IndicateurInfo>
          </legend>
          <label className="block text-xs font-semibold text-muted">
            Délai avant alerte (jours)
            <input
              type="number"
              min={0}
              className="input mt-1"
              value={delai}
              disabled={!peutGerer}
              onChange={(e) => {
                setDelai(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={parametresAlertes.batRelance?.actif !== false}
              disabled={!peutGerer}
              onChange={(e) =>
                updateParametresAlertes({
                  batRelance: {
                    ...parametresAlertes.batRelance,
                    actif: e.target.checked,
                    delaiJours: Math.max(0, Math.floor(Number(delai) || 0)),
                  },
                })
              }
            />
            Alerte in-app active
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-2 flex items-center gap-1.5 font-display text-lg font-semibold">
            Validation
            <IndicateurInfo>
              Créer une version reste ouvert à tout utilisateur ayant accès à
              la commande. L&apos;action « Valider » (déblocage OF) est
              réservée aux rôles cochés. L&apos;administrateur reste toujours
              habilité.
            </IndicateurInfo>
          </legend>
          <ul className="space-y-2">
            {ROLE_IDS.filter((r) => r !== "lecture_seule").map((id) => (
              <li key={id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={id === "admin_entreprise" || rolesChoisis.has(id)}
                    disabled={!peutGerer || id === "admin_entreprise"}
                    onChange={() => toggleRole(id)}
                  />
                  {ROLE_LABELS[id]}
                  {id === "admin_entreprise" ? (
                    <span className="text-xs text-muted">(toujours)</span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {peutGerer && (
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
        )}
        {saved && (
          <p className="text-sm text-sea-800">Paramètres BAT enregistrés.</p>
        )}
      </form>
    </div>
  );
}
