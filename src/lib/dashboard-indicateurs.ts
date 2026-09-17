import {
  differenceInCalendarDays,
  endOfMonth,
  endOfYear,
  parseISO,
  startOfMonth,
  startOfYear,
  subYears,
} from "date-fns";
import { achatImpacteCompteResultat, livraisonsActives, montantAchatsHT } from "./achats";
import { inDateRange, type DateRange, calculerStocks } from "./calculations";
import { resteAPayer, totauxFacture } from "./commercial";
import { caHtFacturesPeriode, syntheseRentabiliteDeuxPaliers } from "./rentabilite";
import { historiqueFournisseursProduit } from "./classement-fournisseurs";
import { depenseEnAttenteReclassement } from "./comptabilite";
import { lignesMainOeuvre, reliquatsMatieres } from "./fabrication";
import { achatConcerneSite, siteEstAtelier } from "./sites";
import {
  fondsValidesMission,
  totalDepenseMission,
  totalDepensesDiverses,
} from "./missions";
import { libelleNatureDepense } from "./natures-depense-mission";
import { natureStockDuProduit, NATURE_STOCK_LABELS } from "./nature-stock";
import { libelleProduit } from "./produits";
import {
  labelsTranchesBalanceAgee,
  normaliserTranchesBalanceAgee,
  balanceAgeeClient,
} from "./tiers";
import type {
  Achat,
  Acompte,
  Commande,
  Devis,
  EntreeStock,
  Facture,
  Inventaire,
  JournalAudit,
  MissionAchat,
  NatureDepenseMission,
  OrdreFabrication,
  Parametres,
  PointDeVente,
  Produit,
  TransformationCommerciale,
  Vente,
  CategorieProduit,
} from "./types";

function ofDuSite(of: OrdreFabrication, siteId: string | "tous") {
  if (siteId === "tous") return true;
  if (of.atelierId === siteId) return true;
  if (of.sorties.some((s) => s.siteSourceId === siteId)) return true;
  if (lignesMainOeuvre(of).some((m) => m.atelierId === siteId)) return true;
  return false;
}

function ofDansPeriode(of: OrdreFabrication, range: DateRange) {
  const d = of.dateClotureReelle ?? of.dateCreation;
  return inDateRange(d, range);
}

export function caFactureNMoins1(
  factures: Facture[],
  parametres: Parametres,
  siteId: string | "tous",
  range: DateRange,
) {
  const prec: DateRange = {
    debut: subYears(range.debut, 1),
    fin: subYears(range.fin, 1),
  };
  const actuel = caHtFacturesPeriode(factures, parametres, siteId, range);
  const precedent = caHtFacturesPeriode(factures, parametres, siteId, prec);
  return {
    actuel,
    precedent,
    ecart: actuel - precedent,
    pct: precedent > 0 ? ((actuel - precedent) / precedent) * 100 : null,
  };
}

export function caMoisEtAnnee(
  factures: Facture[],
  parametres: Parametres,
  siteId: string | "tous",
  reference: Date,
) {
  const mois = caFactureNMoins1(factures, parametres, siteId, {
    debut: startOfMonth(reference),
    fin: endOfMonth(reference),
  });
  const annee = caFactureNMoins1(factures, parametres, siteId, {
    debut: startOfYear(reference),
    fin: endOfYear(reference),
  });
  return { mois, annee };
}

export function balanceAgeeGlobale(
  clients: { id: string }[],
  ctx: { factures: Facture[]; acomptes: Acompte[]; parametres: Parametres },
) {
  const tranches = normaliserTranchesBalanceAgee(
    ctx.parametres.tranchesBalanceAgeeJours,
  );
  const labels = labelsTranchesBalanceAgee(tranches);
  const totaux = labels.map((label) => ({ label, montant: 0 }));
  for (const c of clients) {
    const b = balanceAgeeClient(c.id, ctx);
    b.forEach((t, i) => {
      totaux[i].montant += t.montant;
    });
  }
  return totaux;
}

