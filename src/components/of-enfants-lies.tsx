import Link from "next/link";
import type { LigneOfEnfant, StatutOfEnfant } from "@/lib/of-chaine";

const BADGE: Record<StatutOfEnfant, string> = {
  a_fabriquer: "badge-sea",
  en_fabrication: "badge-sand",
  pret_a_livrer: "badge-success",
  cloture: "badge-success",
  annule: "badge-danger",
};

export function OfEnfantsLies({ lignes }: { lignes: LigneOfEnfant[] }) {
  if (lignes.length === 0) return null;
  return (
    <section className="mb-6 rounded-[var(--radius)] border border-line bg-card p-5">
      <h2 className="mb-1 font-display text-lg font-semibold">OF enfants</h2>
      <p className="mb-3 text-xs text-muted">
        Ordres dont la sortie alimente la nomenclature de cet OF. Le transfert
        de stock entre ateliers reste le mouvement physique.
      </p>
      <ul className="space-y-2 text-sm">
        {lignes.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2">
            <Link href={l.href} className="font-semibold text-sea-800">
              {l.numero}
            </Link>
            <span>{l.produitLibelle}</span>
            <span className={`badge ${BADGE[l.statut]}`}>{l.statutLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AlerteOfEnfantsOuverts({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      {message}
    </p>
  );
}
