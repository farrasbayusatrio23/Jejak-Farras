import { getBucket } from "@/lib/storage";

export type AudioManifest = {
  version: 1;
  fileName: string;
  contentType: string;
  size: number;
  chunks: Array<{ key: string; size: number }>;
};

export function isAudioManifest(value: unknown): value is AudioManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<AudioManifest>;
  return (
    manifest.version === 1 &&
    typeof manifest.fileName === "string" &&
    typeof manifest.contentType === "string" &&
    typeof manifest.size === "number" &&
    Array.isArray(manifest.chunks) &&
    manifest.chunks.every(
      (chunk) =>
        chunk &&
        typeof chunk.key === "string" &&
        chunk.key.startsWith("audio-parts/") &&
        typeof chunk.size === "number",
    )
  );
}

export async function readAudioManifest(
  key: string,
): Promise<AudioManifest | null> {
  if (!key.startsWith("audio/") || !key.endsWith(".json")) return null;
  const object = await getBucket().get(key);
  if (!object) return null;
  try {
    const manifest = JSON.parse(
      await new Response(object.body).text(),
    ) as unknown;
    return isAudioManifest(manifest) ? manifest : null;
  } catch {
    return null;
  }
}

export async function deleteAudioAsset(key: string) {
  const manifest = await readAudioManifest(key);
  const keys = manifest
    ? [key, ...manifest.chunks.map((chunk) => chunk.key)]
    : [key];
  await getBucket().delete(keys);
}
