import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type EditorUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

function configuredEditorEmail(): string | null {
  return process.env.EDITOR_EMAIL?.trim().toLowerCase() || null;
}

export function isEditorUser(user: User): boolean {
  const editorEmail = configuredEditorEmail();
  return Boolean(
    editorEmail && user.email?.trim().toLowerCase() === editorEmail,
  );
}

export async function getAuthorizedEditor(request: Request): Promise<EditorUser | null> {
  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(match[1]);
  if (error || !data.user || !isEditorUser(data.user)) return null;

  const fullName =
    typeof data.user.user_metadata?.full_name === "string"
      ? data.user.user_metadata.full_name
      : null;
  const email = data.user.email || "";
  return {
    userId: data.user.id,
    email,
    fullName,
    displayName: fullName || email,
  };
}
