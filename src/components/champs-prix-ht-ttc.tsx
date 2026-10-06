"use client";

import { useEffect, useRef, useState } from "react";
import {
  messageMontantPrix,
  parserMontantPrix,
  saisiePrixHt,
  saisiePrixTtc,
  ttcAfficheDepuisHt,
} from "@/lib/prix-ttc";

type Props = {
  labelHt: string;
  labelTtc: string;
  ht: string;
  tauxPourcent: number;
  afficherTtc: boolean;
  required?: boolean;
  facultatif?: boolean;
  placeholder?: string;
  onHtChange: (ht: string) => void;
};

export function ChampsPrixHtTtc({
  labelHt,
  labelTtc,
  ht,
  tauxPourcent,
  afficherTtc,
  required,
  facultatif,
  placeholder,
  onHtChange,
}: Props) {
  const [ttc, setTtc] = useState(() =>
    afficherTtc ? (ttcAfficheDepuisHt(ht, tauxPourcent) ?? "") : "",
  );
  const [erreur, setErreur] = useState("");
  const saisieTtc = useRef(false);

  useEffect(() => {
    if (!afficherTtc || saisieTtc.current) return;
    const affiche = ttcAfficheDepuisHt(ht, tauxPourcent);
    if (affiche !== undefined) setTtc(affiche);
  }, [ht, tauxPourcent, afficherTtc]);

  function changerHt(raw: string) {
    if (!afficherTtc) {
      const lecture = parserMontantPrix(raw);
      if (lecture.etat === "vide") {
        onHtChange("");
        setErreur("");
        return;
      }
      onHtChange(raw);
      setErreur(messageMontantPrix(lecture) ?? "");
      return;
    }
    const resultat = saisiePrixHt(raw, ttc, tauxPourcent);
    onHtChange(resultat.ht);
    if (!resultat.erreur) setTtc(resultat.ttc);
    setErreur(resultat.erreur ?? "");
  }

  function changerTtc(raw: string) {
    const resultat = saisiePrixTtc(raw, ht, tauxPourcent);
    setTtc(resultat.ttc);
    if (!resultat.erreur) onHtChange(resultat.ht);
    setErreur(resultat.erreur ?? "");
  }

  return (
    <div
      className={
        afficherTtc ? "grid gap-3 sm:col-span-2 sm:grid-cols-2" : "contents"
      }
    >
      <label className="block text-xs font-semibold text-muted">
        {labelHt}
        {facultatif && <span className="font-normal"> (facultatif)</span>}
        <input
          className="input mt-1"
          inputMode="decimal"
          value={ht}
          required={required}
          placeholder={placeholder}
          onChange={(e) => changerHt(e.target.value)}
        />
      </label>
      {afficherTtc && (
        <label className="block text-xs font-semibold text-muted">
          {labelTtc}
          <input
            className="input mt-1"
            inputMode="decimal"
            value={ttc}
            onFocus={() => {
              saisieTtc.current = true;
            }}
            onBlur={() => {
              saisieTtc.current = false;
              const affiche = ttcAfficheDepuisHt(ht, tauxPourcent);
              if (affiche !== undefined) setTtc(affiche);
            }}
            onChange={(e) => changerTtc(e.target.value)}
          />
        </label>
      )}
      {erreur && (
        <p className="text-xs text-danger sm:col-span-2">{erreur}</p>
      )}
    </div>
  );
}
