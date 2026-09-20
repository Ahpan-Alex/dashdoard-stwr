"use client";

import { useMemo, useState } from "react";
import { addWeeks, format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { StatCard } from "@/components/stat-card";
import { ateliersVisibles, OF_STATUT_LABELS } from "@/lib/fabrication";
import { formatNumber } from "@/lib/format";
import {
  capaciteHeuresJourAtelier,
  chargeHeuresAujourdhui,
  debutSemaineLundi,
  jourIso,
  planningAtelierSemaine,
} from "@/lib/planning-atelier";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";

export default function PlanningAtelierPage() {
  return (
    <RequirePermission permission="produits.lire">
      <Contenu />
    </RequirePermission>
  );
}

function Contenu() {
  const ofs = useStore((s) => s.ordresFabrication ?? []);
  const { visibles, rattache, actif } = useSitesVisibles();
  const ateliers = ateliersVisibles(visibles, rattache);
  const [atelierId, setAtelierId] = useState(
    () => (actif !== "tous" ? actif : ateliers[0]?.id ?? ""),
  );
  const [lundi, setLundi] = useState(() => debutSemaineLundi(new Date()));

  const atelier =
    ateliers.find((a) => a.id === atelierId) ?? ateliers[0] ?? null;
  const aujourdHui = jourIso(new Date());

  const jours = useMemo(
    () =>
      atelier
        ? planningAtelierSemaine({ atelier, ofs, lundi })
        : [],
    [atelier, ofs, lundi],
  );

  const chargeJour = atelier
    ? chargeHeuresAujourdhui(atelier, ofs, aujourdHui)
    : 0;
  const capaJour = atelier ? capaciteHeuresJourAtelier(atelier) : 0;
  const joursSurcharge = jours.filter((j) => j.surcharge).length;
  const heuresSemaine = jours.reduce((s, j) => s + j.heures, 0);
  const dimanche = jours[6]?.date ?? addWeeks(lundi, 0);

  return (
    <div>
      <PageHeader
        title="Planning atelier"
        description="Charge horaire MOD répartie sur la fenêtre de chaque OF (création → date prévue, ou aujourd'hui si l'OF est ouvert et en retard)."
      />

      {ateliers.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-5 w-5" />}
          title="Aucun atelier"
          description="Créez un site avec le rôle atelier, puis renseignez la capacité en heures (Paramètres → Fabrication)."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <label className="text-xs font-semibold text-muted">
              Atelier
              <select
                className="input mt-1 min-w-[12rem]"
                value={atelier?.id ?? ""}
                onChange={(e) => setAtelierId(e.target.value)}
              >
                {ateliers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nom}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLundi((d) => addWeeks(d, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Semaine précédente
              </button>
              <p className="min-w-[11rem] text-center text-sm font-medium">
                {format(lundi, "d MMM", { locale: fr })} –{" "}
                {format(dimanche, "d MMM yyyy", { locale: fr })}
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLundi((d) => addWeeks(d, 1))}
              >
                Semaine suivante
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setLundi(debutSemaineLundi(new Date()))}
              >
                Aujourd&apos;hui
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Charge aujourd'hui"
              value={
                capaJour > 0
                  ? `${formatNumber(chargeJour, 1)} / ${formatNumber(capaJour, 1)} h`
                  : `${formatNumber(chargeJour, 1)} h`
              }
              hint={
                capaJour <= 0
                  ? "Capacité h/jour non renseignée — pas d'alerte de surcharge horaire"
                  : chargeJour > capaJour
                    ? "Surcharge"
                    : "Dans la capacité"
              }
            />
            <StatCard
              label="Heures de la semaine"
              value={`${formatNumber(heuresSemaine, 1)} h`}
            />
            <StatCard
              label="Jours en surcharge"
              value={String(joursSurcharge)}
              hint={capaJour > 0 ? `Capacité ${formatNumber(capaJour, 1)} h / jour` : undefined}
            />
          </div>

          <div className="overflow-x-auto">
            <div className="grid min-w-[56rem] grid-cols-7 gap-2">
              {jours.map((j) => {
                const estAujourdhui = j.jour === aujourdHui;
                return (
                  <div
                    key={j.jour}
                    className={`rounded-[var(--radius)] border p-3 ${
                      j.surcharge
                        ? "border-red-300 bg-red-50"
                        : "border-line bg-card"
                    } ${estAujourdhui ? "ring-2 ring-sea-600" : ""}`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-sea-700">
                      {j.label}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium ${
                        j.surcharge ? "text-danger" : ""
                      }`}
                    >
                      {formatNumber(j.heures, 1)} h
                      {j.capacite > 0
                        ? ` / ${formatNumber(j.capacite, 1)} h`
                        : ""}
                    </p>
                    <p className="text-xs text-muted">
                      {j.nOf} OF
                    </p>
                    <ul className="mt-2 space-y-1">
                      {j.ofs.map((c) => (
                        <li key={c.of.id}>
                          <Link
                            href={`/fabrication/${c.of.id}`}
                            className="block rounded px-1 py-0.5 text-xs hover:bg-sea-50"
                          >
                            <span className="font-medium">{c.of.numero}</span>
                            <span className="ml-1 text-muted">
                              {formatNumber(c.heures, 1)} h
                            </span>
                            <span className="mt-0.5 block text-[10px] text-muted">
                              {OF_STATUT_LABELS[c.of.statut]}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