export function delaiMoyenPaiementClient(
  factures: Facture[],
  parametres: Parametres,
  acomptes: Acompte[],
  journalAudit: JournalAudit[],
  siteId: string | "tous",
  range: DateRange,
) {
  const paiements = journalAudit.filter((j) => j.action === "facture_paiement");
  const lastPay = new Map<string, string>();
  for (const j of paiements) {
    const prev = lastPay.get(j.entiteId);
    if (!prev || j.date > prev) lastPay.set(j.entiteId, j.date);
  }
  const jours: number[] = [];
  for (const f of factures) {
    if (siteId !== "tous" && f.pointDeVenteId !== siteId) continue;
    if (!inDateRange(f.date, range)) continue;
    if (f.statut === "brouillon" || f.statut === "annulee" || f.statut === "proforma") {
      continue;
    }
    if (f.type === "avoir" || f.type === "proforma" || f.type === "acompte") continue;
    const reste = resteAPayer(f, parametres, acomptes, factures);
    if (reste > 0.5) continue;
    const payIso = lastPay.get(f.id);
    if (!payIso) continue;
    const n = differenceInCalendarDays(parseISO(payIso), parseISO(f.date));
    if (Number.isFinite(n) && n >= 0) jours.push(n);
  }
  if (jours.length === 0) return null;
  return Math.round(jours.reduce((s, n) => s + n, 0) / jours.length);
}

export function indicateursProduction(
  ofs: OrdreFabrication[],
  sites: PointDeVente[],
  siteId: string | "tous",
  range: DateRange,
) {
  const ateliers = sites.filter((s) => s.actif && siteEstAtelier(s));
  const vis = ofs.filter((o) => ofDuSite(o, siteId) && ofDansPeriode(o, range));
  const clotures = vis.filter(
    (o) => o.statut === "cloture" || o.statut === "cloture_annule",
  );
  const avecDelai = clotures.filter((o) => o.dateCloturePrevue && o.dateClotureReelle);
  const respect = avecDelai.filter((o) => {
    const reelle = o.dateClotureReelle!.slice(0, 10);
    const prevue = o.dateCloturePrevue!.slice(0, 10);
    return reelle <= prevue;
  }).length;
  const tauxRespect =
    avecDelai.length > 0 ? (respect / avecDelai.length) * 100 : null;

  const parAtelier = ateliers
    .filter((a) => siteId === "tous" || a.id === siteId)
    .map((atelier) => {
      const duSite = vis.filter((o) => o.atelierId === atelier.id);
      const ecarts = duSite.reduce((s, o) => s + (o.ecart?.montant ?? 0), 0);
      let sorti = 0;
      let perte = 0;
      for (const of_ of duSite) {
        const rel = reliquatsMatieres(of_);
        const retours = of_.retoursMatieres ?? [];
        for (const s of of_.sorties) {
          sorti += s.quantite;
        }
        for (const r of rel) {
          const rendu = retours
            .filter((x) => x.composantId === r.composantId)
            .reduce((acc, x) => acc + x.quantite, 0);
          perte += Math.max(0, r.reliquat - rendu);
        }
      }
      const heures = duSite.reduce(
        (s, o) =>
          s +
          lignesMainOeuvre(o)
            .filter((m) => m.atelierId === atelier.id)
            .reduce((a, m) => a + m.heures, 0),
        0,
      );
      const coutMod = duSite.reduce(
        (s, o) =>
          s +
          lignesMainOeuvre(o)
            .filter((m) => m.atelierId === atelier.id)
            .reduce((a, m) => a + m.montant, 0),
        0,
      );
      const cycles = duSite
        .filter((o) => o.dateClotureReelle)
        .map((o) =>
          differenceInCalendarDays(
            parseISO(o.dateClotureReelle!),
            parseISO(o.dateCreation),
          ),
        )
        .filter((n) => n >= 0);
      const cycleMoyen =
        cycles.length > 0
          ? cycles.reduce((s, n) => s + n, 0) / cycles.length
          : null;
      return {
        atelierId: atelier.id,
        nom: atelier.nom,
        ecarts,
        tauxPerte: sorti > 0 ? (perte / sorti) * 100 : null,
        heuresMod: heures,
        coutMod,
        cycleMoyenJours: cycleMoyen,
        nbOf: duSite.length,
      };
    });

  const totalHeures = parAtelier.reduce((s, a) => s + a.heuresMod, 0);
  return {
    tauxRespect,
    nbAvecDelai: avecDelai.length,
    nbRespect: respect,
    parAtelier: parAtelier.map((a) => ({
      ...a,
      tauxCharge: totalHeures > 0 ? (a.heuresMod / totalHeures) * 100 : null,
    })),
  };
}

