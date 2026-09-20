"use client";

import { NumerotationPiecesTable } from "@/components/numerotation-pieces-table";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { PageHeader } from "@/components/page-header";
import { moduleBonDePreparationActif } from "@/lib/bon-de-preparation";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

export default function ParametresDocumentsCommerciauxPage() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const peutGerer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const actif = moduleBonDePreparationActif(parametres);

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Modèles, colonnes des tableaux, et numérotation — une ligne par type de pièce."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Bon de préparation
        </h2>
        <p className="mt-1 text-xs text-muted">
          Étape optionnelle de picking entre la commande et le BL. Le lien
          direct commande → BL reste possible.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={actif}
            disabled={!peutGerer}
            onChange={(e) =>
              updateParametres({ moduleBonDePreparation: e.target.checked })
            }
          />
          <span>
            Activer le bon de préparation
            <span className="mt-0.5 block text-xs font-normal text-muted">
              Affiche le menu, le bouton → BP sur les commandes, et
              l&apos;indicateur stock « en attente de préparation ».
            </span>
          </span>
        </label>
      </section>

      <NumerotationPiecesTable />
    </div>
  );
}
