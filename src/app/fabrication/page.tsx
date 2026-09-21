"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Factory, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SelecteurClient } from "@/components/selecteur-client";
import { StatCard } from "@/components/stat-card";
import { DESTINATION_ACHAT_LABELS } from "@/lib/achats";
import { COMMANDE_STATUTS, libelleClient } from "@/lib/commercial";
import {
  ateliersVisibles,
  OF_STATUT_LABELS,
  quantiteProduite,
} from "@/lib/fabrication";
import { formatDate, formatNumber } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import { produitEstFabrique } from "@/lib/nature-stock";
import { nomenclatureParType } from "@/lib/nomenclature";
import {
  dimensionDepuisCommande,
  motifDimensionNomenclatureManquante,
  nomenclatureExigeDimension,
  perimetreVenteM,
  surfaceVenteM2,
} from "@/lib/nomenclature-formules";
import { libelleProduit } from "@/lib/produits";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import { BAT_STATUTS, badgeBat, batCourant, commandeABatValide } from "@/lib/bat";
import { BadgeDelai } from "@/components/badge-delai";
import { etatDelaiOf } from "@/lib/delais-alerte";
import type {
  DestinationAchat,
  OrdreFabricationStatut,
  TypeNomenclature,
} from "@/lib/types";

const OF_BROUILLON_KEY = "negoo.of.creation";

type BrouillonOf = {
  atelierId: string;
  produitId: string;
  qte: string;
  source: TypeNomenclature;
  cloturePrevue: string;
  largeur: string;
  hauteur: string;
  destination: DestinationAchat | "";
  clientId: string;
  commandeId: string;
};

function lireBrouillonOf(): BrouillonOf | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(OF_BROUILLON_KEY);
    return raw ? (JSON.parse(raw) as BrouillonOf) : null;
  } catch {
    return null;
  }
}

function sauverBrouillonOf(b: BrouillonOf) {
  sessionStorage.setItem(OF_BROUILLON_KEY, JSON.stringify(b));
}

function viderBrouillonOf() {
  sessionStorage.removeItem(OF_BROUILLON_KEY);
}

function badgeOf(statut: OrdreFabricationStatut) {
  if (statut === "cloture") return "badge-success";
  if (statut === "en_cours") return "badge-sand";
  if (statut === "annule" || statut === "cloture_annule") return "badge-danger";
  return "badge-sea";
}

export default function FabricationPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
      <FabricationListe />
    </Suspense>
  );
}

