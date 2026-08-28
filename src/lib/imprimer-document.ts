/** Impression / PDF d'une feuille commerciale à l'identique de l'aperçu écran. */

export type OptionsImpressionDocument = {
  /** Nom du fichier proposé (Enregistrer au format PDF). */
  filename?: string;
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
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Impression document");
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
  if (opts.filename) {
    document.title = nomFichierSafe(opts.filename);
  }

  const htmlClass = document.documentElement.className;
  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.classList.add("document-preview-sheet");
  clone.style.margin = "0";
  clone.style.maxWidth = "none";
  clone.style.width = "210mm";
  clone.style.boxShadow = "none";

  idoc.open();
  idoc.write(`<!DOCTYPE html>
<html lang="fr" class="${htmlClass}">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light only" />
${collectHeadHtml()}
<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
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
    max-width: none !important;
    width: 210mm !important;
  }
  @page {
    size: A4;
    margin: 0;
  }
  @media print {
    html, body {
      background: #ffffff !important;
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
