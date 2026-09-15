"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  apercuNumeroPiece,
  clampLongueurNumeroPiece,
  FORMATS_DATE_NUMERO,
  LONGUEUR_NUMERO_PIECE_MAX,
  LONGUEUR_NUMERO_PIECE_MIN,
  normaliserFormatNumeroPiece,
  sanitiserPrefixeNumero,
} from "@/lib/numerotation-pieces";
import { useStore } from "@/lib/store";
import type { FormatDateNumeroPiece, TypePieceNumerotee } from "@/lib/types";

export function FormatNumeroPieceForm({
  type,
  title,
}: {
  type: TypePieceNumerotee;
  title: string;
}) {
  const parametres = useStore((s) => s.parametres);
  const updateParametres = useStore((s) => s.updateParametres);
  const actuel = useMemo(
    () =>
      normaliserFormatNumeroPiece(type, parametres.formatsNumeroPieces?.[type]),
    [parametres.formatsNumeroPieces, type],
  );
  const [prefixeLibre, setPrefixeLibre] = useState(actuel.prefixeLibre);
  const [formatDate, setFormatDate] = useState<FormatDateNumeroPiece>(
    actuel.formatDate,
  );
  const [longueurNumero, setLongueurNumero] = useState(
    String(actuel.longueurNumero),
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPrefixeLibre(actuel.prefixeLibre);
    setFormatDate(actuel.formatDate);
    setLongueurNumero(String(actuel.longueurNumero));
  }, [actuel]);

  const brouillon = useMemo(
    () =>
      normaliserFormatNumeroPiece(type, {
        prefixeLibre,
        formatDate,
        longueurNumero: Number(longueurNumero),
      }),
    [formatDate, longueurNumero, prefixeLibre, type],
  );
  const apercu = apercuNumeroPiece(brouillon);

  function enregistrer(e: FormEvent) {
    e.preventDefault();
    const format = normaliserFormatNumeroPiece(type, {
      prefixeLibre: sanitiserPrefixeNumero(prefixeLibre),
      formatDate,
      longueurNumero: clampLongueurNumeroPiece(Number(longueurNumero)),
    });
    updateParametres({
      formatsNumeroPieces: {
        ...parametres.formatsNumeroPieces,
        [type]: format,
      },
    });
    setPrefixeLibre(format.prefixeLibre);
    setLongueurNumero(String(format.longueurNumero));
    setMessage("Format enregistré. Les prochains documents suivront ce modèle.");
  }

  return (
    <form
      onSubmit={enregistrer}
      className="max-w-xl rounded-[var(--radius)] border border-line bg-card p-5"
    >
      <h2 className="mb-1 font-display text-lg font-semibold">{title}</h2>
      <p className="mb-5 text-sm text-muted">
        Premier préfixe libre, puis l’année (4 ou 2 caractères) ou l’année et le
        mois. La longueur ne compte que le numéro séquentiel.
      </p>
      {message && <p className="mb-3 text-sm text-success">{message}</p>}

      <label className="mb-4 block text-xs font-semibold text-muted">
        Premier préfixe (texte libre)
        <input
          className="input mt-1 font-mono uppercase"
          value={prefixeLibre}
          onChange={(e) => setPrefixeLibre(e.target.value)}
          placeholder="DEV"
          maxLength={12}
        />
      </label>

      <fieldset className="mb-4">
        <legend className="mb-2 text-xs font-semibold text-muted">
          Deuxième préfixe
        </legend>
        <div className="grid gap-2">
          {FORMATS_DATE_NUMERO.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius)] border px-3 py-2 text-sm ${
                formatDate === opt.id
                  ? "border-sea-400 bg-sea-50"
                  : "border-line"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`format-date-${type}`}
                  checked={formatDate === opt.id}
                  onChange={() => setFormatDate(opt.id)}
                />
                {opt.label}
              </span>
              <span className="font-mono text-xs text-muted">{opt.exemple}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mb-4 block max-w-xs text-xs font-semibold text-muted">
        Longueur du numéro (hors préfixes)
        <input
          type="number"
          min={LONGUEUR_NUMERO_PIECE_MIN}
          max={LONGUEUR_NUMERO_PIECE_MAX}
          className="input mt-1"
          value={longueurNumero}
          onChange={(e) => setLongueurNumero(e.target.value)}
        />
        <span className="mt-1 block font-normal text-[11px]">
          De {LONGUEUR_NUMERO_PIECE_MIN} à {LONGUEUR_NUMERO_PIECE_MAX} chiffres.
          Le compteur reprend à 1 à chaque changement de préfixe de date.
        </span>
      </label>

      <p className="mb-5 rounded-[var(--radius)] bg-sea-50 px-3 py-2 text-sm">
        Aperçu :{" "}
        <span className="font-mono font-semibold tracking-wide">{apercu}</span>
      </p>

      <button type="submit" className="btn btn-primary">
        Enregistrer
      </button>
    </form>
  );
}
