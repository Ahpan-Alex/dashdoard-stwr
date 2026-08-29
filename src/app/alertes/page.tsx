"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  RotateCcw,
  ShoppingCart,
  Boxes,
  ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  LABEL_CATEGORIE_ALERTE,
  LABEL_TYPE_ALERTE,
  type CategorieAlerte,
} from "@/lib/alertes";
import { useAuthStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useAlertes } from "@/lib/use-alertes";

type Filtre = CategorieAlerte | "toutes" | "traitees";

const FILTRES: { id: Filtre; label: string }[] = [
  { id: "toutes", label: "Actives" },
  { id: "achat", label: LABEL_CATEGORIE_ALERTE.achat },
  { id: "vente", label: LABEL_CATEGORIE_ALERTE.vente },
  { id: "stock", label: LABEL_CATEGORIE_ALERTE.stock },
  { id: "traitees", label: "Traitées" },
];

function iconeCategorie(cat: CategorieAlerte) {
  if (cat === "achat") return ShoppingCart;
  if (cat === "vente") return ScrollText;
  return Boxes;
}

function classeGravite(g: "info" | "warning" | "danger") {
  if (g === "danger") return "border-rose-200 bg-rose-50";
  if (g === "warning") return "border-amber-200 bg-amber-50";
  return "border-sea-200 bg-sea-50";
}

export default function AlertesPage() {
  const { actives, traitees, nonLues, suivi, parCategorie } = useAlertes();
  const marquerAlerte = useStore((s) => s.marquerAlerte);
  const peutConfigurer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const liste = useMemo(() => {
    if (filtre === "traitees") return traitees;
    if (filtre === "toutes") return actives;
    return parCategorie(filtre);
  }, [filtre, actives, traitees, parCategorie]);

  return (
    <div>
      <PageHeader
        title="Alertes"
        description="Échéances d'achat et de vente, reliquats de livraison et seuils de stock. Notifications internes uniquement."
        actions={
          peutConfigurer ? (
            <Link href="/reglages/alertes" className="btn btn-secondary">
              Configurer
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Actives</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {actives.length}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Non lues</p>
          <p className="mt-1 font-display text-2xl font-semibold text-rose-700">
            {nonLues.length}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs text-muted">Traitées</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {traitees.length}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filtre === f.id ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setFiltre(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {liste.length === 0 ? (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-dashed border-line bg-card px-5 py-10 text-sm text-muted">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 opacity-50" />
          <p>
            {filtre === "traitees"
              ? "Aucune alerte traitée."
              : "Aucune alerte pour ce filtre. Les seuils stock se règlent sur chaque fiche produit ; les délais se configurent dans Réglages → Alertes."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {liste.map((a) => {
            const Icon = iconeCategorie(a.categorie);
            const lue = suivi.lues.includes(a.id);
            const traitee = suivi.traitees.includes(a.id);
            return (
              <li
                key={a.id}
                className={`rounded-[var(--radius)] border px-4 py-3 ${classeGravite(a.gravite)} ${
                  lue && !traitee ? "opacity-80" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-ink">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {a.titre}
                        {!lue && !traitee && (
                          <span className="ml-2 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Nouveau
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm text-ink/80">{a.message}</p>
                      <p className="mt-1 text-[11px] text-muted">
                        {LABEL_TYPE_ALERTE[a.type]} · {formatDate(a.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={a.href} className="btn btn-secondary !px-2 !py-1 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir
                    </Link>
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
    </div>
  );
}
