import { getAuthorizedEditor } from "@/lib/editor-auth";
import { getBucket } from "@/lib/storage";
import { mediaUrl } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const editor = await getAuthorizedEditor(request);
  if (!editor) {
    return Response.json(
      { error: "Anda tidak memiliki akses editor." },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const scope = formData.get("scope") === "profile" ? "profiles" : "posts";
    if (!(file instanceof File)) {
      return Response.json({ error: "Pilih gambar terlebih dahulu." }, { status: 400 });
    }
    const extension = EXTENSIONS[file.type];
    if (!extension) {
      return Response.json(
        { error: "Gunakan gambar JPG, PNG, atau WebP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "Foto masih terlalu besar setelah diproses. Coba gunakan foto lain." },
        { status: 413 },
      );
    }

    const key = `${scope}/${crypto.randomUUID()}.${extension}`;
    await getBucket().put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: { ownerId: editor.userId },
    });

    return Response.json({ key, url: mediaUrl(key) }, { status: 201 });
  } catch (error) {
    console.error("Unable to upload image", error);
    return Response.json(
      { error: "Gambar belum dapat diunggah. Coba kembali." },
      { status: 500 },
    );
  }
}
