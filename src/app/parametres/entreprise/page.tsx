"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Eye, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { REGIMES_FISCAUX, regimeSansTVA } from "@/lib/commercial";
import { formatCurrency } from "@/lib/format";
import { fileToLogoDataUrl } from "@/lib/logo";
import { useStore } from "@/lib/store";
import type { Parametres, RegimeFiscal } from "@/lib/types";

type EntrepriseFormState = {
  nomEntreprise: string;
  formeJuridique: string;
  capital: string;
  nif: string;
  stat: string;
  rcs: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string;
  rib: string;
  banque: string;
  tauxTVA: string;
  assujettiTVA: boolean;
  regimeFiscal: RegimeFiscal;
  conditionsPaiementDefaut: string;
  logoDataUrl: string;
  signatureDataUrl: string;
  signatureNom: string;
};

function formDepuisParametres(p: Parametres): EntrepriseFormState {
  return {
    nomEntreprise: p.nomEntreprise,
    formeJuridique: p.formeJuridique,
    capital: String(p.capital),
    nif: p.nif,
    stat: p.stat,
    rcs: p.rcs,
    adresse: p.adresse,
    ville: p.ville,
    telephone: p.telephone,
    email: p.email,
    rib: p.rib,
    banque: p.banque,
    tauxTVA: String(p.tauxTVA),
    assujettiTVA: p.assujettiTVA,
    regimeFiscal: p.regimeFiscal,
    conditionsPaiementDefaut: p.conditionsPaiementDefaut,
    logoDataUrl: p.logoDataUrl ?? "",
    signatureDataUrl: p.signatureDataUrl ?? "",
    signatureNom: p.signatureNom ?? "",
  };
}

function formVide(): EntrepriseFormState {
  return {
    nomEntreprise: "",
    formeJuridique: "",
    capital: "0",
    nif: "",
    stat: "",
    rcs: "",
    adresse: "",
    ville: "",
    telephone: "",
    email: "",
    rib: "",
    banque: "",
    tauxTVA: "20",
    assujettiTVA: true,
    regimeFiscal: "tva",
    conditionsPaiementDefaut: "",
    logoDataUrl: "",
    signatureDataUrl: "",
    signatureNom: "",
  };
}

function ficheEntrepriseEnregistree(p: Parametres) {
  return Boolean(p.nomEntreprise.trim());
}

