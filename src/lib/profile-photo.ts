/** Compresse / recadre une image fichier en data URL JPEG carrée pour le profil. */
export async function compressProfilePhoto(
  file: File,
  opts?: { size?: number; quality?: number; maxBytes?: number },
): Promise<string> {
  const size = opts?.size ?? 256;
  const quality = opts?.quality ?? 0.82;
  const maxBytes = opts?.maxBytes ?? 280_000;

  if (!file.type.startsWith("image/")) {
    throw new Error("Choisissez un fichier image (JPEG, PNG ou WebP).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image trop lourde (max 8 Mo avant compression).");
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Impossible de traiter l'image.");
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > maxBytes && q > 0.45) {
    q -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrl.length > maxBytes) {
    throw new Error("Image trop volumineuse après compression. Essayez une autre photo.");
  }
  return dataUrl;
}
