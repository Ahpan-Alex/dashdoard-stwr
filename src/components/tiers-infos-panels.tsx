"use client";

import { useState } from "react";
import { CompteTiersSelect } from "@/components/compte-tiers-select";
import { SelectTypeClient } from "@/components/select-type-client";
import { useAuthStore } from "@/lib/auth-store";
import {
  PREFIXE_COMPTE_CLIENT,
  PREFIXE_COMPTE_FOURNISSEUR,
} from "@/lib/comptabilite";
import { FORMES_JURIDIQUES_MG } from "@/lib/madagascar";
import { createId } from "@/lib/id";
import { modesPaiementActifs } from "@/lib/tresorerie";
import {
  DEVISE_TIERS_DEFAUT,
  masquerCoordonneeBancaire,
} from "@/lib/tiers-fiche";
import { estClient, estFournisseur } from "@/lib/tiers";
import type {
  CompteBancaireTiers,
  CompteComptable,
  ModePaiementParam,
  PointDeVente,
  Tiers,
} from "@/lib/types";

type Save = (patch: Partial<Tiers>) => { ok: boolean; reason?: string };

export function TiersImmatriculationPanel({
  tiers,
  comptes,
  tous,
  pointsDeVente,
  compteClientVerrouille,
  compteFournisseurVerrouille,
  onSave,
}: {
  tiers: Tiers;
  comptes: CompteComptable[];
  tous: Tiers[];
  pointsDeVente: PointDeVente[];
  compteClientVerrouille: boolean;
  compteFournisseurVerrouille: boolean;
  onSave: Save;
}) {
  const [nom, setNom] = useState(tiers.nom);
  const [nomCommercial, setNomCommercial] = useState(tiers.nomCommercial ?? "");
  const [formeJuridique, setFormeJuridique] = useState(tiers.formeJuridique ?? "");
  const [capitalSocial, setCapitalSocial] = useState(
    tiers.capitalSocial != null ? String(tiers.capitalSocial) : "",
  );
  const [nif, setNif] = useState(tiers.nif ?? "");
  const [stat, setStat] = useState(tiers.stat ?? "");
  const [rcs, setRcs] = useState(tiers.rcs ?? "");
  const [type, setType] = useState(tiers.type ?? "autre");
  const [specialite, setSpecialite] = useState(tiers.specialite ?? "");
  const [site, setSite] = useState(tiers.siteRattachementId ?? "");
  const [roles, setRoles] = useState(tiers.roles);
  const [compteClientId, setCompteClientId] = useState(tiers.compteClientId ?? "");
  const [compteFournisseurId, setCompteFournisseurId] = useState(
    tiers.compteFournisseurId ?? "",
  );
  const client = roles.includes("client");
  const fournisseur = roles.includes("fournisseur");

  function basculer(role: "client" | "fournisseur") {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function enregistrer() {
    if (!nom.trim()) {
      alert("La raison sociale est obligatoire.");
      return;
    }
    const capital = Number(capitalSocial.replace(/\s/g, "").replace(",", "."));
    const res = onSave({
      nom: nom.trim(),
      nomCommercial: nomCommercial.trim() || undefined,
      formeJuridique: formeJuridique || undefined,
      capitalSocial: Number.isFinite(capital) && capital > 0 ? capital : undefined,
      nif: nif.trim() || undefined,
      stat: stat.trim() || undefined,
      rcs: rcs.trim() || undefined,
      type: client ? type : undefined,
      specialite: fournisseur ? specialite.trim() || undefined : undefined,
      siteRattachementId: site || undefined,
      roles,
      compteClientId: client ? compteClientId || undefined : undefined,
      compteFournisseurId: fournisseur ? compteFournisseurId || undefined : undefined,
    });
    if (!res.ok) alert(res.reason ?? "Enregistrement impossible.");
  }

  return (
    <section className="rounded-[var(--radius)] border border-line bg-card p-5">
      <h2 className="mb-1 font-display text-lg font-semibold">Immatriculation</h2>
      <p className="mb-4 text-xs text-muted">
        Sur les documents commerciaux, seuls le nom, le NIF et le STAT sont
        imprimés.
      </p>
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={client}
            onChange={() => basculer("client")}
          />
          Client
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fournisseur}
            onChange={() => basculer("fournisseur")}
          />
          Fournisseur
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-semibold text-muted sm:col-span-2">
          Raison sociale
          <input
            className="input mt-1"
            value={nom}
            required
            onChange={(e) => setNom(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Nom commercial
          <input
            className="input mt-1"
            value={nomCommercial}
            onChange={(e) => setNomCommercial(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Forme juridique
          <select
            className="select mt-1"
            value={formeJuridique}
            onChange={(e) => setFormeJuridique(e.target.value)}
          >
            <option value="">—</option>
            {FORMES_JURIDIQUES_MG.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-muted">
          Capital social
          <input
            className="input mt-1"
            value={capitalSocial}
            onChange={(e) => setCapitalSocial(e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-muted">
          NIF
          <input className="input mt-1" value={nif} onChange={(e) => setNif(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-muted">
          STAT
          <input className="input mt-1" value={stat} onChange={(e) => setStat(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-muted">
          RCS
          <input className="input mt-1" value={rcs} onChange={(e) => setRcs(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-muted">
          Site de rattachement
          <select className="select mt-1" value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="">—</option>
            {pointsDeVente
              .filter((p) => p.actif)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
          </select>
        </label>
        {client && (
          <SelectTypeClient value={type} onChange={setType} />
        )}
        {fournisseur && (
          <label className="block text-xs font-semibold text-muted">
            Spécialité
            <input
              className="input mt-1"
              value={specialite}
              onChange={(e) => setSpecialite(e.target.value)}
            />
          </label>
        )}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {client && (
          <CompteTiersSelect
            label="Compte client (411)"
            prefixe={PREFIXE_COMPTE_CLIENT}
            value={compteClientId}
            required
            verrouille={compteClientVerrouille}
            comptes={comptes}
            tiers={tous}
            ignoreTiersId={tiers.id}
            onChange={setCompteClientId}
          />
        )}
        {fournisseur && (
          <CompteTiersSelect
            label="Compte fournisseur (401)"
            prefixe={PREFIXE_COMPTE_FOURNISSEUR}
            value={compteFournisseurId}
            required
            verrouille={compteFournisseurVerrouille}
            comptes={comptes}
            tiers={tous}
            ignoreTiersId={tiers.id}
            onChange={setCompteFournisseurId}
          />
        )}
      </div>
      <button type="button" className="btn btn-primary mt-4" onClick={enregistrer}>
        Enregistrer
      </button>
    </section>
  );
}

export function TiersFiscalitePanel({
  tiers,
  onSave,
}: {
  tiers: Tiers;
  onSave: Save;
}) {
  const [assujetti, setAssujetti] = useState(tiers.assujettiTVA !== false);
  const [exo, setExo] = useState(Boolean(tiers.exonerationTVA?.actif));
  const [motif, setMotif] = useState(tiers.exonerationTVA?.motif ?? "");
  const [reference, setReference] = useState(tiers.exonerationTVA?.reference ?? "");
  const [dateFin, setDateFin] = useState(tiers.exonerationTVA?.dateFin ?? "");

  function enregistrer() {
    if (exo && !motif.trim()) {
      alert("Indiquez le motif de l'exonération.");
      return;
    }
    const res = onSave({
      assujettiTVA: assujetti,
      exonerationTVA: exo
        ? {
            actif: true,
            motif: motif.trim(),
            reference: reference.trim() || undefined,
            dateFin: dateFin || undefined,
          }
        : { actif: false },
    });
    if (!res.ok) alert(res.reason ?? "Enregistrement impossible.");
  }

  return (
    <section className="rounded-[var(--radius)] border border-line bg-card p-5">
      <h2 className="mb-1 font-display text-lg font-semibold">Fiscalité</h2>
      <p className="mb-4 text-xs text-muted">
        Ces cases proposent la TVA des nouveaux documents
        {estClient(tiers) ? " de vente" : ""}
        {estClient(tiers) && estFournisseur(tiers) ? " et" : ""}
        {estFournisseur(tiers) ? " d'achat" : ""}. Les documents déjà créés
        conservent leur taux.
      </p>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={assujetti}
          onChange={(e) => setAssujetti(e.target.checked)}
        />
        Assujetti à la TVA
      </label>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={exo}
          onChange={(e) => setExo(e.target.checked)}
        />
        Exonération
      </label>
      {exo && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-muted sm:col-span-3">
            Motif
            <input
              className="input mt-1"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Référence / justificatif
            <input
              className="input mt-1"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Fin de validité
            <input
              type="date"
              className="input mt-1"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </label>
        </div>
      )}
      <button type="button" className="btn btn-primary mt-4" onClick={enregistrer}>
        Enregistrer
      </button>
    </section>
  );
}

export function TiersPaiementsPanel({
  tiers,
  modes,
  onSave,
}: {
  tiers: Tiers;
  modes: ModePaiementParam[];
  onSave: Save;
}) {
  const peutVoirBanques = useAuthStore(
    (s) => s.hasPermission("comptabilite.lire") || s.hasPermission("comptabilite.gerer"),
  );
  const peutModifierBanques = useAuthStore((s) =>
    s.hasPermission("comptabilite.gerer"),
  );
  const client = estClient(tiers);
  const fournisseur = estFournisseur(tiers);
  const [delaiClient, setDelaiClient] = useState(
    String(tiers.delaiPaiementClientJours ?? ""),
  );
  const [delaiFournisseur, setDelaiFournisseur] = useState(
    String(tiers.delaiPaiementFournisseurJours ?? ""),
  );
  const [remiseClient, setRemiseClient] = useState(
    String(tiers.remiseHabituelleClientPercent ?? ""),
  );
  const [remiseFournisseur, setRemiseFournisseur] = useState(
    String(tiers.remiseHabituelleFournisseurPercent ?? ""),
  );
  const [plafond, setPlafond] = useState(String(tiers.plafondCredit ?? ""));
  const [modeId, setModeId] = useState(tiers.modePaiementDefautId ?? "");
  const [delaiLivraison, setDelaiLivraison] = useState(
    String(tiers.delaiLivraisonHabituelJours ?? ""),
  );
  const [comptes, setComptes] = useState<CompteBancaireTiers[]>(
    tiers.comptesBancaires ?? [],
  );
  const [masques, setMasques] = useState(true);
  const modesActifs = modesPaiementActifs(modes);

  function enregistrer() {
    const res = onSave({
      delaiPaiementClientJours: client
        ? Math.max(0, Number(delaiClient) || 0)
        : undefined,
      delaiPaiementFournisseurJours: fournisseur
        ? Math.max(0, Number(delaiFournisseur) || 0)
        : undefined,
      remiseHabituelleClientPercent: client
        ? Math.max(0, Number(remiseClient) || 0)
        : undefined,
      remiseHabituelleFournisseurPercent: fournisseur
        ? Math.max(0, Number(remiseFournisseur) || 0)
        : undefined,
      plafondCredit: client ? Math.max(0, Number(plafond) || 0) : undefined,
      modePaiementDefautId: modeId || undefined,
      delaiLivraisonHabituelJours: fournisseur
        ? Math.max(0, Number(delaiLivraison) || 0)
        : undefined,
      deviseInformative: fournisseur ? DEVISE_TIERS_DEFAUT : undefined,
      ...(peutModifierBanques ? { comptesBancaires: comptes } : {}),
    });
    if (!res.ok) alert(res.reason ?? "Enregistrement impossible.");
  }

  function ajouterCompte() {
    setComptes((prev) => [
      ...prev,
      { id: createId("rib"), banque: "", parDefaut: prev.length === 0 },
    ]);
    setMasques(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Paiements</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {client && (
            <label className="block text-xs font-semibold text-muted">
              Délai de paiement client (jours)
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={delaiClient}
                onChange={(e) => setDelaiClient(e.target.value)}
              />
            </label>
          )}
          {fournisseur && (
            <label className="block text-xs font-semibold text-muted">
              Délai de paiement fournisseur (jours)
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={delaiFournisseur}
                onChange={(e) => setDelaiFournisseur(e.target.value)}
              />
            </label>
          )}
          <label className="block text-xs font-semibold text-muted">
            Mode de paiement par défaut
            <select
              className="select mt-1"
              value={modeId}
              onChange={(e) => setModeId(e.target.value)}
            >
              <option value="">—</option>
              {modesActifs.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.libelle}
                </option>
              ))}
            </select>
          </label>
          {client && (
            <>
              <label className="block text-xs font-semibold text-muted">
                Remise habituelle vente (%)
                <input
                  type="number"
                  min={0}
                  className="input mt-1"
                  value={remiseClient}
                  onChange={(e) => setRemiseClient(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Plafond de crédit (Ar)
                <input
                  type="number"
                  min={0}
                  className="input mt-1"
                  value={plafond}
                  onChange={(e) => setPlafond(e.target.value)}
                />
              </label>
            </>
          )}
          {fournisseur && (
            <label className="block text-xs font-semibold text-muted">
              Remise habituelle achat (%)
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={remiseFournisseur}
                onChange={(e) => setRemiseFournisseur(e.target.value)}
              />
            </label>
          )}
        </div>
        {client && (
          <p className="mt-2 text-[11px] text-muted">
            Une vente est bloquée si l&apos;encours dépasse le plafond, sauf
            dérogation (administrateur ou comptable).
          </p>
        )}
      </section>

      {fournisseur && (
        <section className="rounded-[var(--radius)] border border-line bg-card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">Fournisseur</h2>
          <p className="mb-3 text-xs text-muted">
            Le délai de livraison est informatif. Il ne change pas l&apos;ordre
            de priorité des fournisseurs sur la fiche article. La devise ne
            déclenche aucune conversion.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-muted">
              Délai de livraison habituel (jours)
              <input
                type="number"
                min={0}
                className="input mt-1"
                value={delaiLivraison}
                onChange={(e) => setDelaiLivraison(e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Devise
              <input className="input mt-1" value={DEVISE_TIERS_DEFAUT} readOnly />
            </label>
          </div>
        </section>
      )}

      {peutVoirBanques && (
        <section className="rounded-[var(--radius)] border border-line bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">
              Coordonnées bancaires
            </h2>
            {peutModifierBanques && (
              <button type="button" className="btn btn-secondary" onClick={ajouterCompte}>
                Ajouter un compte
              </button>
            )}
          </div>
          <p className="mb-3 text-xs text-muted">
            Affichage partiel. Toute modification est tracée (qui, quand).
          </p>
          {peutModifierBanques && (
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!masques}
                onChange={(e) => setMasques(!e.target.checked)}
              />
              Afficher les coordonnées pour les modifier
            </label>
          )}
          {comptes.length === 0 ? (
            <p className="text-sm text-muted">Aucun compte bancaire.</p>
          ) : (
            <div className="space-y-3">
              {comptes.map((c) => (
                <div key={c.id} className="grid gap-2 sm:grid-cols-4">
                  <input
                    className="input"
                    placeholder="Banque"
                    value={c.banque}
                    disabled={!peutModifierBanques}
                    onChange={(e) =>
                      setComptes((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, banque: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    className="input"
                    placeholder="RIB"
                    value={
                      masques && !peutModifierBanques
                        ? masquerCoordonneeBancaire(c.rib)
                        : masques
                          ? masquerCoordonneeBancaire(c.rib)
                          : (c.rib ?? "")
                    }
                    disabled={!peutModifierBanques || masques}
                    onChange={(e) =>
                      setComptes((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, rib: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    className="input"
                    placeholder="IBAN"
                    value={
                      masques
                        ? masquerCoordonneeBancaire(c.iban)
                        : (c.iban ?? "")
                    }
                    disabled={!peutModifierBanques || masques}
                    onChange={(e) =>
                      setComptes((prev) =>
                        prev.map((x) =>
                          x.id === c.id ? { ...x, iban: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="compte-defaut"
                        checked={Boolean(c.parDefaut)}
                        disabled={!peutModifierBanques}
                        onChange={() =>
                          setComptes((prev) =>
                            prev.map((x) => ({
                              ...x,
                              parDefaut: x.id === c.id,
                            })),
                          )
                        }
                      />
                      Défaut
                    </label>
                    {peutModifierBanques && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                          setComptes((prev) => prev.filter((x) => x.id !== c.id))
                        }
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <button type="button" className="btn btn-primary" onClick={enregistrer}>
        Enregistrer
      </button>
    </div>
  );
}
