import { getAuthorizedEditor } from "@/lib/editor-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const editor = await getAuthorizedEditor(request);
  if (!editor) {
    return Response.json(
      { error: "Anda tidak memiliki akses editor." },
      { status: 403 },
    );
  }
  return Response.json({ editor });
}
