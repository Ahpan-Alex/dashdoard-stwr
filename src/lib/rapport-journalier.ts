import {
  eachDayOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  syntheseBenefices,
  type DateRange,
} from "@/lib/calculations";
import type {
  Charge,
  EntreeStock,
  Inventaire,
  Produit,
  RapportFinJournee,
  Vente,
} from "@/lib/types";

export type LigneRapportJournalier = {
  dateJour: string;
  label: string;
  pointDeVenteId: string | "tous";
  /** CA ventes du jour (Ar) */
  totalVentes: number;
  /** Marge brute CA − CMV (Ar) */
  margeRealisee: number;
  /** Coût des marchandises vendues */
  coutAchat: number;
  ecartStockAr: number;
  volAr: number;
  ecartCaisseAr: number;
  invenduAr: number;
  /** Somme des pertes saisies (vol + invendu + manques stock/caisse) */
  totalPertesSaisies: number;
  note?: string;
  rapportId?: string;
  saisi: boolean;
};

function emptySaisie(): Pick<
  LigneRapportJournalier,
  | "ecartStockAr"
  | "volAr"
  | "ecartCaisseAr"
  | "invenduAr"
  | "note"
  | "rapportId"
  | "saisi"
> {
  return {
    ecartStockAr: 0,
    volAr: 0,
    ecartCaisseAr: 0,
    invenduAr: 0,
    note: undefined,
    rapportId: undefined,
    saisi: false,
  };
}

export function totalPertesSaisies(r: {
  ecartStockAr: number;
  volAr: number;
  ecartCaisseAr: number;
  invenduAr: number;
}) {
  const stockManque = r.ecartStockAr < 0 ? Math.abs(r.ecartStockAr) : 0;
  const caisseManque = r.ecartCaisseAr < 0 ? Math.abs(r.ecartCaisseAr) : 0;
  return r.volAr + r.invenduAr + stockManque + caisseManque;
}

function saisiePourJour(
  rapports: RapportFinJournee[],
  dateJour: string,
  pointDeVenteId: string | "tous",
): ReturnType<typeof emptySaisie> {
  if (pointDeVenteId === "tous") {
    const duJour = rapports.filter((r) => r.dateJour === dateJour);
    if (duJour.length === 0) return emptySaisie();
    return duJour.reduce(
      (acc, r) => ({
        ecartStockAr: acc.ecartStockAr + r.ecartStockAr,
        volAr: acc.volAr + r.volAr,
        ecartCaisseAr: acc.ecartCaisseAr + r.ecartCaisseAr,
        invenduAr: acc.invenduAr + r.invenduAr,
        note: acc.note ?? r.note,
        rapportId: undefined,
        saisi: true,
      }),
      emptySaisie(),
    );
  }

  const r = rapports.find(
    (x) => x.dateJour === dateJour && x.pointDeVenteId === pointDeVenteId,
  );
  if (!r) return emptySaisie();
  return {
    ecartStockAr: r.ecartStockAr,
    volAr: r.volAr,
    ecartCaisseAr: r.ecartCaisseAr,
    invenduAr: r.invenduAr,
    note: r.note,
    rapportId: r.id,
    saisi: true,
  };
}

/**
 * Construit le rapport jour par jour sur une période :
 * ventes / marge calculées ; écarts / vol / caisse / invendu depuis la saisie.
 */
export function construireRapportsJournaliers(opts: {
  ventes: Vente[];
  entrees: EntreeStock[];
  charges: Charge[];
  produits: Produit[];
  inventaires?: Inventaire[];
  pointDeVenteId: string | "tous";
  range: DateRange;
  rapports: RapportFinJournee[];
}): LigneRapportJournalier[] {
  const {
    ventes,
    entrees,
    charges,
    produits,
    inventaires = [],
    pointDeVenteId,
    range,
    rapports,
  } = opts;

  const jours = eachDayOfInterval({
    start: startOfDay(range.debut),
    end: endOfDay(range.fin),
  });

  return jours
    .map((day) => {
      const dateJour = format(day, "yyyy-MM-dd");
      const bucket: DateRange = {
        debut: startOfDay(day),
        fin: endOfDay(day),
      };
      const syn = syntheseBenefices(
        ventes,
        entrees,
        charges,
        produits,
        pointDeVenteId,
        bucket,
        inventaires,
      );
      const saisie = saisiePourJour(rapports, dateJour, pointDeVenteId);

      return {
        dateJour,
        label: format(day, "EEE d MMM yyyy", { locale: fr }),
        pointDeVenteId,
        totalVentes: syn.ca,
        margeRealisee: syn.benefice,
        coutAchat: syn.coutAchat,
        ...saisie,
        totalPertesSaisies: totalPertesSaisies(saisie),
      };
    })
    .reverse();
}

export function findRapportFinJournee(
  rapports: RapportFinJournee[],
  dateJour: string,
  pointDeVenteId: string,
) {
  return rapports.find(
    (r) => r.dateJour === dateJour && r.pointDeVenteId === pointDeVenteId,
  );
}

export function parseDateJour(dateJour: string) {
  return parseISO(`${dateJour}T12:00:00`);
}
