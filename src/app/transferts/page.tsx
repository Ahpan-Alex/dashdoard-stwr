"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { isoMidiDepuisJour, jourLocalISO } from "@/lib/inventaire";
import { etatCumpProduit } from "@/lib/cump";
import { libelleProduit } from "@/lib/produits";
import { STATUT_TRANSFERT_LABELS } from "@/lib/transferts";
import { BadgeDelai } from "@/components/badge-delai";
import { etatDelaiTransfert } from "@/lib/delais-alerte";
import { useSitesVisibles } from "@/lib/use-sites-visibles";
import { useStore } from "@/lib/store";
import type {
  EntreeStock,
  Inventaire,
  Produit,
  TransfertStock,
  TransfertStockLigne,
  Vente,
} from "@/lib/types";

function badgeTransfert(statut: TransfertStock["statut"]) {
  if (statut === "recu") return "badge-success";
  if (statut === "expedie") return "badge-sand";
  if (statut === "annule") return "badge-danger";
  return "badge-sea";
}

export default function TransfertsPage() {
  const {
    transfertsStock,
    produits,
    entrees,
    ventes,
    inventaires,
    demanderTransfert,
    expedierTransfert,
    receptionnerTransfert,
    annulerTransfert,
  } = useStore();
  const { visibles, rattache, actif } = useSitesVisibles();
  const tousSites = useStore((s) => s.pointsDeVente);
  const parametresAlertes = useStore((s) => s.parametresAlertes);
  const nomSite = (id: string) =>
    visibles.find((s) => s.id === id)?.nom ??
    useStore.getState().pointsDeVente.find((s) => s.id === id)?.nom ??
    "Site";

  const [creer, setCreer] = useState(false);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const selection = transfertsStock.find((t) => t.id === selectionId);

  const visiblesListe = useMemo(() => {
    return [...transfertsStock]
      .filter(
        (t) =>
          (rattache(t.siteSourceId) || rattache(t.siteDestinataireId)) &&
          (actif === "tous" ||
            t.siteSourceId === actif ||
            t.siteDestinataireId === actif),
      )
      .sort((a, b) => b.dateDemande.localeCompare(a.dateDemande));
  }, [transfertsStock, actif, rattache]);

  if (selection) {
    return (
      <TransfertDetail
        transfert={selection}
        nomSite={nomSite}
        rattache={rattache}
        onBack={() => setSelectionId(null)}
        onExpedier={() => {
          const res = expedierTransfert(selection.id);
          if (!res.ok) alert(res.reason);
        }}
        onReceptionner={() => {
          const res = receptionnerTransfert(selection.id);
          if (!res.ok) alert(res.reason);
        }}
        onAnnuler={() => {
          if (!confirm("Annuler ce transfert ?")) return;
          const res = annulerTransfert(selection.id);
          if (!res.ok) alert(res.reason);
          else setSelectionId(null);
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Transferts de stock"
        description="Mouvements entre sites après réception : demande, expédition, puis validation au destinataire. Le stock arrive au CUMP du site source."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/transferts/historique" className="btn btn-secondary">
              Historique par article
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setCreer(true)}>
              <Plus className="h-4 w-4" />
              Nouveau transfert
            </button>
          </div>
        }
      />

      {creer && (
        <FormulaireTransfert
          sitesSource={visibles.filter((s) => s.actif && rattache(s.id))}
          sitesDest={tousSites.filter((s) => s.actif)}
          produits={produits.filter((p) => p.actif)}
          rattache={rattache}
          defautSource={actif !== "tous" ? actif : visibles.find((s) => rattache(s.id))?.id ?? ""}
          entrees={entrees}
          ventes={ventes}
          inventaires={inventaires}
          onClose={() => setCreer(false)}
          onSubmit={(payload) => {
            const res = demanderTransfert(payload);
            if (!res.ok) {
              alert(res.reason);
              return;
            }
            setCreer(false);
            if (res.id) setSelectionId(res.id);
          }}
        />
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Demandes"
          value={String(visiblesListe.filter((t) => t.statut === "demande").length)}
        />
        <StatCard
          label="En transit"
          value={String(visiblesListe.filter((t) => t.statut === "expedie").length)}
        />
        <StatCard
          label="Reçus"
          value={String(visiblesListe.filter((t) => t.statut === "recu").length)}
        />
      </div>

      {visiblesListe.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="Aucun transfert"
          description="Les transferts déplacent du stock déjà reçu d’un site vers un autre. La répartition d’un achat se fait sur la facture fournisseur, pas ici."
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Source</th>
                <th>Destinataire</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visiblesListe.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.numero}</td>
                  <td>{formatDate(t.dateDemande)}</td>
                  <td>{nomSite(t.siteSourceId)}</td>
                  <td>{nomSite(t.siteDestinataireId)}</td>
                  <td>
                    <span className={`badge ${badgeTransfert(t.statut)}`}>
                      {STATUT_TRANSFERT_LABELS[t.statut]}
                    </span>{" "}
                    <BadgeDelai etat={etatDelaiTransfert(t, parametresAlertes)} />
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectionId(t.id)}
                    >
                      Ouvrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormulaireTransfert({
  sitesSource,
  sitesDest,
  produits,
  rattache,
  defautSource,
  entrees,
  ventes,
  inventaires,
  onClose,
  onSubmit,
}: {
  sitesSource: { id: string; nom: string }[];
  sitesDest: { id: string; nom: string }[];
  produits: Produit[];
  rattache: (id: string) => boolean;
  defautSource: string;
  entrees: EntreeStock[];
  ventes: Vente[];
  inventaires: Inventaire[];
  onClose: () => void;
  onSubmit: (data: {
    siteSourceId: string;
    siteDestinataireId: string;
    dateDemande: string;
    lignes: TransfertStockLigne[];
    note?: string;
  }) => void;
}) {
  const [source, setSource] = useState(defautSource);
  const [dest, setDest] = useState(
    sitesDest.find((s) => s.id !== defautSource)?.id ?? "",
  );
  const [date, setDate] = useState(jourLocalISO());
  const [note, setNote] = useState("");
  const [lignes, setLignes] = useState<TransfertStockLigne[]>([]);
  const [produitId, setProduitId] = useState(produits[0]?.id ?? "");
  const tousProduits = useStore((s) => s.produits);

  function ajouter() {
    if (!produitId || lignes.some((l) => l.produitId === produitId)) return;
    setLignes([...lignes, { produitId, quantite: 1 }]);
  }

  function envoyer(e: FormEvent) {
    e.preventDefault();
    if (!rattache(source)) {
      alert("Vous devez être rattaché au site source pour initier un transfert.");
      return;
    }
    onSubmit({
      siteSourceId: source,
      siteDestinataireId: dest,
      dateDemande: isoMidiDepuisJour(date),
      lignes,
      note: note.trim() || undefined,
    });
  }

  return (
    <form
      onSubmit={envoyer}
      className="mb-6 rounded-[var(--radius)] border border-sea-200 bg-card p-5"
    >
      <h2 className="mb-4 font-display text-lg font-semibold">Nouveau transfert</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-semibold text-muted">
          Site source
          <select
            className="select mt-1"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
          >
            <option value="">—</option>
            {sitesSource.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Site destinataire
          <select
            className="select mt-1"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            required
          >
            <option value="">—</option>
            {sitesDest
              .filter((s) => s.id !== source)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Date de la demande
          <input
            type="date"
            className="input mt-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block text-xs font-semibold text-muted">
          Article
          <select
            className="select mt-1 min-w-[16rem]"
            value={produitId}
            onChange={(e) => setProduitId(e.target.value)}
          >
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {libelleProduit(tousProduits.find((x) => x.id === p.id) ?? p)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-secondary" onClick={ajouter}>
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      <div className="table-shell mt-4">
        <table className="data">
          <thead>
            <tr>
              <th>Article</th>
              <th>Quantité</th>
              <th>CUMP source (indicatif)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  Aucun article.
                </td>
              </tr>
            ) : (
              lignes.map((l) => {
                const p = tousProduits.find((x) => x.id === l.produitId);
                const cump = p && source
                  ? etatCumpProduit({
                      produitId: l.produitId,
                      pointDeVenteId: source,
                      entrees,
                      ventes,
                      inventaires,
                      produit: p,
                    }).cump
                  : 0;
                return (
                  <tr key={l.produitId}>
                    <td>{p ? libelleProduit(p) : l.produitId}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="input w-24"
                        value={l.quantite}
                        onChange={(e) =>
                          setLignes(
                            lignes.map((x) =>
                              x.produitId === l.produitId
                                ? { ...x, quantite: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>{formatCurrency(cump)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          setLignes(lignes.filter((x) => x.produitId !== l.produitId))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <label className="mt-4 block text-xs font-semibold text-muted">
        Note
        <textarea
          className="input mt-1 min-h-[3rem]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary">
          Enregistrer la demande
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function TransfertDetail({
  transfert,
  nomSite,
  rattache,
  onBack,
  onExpedier,
  onReceptionner,
  onAnnuler,
}: {
  transfert: TransfertStock;
  nomSite: (id: string) => string;
  rattache: (id: string) => boolean;
  onBack: () => void;
  onExpedier: () => void;
  onReceptionner: () => void;
  onAnnuler: () => void;
}) {
  const produits = useStore((s) => s.produits);
  const peutSource = rattache(transfert.siteSourceId);
  const peutDest = rattache(transfert.siteDestinataireId);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-muted hover:text-ink"
      >
        ← Retour aux transferts
      </button>
      <PageHeader
        title={transfert.numero}
        description={`${nomSite(transfert.siteSourceId)} → ${nomSite(transfert.siteDestinataireId)}`}
        showPosSelector={false}
        actions={
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${badgeTransfert(transfert.statut)}`}>
              {STATUT_TRANSFERT_LABELS[transfert.statut]}
            </span>
            {transfert.statut === "demande" && peutSource && (
              <button type="button" className="btn btn-primary" onClick={onExpedier}>
                Expédier
              </button>
            )}
            {transfert.statut === "expedie" && peutDest && (
              <button type="button" className="btn btn-primary" onClick={onReceptionner}>
                Réceptionner
              </button>
            )}
            {transfert.statut !== "annule" && transfert.statut !== "recu" && peutSource && (
              <button type="button" className="btn btn-secondary" onClick={onAnnuler}>
                Annuler
              </button>
            )}
            {transfert.statut === "recu" && (peutSource || peutDest) && (
              <button type="button" className="btn btn-secondary" onClick={onAnnuler}>
                Annuler (contre-passation)
              </button>
            )}
          </div>
        }
      />

      <p className="mb-4 text-sm text-muted">
        Demande du {formatDate(transfert.dateDemande)}
        {transfert.demandeParNom ? ` · ${transfert.demandeParNom}` : ""}
        {transfert.dateExpedition
          ? ` · expédié le ${formatDate(transfert.dateExpedition)}`
          : ""}
        {transfert.dateReception
          ? ` · reçu le ${formatDate(transfert.dateReception)}`
          : ""}
      </p>

      <div className="table-shell">
        <table className="data">
          <thead>
            <tr>
              <th>Article</th>
              <th>Quantité</th>
              <th>CUMP source</th>
            </tr>
          </thead>
          <tbody>
            {transfert.lignes.map((l) => {
              const p = produits.find((x) => x.id === l.produitId);
              return (
                <tr key={l.produitId}>
                  <td>{p ? libelleProduit(p) : l.produitId}</td>
                  <td>
                    {formatNumber(l.quantite)} {p?.unite ?? ""}
                  </td>
                  <td>
                    {l.cumpSource != null ? formatCurrency(l.cumpSource) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {transfert.note && (
        <p className="mt-4 text-sm text-muted">{transfert.note}</p>
      )}
    </div>
  );
}
