"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { IndicateurInfo } from "@/components/indicateur-info";
import {
  LABEL_TYPE_ALERTE,
  MODULES_ALERTES,
  explicationAlerte,
  type CategorieAlerte,
} from "@/lib/alertes";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useAlertes } from "@/lib/use-alertes";

function classeGravite(g: "info" | "warning" | "danger") {
  if (g === "danger") return "border-rose-200 bg-rose-50";
  if (g === "warning") return "border-amber-200 bg-amber-50";
  return "border-sea-200 bg-sea-50";
}

export function AlertesListe({ categorie }: { categorie: CategorieAlerte }) {
  const { actives, traitees, suivi } = useAlertes();
  const marquerAlerte = useStore((s) => s.marquerAlerte);
  const parametresAlertes = useStore((s) => s.parametresAlertes);
  const parametres = useStore((s) => s.parametres);
  const peutConfigurer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const [vueTraitees, setVueTraitees] = useState(false);

  const liste = useMemo(() => {
    const src = vueTraitees ? traitees : actives;
    return src.filter((a) => a.categorie === categorie);
  }, [vueTraitees, traitees, actives, categorie]);

  const module = MODULES_ALERTES.find((m) => m.id === categorie);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={!vueTraitees ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setVueTraitees(false)}
        >
          Actives
        </button>
        <button
          type="button"
          className={vueTraitees ? "btn btn-primary" : "btn btn-secondary"}
          onClick={() => setVueTraitees(true)}
        >
          Traitées
        </button>
      </div>

      {liste.length === 0 ? (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-dashed border-line bg-card px-5 py-10 text-sm text-muted">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 opacity-50" />
          <p>
            {vueTraitees
              ? "Aucune alerte traitée dans ce module."
              : "Aucune alerte active dans ce module. Les seuils se règlent dans Paramètres → Alertes (administrateur)."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {liste.map((a) => {
            const lue = suivi.lues.includes(a.id);
            const traitee = suivi.traitees.includes(a.id);
            const info = explicationAlerte(a.type, parametresAlertes, parametres);
            return (
              <li
                key={a.id}
                className={`rounded-[var(--radius)] border px-4 py-3 ${classeGravite(a.gravite)} ${
                  lue && !traitee ? "opacity-80" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                      {a.titre}
                      <IndicateurInfo titre={LABEL_TYPE_ALERTE[a.type]}>
                        <strong className="block mb-1">{LABEL_TYPE_ALERTE[a.type]}</strong>
                        <span className="block mb-1">{info.signification}</span>
                        <span className="block mb-1 text-muted">{info.calcul}</span>
                        <span className="block font-medium">{info.seuil}</span>
                        {peutConfigurer ? (
                          <Link
                            href={info.hrefParametre}
                            className="mt-1 inline-block underline"
                          >
                            Modifier le seuil
                          </Link>
                        ) : null}
                      </IndicateurInfo>
                      {!lue && !traitee && (
                        <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Nouveau
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-ink/80">{a.message}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {LABEL_TYPE_ALERTE[a.type]} · {formatDate(a.date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={a.href} className="btn btn-secondary !px-2 !py-1 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir
                    </Link>
                    {(a.type === "stock_reappro" || a.type === "stock_rupture") && (
                      <Link
                        href={`/demandes-prix?nouveau=1&produit=${encodeURIComponent(a.entiteId)}&pdv=${encodeURIComponent(a.pointDeVenteId ?? "")}&qte=${encodeURIComponent(String(a.quantiteSuggeree ?? 1))}&alerte=${encodeURIComponent(a.id)}`}
                        className="btn btn-primary !px-2 !py-1 text-xs"
                      >
                        Créer une DP
                      </Link>
                    )}
                    {traitee ? (
                      <button
                        type="button"
                        className="btn btn-secondary !px-2 !py-1 text-xs"
                        onClick={() => marquerAlerte(a.id, "rouvrir")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Rouvrir
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary !px-2 !py-1 text-xs"
                          onClick={() =>
                            marquerAlerte(a.id, lue ? "nonlue" : "lue")
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          {lue ? "Non lue" : "Lu"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary !px-2 !py-1 text-xs"
                          onClick={() => marquerAlerte(a.id, "traitee")}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Traiter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {module && !peutConfigurer ? (
        <p className="mt-4 text-xs text-muted">
          Les réglages de seuils sont réservés à l&apos;administrateur.
        </p>
      ) : null}
    </div>
  );
}
