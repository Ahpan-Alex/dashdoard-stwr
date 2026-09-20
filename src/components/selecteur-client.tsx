"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { libelleClient } from "@/lib/commercial";
import type { Client } from "@/lib/types";

function texteRecherche(c: Client) {
  return [c.code, c.nom, c.telephone, c.email, c.ville]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function SelecteurClient({
  clients,
  value,
  onChange,
  label = "Client",
  disabled,
}: {
  clients: Client[];
  value: string;
  onChange: (clientId: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const courant = clients.find((c) => c.id === value);
  const q = recherche.trim().toLowerCase();

  const options = useMemo(() => {
    const base = clients.filter((c) => c.actif || c.id === value);
    const filtrees = q
      ? base.filter((c) => texteRecherche(c).includes(q))
      : base;
    return filtrees.slice(0, 40);
  }, [clients, q, value]);

  function choisir(id: string) {
    onChange(id);
    setRecherche("");
    setOuvert(false);
  }

  const afficherRecherche = ouvert || !courant;

  return (
    <div className="block text-xs font-semibold text-muted">
      {label}
      {courant && !afficherRecherche ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="rounded-[var(--radius)] border border-line bg-card px-3 py-2 text-sm font-medium text-ink">
            {libelleClient(courant)}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            onClick={() => setOuvert(true)}
          >
            <Search className="h-4 w-4" />
            Changer
          </button>
        </div>
      ) : (
        <div className="mt-1 space-y-2">
          {!ouvert && !courant ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={disabled}
              onClick={() => setOuvert(true)}
            >
              <Search className="h-4 w-4" />
              Choisir ou rechercher le client
            </button>
          ) : (
            <>
              <input
                className="input"
                autoFocus
                disabled={disabled}
                placeholder="Rechercher (nom, code, téléphone…)"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
              <div className="max-h-48 overflow-auto rounded-[var(--radius)] border border-line bg-card">
                {options.length === 0 ? (
                  <p className="px-3 py-2 text-sm font-normal text-muted">
                    Aucun client pour cette recherche.
                  </p>
                ) : (
                  options.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm font-medium hover:bg-sea-50 ${
                        c.id === value ? "bg-sea-50 text-sea-800" : "text-ink"
                      }`}
                      onClick={() => choisir(c.id)}
                    >
                      {libelleClient(c)}
                      {c.telephone ? (
                        <span className="ml-2 font-normal text-muted">
                          {c.telephone}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
              {courant && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setOuvert(false);
                    setRecherche("");
                  }}
                >
                  Annuler
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
