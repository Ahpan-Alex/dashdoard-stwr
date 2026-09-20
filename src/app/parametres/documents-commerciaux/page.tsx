"use client";

import { ParametresSectionFrame } from "@/components/parametres-subnav";
import { moduleBonDePreparationActif } from "@/lib/bon-de-preparation";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

export default function ParametresDocumentsCommerciauxPage() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const peutGerer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const actif = moduleBonDePreparationActif(parametres);

  return (
    <ParametresSectionFrame sectionId="documents">
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Mise en page, pied de page, mention TVA optionnelle et colonnes des
        tableaux. La numérotation des devis, commandes, BL, bons de préparation
        et factures clients reste dans Configuration générale.
      </p>

      <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Bon de préparation
        </h2>
        <p className="mt-1 text-xs text-muted">
          Étape optionnelle de picking entre la commande (et les OF clôturés)
          et le BL. Le lien direct commande → BL reste possible. Aucune
          écriture comptable, pas de TVA.
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
              l&apos;indicateur stock « en attente de préparation ». Le modèle
              « Modèle bon de préparation (législation MG) » est disponible
              dans Modèles de documents.
            </span>
          </span>
        </label>
      </section>
    </ParametresSectionFrame>
  );
}
