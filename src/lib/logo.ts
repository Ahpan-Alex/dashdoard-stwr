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
