"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  SEUIL_ALERTE_COMPTE_COURANT,
  alerteCompteCourant,
} from "@/lib/compte-courant";
import { formatCurrency } from "@/lib/format";

export function AlerteCompteCourant({
  solde,
  compact = false,
}: {
  solde: number;
  compact?: boolean;
}) {
  const niveau = alerteCompteCourant(solde);
  if (!niveau) return null;

  const debiteur = niveau === "debiteur";

  return (
    <div
      className={`flex items-start gap-3 rounded-[var(--radius)] border p-4 ${
        debiteur
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
      role="status"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        {debiteur ? (
          <>
            <p className="font-semibold">Compte courant en position débitrice</p>
            <p className={compact ? "mt-0.5 text-xs opacity-90" : "mt-1"}>
              Solde actuel : {formatCurrency(solde)}. L&apos;associé doit{" "}
              {formatCurrency(Math.abs(solde))} à l&apos;entreprise. L&apos;opération
              n&apos;est pas bloquée — cette alerte est uniquement préventive.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold">
              Seuil d&apos;alerte atteint ({formatCurrency(SEUIL_ALERTE_COMPTE_COURANT)}{" "}
              de crédit restant)
            </p>
            <p className={compact ? "mt-0.5 text-xs opacity-90" : "mt-1"}>
              Solde créditeur : {formatCurrency(solde)}. Un retrait supplémentaire
              ferait basculer le compte en débit. Vous pouvez poursuivre, l&apos;alerte
              n&apos;empêche pas la saisie.
            </p>
          </>
        )}
        {!compact && (
          <Link
            href="/compte-courant"
            className="mt-2 inline-block text-xs font-semibold underline-offset-2 hover:underline"
          >
            Gérer le compte courant
          </Link>
        )}
      </div>
    </div>
  );
}
