"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Ban, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  categoriesFeuilles,
  cheminCategorie,
  codeDejaUtilise,
  isCodeProduitValide,
  libelleProduit,
  normalizeCodeProduit,
  produitEstReference,
  trouverDoublonsPotentiels,
} from "@/lib/produits";
import { useStore } from "@/lib/store";

export default function ParametresProduitsPage() {
  const {
    produits,
    categoriesProduits,
    clients,
    tarifsClients,
    historiquesPrix,
    entrees,
    ventes,
    devis,
    commandes,
    bonsDeLivraison,
    factures,
    parametres,
    addProduit,
    updateProduit,
    desactiverProduit,
    deleteProduit,
    addCategorieProduit,
    addTarifClient,
    deleteTarifClient,
  } = useStore();

  const feuilles = categoriesFeuilles(categoriesProduits);
  const [filtreActif, setFiltreActif] = useState<"actifs" | "tous" | "inactifs">(
    "actifs",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alertDoublons, setAlertDoublons] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({
    code: "",
    libelle: "",
    parentId: "",
  });
  const [form, setForm] = useState({
    code: "",
    libelleCourt: "",
    libelleLong: "",
    categorieId: feuilles[0]?.id ?? "cat-autre",
    unite: "kg",
    prixAchat: "",
    prixVenteHT: "",
    prixVenteGrosHT: "",
    seuilGros: "",
    tauxTVA: String(parametres.tauxTVA),
  });
  const [tarifForm, setTarifForm] = useState({
    clientId: clients[0]?.id ?? "",
    prixHT: "",
  });

  const liste = useMemo(() => {
    return [...produits]
      .filter((p) => {
        if (filtreActif === "actifs") return p.actif;
        if (filtreActif === "inactifs") return !p.actif;
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [produits, filtreActif]);

  const selected = produits.find((p) => p.id === selectedId);
  const histSelected = historiquesPrix
    .filter((h) => h.produitId === selectedId)
    .slice(0, 20);
  const tarifsSelected = tarifsClients.filter(
    (t) => t.produitId === selectedId && t.actif,
  );

  function onAddCategorie(e: FormEvent) {
    e.preventDefault();
    const code = normalizeCodeProduit(catForm.code);
    const libelle = catForm.libelle.trim();
    if (!code || !libelle) return;
    addCategorieProduit({
      code,
      libelle,
      parentId: catForm.parentId || undefined,
      ordre: categoriesProduits.length + 1,
      actif: true,
    });
    setCatForm({ code: "", libelle: "", parentId: "" });
  }

  function onAddProduit(e: FormEvent) {
    e.preventDefault();
    setAlertDoublons(null);
    const code = normalizeCodeProduit(form.code);
    if (!isCodeProduitValide(code)) {
      alert("Code invalide (2–32 caractères : A–Z, 0–9, tirets).");
      return;
    }
    if (codeDejaUtilise(code, produits)) {
      alert("Ce code produit existe déjà.");
      return;
    }
    const libelleCourt = form.libelleCourt.trim();
    const libelleLong = form.libelleLong.trim() || libelleCourt;
    if (!libelleCourt || !form.categorieId) return;
    const achat = Number(form.prixAchat);
    const vente = Number(form.prixVenteHT);
    if (achat < 0 || vente < 0) return;

    const doublons = trouverDoublonsPotentiels(libelleLong, produits);
    if (doublons.length > 0) {
      const msg = doublons
        .slice(0, 3)
        .map(
          (d) =>
            `${d.produit.code} — ${libelleProduit(d.produit)} (${Math.round(d.score * 100)} %)`,
        )
        .join("\n");
      if (
        !confirm(
          `Libellés proches détectés :\n${msg}\n\nCréer quand même ce produit ?`,
        )
      ) {
        setAlertDoublons(msg);
        return;
      }
    }

    addProduit({
      code,
      libelleCourt: libelleCourt.slice(0, 40),
      libelleLong,
      categorieId: form.categorieId,
      unite: form.unite.trim() || "kg",
      prixAchat: achat,
      prixVenteHT: vente,
      prixVenteGrosHT: form.prixVenteGrosHT
        ? Number(form.prixVenteGrosHT)
        : undefined,
      seuilGros: form.seuilGros ? Number(form.seuilGros) : undefined,
      tauxTVA: Number(form.tauxTVA) || 0,
      actif: true,
    });
    setForm({
      code: "",
      libelleCourt: "",
      libelleLong: "",
      categorieId: feuilles[0]?.id ?? "cat-autre",
      unite: "kg",
      prixAchat: "",
      prixVenteHT: "",
      prixVenteGrosHT: "",
      seuilGros: "",
      tauxTVA: String(parametres.tauxTVA),
    });
  }

  function sauvegarderPrix(produitId: string) {
    if (!selected || selected.id !== produitId) return;
    const achat = Number(
      prompt("Nouveau prix d'achat HT (Ar)", String(selected.prixAchat)),
    );
    if (Number.isNaN(achat) || achat < 0) return;
    const vente = Number(
      prompt("Nouveau prix de vente HT (Ar)", String(selected.prixVenteHT)),
    );
    if (Number.isNaN(vente) || vente < 0) return;
    const grosRaw = prompt(
      "Prix gros HT (vide = aucun)",
      selected.prixVenteGrosHT != null ? String(selected.prixVenteGrosHT) : "",
    );
    if (grosRaw === null) return;
    updateProduit(
      produitId,
      {
        prixAchat: achat,
        prixVenteHT: vente,
        prixVenteGrosHT: grosRaw.trim() ? Number(grosRaw) : undefined,
      },
      { motifPrix: "Mise à jour manuelle catalogue" },
    );
  }

  return (
    <div>
      <PageHeader
        title="Catalogue produits"
        description="Code unique, catégories, multi-prix, historique — désactivation pour préserver les factures."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={onAddCategorie}
          className="rounded-[var(--radius)] border border-line bg-card p-4"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
            Famille / catégorie
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="input"
              placeholder="Code"
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
            />
            <input
              className="input sm:col-span-2"
              placeholder="Libellé"
              value={catForm.libelle}
              onChange={(e) =>
                setCatForm({ ...catForm, libelle: e.target.value })
              }
            />
            <select
              className="select sm:col-span-2"
              value={catForm.parentId}
              onChange={(e) =>
                setCatForm({ ...catForm, parentId: e.target.value })
              }
            >
              <option value="">— Racine —</option>
              {categoriesProduits.map((c) => (
                <option key={c.id} value={c.id}>
                  {cheminCategorie(c.id, categoriesProduits)}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">
              <Plus className="h-4 w-4" />
              Catégorie
            </button>
          </div>
        </form>

        <form
          onSubmit={onAddProduit}
          className="rounded-[var(--radius)] border border-line bg-card p-4"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-sea-700">
            Nouveau produit
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Code *
              <input
                className="input mt-1 font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Catégorie *
              <select
                className="select mt-1"
                value={form.categorieId}
                onChange={(e) =>
                  setForm({ ...form, categorieId: e.target.value })
                }
              >
                {feuilles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cheminCategorie(c.id, categoriesProduits)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Libellé court *
              <input
                className="input mt-1"
                maxLength={40}
                value={form.libelleCourt}
                onChange={(e) =>
                  setForm({ ...form, libelleCourt: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted sm:col-span-2">
              Libellé long
              <input
                className="input mt-1"
                value={form.libelleLong}
                onChange={(e) =>
                  setForm({ ...form, libelleLong: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Unité
              <input
                className="input mt-1"
                value={form.unite}
                onChange={(e) => setForm({ ...form, unite: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              TVA %
              <input
                type="number"
                className="input mt-1"
                value={form.tauxTVA}
                onChange={(e) => setForm({ ...form, tauxTVA: e.target.value })}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Prix d&apos;achat HT
              <input
                type="number"
                className="input mt-1"
                value={form.prixAchat}
                onChange={(e) => setForm({ ...form, prixAchat: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Prix vente détail HT
              <input
                type="number"
                className="input mt-1"
                value={form.prixVenteHT}
                onChange={(e) =>
                  setForm({ ...form, prixVenteHT: e.target.value })
                }
                required
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Prix gros HT
              <input
                type="number"
                className="input mt-1"
                value={form.prixVenteGrosHT}
                onChange={(e) =>
                  setForm({ ...form, prixVenteGrosHT: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Seuil gros (qté)
              <input
                type="number"
                className="input mt-1"
                value={form.seuilGros}
                onChange={(e) => setForm({ ...form, seuilGros: e.target.value })}
              />
            </label>
          </div>
          {alertDoublons && (
            <p className="mt-2 text-xs text-coral whitespace-pre-wrap">
              Doublons potentiels :{"\n"}
              {alertDoublons}
            </p>
          )}
          <button type="submit" className="btn btn-primary mt-3">
            <Plus className="h-4 w-4" />
            Créer le produit
          </button>
        </form>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["actifs", "Actifs"],
            ["inactifs", "Inactifs"],
            ["tous", "Tous"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn ${filtreActif === id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFiltreActif(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="table-shell lg:col-span-3">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th>Vente HT</th>
                <th>TVA</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liste.map((p) => (
                <tr
                  key={p.id}
                  className={
                    selectedId === p.id ? "bg-sea-50/80" : "cursor-pointer"
                  }
                  onClick={() => setSelectedId(p.id)}
                >
                  <td className="font-mono text-xs font-semibold">{p.code}</td>
                  <td>
                    <span className="font-medium">{p.libelleCourt}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {p.libelleLong}
                    </span>
                  </td>
                  <td className="text-xs">
                    {cheminCategorie(p.categorieId, categoriesProduits)}
                  </td>
                  <td>{formatCurrency(p.prixVenteHT)}</td>
                  <td>{p.tauxTVA} %</td>
                  <td>
                    <span
                      className={`badge ${p.actif ? "badge-sea" : "badge-sand"}`}
                    >
                      {p.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {p.actif ? (
                        <button
                          className="btn btn-ghost"
                          title="Désactiver"
                          onClick={() => {
                            if (confirm(`Désactiver ${p.code} ?`)) {
                              desactiverProduit(p.id);
                            }
                          }}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          title="Réactiver"
                          onClick={() => updateProduit(p.id, { actif: true })}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        title="Supprimer (si jamais utilisé)"
                        onClick={() => {
                          const ref = produitEstReference(p.id, {
                            entrees,
                            ventes,
                            devis,
                            commandes,
                            bonsDeLivraison,
                            factures,
                          });
                          if (ref) {
                            alert(
                              "Produit référencé : suppression impossible. Utilisez la désactivation.",
                            );
                            return;
                          }
                          if (!confirm(`Supprimer définitivement ${p.code} ?`)) {
                            return;
                          }
                          const res = deleteProduit(p.id);
                          if (!res.ok) alert(res.reason);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-[var(--radius)] border border-line bg-card p-4 lg:col-span-2">
          {!selected ? (
            <p className="text-sm text-muted">
              Sélectionnez un produit pour voir tarifs clients et historique des
              prix.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-xs font-semibold text-sea-700">
                  {selected.code}
                </p>
                <p className="font-display text-lg font-semibold">
                  {selected.libelleLong}
                </p>
                <p className="text-xs text-muted">
                  Achat {formatCurrency(selected.prixAchat)} · Détail{" "}
                  {formatCurrency(selected.prixVenteHT)}
                  {selected.prixVenteGrosHT != null
                    ? ` · Gros ${formatCurrency(selected.prixVenteGrosHT)}`
                    : ""}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary mt-2"
                  onClick={() => sauvegarderPrix(selected.id)}
                >
                  Modifier les prix
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
                  Tarifs clients
                </p>
                <ul className="mb-2 space-y-1 text-sm">
                  {tarifsSelected.length === 0 ? (
                    <li className="text-muted">Aucun tarif spécifique.</li>
                  ) : (
                    tarifsSelected.map((t) => {
                      const cli = clients.find((c) => c.id === t.clientId);
                      return (
                        <li
                          key={t.id}
                          className="flex items-center justify-between gap-2 border-b border-line/60 py-1"
                        >
                          <span>
                            {cli?.nom ?? t.clientId} — {formatCurrency(t.prixHT)}
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => deleteTarifClient(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="select min-w-[140px] flex-1"
                    value={tarifForm.clientId}
                    onChange={(e) =>
                      setTarifForm({ ...tarifForm, clientId: e.target.value })
                    }
                  >
                    {clients
                      .filter((c) => c.actif)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    className="input w-28"
                    placeholder="Prix HT"
                    value={tarifForm.prixHT}
                    onChange={(e) =>
                      setTarifForm({ ...tarifForm, prixHT: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const prix = Number(tarifForm.prixHT);
                      if (!tarifForm.clientId || prix < 0) return;
                      addTarifClient({
                        clientId: tarifForm.clientId,
                        produitId: selected.id,
                        prixHT: prix,
                        typeTarif: "fixe",
                        actif: true,
                      });
                      setTarifForm({ ...tarifForm, prixHT: "" });
                    }}
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
                  Historique des prix
                </p>
                {histSelected.length === 0 ? (
                  <p className="text-sm text-muted">Aucune modification.</p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                    {histSelected.map((h) => (
                      <li key={h.id} className="border-b border-line/50 py-1">
                        <span className="text-muted">
                          {formatDate(h.date)} · {h.champ}
                        </span>
                        <br />
                        {formatCurrency(h.ancienMontant)} →{" "}
                        {formatCurrency(h.nouveauMontant)}
                        {h.motif ? ` (${h.motif})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