function FabricationListe() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ordresFabrication, produits, commandes, creerOrdreFabrication, bonsATirer, parametresAlertes } = useStore();
  const { visibles, rattache, actif } = useSitesVisibles();
  const ateliers = ateliersVisibles(visibles, rattache);
  const [creer, setCreer] = useState(
    () =>
      searchParams.get("creer") === "1" || Boolean(searchParams.get("commandeId")),
  );

  useEffect(() => {
    if (
      searchParams.get("creer") === "1" ||
      searchParams.get("commandeId")
    ) {
      setCreer(true);
    }
  }, [searchParams]);

  const liste = useMemo(
    () =>
      [...ordresFabrication]
        .filter(
          (o) =>
            rattache(o.atelierId) &&
            (actif === "tous" || o.atelierId === actif),
        )
        .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)),
    [ordresFabrication, rattache, actif],
  );

  const nomAtelier = (id: string) =>
    visibles.find((s) => s.id === id)?.nom ??
    useStore.getState().pointsDeVente.find((s) => s.id === id)?.nom ??
    "Atelier";

  return (
    <div>
      <PageHeader
        title="Ordres de fabrication"
        description="Consommation de matières et semi-finis, production valorisée au pot de coûts, sans écriture comptable. Les mouvements entre ateliers passent par les transferts de stock."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreer(true)}>
            <Plus className="h-4 w-4" />
            Nouvel OF
          </button>
        }
      />

      {creer && (
        <FormulaireOf
          ateliers={ateliers}
          defautAtelier={actif !== "tous" ? actif : ateliers[0]?.id ?? ""}
          onClose={() => setCreer(false)}
          onSubmit={(payload) => {
            const res = creerOrdreFabrication(payload);
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            viderBrouillonOf();
            setCreer(false);
            router.push(`/fabrication/${res.id}`);
          }}
        />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Brouillons" value={String(liste.filter((o) => o.statut === "brouillon").length)} />
        <StatCard label="En cours" value={String(liste.filter((o) => o.statut === "en_cours").length)} />
        <StatCard label="Clôturés" value={String(liste.filter((o) => o.statut === "cloture").length)} />
        <StatCard
          label="Annulés"
          value={String(liste.filter((o) => o.statut === "annule" || o.statut === "cloture_annule").length)}
        />
      </div>

      {liste.length === 0 ? (
        <EmptyState
          icon={<Factory className="h-5 w-5" />}
          title="Aucun ordre de fabrication"
          description="Déclarez d'abord des sites atelier, des nomenclatures sur les semi-finis / finis, puis créez un OF."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>N°</th>
                <th>Atelier</th>
                <th>Produit</th>
                <th>Qté prévue</th>
                <th>Produite</th>
                <th>Commande</th>
                <th>BAT</th>
                <th>Statut</th>
                <th>Créé</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((o) => {
                const p = produits.find((x) => x.id === o.produitId);
                const cmd = commandes.find((c) => c.id === o.commandeId);
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/fabrication/${o.id}`} className="font-semibold text-sea-800">
                        {o.numero}
                      </Link>
                    </td>
                    <td>{nomAtelier(o.atelierId)}</td>
                    <td>{p ? `${p.code} — ${libelleProduit(p)}` : "—"}</td>
                    <td>{formatNumber(o.quantitePrevue)}</td>
                    <td>{formatNumber(quantiteProduite(o))}</td>
                    <td>
                      {cmd?.numero ?? "—"}
                      {o.derogationBat && (
                        <span className="badge badge-sand ml-1">Dérog. BAT</span>
                      )}
                    </td>
                    <td>
                      {cmd ? (
                        <span
                          className={`badge ${
                            commandeABatValide(bonsATirer ?? [], cmd.id)
                              ? "badge-success"
                              : badgeBat(batCourant(bonsATirer ?? [], cmd.id)?.statut ?? "en_attente")
                          }`}
                        >
                          {commandeABatValide(bonsATirer ?? [], cmd.id)
                            ? "Validé"
                            : batCourant(bonsATirer ?? [], cmd.id)
                              ? BAT_STATUTS[batCourant(bonsATirer ?? [], cmd.id)!.statut]
                              : "Aucun"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className={`badge ${badgeOf(o.statut)}`}>
                        {OF_STATUT_LABELS[o.statut]}
                      </span>{" "}
                      <BadgeDelai etat={etatDelaiOf(o, parametresAlertes)} />
                    </td>
                    <td>{formatDate(o.dateCreation)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormulaireOf({
  ateliers,
  defautAtelier,
  onClose,
  onSubmit,
}: {
  ateliers: { id: string; nom: string }[];
  defautAtelier: string;
  onClose: () => void;
  onSubmit: (data: {
    atelierId: string;
    produitId: string;
    quantitePrevue: number;
    nomenclatureSource?: TypeNomenclature;
    commandeId?: string;
    dateCloturePrevue?: string;
    dimensionLargeur?: number;
    dimensionHauteur?: number;
  }) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogue = useStore((s) => s.produits);
  const commandesBrutes = useStore((s) => s.commandes);
  const clients = useStore((s) => s.clients ?? []);
  const produits = useMemo(
    () => (catalogue ?? []).filter((p) => p?.actif && produitEstFabrique(p)),
    [catalogue],
  );
  const commandes = useMemo(
    () =>
      (commandesBrutes ?? []).filter((c) => c.statut !== "annulee" && c.statut !== "livree"),
    [commandesBrutes],
  );
  const cmdUrl = searchParams.get("commandeId") ?? "";
  const clientUrl = searchParams.get("clientId") ?? "";
  const [atelierId, setAtelierId] = useState(defautAtelier);
  const [produitId, setProduitId] = useState(produits[0]?.id || "");
  const [qte, setQte] = useState("1");
  const [source, setSource] = useState<TypeNomenclature>("automatique");
  const [destination, setDestination] = useState<DestinationAchat | "">(
    cmdUrl ? "projet_client" : "",
  );
  const [clientId, setClientId] = useState(clientUrl);
  const [commandeId, setCommandeId] = useState(cmdUrl);
  const [cloturePrevue, setCloturePrevue] = useState("");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");

  useEffect(() => {
    const b = lireBrouillonOf();
    const cmdId = searchParams.get("commandeId");
    const cliId = searchParams.get("clientId");
    if (b) {
      if (b.atelierId) setAtelierId(b.atelierId);
      if (b.produitId) setProduitId(b.produitId);
      if (b.qte) setQte(b.qte);
      if (b.source) setSource(b.source);
      if (b.cloturePrevue) setCloturePrevue(b.cloturePrevue);
      if (b.largeur) setLargeur(b.largeur);
      if (b.hauteur) setHauteur(b.hauteur);
      if (!cmdId) {
        setDestination(b.destination || "");
        if (b.clientId) setClientId(b.clientId);
        if (b.commandeId) setCommandeId(b.commandeId);
      }
    }
    if (cliId) setClientId(cliId);
    if (!cmdId) return;
    const cmd = (useStore.getState().commandes ?? []).find((c) => c.id === cmdId);
    setCommandeId(cmd?.id ?? cmdId);
    if (cmd?.clientId) setClientId(cmd.clientId);
    setDestination("projet_client");
    // Restauration unique au montage / au retour commande — pas à chaque sync métier.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const produit = produits.find((p) => p.id === produitId);
  const alt = produit ? nomenclatureParType(produit, "alternative") : undefined;
  const nomenc = produit ? nomenclatureParType(produit, source) : undefined;
  const exigeDim = nomenclatureExigeDimension(nomenc?.lignes ?? []);
  const commande = commandes.find((c) => c.id === commandeId);
  const commandesDuClient = commandes.filter((c) => c.clientId === clientId);
  const dimCmd =
    commandeId && produitId
      ? dimensionDepuisCommande(commande, produitId)
      : null;
  const L = dimCmd?.largeur ?? (Number(largeur) || 0);
  const H = dimCmd?.hauteur ?? (Number(hauteur) || 0);
  const motifDim = exigeDim
    ? motifDimensionNomenclatureManquante(nomenc?.lignes ?? [], L, H)
    : null;

  function snapshotBrouillon(): BrouillonOf {
    return {
      atelierId,
      produitId,
      qte,
      source,
      cloturePrevue,
      largeur,
      hauteur,
      destination,
      clientId,
      commandeId,
    };
  }

  function allerVersCommande() {
    if (!clientId) {
      alert("Choisissez d'abord le client du projet.");
      return;
    }
    sauverBrouillonOf(snapshotBrouillon());
    router.push(
      `/commandes?clientId=${encodeURIComponent(clientId)}&retour=of`,
    );
  }

  function onForm(e: FormEvent) {
    e.preventDefault();
    if (!atelierId || !produitId) return;
    if (!destination) {
      alert("Indiquez si c'est un projet client ou un approvisionnement stock.");
      return;
    }
    if (destination === "projet_client") {
      if (!clientId) {
        alert("Choisissez ou recherchez le client du projet.");
        return;
      }
      if (!commandeId) {
        if (commandesDuClient.length === 0) {
          allerVersCommande();
          return;
        }
        alert("Sélectionnez la commande client, ou créez-en une.");
        return;
      }
    }
    if (motifDim) {
      alert(motifDim);
      return;
    }
    onSubmit({
      atelierId,
      produitId,
      quantitePrevue: Number(qte) || 0,
      nomenclatureSource: source,
      commandeId:
        destination === "projet_client" ? commandeId || undefined : undefined,
      dateCloturePrevue: cloturePrevue ? isoMidiDepuisJour(cloturePrevue) : undefined,
      dimensionLargeur: L > 0 ? L : undefined,
      dimensionHauteur: H > 0 ? H : undefined,
    });
  }

  return (
    <form
      onSubmit={onForm}
      className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5"
    >
      <h2 className="mb-4 font-display text-lg font-semibold">Nouvel ordre de fabrication</h2>
      {ateliers.length === 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Aucun atelier rattaché. Créez un site de type Atelier ou Atelier final dans
          Paramètres → Fabrication ou Général → Points de vente.
        </p>
      )}
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-muted">
          Atelier
          <select
            className="select mt-1"
            value={atelierId}
            onChange={(e) => setAtelierId(e.target.value)}
            required
          >
            <option value="">—</option>
            {ateliers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Produit à fabriquer
          <select
            className="select mt-1"
            value={produitId}
            onChange={(e) => {
              setProduitId(e.target.value);
              setSource("automatique");
            }}
            required
          >
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {libelleProduit(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Quantité prévue
          <input
            type="number"
            min={0}
            step="any"
            className="input mt-1"
            value={qte}
            onChange={(e) => setQte(e.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Nomenclature
          <select
            className="select mt-1"
            value={source}
            onChange={(e) => setSource(e.target.value as TypeNomenclature)}
          >
            <option value="automatique">Nomenclature standard</option>
            {alt && <option value="alternative">{alt.nom}</option>}
          </select>
        </label>
        <div className="min-w-0 sm:col-span-2">
          <p className="text-xs font-semibold text-muted">Destination</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <label className="inline-flex min-w-0 items-center gap-2 rounded-[var(--radius)] border border-line bg-card px-3 py-2">
              <input
                type="radio"
                name="destination-of"
                checked={destination === "projet_client"}
                onChange={() => setDestination("projet_client")}
              />
              {DESTINATION_ACHAT_LABELS.projet_client}
            </label>
            <label className="inline-flex min-w-0 items-center gap-2 rounded-[var(--radius)] border border-line bg-card px-3 py-2">
              <input
                type="radio"
                name="destination-of"
                checked={destination === "approvisionnement_stock"}
                onChange={() => {
                  setDestination("approvisionnement_stock");
                  setClientId("");
                  setCommandeId("");
                }}
              />
              {DESTINATION_ACHAT_LABELS.approvisionnement_stock}
            </label>
          </div>
        </div>
        {destination === "projet_client" && (
          <div className="sm:col-span-2 space-y-3">
            <SelecteurClient
              clients={clients}
              value={clientId}
              onChange={(id) => {
                setClientId(id);
                setCommandeId("");
              }}
            />
            {clientId && (
              <>
                {commandesDuClient.length > 0 ? (
                  <label className="block text-xs font-semibold text-muted">
                    Commande du client
                    <select
                      className="select mt-1"
                      value={commandeId}
                      onChange={(e) => setCommandeId(e.target.value)}
                    >
                      <option value="">— Choisir —</option>
                      {commandesDuClient.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.numero}
                          {COMMANDE_STATUTS[c.statut]
                            ? ` (${COMMANDE_STATUTS[c.statut]})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    Aucune commande ouverte pour{" "}
                    <strong>
                      {libelleClient(
                        clients.find((c) => c.id === clientId) ?? {
                          code: "",
                          nom: "ce client",
                        },
                      )}
                    </strong>
                    . Créez-la pour lier l&apos;OF au projet.
                  </p>
                )}
                <button
                  type="button"
                  className={`btn ${commandesDuClient.length > 0 ? "btn-secondary" : "btn-primary"}`}
                  onClick={allerVersCommande}
                >
                  <Plus className="h-4 w-4" />
                  {commandesDuClient.length > 0
                    ? "Créer une nouvelle commande"
                    : "Créer la commande de ce client"}
                </button>
              </>
            )}
          </div>
        )}
        <label className="block text-xs font-semibold text-muted">
          Clôture prévue
          <input
            type="date"
            className="input mt-1"
            value={cloturePrevue}
            onChange={(e) => setCloturePrevue(e.target.value)}
            min={jourLocalISO()}
          />
        </label>
        {dimCmd ? (
          <p className="sm:col-span-2 rounded-lg bg-sea-50 px-3 py-2 text-sm text-sea-950">
            Dimension reprise de la commande {commande?.numero} :{" "}
            {L.toLocaleString("fr-FR")} × {H.toLocaleString("fr-FR")} m
            {exigeDim && (
              <>
                {" "}
                (surface {surfaceVenteM2(L, H).toLocaleString("fr-FR")} m², périmètre{" "}
                {perimetreVenteM(L, H).toLocaleString("fr-FR")} m)
              </>
            )}
            . Pas de ressaisie.
          </p>
        ) : (
          <>
            <label className="block text-xs font-semibold text-muted">
              Largeur (m){exigeDim ? " — obligatoire" : " — si besoin matière"}
              <input
                type="number"
                min={0}
                step="any"
                className="input mt-1"
                value={largeur}
                onChange={(e) => setLargeur(e.target.value)}
                required={exigeDim}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Hauteur (m){exigeDim ? " — obligatoire" : ""}
              <input
                type="number"
                min={0}
                step="any"
                className="input mt-1"
                value={hauteur}
                onChange={(e) => setHauteur(e.target.value)}
                required={exigeDim}
              />
            </label>
          </>
        )}
        {motifDim && (
          <p className="sm:col-span-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {motifDim}
          </p>
        )}
        {commandeId && !dimCmd && exigeDim && (
          <p className="sm:col-span-2 text-xs text-muted">
            La commande liée n&apos;a pas de largeur × hauteur sur une ligne de ce
            produit : saisissez la dimension manuellement.
          </p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={ateliers.length === 0 || Boolean(motifDim)}>
          Créer le brouillon
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
