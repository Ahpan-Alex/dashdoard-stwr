"use client";

import { PageHeader } from "@/components/page-header";
import { ReglagesSubnav } from "@/components/reglages-subnav";
import { RequirePermission } from "@/components/require-permission";
import {
  LABEL_CATEGORIE_ALERTE,
  type ParametresAlertes,
  type RegleAlerte,
} from "@/lib/alertes";
import { useStore } from "@/lib/store";

type CleRegle = keyof ParametresAlertes;

const BLOCS: {
  categorie: keyof typeof LABEL_CATEGORIE_ALERTE;
  items: {
    cle: CleRegle;
    titre: string;
    aide: string;
    delai?: string;
  }[];
}[] = [
  {
    categorie: "achat",
    items: [
      {
        cle: "achatEcheanceApproche",
        titre: "Échéance de paiement fournisseur approchante",
        aide: "Alerte J−n avant la date d'échéance, tant que le solde n'est pas soldé.",
        delai: "Jours avant échéance",
      },
      {
        cle: "achatEcheanceDepassee",
        titre: "Facture d'achat en retard de paiement",
        aide: "Dès que l'échéance est dépassée et qu'un solde reste dû.",
      },
      {
        cle: "achatLivraisonPartielle",
        titre: "Livraison partielle en attente",
        aide: "Déclenchée lorsqu'une réception partielle n'est pas complétée au-delà du délai.",
        delai: "Jours d'attente après la dernière réception",
      },
    ],
  },
  {
    categorie: "vente",
    items: [
      {
        cle: "venteEcheanceApproche",
        titre: "Échéance de paiement client approchante",
        aide: "Alerte J−n avant l'échéance des factures fiscales encore dues.",
        delai: "Jours avant échéance",
      },
      {
        cle: "venteImpayee",
        titre: "Facture de vente impayée après échéance",
        aide: "Relance à déclencher dès le lendemain de l'échéance.",
      },
      {
        cle: "ventePartielleSansMouvement",
        titre: "Paiement partiel sans mouvement",
        aide: "Facture partiellement encaissée sans nouvel encaissement depuis X jours.",
        delai: "Jours sans mouvement",
      },
    ],
  },
  {
    categorie: "stock",
    items: [
      {
        cle: "stockReappro",
        titre: "Seuil de réapprovisionnement",
        aide: "Uniquement pour les produits dont le seuil est renseigné sur la fiche.",
      },
      {
        cle: "stockRupture",
        titre: "Rupture imminente ou effective",
        aide: "Compare le stock au seuil de rupture défini sur chaque produit (0 = rupture à zéro).",
      },
      {
        cle: "stockSurstock",
        titre: "Surstockage",
        aide: "Uniquement si un seuil de surstock est défini sur le produit.",
      },
      {
        cle: "stockPeremption",
        titre: "Péremption proche",
        aide: "Lots restants des produits qui gèrent une DLC, dans le délai indiqué.",
        delai: "Jours avant DLC",
      },
    ],
  },
];

function LigneRegle({
  cle,
  titre,
  aide,
  delai,
  regle,
  onChange,
}: {
  cle: CleRegle;
  titre: string;
  aide: string;
  delai?: string;
  regle: RegleAlerte;
  onChange: (cle: CleRegle, patch: Partial<RegleAlerte>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-line py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 sm:pr-6">
        <label className="flex items-start gap-3 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={regle.actif}
            onChange={(e) => onChange(cle, { actif: e.target.checked })}
          />
          <span>
            {titre}
            <span className="mt-1 block text-xs font-normal text-muted">
              {aide}
            </span>
          </span>
        </label>
      </div>
      {delai && (
        <label className="w-full shrink-0 text-xs font-semibold text-muted sm:w-48">
          {delai}
          <input
            type="number"
            min={0}
            step={1}
            className="input mt-1"
            disabled={!regle.actif}
            value={regle.delaiJours ?? ""}
            onChange={(e) =>
              onChange(cle, {
                delaiJours: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
        </label>
      )}
    </div>
  );
}

function ContenuReglagesAlertes() {
  const parametresAlertes = useStore((s) => s.parametresAlertes);
  const updateParametresAlertes = useStore((s) => s.updateParametresAlertes);

  function patcher(cle: CleRegle, patch: Partial<RegleAlerte>) {
    updateParametresAlertes({
      [cle]: { ...parametresAlertes[cle], ...patch },
    });
  }

  return (
    <div>
      <PageHeader
        title="Réglages — Alertes"
        description="Activation et délais globaux pour l'entreprise. Les seuils de stock se définissent produit par produit. Visible de tous les utilisateurs, configurable par l'administrateur uniquement."
        showPosSelector={false}
      />
      <ReglagesSubnav admin />

      <div className="space-y-6">
        {BLOCS.map((bloc) => (
          <section
            key={bloc.categorie}
            className="rounded-[var(--radius)] border border-line bg-card p-5"
          >
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              {LABEL_CATEGORIE_ALERTE[bloc.categorie]}
            </h2>
            {bloc.items.map((item) => (
              <LigneRegle
                key={item.cle}
                {...item}
                regle={parametresAlertes[item.cle]}
                onChange={patcher}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

export default function ReglagesAlertesPage() {
  return (
    <RequirePermission permission="parametres.gerer">
      <ContenuReglagesAlertes />
    </RequirePermission>
  );
}