export function valorisationStockParNatureEtSite(
  produits: Produit[],
  entrees: EntreeStock[],
  ventes: Vente[],
  sites: PointDeVente[],
  siteId: string | "tous",
  inventaires: Inventaire[],
) {
  const stocks = calculerStocks(
    produits,
    entrees,
    ventes,
    siteId,
    sites,
    undefined,
    inventaires,
  );
  const parNature = new Map<string, number>();
  const parSite = new Map<string, number>();
  for (const l of stocks) {
    const nat = NATURE_STOCK_LABELS[natureStockDuProduit(l.produit)];
    parNature.set(nat, (parNature.get(nat) ?? 0) + l.valeurAchat);
    const nom = sites.find((s) => s.id === l.pointDeVenteId)?.nom ?? l.pointDeVenteId;
    parSite.set(nom, (parSite.get(nom) ?? 0) + l.valeurAchat);
  }
  return {
    parNature: [...parNature.entries()].map(([nom, valeur]) => ({ nom, valeur })),
    parSite: [...parSite.entries()].map(([nom, valeur]) => ({ nom, valeur })),
  };
}

export function rotationMatieresPremieres(
  produits: Produit[],
  ofs: OrdreFabrication[],
  entrees: EntreeStock[],
  ventes: Vente[],
  sites: PointDeVente[],
  siteId: string | "tous",
  range: DateRange,
  inventaires: Inventaire[],
) {
  const stocks = calculerStocks(
    produits,
    entrees,
    ventes,
    siteId,
    sites,
    undefined,
    inventaires,
  );
  const mp = produits.filter((p) => natureStockDuProduit(p) === "matiere_premiere");
  return mp
    .map((p) => {
      const stock = stocks
        .filter((l) => l.produit.id === p.id)
        .reduce((s, l) => s + l.quantiteRestante, 0);
      let sorties = 0;
      for (const of_ of ofs) {
        if (!ofDuSite(of_, siteId)) continue;
        for (const s of of_.sorties) {
          if (s.composantId !== p.id) continue;
          if (!inDateRange(s.date, range)) continue;
          sorties += s.quantite;
        }
      }
      return {
        produitId: p.id,
        nom: libelleProduit(p),
        sorties,
        stock,
        rotation: stock > 0 ? sorties / stock : sorties > 0 ? null : 0,
      };
    })
    .filter((l) => l.sorties > 0 || l.stock > 0)
    .sort((a, b) => (b.rotation ?? 0) - (a.rotation ?? 0));
}

