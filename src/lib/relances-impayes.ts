import { resteAPayer } from "./commercial";
import { labelsTranchesBalanceAgee, normaliserTranchesBalanceAgee } from "./tiers";
import type {
  Acompte,
  Facture,
  Parametres,
  RelanceImpayee,
  RelanceImpayeeCanal,
} from "./types";

export const RELANCE_CANAUX: { id: RelanceImpayeeCanal; label: string }[] = [
  { id: "email", label: "E-mail" },
  { id: "telephone", label: "Téléphone" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "visite", label: "Visite" },
  { id: "courrier", label: "Courrier" },
];

export const RELANCE_CANAL_LABELS: Record<RelanceImpayeeCanal, string> =
  Object.fromEntries(RELANCE_CANAUX.map((c) => [c.id, c.label])) as Record<
    RelanceImpayeeCanal,
    string
  >;

export function jourCivilLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function jourDepuisIso(iso: string | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function joursEntre(debutJour: string, finJour: string) {
  if (!debutJour || !finJour) return 0;
  const a = new Date(`${debutJour}T12:00:00`);
  const b = new Date(`${finJour}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function factureEligibleRelance(f: Facture) {
  if (f.type === "avoir" || f.type === "proforma") return false;
  if (f.statut === "brouillon" || f.statut === "annulee" || f.statut === "proforma") {
    return false;
  }
  return true;
}

export function relancesDuneFacture(
  relances: RelanceImpayee[],
  factureId: string,
) {
  return [...relances]
    .filter((r) => r.factureId === factureId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function derniereRelanceFacture(
  relances: RelanceImpayee[],
  factureId: string,
) {
  return relancesDuneFacture(relances, factureId)[0];
}

export type FileRelance = {
  facture: Facture;
  reste: number;
  echeanceJour: string;
  joursRetard: number;
  trancheLabel: string;
  derniere?: RelanceImpayee;
  prochaine?: string;
  aRelancerAujourdhui: boolean;
  jamaisRelancee: boolean;
};

export function fileRelancesImpayes(opts: {
  factures: Facture[];
  acomptes: Acompte[];
  parametres: Parametres;
  relances: RelanceImpayee[];
  au?: Date;
}): FileRelance[] {
  const au = opts.au ?? new Date();
  const today = jourCivilLocal(au);
  const tranches = normaliserTranchesBalanceAgee(
    opts.parametres.tranchesBalanceAgeeJours,
  );
  const labels = labelsTranchesBalanceAgee(tranches);
  const out: FileRelance[] = [];

  for (const f of opts.factures) {
    if (!factureEligibleRelance(f)) continue;
    const reste = resteAPayer(f, opts.parametres, opts.acomptes, opts.factures);
    if (!(reste > 0.5)) continue;
    const echeanceJour = jourDepuisIso(f.echeance || f.date);
    const age = Math.max(0, joursEntre(echeanceJour, today));
    const joursRetard = echeanceJour < today ? age : 0;
    let trancheLabel = labels[labels.length - 1] ?? "Plus";
    for (let i = 0; i < tranches.length; i++) {
      const max = tranches[i];
      const min = i === 0 ? 0 : tranches[i - 1] + 1;
      if (age <= max) {
        trancheLabel = labels[i] ?? `${min}–${max} j`;
        break;
      }
    }
    const derniere = derniereRelanceFacture(opts.relances, f.id);
    const prochaine = derniere?.prochaineRelance
      ? jourDepuisIso(derniere.prochaineRelance)
      : undefined;
    const jamaisRelancee = !derniere;
    const aRelancerAujourdhui =
      joursRetard > 0 || jamaisRelancee || Boolean(prochaine && prochaine <= today);

    out.push({
      facture: f,
      reste,
      echeanceJour,
      joursRetard,
      trancheLabel,
      derniere,
      prochaine,
      aRelancerAujourdhui,
      jamaisRelancee,
    });
  }

  out.sort((a, b) => {
    if (a.aRelancerAujourdhui !== b.aRelancerAujourdhui) {
      return a.aRelancerAujourdhui ? -1 : 1;
    }
    if (a.joursRetard !== b.joursRetard) return b.joursRetard - a.joursRetard;
    return a.echeanceJour.localeCompare(b.echeanceJour);
  });
  return out;
}

export function corpsMailtoRelance(opts: {
  numero: string;
  date: string;
  reste: string;
  echeance?: string;
}) {
  const lignes = [
    "Bonjour,",
    "",
    `Sauf erreur de notre part, la facture ${opts.numero} du ${opts.date} reste due pour ${opts.reste}.`,
  ];
  if (opts.echeance) {
    lignes.push(`Échéance : ${opts.echeance}.`);
  }
  lignes.push("", "Merci de nous indiquer la date de règlement.", "", "Cordialement");
  return lignes.join("\n");
}
