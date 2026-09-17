"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { PastilleCompteManquant } from "@/components/avertissement-compte-produit";
import { ParametresSectionFrame } from "@/components/parametres-subnav";
import { useAuthStore } from "@/lib/auth-store";
import { atelierSansTauxMod, tauxHoraireModAtelier } from "@/lib/fabrication";
import { formatCurrency } from "@/lib/format";
import { siteEstAtelier } from "@/lib/sites";
import { useStore } from "@/lib/store";

export default function ParametresFabricationPage() {
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const updatePointDeVente = useStore((s) => s.updatePointDeVente);
  const peutGerer = useAuthStore((s) => s.hasPermission("parametres.gerer"));
  const ateliers = useMemo(
    () => pointsDeVente.filter((s) => s.actif && siteEstAtelier(s)),
    [pointsDeVente],
  );
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const [capacites, setCapacites] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);

  function valeurChamp(id: string, actuel?: number) {
    if (brouillons[id] !== undefined) return brouillons[id];
    return actuel && actuel > 0 ? String(actuel) : "";
  }

  function valeurCapa(id: string, actuel?: number) {
    if (capacites[id] !== undefined) return capacites[id];
    return actuel && actuel > 0 ? String(actuel) : "";
  }

  function enregistrer(id: string) {
    const atelier = ateliers.find((a) => a.id === id);
    const taux = Math.max(0, Number(valeurChamp(id, atelier?.tauxHoraireMod)) || 0);
    const capa = Math.max(
      0,
      Number(valeurCapa(id, atelier?.capaciteOfSimultanes)) || 0,
    );
    updatePointDeVente(id, {
      tauxHoraireMod: taux,
      capaciteOfSimultanes: capa,
    });
    setBrouillons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCapacites((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSavedId(id);
    setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
  }

  return (
    <ParametresSectionFrame sectionId="fabrication">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/parametres/produits"
          className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
        >
          <p className="font-display text-base font-semibold text-ink">
            Nomenclatures par défaut
          </p>
          <p className="mt-1 text-xs text-muted">
            Nomenclature automatique et alternative sur les fiches semi-finis et
            finis du catalogue.
          </p>
        </Link>
        <Link
          href="/parametres/points-de-vente"
          className="rounded-[var(--radius)] border border-line bg-card p-4 transition-shadow hover:border-sea-300 hover:shadow-md"
        >
          <p className="font-display text-base font-semibold text-ink">
            Ateliers
          </p>
          <p className="mt-1 text-xs text-muted">
            Sites dont le rôle inclut atelier ou atelier final. Les mouvements
            entre ateliers passent par les transferts de stock.
          </p>
        </Link>
      </div>

      <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Taux horaire MOD et capacité par atelier
        </h2>
        <p className="mt-1 text-xs text-muted">
          Taux figé sur les lignes MOD déjà saisies. Capacité = nombre maximal
          d&apos;OF ouverts simultanément (alerte de surcharge).
        </p>

        {ateliers.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Aucun atelier actif. Créez un site avec le rôle atelier dans{" "}
            <Link href="/parametres/points-de-vente" className="text-sea-800 underline">
              Paramètres → Sites
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {ateliers.map((atelier) => {
              const manque = atelierSansTauxMod(atelier);
              const actuel = tauxHoraireModAtelier(atelier);
              return (
                <div
                  key={atelier.id}
                  className="rounded-lg border border-line px-4 py-3"
                >
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[10rem] flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        {atelier.nom}
                        {manque ? <PastilleCompteManquant /> : null}
                      </p>
                      {manque ? (
                        <p className="mt-1 flex items-start gap-1 text-xs text-amber-800">
                          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Taux non renseigné : la saisie MOD reste possible, au
                          coût 0.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted">
                          Actuel : {formatCurrency(actuel)} / h
                        </p>
                      )}
                    </div>
                    <label className="block text-xs font-semibold text-muted">
                      Taux horaire MOD (Ar / h)
                      <input
                        type="number"
                        min={0}
                        step={100}
                        className="input mt-1 w-40"
                        disabled={!peutGerer}
                        value={valeurChamp(atelier.id, atelier.tauxHoraireMod)}
                        onChange={(e) =>
                          setBrouillons((prev) => ({
                            ...prev,
                            [atelier.id]: e.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-muted">
                      Capacité (OF simultanés)
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="input mt-1 w-36"
                        disabled={!peutGerer}
                        value={valeurCapa(atelier.id, atelier.capaciteOfSimultanes)}
                        onChange={(e) =>
                          setCapacites((prev) => ({
                            ...prev,
                            [atelier.id]: e.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </label>
                    {peutGerer && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => enregistrer(atelier.id)}
                      >
                        Enregistrer
                      </button>
                    )}
                    {savedId === atelier.id && (
                      <span className="text-xs text-sea-800">Enregistré</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-4 rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Règles de clôture d&apos;OF
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
          <li>Seuls les OF en cours, sur un atelier auquel vous êtes rattaché, peuvent être clôturés.</li>
          <li>
            Les reliquats de matières sont retournés à l&apos;atelier ou vers un
            autre site au moment de la clôture.
          </li>
          <li>
            Un écart de fabrication est enregistré si la valeur consommée
            dépasse la production, avec motif optionnel.
          </li>
          <li>
            Après clôture, l&apos;OF est verrouillé : plus aucun mouvement de
            matières ni d&apos;entrée en stock. Les taux MOD déjà saisis restent
            figés.
          </li>
        </ul>
      </section>
    </ParametresSectionFrame>
  );
}