function LigneInfo({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-ink">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

export default function ParametresEntreprisePage() {
  const { parametres, updateParametres } = useStore();
  const ficheEnregistree = ficheEntrepriseEnregistree(parametres);
  const [mode, setMode] = useState<"liste" | "form">(
    ficheEnregistree ? "liste" : "form",
  );
  const [apercu, setApercu] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [entreprise, setEntreprise] = useState(() =>
    formDepuisParametres(parametres),
  );

  const sansTVA = regimeSansTVA(entreprise.regimeFiscal);

  function setRegime(regime: RegimeFiscal) {
    setEntreprise((prev) => ({
      ...prev,
      regimeFiscal: regime,
      ...(regimeSansTVA(regime)
        ? { assujettiTVA: false, tauxTVA: "0" }
        : regime === "tva"
          ? {
              assujettiTVA: true,
              tauxTVA: prev.tauxTVA === "0" ? "20" : prev.tauxTVA,
            }
          : {}),
    }));
  }

  function ouvrirCreation() {
    setEntreprise(formVide());
    setLogoError(null);
    setSignatureError(null);
    setApercu(false);
    setMode("form");
  }

  function ouvrirEdition() {
    setEntreprise(formDepuisParametres(parametres));
    setLogoError(null);
    setSignatureError(null);
    setApercu(false);
    setMode("form");
  }

  function fermerFormulaire() {
    setApercu(false);
    setMode(ficheEntrepriseEnregistree(parametres) ? "liste" : "form");
  }

  async function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoError(null);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setEntreprise((prev) => ({ ...prev, logoDataUrl: dataUrl }));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Import impossible.");
    }
  }

  async function onSignatureChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSignatureError(null);
    try {
      const dataUrl = await fileToLogoDataUrl(file, 320, 140);
      setEntreprise((prev) => ({ ...prev, signatureDataUrl: dataUrl }));
    } catch (err) {
      setSignatureError(
        err instanceof Error ? err.message : "Import impossible.",
      );
    }
  }

  function saveEntreprise(e: FormEvent) {
    e.preventDefault();
    updateParametres({
      nomEntreprise: entreprise.nomEntreprise.trim() || "STWR Poissonnerie",
      formeJuridique: entreprise.formeJuridique.trim(),
      capital: Number(entreprise.capital) || 0,
      devise: "Ar",
      nif: entreprise.nif.trim(),
      stat: entreprise.stat.trim(),
      rcs: entreprise.rcs.trim(),
      adresse: entreprise.adresse.trim(),
      ville: entreprise.ville.trim(),
      telephone: entreprise.telephone.trim(),
      email: entreprise.email.trim(),
      rib: entreprise.rib.trim(),
      banque: entreprise.banque.trim(),
      tauxTVA: sansTVA ? 0 : Number(entreprise.tauxTVA) || 20,
      assujettiTVA: sansTVA ? false : entreprise.assujettiTVA,
      regimeFiscal: entreprise.regimeFiscal,
      conditionsPaiementDefaut: entreprise.conditionsPaiementDefaut.trim(),
      logoDataUrl: entreprise.logoDataUrl || undefined,
      signatureDataUrl: entreprise.signatureDataUrl || undefined,
      signatureNom: entreprise.signatureNom.trim() || undefined,
    });
    setMode("liste");
    setApercu(false);
  }

  function supprimerFiche() {
    if (
      !confirm(
        "Supprimer les informations entreprise & fiscalité ? Les documents déjà validés restent inchangés.",
      )
    ) {
      return;
    }
    updateParametres({
      nomEntreprise: "",
      formeJuridique: "",
      capital: 0,
      nif: "",
      stat: "",
      rcs: "",
      adresse: "",
      ville: "",
      telephone: "",
      email: "",
      rib: "",
      banque: "",
      tauxTVA: 20,
      assujettiTVA: true,
      regimeFiscal: "tva",
      conditionsPaiementDefaut: "",
      logoDataUrl: undefined,
      signatureDataUrl: undefined,
      signatureNom: undefined,
    });
    setEntreprise(formVide());
    setApercu(false);
    setMode("form");
  }

  return (
    <div>
      <PageHeader
        title="Entreprise & fiscalité"
        description="Identité légale et fiscale malagasy de l'entreprise."
        showPosSelector={false}
        actions={
          !ficheEnregistree && mode !== "form" ? (
            <button type="button" className="btn btn-primary" onClick={ouvrirCreation}>
              <Plus className="h-4 w-4" />
              Renseigner l&apos;entreprise
            </button>
          ) : null
        }
      />
      <ParametresSubnav />

      {mode === "liste" && ficheEnregistree && (
        <div className="table-shell">
          <table className="data">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Forme</th>
                <th>NIF</th>
                <th>Ville</th>
                <th>Régime</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">
                  <div className="flex items-center gap-3">
                    {parametres.logoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={parametres.logoDataUrl}
                        alt=""
                        className="h-8 w-auto max-w-[72px] object-contain"
                      />
                    ) : null}
                    <span>
                      {parametres.nomEntreprise}
                      {parametres.telephone ? (
                        <span className="mt-0.5 block text-xs font-normal text-muted">
                          {parametres.telephone}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td>{parametres.formeJuridique || "—"}</td>
                <td className="font-mono text-xs">{parametres.nif || "—"}</td>
                <td>{parametres.ville || "—"}</td>
                <td>
                  <span className="badge badge-sea">
                    {REGIMES_FISCAUX[parametres.regimeFiscal] ??
                      parametres.regimeFiscal}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setApercu(true)}
                    >
                      <Eye className="h-4 w-4" />
                      Visualiser
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={ouvrirEdition}
                    >
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={supprimerFiche}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {mode === "form" && (
        <form
          onSubmit={saveEntreprise}
          className="grid gap-4 rounded-[var(--radius)] border border-line bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <p className="text-sm font-medium text-ink sm:col-span-2 lg:col-span-3">
            {ficheEnregistree
              ? "Modifier l'entreprise"
              : "Renseigner l'entreprise"}
          </p>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Logo (documents commerciaux)
            </p>
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-sea-50/40 p-4">
              {entreprise.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entreprise.logoDataUrl}
                  alt="Logo entreprise"
                  className="h-16 w-auto max-w-[200px] object-contain"
                />
              ) : (
                <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed border-line bg-card text-xs text-muted">
                  Aucun logo
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="btn btn-secondary cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  {entreprise.logoDataUrl ? "Remplacer" : "Ajouter un logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={onLogoChange}
                  />
                </label>
                {entreprise.logoDataUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setEntreprise((prev) => ({ ...prev, logoDataUrl: "" }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                    Retirer
                  </button>
                )}
              </div>
              <p className="w-full text-[11px] text-muted">
                PNG, JPG ou WebP · max. 2,5 Mo · affiché uniquement sur les
                documents commerciaux (devis, commandes, BL, factures — activable
                dans Modèles documents). Ce logo n&apos;est pas repris dans la
                colonne des menus : l&apos;identité du menu se paramètre à part
                dans <strong>Identité du menu</strong>.
              </p>
              {logoError && (
                <p className="w-full text-sm text-danger">{logoError}</p>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Signature électronique (documents)
            </p>
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-sea-50/40 p-4">
              {entreprise.signatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={entreprise.signatureDataUrl}
                  alt="Signature électronique"
                  className="h-16 w-auto max-w-[240px] object-contain"
                />
              ) : (
                <div className="flex h-16 w-40 items-center justify-center rounded border border-dashed border-line bg-card text-xs text-muted">
                  Aucune signature
                </div>
              )}
              <div className="flex min-w-[14rem] flex-1 flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <label className="btn btn-secondary cursor-pointer">
                    <ImagePlus className="h-4 w-4" />
                    {entreprise.signatureDataUrl
                      ? "Remplacer"
                      : "Ajouter une signature"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={onSignatureChange}
                    />
                  </label>
                  {entreprise.signatureDataUrl && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        setEntreprise((prev) => ({
                          ...prev,
                          signatureDataUrl: "",
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                      Retirer
                    </button>
                  )}
                </div>
                <label className="block text-xs font-semibold text-muted">
                  Nom / qualité sous la signature
                  <input
                    className="input mt-1"
                    value={entreprise.signatureNom}
                    onChange={(e) =>
                      setEntreprise({
                        ...entreprise,
                        signatureNom: e.target.value,
                      })
                    }
                    placeholder="Ex. Le Gérant — EDEN Poissonnerie"
                  />
                </label>
              </div>
              <p className="w-full text-[11px] text-muted">
                Image de signature manuscrite ou cachet (fond transparent de
                préférence). Appliquée automatiquement aux devis, commandes, BL
                et brouillons / proformas. Les factures déjà validées restent
                figées ; seules les factures émises ensuite incluent cette
                signature (rubrique active dans{" "}
                <strong>Modèles documents</strong>).
              </p>
              {signatureError && (
                <p className="w-full text-sm text-danger">{signatureError}</p>
              )}
            </div>
          </div>

          <label className="block text-xs font-semibold text-muted">
            Raison sociale
            <input
              className="input mt-1"
              value={entreprise.nomEntreprise}
              onChange={(e) =>
                setEntreprise({ ...entreprise, nomEntreprise: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Forme juridique
            <input
              className="input mt-1"
              value={entreprise.formeJuridique}
              onChange={(e) =>
                setEntreprise({ ...entreprise, formeJuridique: e.target.value })
              }
              placeholder="SARL, SA…"
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Capital (Ar)
            <input
              type="number"
              className="input mt-1"
              value={entreprise.capital}
              onChange={(e) =>
                setEntreprise({ ...entreprise, capital: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            NIF *
            <input
              className="input mt-1"
              value={entreprise.nif}
              onChange={(e) =>
                setEntreprise({ ...entreprise, nif: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            STAT *
            <input
              className="input mt-1"
              value={entreprise.stat}
              onChange={(e) =>
                setEntreprise({ ...entreprise, stat: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            RCS
            <input
              className="input mt-1"
              value={entreprise.rcs}
              onChange={(e) =>
                setEntreprise({ ...entreprise, rcs: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Adresse
            <input
              className="input mt-1"
              value={entreprise.adresse}
              onChange={(e) =>
                setEntreprise({ ...entreprise, adresse: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Ville
            <input
              className="input mt-1"
              value={entreprise.ville}
              onChange={(e) =>
                setEntreprise({ ...entreprise, ville: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Téléphone
            <input
              className="input mt-1"
              value={entreprise.telephone}
              onChange={(e) =>
                setEntreprise({ ...entreprise, telephone: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            E-mail
            <input
              className="input mt-1"
              value={entreprise.email}
              onChange={(e) =>
                setEntreprise({ ...entreprise, email: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Banque
            <input
              className="input mt-1"
              value={entreprise.banque}
              onChange={(e) =>
                setEntreprise({ ...entreprise, banque: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            RIB
            <input
              className="input mt-1"
              value={entreprise.rib}
              onChange={(e) =>
                setEntreprise({ ...entreprise, rib: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-muted">
            Régime fiscal
            <select
              className="select mt-1"
              value={entreprise.regimeFiscal}
              onChange={(e) => setRegime(e.target.value as RegimeFiscal)}
            >
              {Object.entries(REGIMES_FISCAUX).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!sansTVA && (
            <>
              <label className="block text-xs font-semibold text-muted">
                Taux TVA (%)
                <input
                  type="number"
                  className="input mt-1"
                  value={entreprise.tauxTVA}
                  onChange={(e) =>
                    setEntreprise({ ...entreprise, tauxTVA: e.target.value })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm lg:mt-6">
                <input
                  type="checkbox"
                  checked={entreprise.assujettiTVA}
                  onChange={(e) =>
                    setEntreprise({
                      ...entreprise,
                      assujettiTVA: e.target.checked,
                    })
                  }
                />
                Assujetti à la TVA
              </label>
            </>
          )}
          {sansTVA && (
            <p className="text-xs text-muted lg:col-span-2 lg:mt-6">
              Régime sans TVA : les fiches produits et documents commerciaux
              n&apos;afficheront pas de TVA.
            </p>
          )}
          <label className="block text-xs font-semibold text-muted sm:col-span-2 lg:col-span-3">
            Conditions de paiement par défaut
            <textarea
              className="textarea mt-1"
              rows={2}
              value={entreprise.conditionsPaiementDefaut}
              onChange={(e) =>
                setEntreprise({
                  ...entreprise,
                  conditionsPaiementDefaut: e.target.value,
                })
              }
            />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
            {ficheEnregistree && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={fermerFormulaire}
              >
                Annuler
              </button>
            )}
            <p className="w-full text-xs text-muted">
              Devise : Ariary (Ar). NIF et STAT sont obligatoires sur les
              documents commerciaux à Madagascar.
            </p>
          </div>
        </form>
      )}

      {apercu && ficheEnregistree && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
          <div className="my-8 w-full max-w-2xl rounded-[var(--radius)] border border-line bg-card p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {parametres.nomEntreprise}
                </h2>
                <p className="text-sm text-muted">
                  Fiche entreprise &amp; fiscalité
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setApercu(false)}
              >
                Fermer
              </button>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-4">
              {parametres.logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={parametres.logoDataUrl}
                  alt="Logo"
                  className="h-16 w-auto max-w-[200px] object-contain"
                />
              ) : null}
              {parametres.signatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={parametres.signatureDataUrl}
                  alt="Signature"
                  className="h-16 w-auto max-w-[200px] object-contain"
                />
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <LigneInfo label="Forme juridique" value={parametres.formeJuridique} />
              <LigneInfo
                label="Capital"
                value={formatCurrency(parametres.capital)}
              />
              <LigneInfo label="NIF" value={parametres.nif} />
              <LigneInfo label="STAT" value={parametres.stat} />
              <LigneInfo label="RCS" value={parametres.rcs} />
              <LigneInfo label="Adresse" value={parametres.adresse} />
              <LigneInfo label="Ville" value={parametres.ville} />
              <LigneInfo label="Téléphone" value={parametres.telephone} />
              <LigneInfo label="E-mail" value={parametres.email} />
              <LigneInfo label="Banque" value={parametres.banque} />
              <LigneInfo label="RIB" value={parametres.rib} />
              <LigneInfo
                label="Régime fiscal"
                value={REGIMES_FISCAUX[parametres.regimeFiscal]}
              />
              <LigneInfo
                label="TVA"
                value={
                  regimeSansTVA(parametres.regimeFiscal)
                    ? "Non applicable"
                    : `${parametres.tauxTVA} %${parametres.assujettiTVA ? " · assujetti" : ""}`
                }
              />
              <LigneInfo
                label="Signature"
                value={parametres.signatureNom}
              />
              <div className="sm:col-span-2">
                <LigneInfo
                  label="Conditions de paiement"
                  value={parametres.conditionsPaiementDefaut}
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={ouvrirEdition}
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setApercu(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
