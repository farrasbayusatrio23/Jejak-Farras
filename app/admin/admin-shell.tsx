"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { LoaderCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/admin-fetch";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import EditorClient from "./editor-client";

type EditorIdentity = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type Status = "loading" | "signed-out" | "checking" | "authorized" | "denied";

export default function AdminShell() {
  const [status, setStatus] = useState<Status>("loading");
  const [editor, setEditor] = useState<EditorIdentity | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function checkEditor() {
    setStatus("checking");
    setMessage("");
    try {
      const response = await adminFetch("/api/admin/me", { cache: "no-store" });
      const data = (await response.json()) as {
        editor?: EditorIdentity;
        error?: string;
      };
      if (!response.ok || !data.editor) {
        setEditor(null);
        setStatus("denied");
        setMessage(data.error || "Akun ini bukan editor jurnal.");
        return;
      }
      setEditor(data.editor);
      setStatus("authorized");
    } catch (error) {
      setEditor(null);
      setStatus("signed-out");
      setMessage(error instanceof Error ? error.message : "Sesi editor tidak tersedia.");
    }
  }

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) void checkEditor();
      else setStatus("signed-out");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) void checkEditor();
      else {
        setEditor(null);
        setStatus("signed-out");
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await checkEditor();
    } catch (error) {
      setStatus("signed-out");
      setMessage(
        error instanceof Error
          ? error.message
          : "Email atau kata sandi belum dapat digunakan.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    setEditor(null);
    setPassword("");
    setStatus("signed-out");
    setMessage("");
  }

  if (status === "loading" || status === "checking") {
    return (
      <main className="access-denied">
        <section className="access-card" aria-live="polite">
          <LoaderCircle className="mx-auto size-10 animate-spin text-[#e45f32]" aria-hidden="true" />
          <h1>Menyiapkan editor</h1>
          <p>Memeriksa sesi Supabase Anda.</p>
        </section>
      </main>
    );
  }

  if (status === "signed-out") {
    return (
      <main className="access-denied">
        <section className="access-card" aria-labelledby="login-title">
          <div className="public-brand mb-5 justify-center">
            <span>FB</span>
            <strong>Meja Tulis / Farras</strong>
          </div>
          <h1 id="login-title">Masuk ke editor</h1>
          <p>Gunakan akun Supabase Auth yang emailnya sama dengan variabel <strong>EDITOR_EMAIL</strong>.</p>
          <form className="mt-6 grid gap-3 text-left" onSubmit={signIn}>
            <label className="grid gap-1.5 text-sm font-semibold">
              Email
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Kata sandi
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {message && <p className="text-sm text-[#b73c2f]">{message}</p>}
            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              Masuk
            </Button>
            <Button asChild type="button" variant="outline" className="w-full">
              <Link href="/">Kembali ke jurnal</Link>
            </Button>
          </form>
        </section>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="access-denied">
        <section className="access-card" aria-labelledby="access-title">
          <ShieldAlert className="mx-auto size-10 text-[#e45f32]" aria-hidden="true" />
          <h1 id="access-title">Akses terbatas</h1>
          <p>{message || "Akun yang digunakan bukan akun pemilik jurnal ini."}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => void signOut()}>Ganti akun</Button>
            <Button asChild variant="outline">
              <Link href="/">Kembali ke jurnal</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="editor-page">
      <header className="editor-topbar">
        <Link className="public-brand" href="/">
          <span>FB</span>
          <strong>Meja Tulis / Farras</strong>
        </Link>
        <div className="editor-topbar-actions">
          <span>{editor?.displayName || editor?.email}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => void signOut()}
          >
            Keluar
          </Button>
        </div>
      </header>
      <EditorClient />
    </main>
  );
}
