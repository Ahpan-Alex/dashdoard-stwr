"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AdresseTiersFields } from "@/components/adresse-tiers-fields";
import {
  adresseCourrierEffective,
  adresseFacturationEffective,
  adressePrincipaleEffective,
  adresseTiersVide,
  synchroniserAdresseLegacy,
} from "@/lib/adresse-tiers";
import { createId } from "@/lib/id";
import type { AdresseTiers, Tiers } from "@/lib/types";

type Props = {
  tiers: Tiers;
  onSave: (patch: Partial<Tiers>) => { ok: boolean; reason?: string };
};

export function TiersAdressePanel({ tiers, onSave }: Props) {
  const [principale, setPrincipale] = useState<AdresseTiers>(() =>
    adressePrincipaleEffective(tiers),
  );
  const [memeCourrier, setMemeCourrier] = useState(
    tiers.memeAdresseCourrier !== false,
  );
  const [memeFacturation, setMemeFacturation] = useState(
    tiers.memeAdresseFacturation !== false,
  );
  const [memeLivraison, setMemeLivraison] = useState(
    tiers.memeAdresseLivraison !== false,
  );
  const [courrier, setCourrier] = useState<AdresseTiers>(() =>
    adresseCourrierEffective(tiers),
  );
  const [facturation, setFacturation] = useState<AdresseTiers>(() =>
    adresseFacturationEffective(tiers),
  );
  const [livraisons, setLivraisons] = useState<AdresseTiers[]>(() => {
    const list = tiers.adressesLivraison ?? [];
    return list.length ? list.map((a) => adresseTiersVide(a)) : [adresseTiersVide()];
  });

  function enregistrer() {
    const legacy = synchroniserAdresseLegacy({ adressePrincipale: principale });
    const res = onSave({
      adressePrincipale: principale,
      memeAdresseCourrier: memeCourrier,
      memeAdresseFacturation: memeFacturation,
      memeAdresseLivraison: memeLivraison,
      adresseCourrier: memeCourrier ? undefined : courrier,
      adresseFacturation: memeFacturation ? undefined : facturation,
      adressesLivraison: memeLivraison
        ? []
        : livraisons.map((a) => ({
            ...a,
            id: a.id || createId("adr"),
          })),
      adresse: legacy.adresse,
      ville: legacy.ville,
    });
    if (!res.ok) alert(res.reason ?? "Enregistrement impossible.");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Adresse principale
        </h2>
        <AdresseTiersFields value={principale} onChange={setPrincipale} />
      </section>

      <UsageAdresse
        titre="Courrier"
        meme={memeCourrier}
        onMeme={(v) => {
          setMemeCourrier(v);
          if (!v) setCourrier(adressePrincipaleEffective({ ...tiers, adressePrincipale: principale }));
        }}
        adresse={courrier}
        onChange={setCourrier}
      />

      <UsageAdresse
        titre="Facturation"
        meme={memeFacturation}
        onMeme={(v) => {
          setMemeFacturation(v);
          if (!v) {
            setFacturation(
              adressePrincipaleEffective({ ...tiers, adressePrincipale: principale }),
            );
          }
        }}
        adresse={facturation}
        onChange={setFacturation}
      />

      <section className="rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">Livraison</h2>
        <p className="mb-3 text-xs text-muted">
          Plusieurs sites ou dépôts possibles. Le courrier et la facturation
          restent uniques.
        </p>
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={memeLivraison}
            onChange={(e) => {
              const v = e.target.checked;
              setMemeLivraison(v);
              if (!v && livraisons.length === 0) {
                setLivraisons([
                  adresseTiersVide(
                    adressePrincipaleEffective({
                      ...tiers,
                      adressePrincipale: principale,
                    }),
                  ),
                ]);
              }
            }}
          />
          Utiliser la même adresse
        </label>
        {memeLivraison ? (
          <p className="text-sm text-muted">
            Les livraisons utilisent l&apos;adresse principale.
          </p>
        ) : (
          <div className="space-y-4">
            {livraisons.map((a, i) => (
              <div
                key={a.id ?? i}
                className="rounded-lg border border-line p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Site / dépôt {i + 1}
                  </p>
                  {livraisons.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        setLivraisons(livraisons.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Retirer
                    </button>
                  )}
                </div>
                <AdresseTiersFields
                  showLibelle
                  value={a}
                  onChange={(next) =>
                    setLivraisons(
                      livraisons.map((x, j) => (j === i ? next : x)),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setLivraisons([
                  ...livraisons,
                  adresseTiersVide({ id: createId("adr") }),
                ])
              }
            >
              <Plus className="h-4 w-4" />
              Ajouter un site de livraison
            </button>
          </div>
        )}
      </section>

      <button type="button" className="btn btn-primary" onClick={enregistrer}>
        Enregistrer les adresses
      </button>
    </div>
  );
}

function UsageAdresse({
  titre,
  meme,
  onMeme,
  adresse,
  onChange,
}: {
  titre: string;
  meme: boolean;
  onMeme: (v: boolean) => void;
  adresse: AdresseTiers;
  onChange: (a: AdresseTiers) => void;
}) {
  return (
    <section className="rounded-[var(--radius)] border border-line bg-card p-5">
      <h2 className="mb-3 font-display text-lg font-semibold">{titre}</h2>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={meme}
          onChange={(e) => onMeme(e.target.checked)}
        />
        Utiliser la même adresse
      </label>
      {meme ? (
        <p className="text-sm text-muted">Identique à l&apos;adresse principale.</p>
      ) : (
        <AdresseTiersFields value={adresse} onChange={onChange} />
      )}
    </section>
  );
}
