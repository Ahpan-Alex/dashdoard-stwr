"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { IndicateurInfo } from "@/components/indicateur-info";
import {
  LABEL_TYPE_ALERTE,
  explicationAlerte,
  type ParametresAlertes,
  type RegleAlerte,
} from "@/lib/alertes";
import {
  labelsTranchesBalanceAgee,
  normaliserTranchesBalanceAgee,
  TRANCHES_BALANCE_AGEE_DEFAUT,
} from "@/lib/tiers";
import { siteEstAtelier } from "@/lib/sites";
import { useStore } from "@/lib/store";

type CleRegle = keyof ParametresAlertes;

type ItemRegle = {
  cle: CleRegle;
  titre: string;
  champ?: "delai" | "percent";
  unite?: string;
};

const ITEMS: Record<"stock" | "production" | "achat" | "vente", ItemRegle[]> = {
  stock: [
    { cle: "stockRupture", titre: "Rupture de matière première" },
    { cle: "stockReappro", titre: "Seuil de réapprovisionnement" },
    { cle: "stockSurstock", titre: "Surstockage" },
    {
      cle: "stockPeremption",
      titre: "Péremption proche",
      champ: "delai",
      unite: "Jours avant DLC",
    },
    {
      cle: "stockDormant",
      titre: "Stock semi-fini / fini dormant",
      champ: "delai",
      unite: "Jours sans vente ni transfert",
    },
    {
      cle: "stockCumpAnormal",
      titre: "Écart de valorisation CUMP",
      champ: "percent",
      unite: "Variation CUMP (%)",
    },
  ],
  production: [
    {
      cle: "productionOfRetard",
      titre: "OF en retard",
      champ: "delai",
      unite: "Jours après la date prévue (0 = dès le dépassement)",
    },
    {
      cle: "productionEcartFabrication",
      titre: "Écart de fabrication anormal",
      champ: "percent",
      unite: "Perte matière globale (%)",
    },
    { cle: "productionRuptureComposant", titre: "Rupture de composant en cours d'OF" },
    { cle: "productionSurchargeAtelier", titre: "Atelier en surcharge" },
  ],
  achat: [
    {
      cle: "achatEcheanceApproche",
      titre: "Échéance fournisseur approchante",
      champ: "delai",
      unite: "Jours avant échéance",
    },
    { cle: "achatEcheanceDepassee", titre: "Facture d'achat en retard" },
    {
      cle: "achatLivraisonPartielle",
      titre: "Livraison partielle en attente",
      champ: "delai",
      unite: "Jours après la dernière réception",
    },
    {
      cle: "achatMissionAvance",
      titre: "Avance de mission non rapprochée",
      champ: "delai",
      unite: "Jours sans clôture / rapprochement",
    },
    {
      cle: "achatCompte471",
      titre: "Compte 471 non reclassé",
      champ: "delai",
      unite: "Jours en attente de reclassement",
    },
    {
      cle: "achatDpSansReponse",
      titre: "Demande de prix sans réponse",
      champ: "delai",
      unite: "Jours sans offre",
    },
  ],
  vente: [
    {
      cle: "venteEcheanceApproche",
      titre: "Échéance client approchante",
      champ: "delai",
      unite: "Jours avant échéance",
    },
    { cle: "venteImpayee", titre: "Facture client en retard (tranches balance âgée)" },
    {
      cle: "ventePartielleSansMouvement",
      titre: "Paiement partiel sans mouvement",
      champ: "delai",
      unite: "Jours sans encaissement",
    },
    {
      cle: "ventePlafondCredit",
      titre: "Client proche du plafond de crédit",
      champ: "percent",
      unite: "Anticipation (% du plafond)",
    },
  ],
};

const TYPE_PAR_CLE: Partial<Record<CleRegle, keyof typeof LABEL_TYPE_ALERTE>> = {
  stockRupture: "stock_rupture",
  stockReappro: "stock_reappro",
  stockSurstock: "stock_surstock",
  stockPeremption: "stock_peremption",
  stockDormant: "stock_dormant",
  stockCumpAnormal: "stock_cump_anormal",
  productionOfRetard: "of_retard",
  productionEcartFabrication: "of_ecart_matiere",
  productionRuptureComposant: "of_rupture_composant",
  productionSurchargeAtelier: "atelier_surcharge",
  achatEcheanceApproche: "achat_echeance_approche",
  achatEcheanceDepassee: "achat_echeance_depassee",
  achatLivraisonPartielle: "achat_livraison_partielle",
  achatMissionAvance: "mission_avance_non_rapprochee",
  achatCompte471: "mission_471_non_reclasse",
  achatDpSansReponse: "dp_sans_reponse",
  venteEcheanceApproche: "vente_echeance_approche",
  venteImpayee: "vente_impayee",
  ventePartielleSansMouvement: "vente_partielle_sans_mouvement",
  ventePlafondCredit: "vente_plafond_credit",
};

