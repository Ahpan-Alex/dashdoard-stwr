"use client";

import Link from "next/link";
import {
  codeTypeClientDefaut,
  libelleTypeClient,
  typesClientsActifs,
} from "@/lib/types-clients";
import { useStore } from "@/lib/store";

export function SelectTypeClient({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const typesClients = useStore((s) => s.typesClients);
  const actives = typesClientsActifs(typesClients);
  const courant =
    value && !actives.some((t) => t.code === value)
      ? typesClients.find((t) => t.code === value)
      : undefined;
  const options = courant ? [courant, ...actives] : actives;
  const selected = value || codeTypeClientDefaut(typesClients);

  return (
    <label className="block text-xs font-semibold text-muted">
      Type client
      <select
        className="select mt-1"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((t) => (
          <option key={t.id} value={t.code}>
            {t.libelle}
          </option>
        ))}
        {options.length === 0 && (
          <option value={selected}>{libelleTypeClient(undefined, selected)}</option>
        )}
      </select>
      <Link
        href="/parametres/types-clients"
        className="mt-1 inline-block text-[11px] font-semibold text-sea-700 underline"
      >
        Gérer les types de clients
      </Link>
    </label>
  );
}
