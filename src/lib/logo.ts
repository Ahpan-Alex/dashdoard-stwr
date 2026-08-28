/** Redimensionne une image et retourne un data URL (PNG) pour stockage local. */
export function fileToLogoDataUrl(
  file: File,
  maxWidth = 360,
  maxHeight = 160,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Le fichier doit être une image (PNG, JPG, WebP…)."));
      return;
    }
    if (file.size > 2_500_000) {
      reject(new Error("Image trop lourde (max. 2,5 Mo)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const raw = String(reader.result);

      // SVG : conserver tel quel (canvas souvent incompatible)
      if (file.type === "image/svg+xml") {
        resolve(raw);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("Image invalide."));
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponible."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

/** Contraintes du logo de la colonne des menus (indépendant des documents). */
export const LOGO_MENU = {
  mimeTypes: ["image/png", "image/jpeg", "image/svg+xml"] as const,
  accept: "image/png,image/jpeg,image/svg+xml",
  maxBytes: 2 * 1024 * 1024,
  /** Côté max après redimensionnement (affichage ~40 px, marge 2–3×). */
  maxEdgePx: 256,
  /** Ratio largeur/hauteur accepté (carré ou proche). */
  ratioMin: 0.7,
  ratioMax: 1.43,
  dimensionsRecommandees: "256 × 256 px (carré ou proche)",
} as const;

function mimeLogoMenu(file: File): string {
  const t = (file.type || "").toLowerCase();
  if (t === "image/jpg") return "image/jpeg";
  return t;
}

function estMimeLogoMenu(type: string): boolean {
  return (LOGO_MENU.mimeTypes as readonly string[]).includes(type);
}

/** Logo du menu : PNG / JPG / SVG, max 2 Mo, ratio carré ou proche. */
export function fileToMenuLogoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const type = mimeLogoMenu(file);
    if (!estMimeLogoMenu(type)) {
      reject(
        new Error("Format non accepté. Utilisez un PNG, un JPG ou un SVG."),
      );
      return;
    }
    if (file.size > LOGO_MENU.maxBytes) {
      reject(new Error("Image trop lourde (max. 2 Mo)."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const raw = String(reader.result);
      if (type === "image/svg+xml") {
        resolve(raw);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("Image invalide."));
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          reject(new Error("Impossible de lire les dimensions de l'image."));
          return;
        }
        const ratio = w / h;
        if (ratio < LOGO_MENU.ratioMin || ratio > LOGO_MENU.ratioMax) {
          reject(
            new Error(
              `Logo trop allongé (ratio ${ratio.toFixed(2)}). Utilisez un format carré ou proche (${LOGO_MENU.ratioMin}–${LOGO_MENU.ratioMax}). Recommandé : ${LOGO_MENU.dimensionsRecommandees}.`,
            ),
          );
          return;
        }
        const scale = Math.min(LOGO_MENU.maxEdgePx / w, LOGO_MENU.maxEdgePx / h, 1);
        const width = Math.max(1, Math.round(w * scale));
        const height = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponible."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
