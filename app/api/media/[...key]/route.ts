import { readAudioManifest } from "@/lib/audio-storage";
import { getBucket } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function safeKey(segments: string[]): string | null {
  if (!segments.length || segments.length > 8) return null;
  for (const segment of segments) {
    if (!SEGMENT.test(segment) || segment === "." || segment === "..") {
      return null;
    }
  }
  return segments.join("/");
}

function parseRange(header: string | null, size: number) {
  if (!header || size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start: number;
  let end: number;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

async function readObjectBytes(key: string) {
  const object = await getBucket().get(key);
  if (!object) return null;
  return new Uint8Array(await new Response(object.body).arrayBuffer());
}

function concatSlice(parts: Uint8Array[], start: number, end: number) {
  const output = new Uint8Array(end - start + 1);
  let written = 0;
  let position = 0;
  for (const part of parts) {
    const partStart = position;
    const partEnd = position + part.byteLength - 1;
    position += part.byteLength;
    if (partEnd < start) continue;
    if (partStart > end) break;
    const from = Math.max(start, partStart) - partStart;
    const to = Math.min(end, partEnd) - partStart;
    output.set(part.subarray(from, to + 1), written);
    written += to - from + 1;
  }
  return output;
}

async function serveAudioManifest(key: string, request: Request) {
  const manifest = await readAudioManifest(key);
  if (!manifest) return new Response("Not found", { status: 404 });

  const parts: Uint8Array[] = [];
  for (const chunk of manifest.chunks) {
    const bytes = await readObjectBytes(chunk.key);
    if (!bytes) {
      return new Response("Berkas musik tidak lengkap.", { status: 502 });
    }
    parts.push(bytes);
  }

  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const range = parseRange(request.headers.get("range"), total);
  const start = range ? range.start : 0;
  const end = range ? range.end : total - 1;
  const body = concatSlice(parts, start, end);

  const headers = new Headers({
    "Content-Type": manifest.contentType || "audio/mpeg",
    "Content-Length": String(body.byteLength),
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  });
  if (range) {
    headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
  }

  return new Response(body, { status: range ? 206 : 200, headers });
}

export async function GET(request: Request, context: RouteContext) {
  const { key: segments } = await context.params;
  const key = safeKey(segments ?? []);
  if (!key) return new Response("Not found", { status: 404 });

  try {
    if (key.startsWith("audio/") && key.endsWith(".json")) {
      return await serveAudioManifest(key, request);
    }

    const metadata = await getBucket().head(key);
    if (!metadata) return new Response("Not found", { status: 404 });

    const range = parseRange(request.headers.get("range"), metadata.size);
    const object = await getBucket().get(
      key,
      range
        ? { range: { offset: range.start, length: range.end - range.start + 1 } }
        : undefined,
    );
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers({
      "Content-Type":
        object.httpMetadata?.contentType ||
        metadata.httpMetadata?.contentType ||
        "application/octet-stream",
      "Content-Length": String(
        range ? range.end - range.start + 1 : object.size,
      ),
      "Accept-Ranges": "bytes",
      "Cache-Control":
        metadata.httpMetadata?.cacheControl ||
        "public, max-age=31536000, immutable",
    });
    const etag = object.httpEtag || metadata.httpEtag;
    if (etag) headers.set("ETag", etag);
    if (range) {
      headers.set(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${metadata.size}`,
      );
    }

    return new Response(object.body, { status: range ? 206 : 200, headers });
  } catch (error) {
    console.error("Unable to serve media", error);
    return new Response("Media tidak dapat dimuat.", { status: 500 });
  }
}
