"use client";

import { useState } from "react";
import { ParametresSectionFrame } from "@/components/parametres-subnav";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";
import { tailleMaxFichierTiersOctets } from "@/lib/tiers-fiche";

export default function ParametresTiersPage() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const peutGerer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const [mo, setMo] = useState(
    String(parametres.tailleMaxFichierTiersMo ?? 5),
  );

  function enregistrer() {
    const n = Number(mo);
    if (!Number.isFinite(n) || n < 1 || n > 15) {
      alert("Indiquez une taille entre 1 et 15 Mo.");
      return;
    }
    updateParametres({ tailleMaxFichierTiersMo: n });
  }

  const actif = tailleMaxFichierTiersOctets(parametres);

  return (
    <ParametresSectionFrame sectionId="tiers">
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Plafonds de crédit, comptes 411 (clients) et 401 (fournisseurs) se
        règlent sur chaque fiche. Les tranches de balance âgée s&apos;appliquent
        à toute l&apos;entreprise.
      </p>
      <section className="max-w-md rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">
          Stockage des fiches
        </h2>
        <p className="mb-3 text-xs text-muted">
          Taille maximale d&apos;un fichier joint à un tiers. Valeur en vigueur :{" "}
          {Math.round(actif / (1024 * 1024))} Mo.
        </p>
        <label className="block text-xs font-semibold text-muted">
          Maximum (Mo)
          <input
            type="number"
            min={1}
            max={15}
            className="input mt-1"
            value={mo}
            disabled={!peutGerer}
            onChange={(e) => setMo(e.target.value)}
          />
        </label>
        {peutGerer && (
          <button type="button" className="btn btn-primary mt-3" onClick={enregistrer}>
            Enregistrer
          </button>
        )}
      </section>
    </ParametresSectionFrame>
  );
}