export function ParametresAlertesForm({
  module,
}: {
  module: "stock" | "production" | "achat" | "vente";
}) {
  const parametresAlertes = useStore((s) => s.parametresAlertes);
  const updateParametresAlertes = useStore((s) => s.updateParametresAlertes);
  const parametres = useStore((s) => s.parametres);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const updatePointDeVente = useStore((s) => s.updatePointDeVente);
  const ateliers = pointsDeVente.filter((s) => s.actif && siteEstAtelier(s));

  function patcher(cle: CleRegle, patch: Partial<RegleAlerte>) {
    updateParametresAlertes({
      [cle]: { ...parametresAlertes[cle], ...patch },
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius)] border border-line bg-card p-5">
        {ITEMS[module].map((item) => {
          const regle = parametresAlertes[item.cle];
          const type = TYPE_PAR_CLE[item.cle];
          const info = type
            ? explicationAlerte(type, parametresAlertes, parametres)
            : null;
          return (
            <div
              key={item.cle}
              className="flex flex-col gap-3 border-t border-line py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <label className="flex min-w-0 items-start gap-3 text-sm font-semibold text-ink sm:pr-6">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={regle.actif}
                  onChange={(e) => patcher(item.cle, { actif: e.target.checked })}
                />
                <span>
                  <span className="inline-flex items-center gap-1.5">
                    {item.titre}
                    {info ? (
                      <IndicateurInfo>
                        <span className="block mb-1">{info.signification}</span>
                        <span className="block mb-1 text-muted">{info.calcul}</span>
                        <span className="block font-medium">{info.seuil}</span>
                      </IndicateurInfo>
                    ) : null}
                  </span>
                  {item.cle === "stockRupture" ||
                  item.cle === "stockReappro" ||
                  item.cle === "stockSurstock" ? (
                    <span className="mt-1 block text-xs font-normal text-muted">
                      Seuil individuel sur chaque{" "}
                      <Link href="/parametres/produits" className="underline">
                        fiche produit
                      </Link>
                      .
                    </span>
                  ) : null}
                </span>
              </label>
              {item.champ && (
                <label className="w-full shrink-0 text-xs font-semibold text-muted sm:w-56">
                  {item.unite}
                  <input
                    type="number"
                    min={0}
                    step={item.champ === "percent" ? 1 : 1}
                    className="input mt-1"
                    disabled={!regle.actif}
                    value={
                      item.champ === "percent"
                        ? (regle.seuilPercent ?? "")
                        : (regle.delaiJours ?? "")
                    }
                    onChange={(e) =>
                      patcher(
                        item.cle,
                        item.champ === "percent"
                          ? {
                              seuilPercent:
                                e.target.value === "" ? 0 : Number(e.target.value),
                            }
                          : {
                              delaiJours:
                                e.target.value === "" ? 0 : Number(e.target.value),
                            },
                      )
                    }
                  />
                </label>
              )}
            </div>
          );
        })}
      </section>

      {module === "production" && (
        <>
          <section className="rounded-[var(--radius)] border border-line bg-card p-5">
            <h2 className="font-display text-lg font-semibold">
              Seuil d&apos;écart matière par atelier
            </h2>
            <p className="mt-1 text-xs text-muted">
              Laissez vide pour utiliser le pourcentage global. Uniquement
              administrateur.
            </p>
            {ateliers.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucun atelier actif.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {ateliers.map((a) => (
                  <label
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span>{a.nom}</span>
                    <input
                      type="number"
                      min={0}
                      className="input w-28"
                      placeholder="Global"
                      value={
                        parametresAlertes.productionEcartFabrication.seuilsParAtelier?.[
                          a.id
                        ] ?? ""
                      }
                      onChange={(e) => {
                        const next = {
                          ...(parametresAlertes.productionEcartFabrication
                            .seuilsParAtelier ?? {}),
                        };
                        if (e.target.value === "") delete next[a.id];
                        else next[a.id] = Number(e.target.value);
                        patcher("productionEcartFabrication", {
                          seuilsParAtelier: next,
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-[var(--radius)] border border-line bg-card p-5">
            <h2 className="font-display text-lg font-semibold">
              Capacité par atelier (OF simultanés)
            </h2>
            <p className="mt-1 text-xs text-muted">
              Nombre maximal d&apos;OF ouverts. 0 = pas d&apos;alerte de surcharge
              pour cet atelier. Même champ que la fiche site.
            </p>
            {ateliers.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucun atelier actif.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {ateliers.map((a) => (
                  <label
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span>{a.nom}</span>
                    <input
                      type="number"
                      min={0}
                      className="input w-28"
                      value={a.capaciteOfSimultanes ?? 0}
                      onChange={(e) =>
                        updatePointDeVente(a.id, {
                          capaciteOfSimultanes: Math.max(
                            0,
                            Number(e.target.value) || 0,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {module === "vente" && <BalanceAgeeDansAlertes />}
    </div>
  );
}

function BalanceAgeeDansAlertes() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const actuelles = normaliserTranchesBalanceAgee(
    parametres.tranchesBalanceAgeeJours,
  );
  const [saisie, setSaisie] = useState(actuelles.join(", "));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = saisie
      .split(/[,;\s]+/)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0);
    const next = normaliserTranchesBalanceAgee(
      raw.length ? raw : [...TRANCHES_BALANCE_AGEE_DEFAUT],
    );
    updateParametres({ tranchesBalanceAgeeJours: next });
    setSaisie(next.join(", "));
  }

  const labels = labelsTranchesBalanceAgee(
    normaliserTranchesBalanceAgee(
      saisie
        .split(/[,;\s]+/)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  );

  return (
    <section className="rounded-[var(--radius)] border border-line bg-card p-5">
      <h2 className="font-display text-lg font-semibold">
        Tranches de balance âgée
      </h2>
      <p className="mt-1 text-xs text-muted">
        Mêmes bornes que Paramètres → Tiers →{" "}
        <Link href="/parametres/balance-agee" className="underline">
          Balance âgée
        </Link>
        . Elles classent les factures clients en retard (31–60 / 61–90 / +90 par
        défaut).
      </p>
      <form onSubmit={onSubmit} className="mt-3 max-w-xl">
        <label className="block text-xs font-semibold text-muted">
          Bornes en jours (séparées par des virgules)
          <input
            className="input mt-1"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="30, 60, 90"
          />
        </label>
        <p className="mt-2 text-sm text-muted">
          Tranches : {labels.join(" · ")}
        </p>
        <button type="submit" className="btn btn-primary mt-3">
          Enregistrer les tranches
        </button>
      </form>
    </section>
  );
}
