"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { createId } from "@/lib/id";
import { produitEstFabrique } from "@/lib/nature-stock";
import { sommeRepartitionsOf } from "@/lib/repartition-achat-of";
import { siteEstAtelier } from "@/lib/sites";
import { useStore } from "@/lib/store";
import type { AchatLigne, AchatRepartitionOf } from "@/lib/types";

type Props = {
  ligne: AchatLigne;
  siteDefaut: string;
  onChange: (r: AchatRepartitionOf[]) => void;
  lectureSeule?: boolean;
};

export function RepartitionOfLigne({
  ligne,
  siteDefaut,
  onChange,
  lectureSeule,
}: Props) {
  const ofs = useStore((s) => s.ordresFabrication);
  const produits = useStore((s) => s.produits);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const creerOf = useStore((s) => s.creerOrdreFabrication);
  const reps = ligne.repartitionsOf ?? [];
  const somme = sommeRepartitionsOf(ligne);
  const reliquat = Math.max(0, ligne.quantite - somme);
  const depassement = somme - ligne.quantite > 1e-6;
  const [ofId, setOfId] = useState("");
  const [qte, setQte] = useState("");
  const [creer, setCreer] = useState(false);
  const [atelierId, setAtelierId] = useState("");
  const [produitOfId, setProduitOfId] = useState("");
  const [qteOf, setQteOf] = useState("1");

  const ofsOuverts = useMemo(
    () =>
      ofs.filter(
        (o) => o.statut === "brouillon" || o.statut === "en_cours" || o.statut === "cloture",
      ),
    [ofs],
  );
  const ateliers = pointsDeVente.filter((p) => p.actif !== false && siteEstAtelier(p));
  const fabriques = produits.filter((p) => p.actif && produitEstFabrique(p));

  function nomOf(id: string) {
    const o = ofs.find((x) => x.id === id);
    if (!o) return "OF";
    const p = produits.find((x) => x.id === o.produitId);
    return `${o.numero}${p ? ` — ${p.code}` : ""}`;
  }

  function ajouter(idOf: string, quantite: number) {
    if (!idOf || !(quantite > 0)) return;
    const exist = reps.find((r) => r.ofId === idOf && (r.pointDeVenteId || siteDefaut) === siteDefaut);
    if (exist) {
      onChange(
        reps.map((r) =>
          r.id === exist.id ? { ...r, quantite: r.quantite + quantite } : r,
        ),
      );
    } else {
      onChange([
        ...reps,
        {
          id: createId("aof"),
          ofId: idOf,
          quantite,
          pointDeVenteId: siteDefaut,
        },
      ]);
    }
    setOfId("");
    setQte("");
  }

  function creerEtAffecter() {
    const res = creerOf({
      atelierId,
      produitId: produitOfId,
      quantitePrevue: Number(qteOf) || 0,
    });
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    ajouter(res.id, Number(qte) || reliquat || 1);
    setCreer(false);
  }

  if (lectureSeule) {
    if (reps.length === 0) {
      return <p className="text-xs text-muted">Stock libre (aucun OF)</p>;
    }
    return (
      <ul className="space-y-0.5 text-xs">
        {reps.map((r) => (
          <li key={r.id}>
            <Link href={`/fabrication/${r.ofId}`} className="text-sea-800 hover:underline">
              {nomOf(r.ofId)}
            </Link>
            {" : "}
            {formatNumber(r.quantite)}
          </li>
        ))}
        {reliquat > 1e-6 && (
          <li className="text-muted">Reliquat magasin : {formatNumber(reliquat)}</li>
        )}
      </ul>
    );
  }

  return (
    <div className="min-w-[16rem] space-y-1.5">
      {reps.map((r) => (
        <div key={r.id} className="flex items-center gap-1 text-xs">
          <Link href={`/fabrication/${r.ofId}`} className="flex-1 text-sea-800 hover:underline">
            {nomOf(r.ofId)}
          </Link>
          <input
            type="number"
            min={0}
            step="any"
            className="input w-20"
            value={r.quantite}
            onChange={(e) =>
              onChange(
                reps.map((x) =>
                  x.id === r.id ? { ...x, quantite: Number(e.target.value) || 0 } : x,
                ),
              )
            }
          />
          <button
            type="button"
            className="btn btn-secondary !px-2 !py-1"
            onClick={() => onChange(reps.filter((x) => x.id !== r.id))}
          >
            ×
          </button>
        </div>
      ))}
      <p className={`text-[11px] ${depassement ? "font-medium text-amber-800" : "text-muted"}`}>
        Affecté {formatNumber(somme)} / {formatNumber(ligne.quantite)}
        {reliquat > 1e-6 ? ` · libre ${formatNumber(reliquat)}` : ""}
        {depassement ? " — dépasse la ligne" : ""}
        {" · facultatif (pièces d'usure / achat imprévu : laisser libre)"}
      </p>
      <div className="flex flex-wrap items-end gap-1">
        <select
          className="select min-w-[8rem] flex-1"
          value={ofId}
          onChange={(e) => setOfId(e.target.value)}
        >
          <option value="">— OF —</option>
          {ofsOuverts.map((o) => (
            <option key={o.id} value={o.id}>
              {nomOf(o.id)}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          step="any"
          className="input w-20"
          placeholder="Qté"
          value={qte}
          onChange={(e) => setQte(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary !px-2 !py-1"
          onClick={() => ajouter(ofId, Number(qte) || reliquat)}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        className="text-[11px] text-sea-800 hover:underline"
        onClick={() => setCreer((v) => !v)}
      >
        {creer ? "Fermer" : "Créer un OF à la volée"}
      </button>
      {creer && (
        <div className="space-y-1 rounded-lg border border-line p-2">
          <select
            className="select"
            value={atelierId}
            onChange={(e) => setAtelierId(e.target.value)}
          >
            <option value="">Atelier</option>
            {ateliers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={produitOfId}
            onChange={(e) => setProduitOfId(e.target.value)}
          >
            <option value="">Produit fabriqué</option>
            {fabriques.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.libelleCourt}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            className="input"
            value={qteOf}
            onChange={(e) => setQteOf(e.target.value)}
            placeholder="Qté OF"
          />
          <button type="button" className="btn btn-primary w-full" onClick={creerEtAffecter}>
            Créer et affecter
          </button>
        </div>
      )}
    </div>
  );
}
