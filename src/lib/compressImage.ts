// Compression d'image côté navigateur.
// Les photos de ticket prises au téléphone pèsent souvent 3–8 Mo, ce qui
// dépasse la limite de 1 Mo du corps des Server Actions Next.js. On redimensionne
// et on ré-encode en JPEG avant l'envoi pour rester bien en dessous.

type CompressOptions = {
  /** Taille cible max du fichier en octets (défaut ~900 Ko, sous la limite 1 Mo). */
  maxBytes?: number;
  /** Plus grande dimension (largeur ou hauteur) tolérée, en px. */
  maxDimension?: number;
};

/** Décode le fichier en respectant l'orientation EXIF (photos téléphone). */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // certains formats (HEIC) ou navigateurs échouent → fallback <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // l'URL reste valide tant que l'image est dessinée juste après
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function dimensions(src: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  const el = src as HTMLImageElement; // naturalWidth absent sur ImageBitmap → fallback .width
  return {
    w: el.naturalWidth || src.width,
    h: el.naturalHeight || src.height,
  };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob a échoué"))),
      "image/jpeg",
      quality,
    );
  });
}

function drawAt(
  src: ImageBitmap | HTMLImageElement,
  w: number,
  h: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponible");
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
  return canvas;
}

/**
 * Redimensionne + ré-encode une image pour qu'elle pèse moins de `maxBytes`.
 * Renvoie le fichier d'origine s'il est déjà assez léger.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxBytes = opts.maxBytes ?? 900 * 1024;
  const maxDimension = opts.maxDimension ?? 1600;

  if (!file.type.startsWith("image/")) return file;
  // Les photos iPhone sont en HEIC/HEIF : format que l'outil Read du CLI Claude
  // ne sait pas décoder. On les ré-encode TOUJOURS en JPEG, même petites.
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  // Déjà un format web sous la limite et pas démesuré → on n'altère pas la qualité.
  if (file.size <= maxBytes && !isHeic) return file;

  const bitmap = await loadBitmap(file);
  const { w: w0, h: h0 } = dimensions(bitmap);

  let scale = Math.min(1, maxDimension / Math.max(w0, h0));
  let w = Math.max(1, Math.round(w0 * scale));
  let h = Math.max(1, Math.round(h0 * scale));

  let quality = 0.82;
  let blob = await toBlob(drawAt(bitmap, w, h), quality);

  // 1) baisse la qualité JPEG
  while (blob.size > maxBytes && quality > 0.4) {
    quality = Math.round((quality - 0.1) * 100) / 100;
    blob = await toBlob(drawAt(bitmap, w, h), quality);
  }

  // 2) si toujours trop lourd, réduit les dimensions
  while (blob.size > maxBytes && Math.max(w, h) > 700) {
    w = Math.round(w * 0.85);
    h = Math.round(h * 0.85);
    blob = await toBlob(drawAt(bitmap, w, h), 0.6);
  }

  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
}
