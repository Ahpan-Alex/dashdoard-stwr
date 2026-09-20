"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
import { MapPin, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresAlertesForm } from "@/components/parametres-alertes-form";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { RequirePermission } from "@/components/require-permission";
import {
  chiffreAffairesFactures,
  syntheseRentabiliteDeuxPaliers,
} from "@/lib/rentabilite";
import { formatCurrency, formatPercent } from "@/lib/format";
import { MODULES_ALERTES } from "@/lib/alertes";
import { useAuthStore } from "@/lib/auth-store";
import { useStore } from "@/lib/store";

type Onglet = "objectifs" | "alertes";
type ModuleAlerte = "stock" | "production" | "achat" | "vente";

function parseAr(value: string) {
  return Math.max(0, Number(value) || 0);
}

export default function ParametresPilotagePage() {
  return (
    <RequirePermission permission="parametres.lire">
      <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
        <PilotageContent />
      </Suspense>
    </RequirePermission>
  );
}

function PilotageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const peutAlertes = hasPermission("parametres.gerer");
  const peutMarge = hasPermission("rentabilite.lire");

  const ongletParam = searchParams.get("onglet");
  const moduleParam = searchParams.get("module");
  const onglet: Onglet =
    ongletParam === "alertes" && peutAlertes ? "alertes" : "objectifs";
  const moduleAlerte: ModuleAlerte =
    moduleParam === "production" ||
    moduleParam === "achat" ||
    moduleParam === "vente" ||
    moduleParam === "stock"
      ? moduleParam
      : "stock";

  function aller(next: Onglet, module?: ModuleAlerte) {
    const params = new URLSearchParams();
    params.set("onglet", next);
    if (next === "alertes") params.set("module", module ?? moduleAlerte);
    router.replace(`/parametres/pilotage?${params.toString()}`);
  }

  return (
    <div>
      <PageHeader
        title="Pilotage"
        description="Objectifs par site, seuils de rentabilité, et seuils des alertes in-app."
        showPosSelector={false}
        actions={
          onglet === "objectifs" ? (
            <Link href="/dashboard/ventes" className="btn btn-secondary">
              <TrendingUp className="h-4 w-4" />
              Dashboard ventes
            </Link>
          ) : (
            <Link href="/alertes" className="btn btn-secondary">
              Voir les alertes
            </Link>
          )
        }
      />
      <ParametresSubnav />

      <nav className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn ${onglet === "objectifs" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => aller("objectifs")}
        >
          Objectifs
        </button>
        {peutAlertes && (
          <button
            type="button"
            className={`btn ${onglet === "alertes" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => aller("alertes")}
          >
            Alertes
          </button>
        )}
      </nav>

      {onglet === "objectifs" ? (
        <ObjectifsPilotage peutMarge={peutMarge} />
      ) : (
        <div>
          <nav className="mb-4 flex flex-wrap gap-2">
            {MODULES_ALERTES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`btn ${moduleAlerte === m.id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => aller("alertes", m.id)}
              >
                {m.label}
              </button>
            ))}
          </nav>
          <ParametresAlertesForm module={moduleAlerte} />
        </div>
      )}
    </div>
  );
}

