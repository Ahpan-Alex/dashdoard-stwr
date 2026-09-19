"use client";

import {
  BAT_STATUTS,
  badgeBat,
  batEnRetardRelance,
  courantCouvrantLigne,
  lignesProduitCommande,
  statutBatLigne,
} from "@/lib/bat";
import type { BonATirer, Commande } from "@/lib/types";

export function LignesCommandeBat({
  commande,
  bats,
  delaiRelanceJours = 7,
}: {
  commande: Commande;
  bats: BonATirer[];
  delaiRelanceJours?: number;
}) {
  const lignes = lignesProduitCommande(commande);
  if (lignes.length === 0) return null;
  return (
    <div className="mt-3 overflow-x-auto rounded-[var(--radius)] border border-line bg-card no-print">
      <p className="border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Lignes de commande — statut BAT
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>Ligne</th>
            <th>BAT</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const st = statutBatLigne(bats, commande, l.id);
            const courant = courantCouvrantLigne(bats, commande, l.id);
            return (
              <tr key={l.id}>
                <td>
                  {l.designation || l.codeProduit || l.produitId}
                  {l.quantite ? (
                    <span className="ml-1 text-xs text-muted">
                      × {l.quantite}
                    </span>
                  ) : null}
                </td>
                <td>
                  {st ? (
                    <>
                      <span className={`badge ${badgeBat(st)}`}>
                        {BAT_STATUTS[st]}
                      </span>
                      {courant &&
                        batEnRetardRelance(courant, delaiRelanceJours) && (
                          <span className="badge badge-danger ml-1">
                            Relance
                          </span>
                        )}
                    </>
                  ) : (
                    <span className="text-xs text-muted">Aucun BAT</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
