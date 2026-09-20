"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { NumerotationInitialeForm } from "@/components/numerotation-initiale-form";
import {
  apercuNumeroPiece,
  clampLongueurNumeroPiece,
  FORMATS_DATE_NUMERO,
  LONGUEUR_NUMERO_PIECE_MAX,
  LONGUEUR_NUMERO_PIECE_MIN,
  normaliserFormatNumeroPiece,
  PIECES_NUMEROTEES,
  sanitiserPrefixeNumero,
} from "@/lib/numerotation-pieces";
import { useStore } from "@/lib/store";
import type { FormatDateNumeroPiece, FormatNumeroPiece, TypePieceNumerotee } from "@/lib/types";

type LigneBrouillon = {
  prefixeLibre: string;
  formatDate: FormatDateNumeroPiece;
  longueurNumero: string;
};

function ligneDepuisFormat(format: FormatNumeroPiece): LigneBrouillon {
  return {
    prefixeLibre: format.prefixeLibre,
    formatDate: format.formatDate,
    longueurNumero: String(format.longueurNumero),
  };
}

export function NumerotationPiecesTable() {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);

  const formatsActuels = useMemo(() => {
    const out: Record<TypePieceNumerotee, FormatNumeroPiece> = {} as Record<
      TypePieceNumerotee,
      FormatNumeroPiece
    >;
    for (const p of PIECES_NUMEROTEES) {
      out[p.type] = normaliserFormatNumeroPiece(
        p.type,
        parametres.formatsNumeroPieces?.[p.type],
      );
    }
    return out;
  }, [parametres.formatsNumeroPieces]);

  const [lignes, setLignes] = useState<Record<string, LigneBrouillon>>(() => {
    const init: Record<string, LigneBrouillon> = {};
    for (const p of PIECES_NUMEROTEES) {
      init[p.type] = ligneDepuisFormat(formatsActuels[p.type]);
    }
    return init;
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sync: Record<string, LigneBrouillon> = {};
    for (const p of PIECES_NUMEROTEES) {
      sync[p.type] = ligneDepuisFormat(formatsActuels[p.type]);
    }
    setLignes(sync);
  }, [formatsActuels]);

  function patcher(type: TypePieceNumerotee, patch: Partial<LigneBrouillon>) {
    setMessage(null);
    setLignes((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...patch },
    }));
  }

  function enregistrer(e: FormEvent) {
    e.preventDefault();
    const formats = { ...parametres.formatsNumeroPieces };
    for (const p of PIECES_NUMEROTEES) {
      const ligne = lignes[p.type];
      formats[p.type] = normaliserFormatNumeroPiece(p.type, {
        prefixeLibre: sanitiserPrefixeNumero(ligne.prefixeLibre),
        formatDate: ligne.formatDate,
        longueurNumero: clampLongueurNumeroPiece(Number(ligne.longueurNumero)),
      });
    }
    updateParametres({ formatsNumeroPieces: formats });
    const sync: Record<string, LigneBrouillon> = {};
    for (const p of PIECES_NUMEROTEES) {
      sync[p.type] = ligneDepuisFormat(
        normaliserFormatNumeroPiece(p.type, formats[p.type]),
      );
    }
    setLignes(sync);
    setMessage("Formats enregistrés. Les prochains documents suivront ce modèle.");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={enregistrer}
        className="rounded-[var(--radius)] border border-line bg-card p-5"
      >
        <h2 className="font-display text-lg font-semibold">
          Numérotation des pièces
        </h2>
        <p className="mt-1 text-sm text-muted">
          Une ligne par type de document. Premier préfixe libre, puis l&apos;année
          ou l&apos;année-mois. La longueur ne compte que le numéro séquentiel.
        </p>
        {message && <p className="mt-3 text-sm text-success">{message}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Pièce</th>
                <th>Préfixe</th>
                <th>Date</th>
                <th>Longueur</th>
                <th>Aperçu</th>
              </tr>
            </thead>
            <tbody>
              {PIECES_NUMEROTEES.map((p) => {
                const ligne = lignes[p.type] ?? ligneDepuisFormat(formatsActuels[p.type]);
                const apercu = apercuNumeroPiece(
                  normaliserFormatNumeroPiece(p.type, {
                    prefixeLibre: ligne.prefixeLibre,
                    formatDate: ligne.formatDate,
                    longueurNumero: Number(ligne.longueurNumero),
                  }),
                );
                return (
                  <tr key={p.type}>
                    <td>
                      <p className="font-medium">{p.label}</p>
                      <p className="text-xs text-muted">{p.description}</p>
                    </td>
                    <td>
                      <input
                        className="input font-mono uppercase"
                        value={ligne.prefixeLibre}
                        onChange={(e) =>
                          patcher(p.type, { prefixeLibre: e.target.value })
                        }
                        maxLength={12}
                      />
                    </td>
                    <td>
                      <select
                        className="select"
                        value={ligne.formatDate}
                        onChange={(e) =>
                          patcher(p.type, {
                            formatDate: e.target.value as FormatDateNumeroPiece,
                          })
                        }
                      >
                        {FORMATS_DATE_NUMERO.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={LONGUEUR_NUMERO_PIECE_MIN}
                        max={LONGUEUR_NUMERO_PIECE_MAX}
                        className="input w-20"
                        value={ligne.longueurNumero}
                        onChange={(e) =>
                          patcher(p.type, { longueurNumero: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <span className="font-mono text-sm font-semibold tracking-wide">
                        {apercu}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td>
                  <p className="font-medium">Facture fournisseur</p>
                  <p className="text-xs text-muted">
                    Pas de format automatique : on reprend le n° saisi sur la
                    commande d&apos;achat.
                  </p>
                </td>
                <td colSpan={4} className="text-sm text-muted">
                  Saisi à la main
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button type="submit" className="btn btn-primary mt-4">
          Enregistrer les formats
        </button>
      </form>

      <NumerotationInitialeForm />
    </div>
  );
}
