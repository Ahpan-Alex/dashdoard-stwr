"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SaisieLignesPaiement } from "@/components/saisie-lignes-paiement";
import {
  facturesOuvertesFournisseur,
  sommeSoldes,
  totalVentilation,
  ventilerParAnciennete,
} from "@/lib/lots-paiement";
import { soldeAchat, totauxAchat } from "@/lib/achats";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { SaisieLignePaiement } from "@/lib/tresorerie";

export default function NouveauLotPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
      <NouveauLot />
    </Suspense>
  );
}

function NouveauLot() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const achats = useStore((s) => s.achats);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const creer = useStore((s) => s.creerLotPaiementFournisseur);
  const preselect = searchParams.get("fournisseur") ?? "";
  const [fournisseurId, setFournisseurId] = useState(preselect);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [montantSaisi, setMontantSaisi] = useState("");
  const [ventilations, setVentilations] = useState<Record<string, string>>({});
  const [montantManuel, setMontantManuel] = useState(false);
  const [ventManuel, setVentManuel] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const ouvertes = useMemo(
    () => (fournisseurId ? facturesOuvertesFournisseur(achats, fournisseurId) : []),
    [achats, fournisseurId],
  );
  const selectionnees = useMemo(
    () => ouvertes.filter((a) => selection.has(a.id)),
    [ouvertes, selection],
  );
  const sommeSelection = sommeSoldes(selectionnees);
  const montant = Math.round(Number(montantSaisi) || 0);

  useEffect(() => {
    if (preselect) setFournisseurId(preselect);
  }, [preselect]);

  useEffect(() => {
    if (!ventManuel) {
      const auto = ventilerParAnciennete(selectionnees, montant || sommeSelection);
      const next: Record<string, string> = {};
      for (const a of selectionnees) {
        const v = auto.find((x) => x.achatId === a.id);
        next[a.id] = v ? String(v.montant) : "0";
      }
      setVentilations(next);
    }
  }, [ventManuel, montant, sommeSelection, selectionnees]);

  function toggle(id: string) {
    setVentManuel(false);
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toutSelectionner() {
    setVentManuel(false);
    setSelection(new Set(ouvertes.map((a) => a.id)));
  }

  useEffect(() => {
    if (!montantManuel) {
      setMontantSaisi(sommeSelection > 0 ? String(Math.round(sommeSelection)) : "");
    }
  }, [sommeSelection, montantManuel]);

  const listeVentil = selectionnees.map((a) => ({
    achatId: a.id,
    montant: Math.round(Number(ventilations[a.id]) || 0),
  }));
  const totalVent = totalVentilation(listeVentil);
  const ecart = Math.round(montant) - totalVent;

  function valider(lignes: SaisieLignePaiement[]) {
    setErreur(null);
    const res = creer({
      fournisseurId,
      montant,
      lignes,
      ventilations: listeVentil.filter((v) => v.montant > 0),
    });
    if (!res.ok) {
      setErreur(res.reason);
      return;
    }
    router.push(`/achats/lots/${res.id}`);
  }

  const frn = fournisseurs.find((f) => f.id === fournisseurId);

  return (
    <div>
      <Link href="/achats/lots" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Lots
      </Link>
      <PageHeader
        title="Nouveau paiement groupé"
        description="Sélectionnez des factures ouvertes, ajustez la ventilation, puis saisissez les modes de paiement du lot."
        showPosSelector={false}
      />

      <div className="mb-6 max-w-md">
        <label className="text-xs font-semibold text-muted">
          Fournisseur
          <select
            className="select mt-1"
            value={fournisseurId}
            onChange={(e) => {
              setFournisseurId(e.target.value);
              setSelection(new Set());
              setMontantManuel(false);
              setVentManuel(false);
              setMontantSaisi("");
            }}
          >
            <option value="">Choisir…</option>
            {fournisseurs
              .filter((f) => f.actif !== false)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
          </select>
        </label>
      </div>

      {fournisseurId && ouvertes.length === 0 && (
        <p className="text-sm text-muted">
          Aucune facture ouverte pour {frn?.nom ?? "ce fournisseur"}. Les avoirs déjà
          validés réduisent le solde restant dû avant constitution du lot.
        </p>
      )}

      {ouvertes.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              {selection.size} facture(s) · soldes {formatCurrency(sommeSelection)}
            </p>
            <button type="button" className="btn btn-secondary" onClick={toutSelectionner}>
              Tout sélectionner
            </button>
          </div>
          <div className="table-shell mb-6">
            <table className="data">
              <thead>
                <tr>
                  <th />
                  <th>N°</th>
                  <th>Date</th>
                  <th>Échéance</th>
                  <th>TTC</th>
                  <th>Solde dû</th>
                  <th>Ventilation</th>
                </tr>
              </thead>
              <tbody>
                {ouvertes.map((a) => {
                  const solde = soldeAchat(a);
                  const coche = selection.has(a.id);
                  return (
                    <tr key={a.id} className={coche ? "bg-sea-50/60" : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={coche}
                          onChange={() => toggle(a.id)}
                        />
                      </td>
                      <td className="font-medium">
                        <Link href={`/achats?id=${a.id}`} className="hover:underline">
                          {a.numeroFactureFournisseur?.trim() || a.numero}
                        </Link>
                      </td>
                      <td>{formatDate(a.date)}</td>
                      <td>{a.echeance ? formatDate(a.echeance) : "—"}</td>
                      <td>{formatCurrency(totauxAchat(a).ttc)}</td>
                      <td className="font-semibold">{formatCurrency(solde)}</td>
                      <td>
                        {coche ? (
                          <input
                            type="number"
                            min={0}
                            max={Math.round(solde)}
                            className="input w-28"
                            value={ventilations[a.id] ?? ""}
                            onChange={(e) => {
                              setVentManuel(true);
                              setVentilations((prev) => ({
                                ...prev,
                                [a.id]: e.target.value,
                              }));
                            }}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-muted">
              Montant du lot (Ar)
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={montantSaisi}
                onChange={(e) => {
                  setMontantManuel(true);
                  setVentManuel(false);
                  setMontantSaisi(e.target.value);
                }}
              />
            </label>
            <div className="text-sm">
              <p className="text-xs font-semibold text-muted">Ventilé</p>
              <p className="mt-2 font-semibold">{formatCurrency(totalVent)}</p>
            </div>
            <div className="text-sm">
              <p className="text-xs font-semibold text-muted">Écart</p>
              <p className={`mt-2 font-semibold ${ecart !== 0 ? "text-danger" : "text-sea-700"}`}>
                {formatCurrency(ecart)}
              </p>
            </div>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setVentManuel(false);
                const auto = ventilerParAnciennete(selectionnees, montant || sommeSelection);
                const next: Record<string, string> = {};
                for (const a of selectionnees) {
                  const v = auto.find((x) => x.achatId === a.id);
                  next[a.id] = v ? String(v.montant) : "0";
                }
                setVentilations(next);
              }}
            >
              Répartir par ancienneté
            </button>
            <p className="self-center text-xs text-muted">
              Plus ancienne soldée en premier (échéance, sinon date de facture).
            </p>
          </div>

          {selection.size > 0 && montant > 0 && Math.abs(ecart) <= 0 && (
            <div>
              <h2 className="mb-2 font-display text-lg font-semibold">
                Modes de paiement du lot
              </h2>
              <p className="mb-3 text-sm text-muted">
                Une seule combinaison de modes s&apos;applique à tout le lot. Fractionnement
                possible, référence facultative, chèque différé avec échéance.
              </p>
              {erreur && <p className="mb-3 text-sm text-danger">{erreur}</p>}
              <SaisieLignesPaiement
                key={`${fournisseurId}-${montant}`}
                montantPropose={montant}
                onValider={valider}
                submitLabel="Enregistrer le paiement groupé"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
