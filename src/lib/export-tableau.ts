import {
  colonnesDuType,
  type TableAffichageDef,
  type TypeAffichage,
} from "./affichage-tableaux";

export type LigneExportTableau = Record<string, string>;

function csvEscape(value: string) {
  const v = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[;"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function construireCsv(
  table: TableAffichageDef,
  type: TypeAffichage,
  lignes: LigneExportTableau[],
): string {
  const colonnes = colonnesDuType(table, type, false);
  const header = colonnes.map((c) => csvEscape(c.label)).join(";");
  const rows = lignes.map((ligne) =>
    colonnes.map((c) => csvEscape(ligne[c.id] ?? "")).join(";"),
  );
  return `\uFEFF${[header, ...rows].join("\n")}`;
}

export function telechargerCsv(filename: string, contenu: string) {
  const blob = new Blob([contenu], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function nomFichierSafe(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "tableau";
}

/** Impression / PDF A4 portrait de la sélection de colonnes. */
export async function imprimerTableauPdf(
  table: TableAffichageDef,
  type: TypeAffichage,
  lignes: LigneExportTableau[],
  opts?: { filename?: string; titre?: string },
) {
  const colonnes = colonnesDuType(table, type, true);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Export PDF tableau");
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
  const titre = opts?.titre ?? table.label;
  if (opts?.filename) document.title = nomFichierSafe(opts.filename);

  const thead = colonnes
    .map((c) => `<th style="width:${c.largeurMm}mm">${escapeHtml(c.label)}</th>`)
    .join("");
  const tbody =
    lignes.length === 0
      ? `<tr><td colspan="${colonnes.length}">Aucune ligne.</td></tr>`
      : lignes
          .map(
            (ligne) =>
              `<tr>${colonnes
                .map((c) => `<td>${escapeHtml(ligne[c.id] ?? "")}</td>`)
                .join("")}</tr>`,
          )
          .join("");

  idoc.open();
  idoc.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titre)}</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #0c1f28;
    font-family: "Manrope", system-ui, sans-serif;
    font-size: 9pt;
  }
  h1 {
    font-size: 13pt;
    margin: 0 0 8px;
  }
  .meta { color: #5b6b73; font-size: 8pt; margin-bottom: 10px; }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th, td {
    border: 0.4pt solid #c5d0d4;
    padding: 3px 5px;
    text-align: left;
    vertical-align: top;
    word-wrap: break-word;
  }
  th { background: #eef4f6; font-weight: 600; }
  @page { size: A4 portrait; margin: 12mm; }
</style>
</head>
<body>
  <h1>${escapeHtml(titre)}</h1>
  <p class="meta">${escapeHtml(type.nom)} · ${colonnes.length} colonnes · ${lignes.length} ligne(s)</p>
  <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
</body>
</html>`);
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
