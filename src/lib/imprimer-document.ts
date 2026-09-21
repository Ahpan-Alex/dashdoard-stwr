import {
  ancrerPiedDernierePage,
  HAUTEUR_PAGE_A4_MM,
  HAUTEUR_PAGE_A4_PAYSAGE_MM,
} from "./document-mise-en-page";

export type OrientationDocument = "portrait" | "landscape";

export type OptionsImpressionDocument = {
  /** Nom du fichier proposé (Enregistrer au format PDF). */
  filename?: string;
  /** Portrait par défaut ; paysage si le tableau 8 colonnes reste trop dense. */
  orientation?: OrientationDocument;
};

function collectHeadHtml() {
  const parts: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((n) => {
    parts.push(n.outerHTML);
  });
  document.querySelectorAll('link[rel="preload"][as="font"]').forEach((n) => {
    parts.push(n.outerHTML);
  });
  document.querySelectorAll("style").forEach((n) => {
    parts.push(n.outerHTML);
  });
  try {
    for (const sheet of document.adoptedStyleSheets ?? []) {
      const rules = [...sheet.cssRules].map((r) => r.cssText).join("\n");
      if (rules) parts.push(`<style>${rules}</style>`);
    }
  } catch {
    /* feuilles cross-origin */
  }
  return parts.join("\n");
}

async function attendreRessources(doc: Document) {
  const images = [...doc.images];
  await Promise.all(
    images.map((img) => {
      if (typeof img.decode === "function") {
        return img.decode().catch(() => undefined);
      }
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
  if (doc.fonts?.ready) {
    await doc.fonts.ready.catch(() => undefined);
  }
}

function nomFichierSafe(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "document";
}

/**
 * Imprime (ou enregistre en PDF) exactement le nœud de l'aperçu :
 * même HTML, mêmes CSS, couleurs forcées, format A4.
 * L'utilisateur choisit « Imprimante » ou « Enregistrer au format PDF ».
 */
export async function imprimerFeuilleCommerciale(
  sheet: HTMLElement,
  opts: OptionsImpressionDocument = {},
) {
  const paysage = opts.orientation === "landscape";
  const pageW = paysage ? "297mm" : "210mm";
  const pageH = paysage ? "210mm" : "297mm";

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Impression document");
  iframe.style.cssText =
    `position:fixed;left:0;top:0;width:${pageW};height:${pageH};border:0;opacity:0;pointer-events:none;z-index:-1;`;
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    throw new Error("Impossible d'ouvrir la fenêtre d'impression.");
  }

  const prevTitle = document.title;
  if (opts.filename) {
    document.title = nomFichierSafe(opts.filename);
  }

  const htmlClass = document.documentElement.className;
  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.classList.add("document-preview-sheet");
  clone.style.margin = "0";
  clone.style.maxWidth = "none";
  clone.style.width = pageW;
  clone.style.boxShadow = "none";
  clone.style.boxSizing = "border-box";
  clone.style.overflowX = "hidden";

  idoc.open();
  idoc.write(`<!DOCTYPE html>
<html lang="fr" class="${htmlClass}">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light only" />
${collectHeadHtml()}
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: ${pageW} !important;
    max-width: ${pageW} !important;
    height: auto !important;
    overflow-x: hidden !important;
    background: #ffffff !important;
    color: #0c1f28;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    forced-color-adjust: none !important;
  }
  .document-preview-sheet {
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    forced-color-adjust: none !important;
    box-shadow: none !important;
    margin: 0 !important;
    max-width: ${pageW} !important;
    width: ${pageW} !important;
    min-height: ${pageH} !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .document-preview-footer {
    position: absolute !important;
    left: 12mm !important;
    right: 12mm !important;
    bottom: 12mm !important;
  }
  .document-preview-sheet table.data {
    table-layout: fixed !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  @page {
    size: A4 ${paysage ? "landscape" : "portrait"};
    margin: 0;
  }
  @media print {
    html, body {
      background: #ffffff !important;
      width: ${pageW} !important;
      overflow-x: hidden !important;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  }
</style>
</head>
<body>${clone.outerHTML}</body>
</html>`);
  idoc.close();

  try {
    await attendreRessources(idoc);
    const printed = idoc.querySelector(".document-preview-sheet");
    if (printed instanceof HTMLElement) {
      ancrerPiedDernierePage(
        printed,
        paysage ? HAUTEUR_PAGE_A4_PAYSAGE_MM : HAUTEUR_PAGE_A4_MM,
      );
    }
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

/**
 * Génère un PDF A4 (blob) de la même feuille que l'aperçu, pour l'envoi e-mail / WhatsApp.
 */
export async function pdfBlobDepuisFeuille(
  sheet: HTMLElement,
  opts: OptionsImpressionDocument = {},
): Promise<Blob> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const paysage = opts.orientation === "landscape";
  const canvas = await html2canvas(sheet, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  const img = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({
    orientation: paysage ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;
  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(img, "JPEG", 0, position, pageW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(img, "JPEG", 0, position, pageW, imgH);
    heightLeft -= pageH;
  }
  const blob = pdf.output("blob");
  const name = nomFichierSafe(opts.filename ?? "document");
  return new File([blob], name.endsWith(".pdf") ? name : `${name}.pdf`, {
    type: "application/pdf",
  });
}

export function feuilleDepuisConteneur(
  root: ParentNode | null,
): HTMLElement | null {
  if (!root) return null;
  if (root instanceof HTMLElement && root.classList.contains("document-preview-sheet")) {
    return root;
  }
  const found = root.querySelector(".document-preview-sheet");
  return found instanceof HTMLElement ? found : null;
}
