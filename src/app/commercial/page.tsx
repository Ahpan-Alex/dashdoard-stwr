"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Package,
  ScrollText,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  caFactures,
  creancesClientsFactures,
  totauxDevis,
} from "@/lib/commercial";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

const cards = [
  {
    href: "/clients",
    title: "Clients",
    description: "Fiches clients + NIF professionnel",
    icon: Users,
  },
  {
    href: "/fournisseurs",
    title: "Fournisseurs",
    description: "Partenaires d'achat",
    icon: Truck,
  },
  {
    href: "/devis",
    title: "Devis",
    description: "Propositions → conversion commande",
    icon: FileText,
  },
  {
    href: "/commandes",
    title: "Commandes",
    description: "Bons de commande clients",
    icon: ClipboardList,
  },
  {
    href: "/bons-de-livraison",
    title: "Bons de livraison",
    description: "Livraisons → conversion facture",
    icon: Package,
  },
  {
    href: "/acomptes",
    title: "Acomptes",
    description: "Encaissements + factures d'acompte",
    icon: Wallet,
  },
  {
    href: "/factures",
    title: "Factures",
    description: "Standard, acompte, solde (MG)",
    icon: ScrollText,
  },
];

export default function CommercialPage() {
  const {
    clients,
    devis,
    commandes,
    factures,
    acomptes,
    parametres,
    pointDeVenteActifId,
  } = useStore();

  const devisOuverts = devis.filter((d) =>
    ["brouillon", "envoye"].includes(d.statut),
  );
  const montantDevis = devisOuverts.reduce(
    (s, d) => s + totauxDevis(d, parametres).totalTTC,
    0,
  );
  const creances = creancesClientsFactures(factures, parametres, acomptes);
  const caFac = caFactures(factures, pointDeVenteActifId, parametres);
  const totalAcomptes = acomptes
    .filter((a) => a.statut !== "annule")
    .reduce((s, a) => s + a.montantTTC, 0);

  return (
    <div>
      <PageHeader
        title="Gestion commerciale"
        description="Cycle devis → commande → bon de livraison → acompte → facture, conforme aux mentions fiscales malagasy."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Clients actifs
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatNumber(clients.filter((c) => c.actif).length, 0)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Devis en cours
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(montantDevis)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Commandes / acomptes
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatNumber(commandes.length, 0)} /{" "}
            {formatCurrency(totalAcomptes)}
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-line bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            CA facturé / créances
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {formatCurrency(caFac)}
          </p>
          <p className="mt-1 text-xs text-coral">
            Créances {formatCurrency(creances)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start justify-between gap-4 rounded-[var(--radius)] border border-line bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sea-100 text-sea-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-sea-700" />
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted">
        Mentions obligatoires : NIF, STAT, numérotation, totaux HT/TVA/TTC.
        Personnalisez les modèles dans Paramétrage → Modèles documents
        (`/parametres/modeles`).
      </p>
    </div>
  );
}
