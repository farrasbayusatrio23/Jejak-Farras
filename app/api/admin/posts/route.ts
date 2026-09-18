import { z } from "zod";
import { createPost, deletePost, listAllPosts, updatePost } from "@/lib/posts";
import { getAuthorizedEditor } from "@/lib/editor-auth";
import { getBucket } from "@/lib/storage";

export const dynamic = "force-dynamic";

const postInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  excerpt: z.string().trim().min(1).max(280),
  content: z.string().trim().min(1).max(30000),
  location: z.string().trim().min(1).max(100),
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  readTime: z.number().int().min(1).max(60),
  status: z.enum(["draft", "published"]),
  coverKey: z.string().max(300).nullable(),
  coverAlt: z.string().trim().max(180),
});

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

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth.editor) return auth.response;

  try {
    return Response.json({ posts: await listAllPosts() });
  } catch (error) {
    console.error("Unable to list posts", error);
    return Response.json(
      { error: "Catatan belum dapat dimuat. Coba beberapa saat lagi." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth.editor) return auth.response;

  try {
    const parsed = postInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Periksa kembali judul, tanggal, dan isi catatan." },
        { status: 400 },
      );
    }
    const post = await createPost(parsed.data, auth.editor.userId);
    return Response.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Unable to create post", error);
    return Response.json(
      { error: "Catatan belum dapat disimpan. Isian Anda tetap ada." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (!auth.editor) return auth.response;

  try {
    const payload = (await request.json()) as { id?: unknown; input?: unknown };
    if (typeof payload.id !== "string") {
      return Response.json({ error: "Catatan tidak ditemukan." }, { status: 400 });
    }
    const parsed = postInputSchema.safeParse(payload.input);
    if (!parsed.success) {
      return Response.json(
        { error: "Periksa kembali judul, tanggal, dan isi catatan." },
        { status: 400 },
      );
    }

    const result = await updatePost(payload.id, parsed.data);
    if (!result) {
      return Response.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    }
    if (result.replacedCoverKey) {
      await getBucket().delete(result.replacedCoverKey).catch((error) => {
        console.error("Unable to remove replaced cover", error);
      });
    }
    return Response.json({ post: result.post });
  } catch (error) {
    console.error("Unable to update post", error);
    return Response.json(
      { error: "Perubahan belum dapat disimpan. Isian Anda tetap ada." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (!auth.editor) return auth.response;

  try {
    const payload = (await request.json()) as { id?: unknown };
    if (typeof payload.id !== "string") {
      return Response.json({ error: "Catatan tidak ditemukan." }, { status: 400 });
    }
    const post = await deletePost(payload.id);
    if (!post) {
      return Response.json({ error: "Catatan tidak ditemukan." }, { status: 404 });
    }
    if (post.coverKey) {
      await getBucket().delete(post.coverKey).catch((error) => {
        console.error("Unable to remove deleted cover", error);
      });
    }
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete post", error);
    return Response.json(
      { error: "Catatan belum dapat dihapus." },
      { status: 500 },
    );
  }
}
