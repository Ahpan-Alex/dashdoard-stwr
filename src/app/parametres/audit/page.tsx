"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import { useAuthStore } from "@/lib/auth-store";
import { CATEGORIE_JOURNAL_LABELS } from "@/lib/journal-audit";
import { useStore } from "@/lib/store";

export default function ParametresAuditPage() {
  return (
    <RequirePermission permission="audit.lire">
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const peutGerer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const [suppressions, setSuppressions] = useState(
    parametres.auditRetention?.suppressionsAnnees != null
      ? String(parametres.auditRetention.suppressionsAnnees)
      : "",
  );
  const [prix, setPrix] = useState(
    parametres.auditRetention?.prixAnnees != null
      ? String(parametres.auditRetention.prixAnnees)
      : "",
  );
  const [statuts, setStatuts] = useState(
    parametres.auditRetention?.statutsCritiquesAnnees != null
      ? String(parametres.auditRetention.statutsCritiquesAnnees)
      : "",
  );
  const [message, setMessage] = useState<string | null>(null);

  function parseAnnees(raw: string): number | null {
    const t = raw.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(50, Math.floor(n));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!peutGerer) return;
    updateParametres({
      auditRetention: {
        suppressionsAnnees: parseAnnees(suppressions),
        prixAnnees: parseAnnees(prix),
        statutsCritiquesAnnees: parseAnnees(statuts),
      },
    });
    setMessage("Politique de rétention enregistrée. La purge ne touche jamais la comptabilité ni les droits utilisateurs.");
  }

  return (
    <div>
      <ParametresSubnav />
      <PageHeader
        title="Journal métier — rétention"
        description="La conservation des actions comptables et RBAC est illimitée. Les autres catégories peuvent être purgées après X années — jamais rétroactivement sur les catégories illimitées."
        showPosSelector={false}
      />

      <form
        onSubmit={onSubmit}
        className="max-w-xl space-y-4 rounded-[var(--radius)] border border-line bg-card p-5"
      >
        <p className="text-sm text-muted">
          Champ vide = pas de purge automatique. Unité : années.
        </p>
        <label className="block text-xs font-semibold text-muted">
          {CATEGORIE_JOURNAL_LABELS.suppression}
          <input
            className="input mt-1"
            inputMode="numeric"
            disabled={!peutGerer}
            value={suppressions}
            onChange={(e) => setSuppressions(e.target.value)}
            placeholder="Illimitée"
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          {CATEGORIE_JOURNAL_LABELS.prix}
          <input
            className="input mt-1"
            inputMode="numeric"
            disabled={!peutGerer}
            value={prix}
            onChange={(e) => setPrix(e.target.value)}
            placeholder="Illimitée"
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          {CATEGORIE_JOURNAL_LABELS.statut_critique}
          <input
            className="input mt-1"
            inputMode="numeric"
            disabled={!peutGerer}
            value={statuts}
            onChange={(e) => setStatuts(e.target.value)}
            placeholder="Illimitée"
          />
        </label>
        <div className="rounded-[var(--radius)] border border-line bg-sea-100/50 p-3 text-sm">
          <p className="font-semibold text-ink">Toujours illimité</p>
          <p className="mt-1 text-muted">
            {CATEGORIE_JOURNAL_LABELS.comptabilite} · {CATEGORIE_JOURNAL_LABELS.rbac}
          </p>
        </div>
        {message && <p className="text-sm text-sea-700">{message}</p>}
        {peutGerer && (
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
        )}
        <p className="text-sm">
          <Link href="/administration/journal-audit" className="text-sea-700 underline">
            Ouvrir le journal métier
          </Link>
        </p>
      </form>
    </div>
  );
}
