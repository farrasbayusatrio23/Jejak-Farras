import { z } from "zod";
import { getAuthorizedEditor } from "@/lib/editor-auth";
import { getBucket } from "@/lib/storage";
import { mediaUrl } from "@/lib/types";
import type { AudioManifest } from "@/lib/audio-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIO_LIMIT = 30 * 1024 * 1024;
const CHUNK_SIZE = 768 * 1024;
const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
]);

type UploadSession = {
  version: 1;
  uploadId: string;
  ownerId: string;
  fileName: string;
  contentType: string;
  size: number;
  totalChunks: number;
  createdAt: string;
};

const startSchema = z.object({
  action: z.literal("start"),
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().trim().min(1).max(100),
  size: z.number().int().min(1).max(AUDIO_LIMIT),
});

const finishSchema = z.object({
  action: z.literal("complete"),
  uploadId: z.string().uuid(),
});

const abortSchema = z.object({ uploadId: z.string().uuid() });

function sessionKey(uploadId: string) {
  return `audio-uploads/${uploadId}.json`;
}

function partKey(uploadId: string, part: number) {
  return `audio-parts/${uploadId}/${String(part).padStart(4, "0")}.part`;
}

async function jsonBuffer(value: unknown) {
  return new Blob([JSON.stringify(value)], {
    type: "application/json",
  }).arrayBuffer();
}

async function readSession(uploadId: string): Promise<UploadSession | null> {
  const object = await getBucket().get(sessionKey(uploadId));
  if (!object) return null;
  try {
    const session = JSON.parse(
      await new Response(object.body).text(),
    ) as UploadSession;
    return session.version === 1 && session.uploadId === uploadId
      ? session
      : null;
  } catch {
    return null;
  }
}

async function authorize(request: Request) {
  const editor = await getAuthorizedEditor(request);
  if (!editor) {
    return {
      editor: null,
      response: Response.json(
        { error: "Anda tidak memiliki akses editor." },
        { status: 403 },
      ),
    };
  }
  return { editor, response: null };
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth.editor) return auth.response;

  try {
    const payload = await request.json();
    if ((payload as { action?: unknown }).action === "start") {
      const parsed = startSchema.safeParse(payload);
      if (!parsed.success || !AUDIO_TYPES.has(parsed.data?.contentType || "")) {
        return Response.json(
          { error: "Gunakan berkas MP3, M4A, AAC, WAV, OGG, atau WebM." },
          { status: 400 },
        );
      }

      const uploadId = crypto.randomUUID();
      const session: UploadSession = {
        version: 1,
        uploadId,
        ownerId: auth.editor.userId,
        fileName: parsed.data.fileName,
        contentType: parsed.data.contentType,
        size: parsed.data.size,
        totalChunks: Math.ceil(parsed.data.size / CHUNK_SIZE),
        createdAt: new Date().toISOString(),
      };
      await getBucket().put(sessionKey(uploadId), await jsonBuffer(session), {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { ownerId: auth.editor.userId },
      });
      return Response.json({ uploadId, chunkSize: CHUNK_SIZE });
    }

    const parsed = finishSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json({ error: "Unggahan musik tidak valid." }, { status: 400 });
    }
    const session = await readSession(parsed.data.uploadId);
    if (!session || session.ownerId !== auth.editor.userId) {
      return Response.json({ error: "Sesi unggahan tidak ditemukan." }, { status: 404 });
    }

    const chunks = await Promise.all(
      Array.from({ length: session.totalChunks }, async (_, part) => {
        const key = partKey(session.uploadId, part);
        const object = await getBucket().head(key);
        return object ? { key, size: object.size } : null;
      }),
    );
    if (chunks.some((chunk) => !chunk)) {
      return Response.json(
        { error: "Ada bagian lagu yang belum selesai diunggah." },
        { status: 409 },
      );
    }
    const completedChunks = chunks.filter(
      (chunk): chunk is { key: string; size: number } => Boolean(chunk),
    );
    if (
      completedChunks.reduce((total, chunk) => total + chunk.size, 0) !==
      session.size
    ) {
      return Response.json(
        { error: "Ukuran lagu yang diterima tidak sesuai." },
        { status: 409 },
      );
    }

    const manifest: AudioManifest = {
      version: 1,
      fileName: session.fileName,
      contentType: session.contentType,
      size: session.size,
      chunks: completedChunks,
    };
    const key = `audio/${session.uploadId}.json`;
    await getBucket().put(key, await jsonBuffer(manifest), {
      httpMetadata: {
        contentType: "application/json",
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { ownerId: auth.editor.userId },
    });
    await getBucket().delete(sessionKey(session.uploadId));
    return Response.json(
      { key, url: mediaUrl(key), fileName: session.fileName },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to manage audio upload", error);
    return Response.json(
      { error: "Lagu belum dapat diunggah. Coba kembali." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (!auth.editor) return auth.response;

  try {
    const url = new URL(request.url);
    const uploadId = url.searchParams.get("uploadId") || "";
    const part = Number(url.searchParams.get("part"));
    if (!z.string().uuid().safeParse(uploadId).success || !Number.isInteger(part)) {
      return Response.json({ error: "Bagian unggahan tidak valid." }, { status: 400 });
    }
    const session = await readSession(uploadId);
    if (!session || session.ownerId !== auth.editor.userId) {
      return Response.json({ error: "Sesi unggahan tidak ditemukan." }, { status: 404 });
    }
    if (part < 0 || part >= session.totalChunks) {
      return Response.json({ error: "Nomor bagian tidak valid." }, { status: 400 });
    }

    const bytes = await request.arrayBuffer();
    const expectedSize =
      part === session.totalChunks - 1
        ? session.size - CHUNK_SIZE * part
        : CHUNK_SIZE;
    if (bytes.byteLength !== expectedSize) {
      return Response.json(
        { error: "Ukuran bagian unggahan tidak sesuai." },
        { status: 400 },
      );
    }
    await getBucket().put(partKey(uploadId, part), bytes, {
      httpMetadata: { contentType: "application/octet-stream" },
      customMetadata: { ownerId: auth.editor.userId },
    });
    return Response.json({ part, size: bytes.byteLength });
  } catch (error) {
    console.error("Unable to upload audio chunk", error);
    return Response.json(
      { error: "Sebagian lagu gagal diunggah. Silakan coba kembali." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (!auth.editor) return auth.response;

  try {
    const parsed = abortSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ aborted: true });
    }
    const session = await readSession(parsed.data.uploadId);
    if (!session || session.ownerId !== auth.editor.userId) {
      return Response.json({ aborted: true });
    }
    await getBucket().delete([
      sessionKey(session.uploadId),
      ...Array.from({ length: session.totalChunks }, (_, part) =>
        partKey(session.uploadId, part),
      ),
    ]);
    return Response.json({ aborted: true });
  } catch (error) {
    console.error("Unable to abort audio upload", error);
    return Response.json({ aborted: true });
  }
}
