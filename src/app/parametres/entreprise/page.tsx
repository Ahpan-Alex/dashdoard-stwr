"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { REGIMES_FISCAUX } from "@/lib/commercial";
import { fileToLogoDataUrl } from "@/lib/logo";
import { useStore } from "@/lib/store";
import type { RegimeFiscal } from "@/lib/types";

export default function ParametresEntreprisePage() {
  const { parametres, updateParametres } = useStore();
  const [logoError, setLogoError] = useState<string | null>(null);
  const [entreprise, setEntreprise] = useState({
    nomEntreprise: parametres.nomEntreprise,
    formeJuridique: parametres.formeJuridique,
    capital: String(parametres.capital),
    nif: parametres.nif,
    stat: parametres.stat,
    rcs: parametres.rcs,
    adresse: parametres.adresse,
    ville: parametres.ville,
    telephone: parametres.telephone,
    email: parametres.email,
    rib: parametres.rib,
    banque: parametres.banque,
    tauxTVA: String(parametres.tauxTVA),
    assujettiTVA: parametres.assujettiTVA,
    regimeFiscal: parametres.regimeFiscal,
    conditionsPaiementDefaut: parametres.conditionsPaiementDefaut,
    logoDataUrl: parametres.logoDataUrl ?? "",
  });

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
      tauxTVA: Number(entreprise.tauxTVA) || 20,
      assujettiTVA: entreprise.assujettiTVA,
      regimeFiscal: entreprise.regimeFiscal,
      conditionsPaiementDefaut: entreprise.conditionsPaiementDefaut.trim(),
      logoDataUrl: entreprise.logoDataUrl || undefined,
    });
    alert("Paramètres entreprise enregistrés.");
  }

  return (
    <div>
      <PageHeader
        title="Entreprise & fiscalité"
        description="Identité légale et fiscale malagasy de l'entreprise."
        showPosSelector={false}
      />
      <ParametresSubnav />

      <form
        onSubmit={saveEntreprise}
        className="grid gap-4 rounded-[var(--radius)] border border-line bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
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
              PNG, JPG ou WebP · max. 2,5 Mo · affiché sur devis, commandes et
              factures (activable dans Modèles documents).
            </p>
            {logoError && (
              <p className="w-full text-sm text-danger">{logoError}</p>
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
            onChange={(e) =>
              setEntreprise({
                ...entreprise,
                regimeFiscal: e.target.value as RegimeFiscal,
              })
            }
          >
            {Object.entries(REGIMES_FISCAUX).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
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
        <div className="sm:col-span-2 lg:col-span-3">
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
          <p className="mt-2 text-xs text-muted">
            Devise : Ariary (Ar). NIF et STAT sont obligatoires sur les
            documents commerciaux à Madagascar.
          </p>
        </div>
      </form>
    </div>
  );
}
