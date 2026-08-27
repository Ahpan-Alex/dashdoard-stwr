"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ParametresSubnav } from "@/components/parametres-subnav";
import { useStore } from "@/lib/store";

export default function ParametresBilanInitialPage() {
  const { bilanInitial, updateBilanInitial, parametres } = useStore();

  const [ouverture, setOuverture] = useState({
    date: bilanInitial.date.slice(0, 10),
    immobilisations: String(bilanInitial.immobilisations),
    stocks: String(bilanInitial.stocks),
    creancesClients: String(bilanInitial.creancesClients),
    disponibilites: String(bilanInitial.disponibilites),
    capital: String(bilanInitial.capital),
    dettesFournisseurs: String(bilanInitial.dettesFournisseurs),
    dettesSociales: String(bilanInitial.dettesSociales),
    emprunts: String(bilanInitial.emprunts),
    resultatReporte: String(bilanInitial.resultatReporte),
    compteCourantAssocie: String(bilanInitial.compteCourantAssocie ?? 0),
  });

  function saveOuverture(e: FormEvent) {
    e.preventDefault();
    updateBilanInitial({
      date: new Date(`${ouverture.date}T12:00:00`).toISOString(),
      immobilisations: Number(ouverture.immobilisations) || 0,
      stocks: Number(ouverture.stocks) || 0,
      creancesClients: Number(ouverture.creancesClients) || 0,
      disponibilites: Number(ouverture.disponibilites) || 0,
      capital: Number(ouverture.capital) || 0,
      dettesFournisseurs: Number(ouverture.dettesFournisseurs) || 0,
      dettesSociales: Number(ouverture.dettesSociales) || 0,
      emprunts: Number(ouverture.emprunts) || 0,
      resultatReporte: Number(ouverture.resultatReporte) || 0,
      compteCourantAssocie: Number(ouverture.compteCourantAssocie) || 0,
    });
    alert("Bilan initial enregistré.");
  }

  const field = (label: string, key: keyof typeof ouverture) => (
    <label key={key} className="block text-xs font-semibold text-muted">
      {label}
      <input
        type={key === "date" ? "date" : "number"}
        step={key === "date" ? undefined : "1000"}
        className="input mt-1"
        value={ouverture[key]}
        onChange={(e) =>
          setOuverture({ ...ouverture, [key]: e.target.value })
        }
      />
    </label>
  );

  return (
    <div>
      <PageHeader
        title="Bilan initial"
        description={`Soldes d'ouverture — ${parametres.nomEntreprise}`}
        showPosSelector={false}
        actions={
          <div className="flex gap-2">
            <Link href="/compte-courant" className="btn btn-secondary">
              Compte courant
            </Link>
            <Link href="/bilan" className="btn btn-secondary">
              <FileSpreadsheet className="h-4 w-4" />
              Voir le bilan
            </Link>
          </div>
        }
      />
      <ParametresSubnav />

      <section className="rounded-[var(--radius)] border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">
          Soldes d&apos;ouverture
        </h2>
        <p className="mb-4 text-xs text-muted">
          Base du bilan instantané. Le détail des stocks se paramètre aussi
          dans Stock initial.
        </p>
        <form
          onSubmit={saveOuverture}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {field("Date d'ouverture", "date")}
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Actif d&apos;ouverture
            </p>
          </div>
          {field("Immobilisations (Ar)", "immobilisations")}
          {field("Stocks (Ar)", "stocks")}
          {field("Créances clients (Ar)", "creancesClients")}
          {field("Disponibilités (Ar)", "disponibilites")}
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sea-700">
              Passif d&apos;ouverture
            </p>
          </div>
          {field("Capital (Ar)", "capital")}
          {field("Résultat reporté (Ar)", "resultatReporte")}
          {field("Emprunts (Ar)", "emprunts")}
          {field("Dettes fournisseurs (Ar)", "dettesFournisseurs")}
          {field("Dettes sociales (Ar)", "dettesSociales")}
          {field("Compte courant d'associé (Ar, + crédit / − débit)", "compteCourantAssocie")}
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className="btn btn-primary">
              Enregistrer le bilan initial
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
