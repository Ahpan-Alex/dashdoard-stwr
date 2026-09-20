"use client";

import { useMemo, useState } from "react";
import { Archive, Eye, Search } from "lucide-react";
import Link from "next/link";
import { BonCommandeFournisseur } from "@/components/bon-commande-fournisseur";
import { DemandePrixDocument } from "@/components/demande-prix-document";
import { EmptyState } from "@/components/empty-state";
import { ExportDocumentPdfButton } from "@/components/export-documents-pdf";
import { PageHeader } from "@/components/page-header";
import { couleurStatutDocument } from "@/lib/commercial";
import {
  TYPE_DOCUMENT_ARCHIVE_LABELS,
  TYPES_ARCHIVE_FOURNISSEUR,
  TYPES_ARCHIVE_VENTE,
  collecterDocumentsArchive,
  type FamilleArchiveDocuments,
  type TypeDocumentArchive,
} from "@/lib/documents-archive";
import { dateDansExercice, exercicesTries, jourIso } from "@/lib/exercices";
import { formatCurrency, formatDate } from "@/lib/format";
import { assurerTiers, estClient, estFournisseur } from "@/lib/tiers";
import { useStore } from "@/lib/store";

export function HistoriqueDocuments({
  famille,
}: {
  famille: FamilleArchiveDocuments;
}) {
  const demandesPrix = useStore((s) => s.demandesPrix ?? []);
  const achats = useStore((s) => s.achats);
  const devis = useStore((s) => s.devis);
  const commandes = useStore((s) => s.commandes);
  const bonsDeLivraison = useStore((s) => s.bonsDeLivraison);
  const bonsDePreparation = useStore((s) => s.bonsDePreparation ?? []);
  const factures = useStore((s) => s.factures);
  const acomptes = useStore((s) => s.acomptes);
  const clients = useStore((s) => s.clients);
  const fournisseurs = useStore((s) => s.fournisseurs);
  const tiers = useStore((s) => s.tiers);
  const parametres = useStore((s) => s.parametres);
  const produits = useStore((s) => s.produits ?? []);
  const pointsDeVente = useStore((s) => s.pointsDeVente);
  const pointDeVenteActifId = useStore((s) => s.pointDeVenteActifId);
  const exercicesComptables = useStore((s) => s.exercicesComptables ?? []);

  const typesDispo = famille === "fournisseur" ? TYPES_ARCHIVE_FOURNISSEUR : TYPES_ARCHIVE_VENTE;
  const [type, setType] = useState<TypeDocumentArchive | "tous">("tous");
  const [statut, setStatut] = useState("");
  const [q, setQ] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [tiersId, setTiersId] = useState("");
  const [exerciceId, setExerciceId] = useState("");

  const tousTiers = useMemo(
    () => assurerTiers({ clients, fournisseurs, tiers }),
    [clients, fournisseurs, tiers],
  );

  const parties = useMemo(() => {
    return tousTiers
      .filter((t) =>
        famille === "fournisseur" ? estFournisseur(t) : estClient(t),
      )
      .filter((t) => t.actif !== false && !t.systeme)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [tousTiers, famille]);

  const lignes = useMemo(
    () =>
      collecterDocumentsArchive({
        demandesPrix,
        achats,
        devis,
        commandes,
        bonsDePreparation,
        bonsDeLivraison,
        factures,
        acomptes,
        clients,
        fournisseurs,
        tiers,
        parametres,
        pointDeVenteActifId,
        famille,
      }),
    [
      demandesPrix,
      achats,
      devis,
      commandes,
      bonsDePreparation,
      bonsDeLivraison,
      factures,
      acomptes,
      clients,
      fournisseurs,
      tiers,
      parametres,
      pointDeVenteActifId,
      famille,
    ],
  );

  const pastilles = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const l of lignes) {
      const prev = map.get(l.statut);
      map.set(l.statut, {
        label: l.statutLabel,
        count: (prev?.count ?? 0) + 1,
      });
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [lignes]);

  const filtrées = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const ex = exercicesComptables.find((e) => e.id === exerciceId);
    return lignes.filter((l) => {
      if (type !== "tous" && l.type !== type) return false;
      if (statut && l.statut !== statut) return false;
      if (tiersId && !(l.tiersIds ?? []).includes(tiersId)) return false;
      const j = jourIso(l.date);
      if (dateDebut && j < dateDebut) return false;
      if (dateFin && j > dateFin) return false;
      if (ex && !dateDansExercice(ex, l.date)) return false;
      if (!needle) return true;
      return (
        l.numero.toLowerCase().includes(needle) ||
        l.tiersNom.toLowerCase().includes(needle) ||
        TYPE_DOCUMENT_ARCHIVE_LABELS[l.type].toLowerCase().includes(needle)
      );
    });
  }, [lignes, type, statut, q, tiersId, dateDebut, dateFin, exerciceId, exercicesComptables]);

  function destinaire(id: string) {
    const t = tousTiers.find((x) => x.id === id);
    const f = fournisseurs.find((x) => x.id === id);
    return {
      nom: t?.nom ?? f?.nom ?? "Fournisseur",
      telephone: t?.telephone ?? f?.telephone,
      email: t?.email ?? f?.email,
      adresse: t?.adresse ?? f?.adresse,
      ville: t?.ville ?? f?.ville,
      nif: t?.nif ?? f?.nif,
      stat: t?.stat ?? f?.stat,
    };
  }

  const titre =
    famille === "fournisseur"
      ? "Historique documents fournisseurs"
      : "Historique documents clients";
  const description =
    famille === "fournisseur"
      ? "Demandes de prix et bons de commande fournisseur. Filtrez par dates, fournisseur et exercice."
      : "Devis, commandes, bons de livraison et factures. Filtrez par dates, client et exercice.";
  const labelTiers = famille === "fournisseur" ? "Fournisseur" : "Client";

  return (
    <div>
      <PageHeader title={titre} description={description} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-semibold text-muted">
          Du
          <input
            type="date"
            className="input mt-1"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Au
          <input
            type="date"
            className="input mt-1"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          {labelTiers}
          <select
            className="select mt-1"
            value={tiersId}
            onChange={(e) => setTiersId(e.target.value)}
          >
            <option value="">Tous</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Exercice comptable
          <select
            className="select mt-1"
            value={exerciceId}
            onChange={(e) => setExerciceId(e.target.value)}
          >
            <option value="">Tous</option>
            {exercicesTries(exercicesComptables).map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.libelle}
                {ex.cloture ? " (clôturé)" : ex.actif ? " (actif)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {pastilles.map(([id, { label, count }]) => (
          <button
            key={id}
            type="button"
            className={`badge badge-${couleurStatutDocument(id)} ${
              statut === id ? "ring-2 ring-sea-800" : ""
            }`}
            onClick={() => setStatut(statut === id ? "" : id)}
          >
            {label} · {count}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn ${type === "tous" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setType("tous")}
        >
          Tous
        </button>
        {typesDispo.map((id) => (
          <button
            key={id}
            type="button"
            className={`btn ${type === id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setType(id)}
          >
            {TYPE_DOCUMENT_ARCHIVE_LABELS[id]}
          </button>
        ))}
      </div>

      <label className="mb-4 flex max-w-md items-center gap-2">
        <Search className="h-4 w-4 text-muted" />
        <input
          className="input"
          placeholder="N°, tiers, type…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>

      {filtrées.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-5 w-5" />}
          title="Aucun document"
          description={
            famille === "fournisseur"
              ? "Les demandes de prix et commandes fournisseurs apparaissent ici."
              : "Les devis, commandes clients, BL et factures apparaissent ici."
          }
        />
      ) : (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>N°</th>
                <th>{labelTiers}</th>
                <th>Statut</th>
                <th className="text-right">Montant</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrées.map((l) => {
                const achat =
                  l.type === "commande_fournisseur"
                    ? achats.find((a) => a.id === l.id)
                    : undefined;
                const dp =
                  l.type === "demande_prix"
                    ? demandesPrix.find((d) => d.id === l.id)
                    : undefined;
                const frnId =
                  achat?.fournisseurId ??
                  dp?.fournisseurIdsRetenus?.[0] ??
                  dp?.fournisseurIds?.[0];
                return (
                  <tr key={`${l.type}-${l.id}`}>
                    <td>{formatDate(l.date)}</td>
                    <td>{TYPE_DOCUMENT_ARCHIVE_LABELS[l.type]}</td>
                    <td className="font-semibold">{l.numero}</td>
                    <td>{l.tiersNom}</td>
                    <td>
                      <span className={`badge badge-${couleurStatutDocument(l.statut)}`}>
                        {l.statutLabel}
                      </span>
                    </td>
                    <td className="text-right">
                      {l.montant != null ? formatCurrency(l.montant) : "—"}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1">
                        <Link href={l.href} className="btn btn-ghost" title="Ouvrir">
                          <Eye className="h-4 w-4" />
                          Voir
                        </Link>
                        {achat && (
                          <ExportDocumentPdfButton
                            label={`PDF ${achat.numero}`}
                            filename={`${achat.numero}.pdf`}
                          >
                            <BonCommandeFournisseur
                              achat={achat}
                              parametres={parametres}
                              produits={produits}
                              destinataire={destinaire(achat.fournisseurId)}
                              siteNom={
                                pointsDeVente.find((p) => p.id === achat.pointDeVenteId)
                                  ?.nom
                              }
                            />
                          </ExportDocumentPdfButton>
                        )}
                        {dp && frnId && (
                          <ExportDocumentPdfButton
                            label={`PDF ${dp.numero}`}
                            filename={`${dp.numero}.pdf`}
                          >
                            <DemandePrixDocument
                              dp={dp}
                              parametres={parametres}
                              produits={produits}
                              destinataire={destinaire(frnId)}
                            />
                          </ExportDocumentPdfButton>
                        )}
                      </div>
                    </td>
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
