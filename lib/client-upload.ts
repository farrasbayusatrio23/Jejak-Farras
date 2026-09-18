import { adminFetch } from "@/lib/admin-fetch";

const SOURCE_FILE_LIMIT = 25 * 1024 * 1024;
const UPLOAD_TARGET_BYTES = 1_500_000;
const MAX_IMAGE_DIMENSION = 1920;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
};

export function validateImageFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Gunakan gambar JPG, PNG, atau WebP.";
  }
  if (file.size > SOURCE_FILE_LIMIT) {
    return "Ukuran foto asli maksimal 25 MB.";
  }
  return null;
}

export async function readJsonResponse(response: Response) {
  const raw = await response.text();
  let data: Record<string, unknown> = {};

  if (raw) {
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      if (response.status === 413 || /payload too large/i.test(raw)) {
        throw new Error(
          "Berkas terlalu besar untuk dikirim. Pilih kembali berkasnya lalu coba lagi.",
        );
      }
      if (!response.ok) {
        throw new Error("Server belum dapat menerima unggahan. Coba kembali.");
      }
      throw new Error("Respons server tidak dapat dibaca. Muat ulang editor.");
    }
  }

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(
        "Berkas masih terlalu besar. Coba gunakan berkas lain.",
      );
    }
    throw new Error(String(data.error || "Terjadi kesalahan."));
  }

  return data;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    element.src = objectUrl;
  }).catch((error) => {
    URL.revokeObjectURL(objectUrl);
    throw error;
  });

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Foto tidak dapat dikompresi."));
      },
      "image/webp",
      quality,
    );
  });
}

export async function optimizeImageForUpload(file: File): Promise<File> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  let decoded: DecodedImage | null = null;
  try {
    decoded = await decodeImage(file);
    if (
      file.size <= UPLOAD_TARGET_BYTES &&
      decoded.width <= MAX_IMAGE_DIMENSION &&
      decoded.height <= MAX_IMAGE_DIMENSION
    ) {
      return file;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Foto tidak dapat diproses di browser ini.");

    const longestSide = Math.max(decoded.width, decoded.height);
    const qualities = [0.84, 0.74, 0.64, 0.54];
    let smallest: Blob | null = null;

    for (let scaleAttempt = 0; scaleAttempt < 5; scaleAttempt += 1) {
      const targetLongestSide = MAX_IMAGE_DIMENSION * 0.78 ** scaleAttempt;
      const scale = Math.min(1, targetLongestSide / longestSide);
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, quality);
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= UPLOAD_TARGET_BYTES) {
          const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
          return new File([blob], `${baseName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });
        }
      }
    }

    if (smallest) {
      throw new Error(
        "Foto masih terlalu besar setelah diproses. Coba gunakan foto lain.",
      );
    }
    throw new Error("Foto tidak dapat diproses.");
  } catch (error) {
    if (file.size <= UPLOAD_TARGET_BYTES) return file;
    throw error;
  } finally {
    decoded?.dispose();
  }
}

const AUDIO_FILE_LIMIT = 30 * 1024 * 1024;
const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
};

function audioContentType(file: File) {
  if (file.type && Object.values(AUDIO_TYPES).includes(file.type)) {
    return file.type;
  }
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return AUDIO_TYPES[extension] || null;
}

export function validateAudioFile(file: File) {
  if (!audioContentType(file)) {
    return "Gunakan berkas MP3, M4A, AAC, WAV, OGG, atau WebM.";
  }
  if (file.size > AUDIO_FILE_LIMIT) {
    return "Ukuran lagu maksimal 30 MB.";
  }
  return null;
}

export async function uploadAudioFile(
  file: File,
  onProgress?: (progress: number) => void,
) {
  const validationError = validateAudioFile(file);
  if (validationError) throw new Error(validationError);
  const contentType = audioContentType(file);
  if (!contentType) throw new Error("Format lagu tidak didukung.");

  const startResponse = await adminFetch("/api/admin/audio-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "start",
      fileName: file.name,
      contentType,
      size: file.size,
    }),
  });
  const started = await readJsonResponse(startResponse);
  const uploadId = String(started.uploadId || "");
  const chunkSize = Number(started.chunkSize);
  if (!uploadId || !Number.isFinite(chunkSize) || chunkSize < 1) {
    throw new Error("Sesi unggahan lagu tidak dapat dimulai.");
  }

  try {
    const totalChunks = Math.ceil(file.size / chunkSize);
    for (let part = 0; part < totalChunks; part += 1) {
      const chunk = file.slice(
        part * chunkSize,
        Math.min(file.size, (part + 1) * chunkSize),
      );
      const response = await adminFetch(
        `/api/admin/audio-upload?uploadId=${encodeURIComponent(uploadId)}&part=${part}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: chunk,
        },
      );
      await readJsonResponse(response);
      onProgress?.(Math.round(((part + 1) / totalChunks) * 95));
    }

    const completeResponse = await adminFetch("/api/admin/audio-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", uploadId }),
    });
    const completed = await readJsonResponse(completeResponse);
    onProgress?.(100);
    return completed;
  } catch (error) {
    await adminFetch("/api/admin/audio-upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId }),
    }).catch(() => undefined);
    throw error;
  }
}
