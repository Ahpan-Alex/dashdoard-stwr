"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useAlertes } from "@/lib/use-alertes";

export function AlertesCloche() {
  const { compteur } = useAlertes();
  return (
    <Link
      href="/alertes"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-sea-100 transition-colors hover:bg-white/10 hover:text-white"
      title={
        compteur > 0
          ? `${compteur} alerte${compteur > 1 ? "s" : ""} non lue${compteur > 1 ? "s" : ""}`
          : "Centre d'alertes"
      }
    >
      <Bell className="h-4 w-4" />
      {compteur > 0 && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
          {compteur > 99 ? "99+" : compteur}
        </span>
      )}
    </Link>
  );
}
