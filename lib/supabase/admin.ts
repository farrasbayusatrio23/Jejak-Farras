import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Environment variable ${name} belum diatur.`);
  return value;
}

// Terima penamaan key Supabase baru maupun legacy.
function firstAvailable(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Environment variable ${names.join(" atau ")} belum diatur.`);
}

export function getSupabaseAdmin() {
  if (!client) {
    client = createClient(
      required("NEXT_PUBLIC_SUPABASE_URL"),
      firstAvailable(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return client;
}

export function storageBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "journal-media";
}
