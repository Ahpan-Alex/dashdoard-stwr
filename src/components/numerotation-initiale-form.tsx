"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  clampProchainNumeroPiece,
  formatNumeroPieceEffectif,
  nextNumeroSelonFormat,
  PIECES_NUMEROTEES,
  prochainNumeroPieceEffectif,
} from "@/lib/numerotation-pieces";
import { useStore } from "@/lib/store";
import type { ProchainsNumerosPieces, TypePieceNumerotee } from "@/lib/types";

function numerosExistants(
  type: TypePieceNumerotee,
  etat: {
    devis: { numero: string }[];
    commandes: { numero: string }[];
    bonsDeLivraison: { numero: string }[];
    bonsDePreparation?: { numero: string }[];
    factures: { numero: string }[];
  },
) {
  if (type === "devis") return etat.devis.map((d) => d.numero);
  if (type === "commande") return etat.commandes.map((c) => c.numero);
  if (type === "livraison") return etat.bonsDeLivraison.map((b) => b.numero);
  if (type === "preparation") {
    return (etat.bonsDePreparation ?? []).map((b) => b.numero);
  }
  return etat.factures.map((f) => f.numero);
}

export function NumerotationInitialeForm() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const devis = useStore((s) => s.devis);
  const commandes = useStore((s) => s.commandes);
  const bonsDeLivraison = useStore((s) => s.bonsDeLivraison);
  const bonsDePreparation = useStore((s) => s.bonsDePreparation ?? []);
  const factures = useStore((s) => s.factures);

  const [valeurs, setValeurs] = useState<Record<TypePieceNumerotee, string>>(
    () => ({
      devis: String(prochainNumeroPieceEffectif(parametres, "devis")),
      commande: String(prochainNumeroPieceEffectif(parametres, "commande")),
      livraison: String(prochainNumeroPieceEffectif(parametres, "livraison")),
      preparation: String(prochainNumeroPieceEffectif(parametres, "preparation")),
      facture_client: String(
        prochainNumeroPieceEffectif(parametres, "facture_client"),
      ),
    }),
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setValeurs({
      devis: String(prochainNumeroPieceEffectif(parametres, "devis")),
      commande: String(prochainNumeroPieceEffectif(parametres, "commande")),
      livraison: String(prochainNumeroPieceEffectif(parametres, "livraison")),
      preparation: String(prochainNumeroPieceEffectif(parametres, "preparation")),
      facture_client: String(
        prochainNumeroPieceEffectif(parametres, "facture_client"),
      ),
    });
  }, [parametres.prochainsNumerosPieces]);

  const etatDocs = useMemo(
    () => ({ devis, commandes, bonsDeLivraison, bonsDePreparation, factures }),
    [bonsDeLivraison, bonsDePreparation, commandes, devis, factures],
  );

  function enregistrer(e: FormEvent) {
    e.preventDefault();
    const prochains: ProchainsNumerosPieces = {
      devis: clampProchainNumeroPiece(valeurs.devis),
      commande: clampProchainNumeroPiece(valeurs.commande),
      livraison: clampProchainNumeroPiece(valeurs.livraison),
      preparation: clampProchainNumeroPiece(valeurs.preparation),
      facture_client: clampProchainNumeroPiece(valeurs.facture_client),
    };
    updateParametres({ prochainsNumerosPieces: prochains });
    setValeurs({
      devis: String(prochains.devis),
      commande: String(prochains.commande),
      livraison: String(prochains.livraison),
      preparation: String(prochains.preparation),
      facture_client: String(prochains.facture_client),
    });
    setMessage(
      "Prochains numéros enregistrés. Les nouvelles pièces partiront de ces compteurs si aucun document plus élevé n’existe déjà.",
    );
  }

  return (
    <form
      onSubmit={enregistrer}
      className="max-w-xl rounded-[var(--radius)] border border-line bg-card p-5"
    >
      <h2 className="mb-1 font-display text-lg font-semibold">
        Prochains numéros
      </h2>
      <p className="mb-5 text-sm text-muted">
        Indiquez le prochain compteur à attribuer (hors préfixes). Exemple :
        devis à 16 et facture à 20 pour enchaîner une exploitation déjà
        commencée, sans ressaisir les anciens documents.
      </p>
      {message && <p className="mb-3 text-sm text-success">{message}</p>}

      <div className="space-y-4">
        {PIECES_NUMEROTEES.map((p) => {
          const format = formatNumeroPieceEffectif(parametres, p.type);
          const plancher = clampProchainNumeroPiece(valeurs[p.type]);
          const apercu = nextNumeroSelonFormat(
            format,
            numerosExistants(p.type, etatDocs),
            undefined,
            plancher,
          );
          return (
            <label
              key={p.type}
              className="block text-xs font-semibold text-muted"
            >
              {p.label} — prochain numéro
              <input
                type="number"
                min={1}
                className="input mt-1 max-w-xs"
                value={valeurs[p.type]}
                onChange={(e) =>
                  setValeurs((v) => ({ ...v, [p.type]: e.target.value }))
                }
                required
              />
              <span className="mt-1 block font-normal text-[11px]">
                Prochaine pièce :{" "}
                <span className="font-mono font-semibold tracking-wide text-ink">
                  {apercu}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-muted">
        Si des pièces du même préfixe existent déjà avec un compteur plus
        élevé, Négoo continue après le plus grand n° déjà émis.
      </p>

      <button type="submit" className="btn btn-primary mt-5">
        Enregistrer
      </button>
    </form>
  );
}