export function topMatieresRupture(
  produits: Produit[],
  ofs: OrdreFabrication[],
  achats: Achat[],
  entrees: EntreeStock[],
  ventes: Vente[],
  sites: PointDeVente[],
  siteId: string | "tous",
  inventaires: Inventaire[],
) {
  const stocks = calculerStocks(
    produits,
    entrees,
    ventes,
    siteId,
    sites,
    undefined,
    inventaires,
  );
  const map = new Map<string, { nom: string; ruptures: number; daOf: number }>();
  const bump = (id: string, field: "ruptures" | "daOf") => {
    const p = produits.find((x) => x.id === id);
    if (!p) return;
    const cur = map.get(id) ?? { nom: libelleProduit(p), ruptures: 0, daOf: 0 };
    cur[field] += 1;
    map.set(id, cur);
  };
  for (const p of produits) {
    if (natureStockDuProduit(p) !== "matiere_premiere") continue;
    const qty = stocks
      .filter((l) => l.produit.id === p.id)
      .reduce((s, l) => s + l.quantiteRestante, 0);
    const seuil = p.seuilRupture ?? 0;
    if (qty <= seuil) bump(p.id, "ruptures");
  }
  for (const a of achats) {
    if (!a.ofId) continue;
    const of_ = ofs.find((o) => o.id === a.ofId);
    if (of_ && !ofDuSite(of_, siteId)) continue;
    const pid = a.ofComposantId ?? a.lignes[0]?.produitId;
    if (pid) bump(pid, "daOf");
  }
  return [...map.entries()]
    .map(([produitId, v]) => ({ produitId, ...v, score: v.ruptures + v.daOf }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function indicateursMissionsDashboard(
  missions: MissionAchat[],
  natures: NatureDepenseMission[],
  siteId: string | "tous",
  range: DateRange,
) {
  const vis = missions.filter(
    (m) => siteId === "tous" || m.siteDestinataireId === siteId,
  );
  const enCours = vis.filter(
    (m) =>
      m.statut !== "cloture" &&
      m.statut !== "cloture_annule" &&
      m.statut !== "annule" &&
      m.statut !== "rejetee",
  );
  const avances = enCours.reduce((s, m) => s + fondsValidesMission(m), 0);

  const parNature = new Map<string, { libelle: string; montant: number; attente471: boolean }>();
  let totalDivers = 0;
  let attente471 = 0;
  const ecarts: number[] = [];
  for (const m of vis) {
    const dateRef = m.dateCloture ?? m.date;
    if (!inDateRange(dateRef, range)) continue;
    totalDivers += totalDepensesDiverses(m);
    for (const d of m.depensesDiverses) {
      if (!(d.montant > 0)) continue;
      const attente = depenseEnAttenteReclassement(d, natures);
      if (attente) attente471 += d.montant;
      const lib = libelleNatureDepense(d, natures) || "Sans nature";
      const key = d.natureId ?? `libre:${lib}`;
      const cur = parNature.get(key) ?? { libelle: lib, montant: 0, attente471: attente };
      cur.montant += d.montant;
      cur.attente471 = cur.attente471 || attente;
      parNature.set(key, cur);
    }
    const fonds = fondsValidesMission(m);
    if (fonds > 0) ecarts.push(fonds - totalDepenseMission(m));
  }
  return {
    avancesEnCours: avances,
    totalDivers,
    attente471,
    parNature: [...parNature.values()].sort((a, b) => b.montant - a.montant),
    ecartMoyen:
      ecarts.length > 0
        ? ecarts.reduce((s, n) => s + n, 0) / ecarts.length
        : null,
  };
}

export function margeParOfCommande(
  ofs: OrdreFabrication[],
  commandes: Commande[],
  factures: Facture[],
  parametres: Parametres,
  siteId: string | "tous",
  range: DateRange,
) {
  return ofs
    .filter((o) => ofDuSite(o, siteId) && o.commandeId && ofDansPeriode(o, range))
    .map((o) => {
      const cmd = commandes.find((c) => c.id === o.commandeId);
      const facs = factures.filter((f) => f.commandeId === o.commandeId);
      let ca = 0;
      for (const f of facs) {
        if (f.statut === "brouillon" || f.statut === "annulee" || f.statut === "proforma") {
          continue;
        }
        if (f.type === "acompte" || f.type === "proforma") continue;
        const t = totauxFacture(f, parametres);
        ca += f.type === "avoir" ? -t.totalHT : t.totalHT;
      }
      const cout = o.entreesProduction.reduce((s, e) => s + e.coutTotal, 0);
      return {
        ofId: o.id,
        numero: o.numero,
        commande: cmd?.numero ?? o.commandeId!,
        ca,
        cout,
        marge: ca - cout,
      };
    })
    .sort((a, b) => b.marge - a.marge);
}

export function margeParFamille(
  factures: Facture[],
  produits: Produit[],
  categories: CategorieProduit[],
  entrees: EntreeStock[],
  inventaires: Inventaire[],
  parametres: Parametres,
  siteId: string | "tous",
  range: DateRange,
) {
  const syn = syntheseRentabiliteDeuxPaliers({
    factures,
    achats: [],
    produits,
    entrees,
    inventaires,
    parametres,
    pointDeVenteId: siteId,
    range,
  });
  const map = new Map<string, { nom: string; ca: number; cmv: number }>();
  for (const l of syn.parProduit) {
    const p = produits.find((x) => x.id === l.produitId);
    const cat = categories.find((c) => c.id === p?.categorieId);
    const nom = cat?.libelle ?? "Sans famille";
    const cur = map.get(nom) ?? { nom, ca: 0, cmv: 0 };
    cur.ca += l.ca;
    cur.cmv += l.cmv;
    map.set(nom, cur);
  }
  return [...map.values()]
    .map((l) => ({ ...l, marge: l.ca - l.cmv }))
    .sort((a, b) => b.marge - a.marge);
}

export function caMargeParClient(
  factures: Facture[],
  clients: { id: string; nom: string }[],
  produits: Produit[],
  entrees: EntreeStock[],
  inventaires: Inventaire[],
  parametres: Parametres,
  siteId: string | "tous",
  range: DateRange,
) {
  const syn = syntheseRentabiliteDeuxPaliers({
    factures,
    achats: [],
    produits,
    entrees,
    inventaires,
    parametres,
    pointDeVenteId: siteId,
    range,
  });
  const cmvParProduit = new Map(syn.parProduit.map((l) => [l.produitId, l]));
  const map = new Map<string, { nom: string; ca: number; cmv: number }>();
  for (const f of factures) {
    if (siteId !== "tous" && f.pointDeVenteId !== siteId) continue;
    if (!inDateRange(f.date, range)) continue;
    if (f.statut === "brouillon" || f.statut === "annulee" || f.statut === "proforma") {
      continue;
    }
    if (f.type === "acompte" || f.type === "proforma") continue;
    const t = totauxFacture(f, parametres);
    const ca = f.type === "avoir" ? -t.totalHT : t.totalHT;
    const client = clients.find((c) => c.id === f.clientId);
    const cur = map.get(f.clientId) ?? {
      nom: client?.nom ?? f.clientId,
      ca: 0,
      cmv: 0,
    };
    cur.ca += ca;
    for (const l of f.lignes) {
      if (!l.produitId) continue;
      const p = cmvParProduit.get(l.produitId);
      if (p && p.quantite) {
        cur.cmv += (p.cmv / p.quantite) * l.quantite * (f.type === "avoir" ? -1 : 1);
      }
    }
    map.set(f.clientId, cur);
  }
  return [...map.values()]
    .map((l) => ({ ...l, marge: l.ca - l.cmv }))
    .sort((a, b) => b.ca - a.ca);
}

export function tauxTransformationDevisCommande(
  devis: Devis[],
  transformations: TransformationCommerciale[],
  siteId: string | "tous",
  range: DateRange,
) {
  const vis = devis.filter((d) => {
    if (siteId !== "tous" && d.pointDeVenteId !== siteId) return false;
    return inDateRange(d.date, range);
  });
  const ids = new Set(vis.map((d) => d.id));
  const transformes = new Set(
    transformations
      .filter((t) => t.sourceType === "devis" && t.cibleType === "commande" && ids.has(t.sourceId))
      .map((t) => t.sourceId),
  );
  const n = vis.filter((d) => d.statut !== "brouillon").length;
  const ok = vis.filter((d) => transformes.has(d.id)).length;
  return { n, ok, taux: n > 0 ? (ok / n) * 100 : null };
}

export function achatsHtPeriode(
  achats: Achat[],
  siteId: string | "tous",
  range: DateRange,
) {
  return montantAchatsHT(achats, siteId, range);
}

export function historiquePrixFournisseurArticle(
  achats: Achat[],
  produits: Produit[],
  fournisseurs: { id: string; nom: string }[],
  siteId: string | "tous",
  range: DateRange,
) {
  const volume = new Map<string, number>();
  for (const a of achats) {
    if (!achatImpacteCompteResultat(a)) continue;
    if (siteId !== "tous" && !achatConcerneSite(a, siteId)) continue;
    const d = a.dateValidation ?? a.date;
    if (!inDateRange(d, range)) continue;
    for (const l of a.lignes) {
      if (!l.produitId) continue;
      volume.set(
        l.produitId,
        (volume.get(l.produitId) ?? 0) + l.quantite * l.prixAchatUnitaire,
      );
    }
  }
  const topIds = [...volume.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => id);
  const ids = topIds.length > 0 ? topIds : produits.slice(0, 8).map((p) => p.id);
  const lignes: {
    produitId: string;
    article: string;
    fournisseur: string;
    dernierPrix: number | null;
    date?: string;
    delaiMoyenJours: number | null;
  }[] = [];
  for (const pid of ids) {
    const p = produits.find((x) => x.id === pid);
    if (!p) continue;
    const hist = historiqueFournisseursProduit(pid, { achats });
    for (const h of hist) {
      lignes.push({
        produitId: pid,
        article: libelleProduit(p),
        fournisseur:
          fournisseurs.find((f) => f.id === h.fournisseurId)?.nom ?? h.fournisseurId,
        dernierPrix: h.dernierPrix,
        date: h.dateDernierPrix,
        delaiMoyenJours: h.delaiMoyenJours,
      });
    }
  }
  return lignes;
}

export function performanceFournisseurs(
  achats: Achat[],
  fournisseurs: { id: string; nom: string }[],
  siteId: string | "tous",
  range: DateRange,
) {
  const map = new Map<
    string,
    { nom: string; nbAchats: number; delais: number[]; nbAvoirs: number }
  >();
  for (const a of achats) {
    if (a.statut === "annule") continue;
    if (siteId !== "tous" && !achatConcerneSite(a, siteId)) continue;
    const d = a.dateValidation ?? a.date;
    if (!inDateRange(d, range)) continue;
    const frn = fournisseurs.find((f) => f.id === a.fournisseurId);
    const cur = map.get(a.fournisseurId) ?? {
      nom: frn?.nom ?? a.fournisseurId,
      nbAchats: 0,
      delais: [],
      nbAvoirs: 0,
    };
    cur.nbAchats += 1;
    cur.nbAvoirs += a.avoirs.filter((av) => av.statut === "valide").length;
    const livs = livraisonsActives(a)
      .filter((l) => l.lignes.some((x) => x.quantiteLivree > 0))
      .sort((x, y) => x.date.localeCompare(y.date));
    if (livs[0]) {
      const j = differenceInCalendarDays(parseISO(livs[0].date), parseISO(a.date));
      if (Number.isFinite(j) && j >= 0) cur.delais.push(j);
    }
    map.set(a.fournisseurId, cur);
  }
  return [...map.entries()]
    .map(([fournisseurId, v]) => ({
      fournisseurId,
      nom: v.nom,
      nbAchats: v.nbAchats,
      delaiMoyenJours:
        v.delais.length === 0
          ? null
          : Math.round(v.delais.reduce((s, n) => s + n, 0) / v.delais.length),
      nbAvoirs: v.nbAvoirs,
    }))
    .sort((a, b) => b.nbAchats - a.nbAchats);
}
