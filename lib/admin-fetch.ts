"use client";

import { getSupabaseBrowser } from "@/lib/supabase/browser";

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Sesi editor telah berakhir. Silakan masuk lagi.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
}
