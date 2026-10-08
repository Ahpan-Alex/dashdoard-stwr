import { OF_STATUT_LABELS, quantiteProduite } from "./fabrication";
import { formatDate, formatNumber } from "./format";
import type { OrdreFabrication } from "./types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fiche de fabrication, A4 portrait. La colonne Actions de la liste n'y figure pas. */
export async function imprimerFicheOf(
  of: OrdreFabrication,
  libelles: {
    produit: string;
    atelier: string;
    commande: string;
    composant: (id: string) => string;
  },
) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Fiche de fabrication");
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);
  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    throw new Error("Impossible d'ouvrir la fenêtre d'impression.");
  }
  const prevTitle = document.title;
  document.title = of.numero;
  const lignes = (of.nomenclatureLignes ?? [])
    .map(
      (l) =>
        `<tr><td>${escapeHtml(libelles.composant(l.composantId))}</td><td>${escapeHtml(formatNumber(l.quantiteUnitaire))}</td><td>${escapeHtml(formatNumber(l.quantiteUnitaire * of.quantitePrevue))}</td></tr>`,
    )
    .join("");
  const sorties = (of.sorties ?? [])
    .map(
      (s) =>
        `<tr><td>${escapeHtml(formatDate(s.date))}</td><td>${escapeHtml(libelles.composant(s.composantId))}</td><td>${escapeHtml(formatNumber(s.quantite))}</td></tr>`,
    )
    .join("");
  idoc.open();
  idoc.write(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<title>${escapeHtml(of.numero)}</title>
<style>
  body { margin: 0; font-family: system-ui, sans-serif; font-size: 10pt; color: #0c1f28; }
  h1 { font-size: 16pt; margin: 0 0 4px; }
  h2 { font-size: 12pt; margin: 16px 0 6px; }
  p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 0.4pt solid #c5d0d4; padding: 3px 5px; text-align: left; }
  th { background: #eef4f6; }
  @page { size: A4 portrait; margin: 12mm; }
</style></head><body>
  <h1>${escapeHtml(of.numero)}</h1>
  <p>${escapeHtml(OF_STATUT_LABELS[of.statut] ?? of.statut)} · ${escapeHtml(libelles.atelier)}</p>
  <p>Produit : ${escapeHtml(libelles.produit)}</p>
  <p>Destination : ${escapeHtml(libelles.commande)}</p>
  <p>Quantité prévue : ${escapeHtml(formatNumber(of.quantitePrevue))} · Produite : ${escapeHtml(formatNumber(quantiteProduite(of)))}</p>
  <p>Échéance : ${escapeHtml(of.dateCloturePrevue ? formatDate(of.dateCloturePrevue) : "—")}</p>
  ${of.note ? `<p>Note : ${escapeHtml(of.note)}</p>` : ""}
  <h2>Nomenclature</h2>
  <table><thead><tr><th>Composant</th><th>Qté / unité</th><th>Besoin</th></tr></thead>
  <tbody>${lignes || `<tr><td colspan="3">Aucune ligne.</td></tr>`}</tbody></table>
  <h2>Sorties de matières</h2>
  <table><thead><tr><th>Date</th><th>Composant</th><th>Quantité</th></tr></thead>
  <tbody>${sorties || `<tr><td colspan="3">Aucune sortie.</td></tr>`}</tbody></table>
</body></html>`);
  idoc.close();
  try {
    await new Promise((r) => window.setTimeout(r, 80));
    iwin.focus();
    iwin.print();
  } finally {
    const cleanup = () => {
      document.title = prevTitle;
      iframe.remove();
    };
    iwin.addEventListener("afterprint", cleanup);
    window.setTimeout(cleanup, 90_000);
  }
}