function ObjectifsPilotage({ peutMarge }: { peutMarge: boolean }) {
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const factures = useStore((s) => s.factures);
  const achats = useStore((s) => s.achats);
  const entrees = useStore((s) => s.entrees);
  const produits = useStore((s) => s.produits);
  const inventaires = useStore((s) => s.inventaires);
  const updatePointDeVente = useStore((s) => s.updatePointDeVente);
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);

  const mois = useMemo(
    () => ({ debut: startOfMonth(new Date()), fin: endOfMonth(new Date()) }),
    [],
  );
  const annee = useMemo(
    () => ({ debut: startOfYear(new Date()), fin: endOfYear(new Date()) }),
    [],
  );

  const totalCaMois = pointsDeVente.reduce(
    (s, p) => s + (p.objectifCAMensuel ?? 0),
    0,
  );
  const totalCaAnnee = pointsDeVente.reduce(
    (s, p) => s + (p.objectifCAAnnuel ?? 0),
    0,
  );
  const totalMargeMois = pointsDeVente.reduce(
    (s, p) => s + (p.objectifMargeMensuel ?? 0),
    0,
  );
  const totalMargeAnnee = pointsDeVente.reduce(
    (s, p) => s + (p.objectifMargeAnnuel ?? 0),
    0,
  );

  const [seuil1, setSeuil1] = useState(
    String(parametres.seuilMargePalier1Percent ?? 25),
  );
  const [seuil2, setSeuil2] = useState(
    String(parametres.seuilMargePalier2Percent ?? 5),
  );
  const [saved, setSaved] = useState(false);

  function onSeuils(e: FormEvent) {
    e.preventDefault();
    updateParametres({
      seuilMargePalier1Percent: Math.max(0, Number(seuil1) || 0),
      seuilMargePalier2Percent: Math.max(0, Number(seuil2) || 0),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <ResumeObjectif
          label="Objectif CA mensuel"
          valeur={formatCurrency(totalCaMois)}
        />
        <ResumeObjectif
          label="Objectif CA annuel"
          valeur={formatCurrency(totalCaAnnee)}
        />
        {peutMarge && (
          <>
            <ResumeObjectif
              label="Objectif marge mensuel"
              valeur={formatCurrency(totalMargeMois)}
            />
            <ResumeObjectif
              label="Objectif marge annuel"
              valeur={formatCurrency(totalMargeAnnee)}
            />
          </>
        )}
      </div>

      {pointsDeVente.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-line bg-card p-8 text-center">
          <p className="text-sm text-muted">
            Aucun site. Créez-en un pour fixer des objectifs.
          </p>
          <Link href="/parametres/points-de-vente" className="btn btn-primary mt-4">
            <MapPin className="h-4 w-4" />
            Sites
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pointsDeVente.map((pdv) => {
            const objCaMois = pdv.objectifCAMensuel ?? 0;
            const objCaAnnee = pdv.objectifCAAnnuel ?? 0;
            const caMois = chiffreAffairesFactures(
              factures,
              parametres,
              pdv.id,
              "mois",
            );
            const caAnnee = chiffreAffairesFactures(
              factures,
              parametres,
              pdv.id,
              "annee",
            );
            const objMargeMois = pdv.objectifMargeMensuel ?? 0;
            const objMargeAnnee = pdv.objectifMargeAnnuel ?? 0;
            const margeMois = peutMarge
              ? syntheseRentabiliteDeuxPaliers({
                  factures,
                  achats,
                  produits,
                  entrees,
                  inventaires,
                  parametres,
                  pointDeVenteId: pdv.id,
                  range: mois,
                }).margeBrute
              : 0;
            const margeAnnee = peutMarge
              ? syntheseRentabiliteDeuxPaliers({
                  factures,
                  achats,
                  produits,
                  entrees,
                  inventaires,
                  parametres,
                  pointDeVenteId: pdv.id,
                  range: annee,
                }).margeBrute
              : 0;

            return (
              <article
                key={pdv.id}
                className="rounded-[var(--radius)] border border-line bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-100 text-sea-700">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-ink">
                        {pdv.nom}
                      </h3>
                      <p className="text-xs text-muted">
                        {[pdv.adresse, pdv.ville].filter(Boolean).join(", ") ||
                          "—"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`badge ${pdv.actif ? "badge-success" : "badge-sand"}`}
                  >
                    {pdv.actif ? "Actif" : "Inactif"}
                  </span>
                </div>

                <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-sea-700">
                  Chiffre d&apos;affaires
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-muted">
                    Objectif mensuel (Ar)
                    <input
                      type="number"
                      min={0}
                      step={100000}
                      className="input mt-1.5"
                      value={objCaMois}
                      onChange={(e) =>
                        updatePointDeVente(pdv.id, {
                          objectifCAMensuel: parseAr(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs font-semibold text-muted">
                    Objectif annuel (Ar)
                    <input
                      type="number"
                      min={0}
                      step={1000000}
                      className="input mt-1.5"
                      value={objCaAnnee}
                      onChange={(e) =>
                        updatePointDeVente(pdv.id, {
                          objectifCAAnnuel: parseAr(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">CA mois / atteinte</dt>
                    <dd className="font-semibold">
                      {formatCurrency(caMois)}
                      <span className="ml-1 text-xs font-normal text-muted">
                        ({objCaMois > 0 ? formatPercent(caMois / objCaMois) : "—"})
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">CA année / atteinte</dt>
                    <dd className="font-semibold">
                      {formatCurrency(caAnnee)}
                      <span className="ml-1 text-xs font-normal text-muted">
                        (
                        {objCaAnnee > 0
                          ? formatPercent(caAnnee / objCaAnnee)
                          : "—"}
                        )
                      </span>
                    </dd>
                  </div>
                </dl>

                {peutMarge && (
                  <>
                    <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-sea-700">
                      Marge
                    </p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-muted">
                        Objectif mensuel (Ar)
                        <input
                          type="number"
                          min={0}
                          step={100000}
                          className="input mt-1.5"
                          value={objMargeMois}
                          onChange={(e) =>
                            updatePointDeVente(pdv.id, {
                              objectifMargeMensuel: parseAr(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="block text-xs font-semibold text-muted">
                        Objectif annuel (Ar)
                        <input
                          type="number"
                          min={0}
                          step={1000000}
                          className="input mt-1.5"
                          value={objMargeAnnee}
                          onChange={(e) =>
                            updatePointDeVente(pdv.id, {
                              objectifMargeAnnuel: parseAr(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted">
                          Marge mois / atteinte
                        </dt>
                        <dd className="font-semibold">
                          {formatCurrency(margeMois)}
                          <span className="ml-1 text-xs font-normal text-muted">
                            (
                            {objMargeMois > 0
                              ? formatPercent(margeMois / objMargeMois)
                              : "—"}
                            )
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">
                          Marge année / atteinte
                        </dt>
                        <dd className="font-semibold">
                          {formatCurrency(margeAnnee)}
                          <span className="ml-1 text-xs font-normal text-muted">
                            (
                            {objMargeAnnee > 0
                              ? formatPercent(margeAnnee / objMargeAnnee)
                              : "—"}
                            )
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      {peutMarge && (
        <form
          onSubmit={onSeuils}
          className="max-w-lg rounded-[var(--radius)] border border-line bg-card p-5"
        >
          <h2 className="font-display text-lg font-semibold">
            Seuils de rentabilité
          </h2>
          <p className="mt-1 text-xs text-muted">
            Alertes du Dashboard à 2 paliers (taux de marge minimum).
          </p>
          <label className="mt-4 block text-xs font-semibold text-muted">
            Seuil palier 1 — marge brute (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="input mt-1"
              value={seuil1}
              onChange={(e) => setSeuil1(e.target.value)}
            />
          </label>
          <p className="mt-1 text-xs text-muted">
            Alerte si (CA HT facturé − CMV) / CA &lt; ce seuil. Défaut : 25 %.
          </p>
          <label className="mt-4 block text-xs font-semibold text-muted">
            Seuil palier 2 — résultat (CA − achats) (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="input mt-1"
              value={seuil2}
              onChange={(e) => setSeuil2(e.target.value)}
            />
          </label>
          <p className="mt-1 text-xs text-muted">
            Alerte si (CA HT facturé − achats HT) / CA &lt; ce seuil. Défaut :
            5 %.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button type="submit" className="btn btn-primary">
              Enregistrer les seuils
            </button>
            {saved && (
              <span className="text-sm text-success">Seuils enregistrés.</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function ResumeObjectif({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-sea-200 bg-sea-50/60 px-4 py-3 text-sm text-sea-900">
      <div className="flex items-start gap-2">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-sea-700" />
        <p>
          {label} : <strong>{valeur}</strong>
        </p>
      </div>
    </div>
  );
}
