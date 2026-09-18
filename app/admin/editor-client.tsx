"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin-fetch";
import {
  optimizeImageForUpload,
  readJsonResponse,
  validateImageFile,
} from "@/lib/client-upload";
import type { PostInput, TravelPost } from "@/lib/types";
import { mediaUrl } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import SettingsEditor from "./settings-editor";

type EditorDraft = PostInput & { id: string | null };

const newDraft = (): EditorDraft => ({
  id: null,
  title: "",
  excerpt: "",
  content: "",
  location: "",
  tripDate: new Date().toISOString().slice(0, 10),
  readTime: 5,
  status: "draft",
  coverKey: null,
  coverAlt: "",
});

function fromPost(post: TravelPost): EditorDraft {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    location: post.location,
    tripDate: post.tripDate,
    readTime: post.readTime,
    status: post.status,
    coverKey: post.coverKey,
    coverAlt: post.coverAlt,
  };
}

export default function EditorClient() {
  const [posts, setPosts] = useState<TravelPost[]>([]);
  const [draft, setDraft] = useState<EditorDraft>(newDraft);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminFetch("/api/admin/posts", { cache: "no-store" })
      .then(readJsonResponse)
      .then((data) => {
        const loadedPosts = (data.posts || []) as TravelPost[];
        setPosts(loadedPosts);
        if (loadedPosts[0]) setDraft(fromPost(loadedPosts[0]));
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const localPreview = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  const coverPreview = useMemo(
    () => localPreview || mediaUrl(draft.coverKey) || "/bromo-sunrise.webp",
    [draft.coverKey, localPreview],
  );

  const selectPost = (post: TravelPost) => {
    if (saving) return;
    setDraft(fromPost(post));
    setSelectedFile(null);
    setError(null);
  };

  const startNew = () => {
    if (saving) return;
    setDraft(newDraft());
    setSelectedFile(null);
    setError(null);
  };

  const update = <K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const savePost = async () => {
    setError(null);
    if (!draft.title.trim() || !draft.excerpt.trim() || !draft.content.trim() || !draft.location.trim()) {
      setError("Lengkapi judul, ringkasan, lokasi, dan isi cerita.");
      return;
    }

    setSaving(true);
    try {
      let coverKey = draft.coverKey;
      if (selectedFile) {
        const uploadFile = await optimizeImageForUpload(selectedFile);
        const formData = new FormData();
        formData.append("image", uploadFile, uploadFile.name);
        const uploadResponse = await adminFetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const uploaded = await readJsonResponse(uploadResponse);
        coverKey = String(uploaded.key);
        setDraft((current) => ({ ...current, coverKey }));
        setSelectedFile(null);
        if (fileInput.current) fileInput.current.value = "";
      }

      const input: PostInput = {
        title: draft.title.trim(),
        excerpt: draft.excerpt.trim(),
        content: draft.content.trim(),
        location: draft.location.trim(),
        tripDate: draft.tripDate,
        readTime: Number(draft.readTime),
        status: draft.status,
        coverKey,
        coverAlt: draft.coverAlt.trim(),
      };

      const response = await adminFetch("/api/admin/posts", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft.id ? { id: draft.id, input } : input),
      });
      const saved = await readJsonResponse(response);
      const post = saved.post as TravelPost;
      setPosts((current) => {
        const exists = current.some((item) => item.id === post.id);
        const next = exists
          ? current.map((item) => (item.id === post.id ? post : item))
          : [post, ...current];
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setDraft(fromPost(post));
      setSelectedFile(null);
      toast.success(draft.id ? "Perubahan disimpan" : "Catatan baru dibuat");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Catatan belum dapat disimpan.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrent = async () => {
    if (!draft.id) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id }),
      });
      await readJsonResponse(response);
      const remaining = posts.filter((post) => post.id !== draft.id);
      setPosts(remaining);
      setDraft(remaining[0] ? fromPost(remaining[0]) : newDraft());
      setSelectedFile(null);
      toast.success("Catatan dihapus");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Catatan belum dapat dihapus.";
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  return (
    <>
      <Tabs defaultValue="posts" className="editor-tabs">
        <div className="editor-tabbar">
          <TabsList variant="line" aria-label="Bagian editor">
            <TabsTrigger value="posts">Catatan</TabsTrigger>
            <TabsTrigger value="homepage">Halaman utama</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="posts" className="editor-tab-content">
          <div className="editor-shell">
        <aside className="editor-sidebar">
          <div className="editor-sidebar-head">
            <div>
              <h1>Catatan</h1>
              <span className="editor-count">{posts.length} tulisan</span>
            </div>
            <Button size="icon" variant="secondary" onClick={startNew} aria-label="Buat catatan baru">
              <Plus />
            </Button>
          </div>
          <div className="post-list" aria-label="Daftar catatan">
            {loading ? (
              <>
                <Skeleton className="h-20 bg-white/10" />
                <Skeleton className="h-20 bg-white/10" />
                <Skeleton className="h-20 bg-white/10" />
              </>
            ) : posts.length ? (
              posts.map((post) => (
                <button
                  type="button"
                  className={`post-list-item ${draft.id === post.id ? "active" : ""}`}
                  onClick={() => selectPost(post)}
                  key={post.id}
                >
                  <strong>{post.title}</strong>
                  <span><i className={`status-dot ${post.status}`} />{post.status === "published" ? "Terbit" : "Draf"} · {post.location}</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-white/60">Belum ada catatan.</p>
            )}
          </div>
        </aside>

        <section className="editor-workspace">
          <div className="editor-panel">
            <div className="editor-heading">
              <div>
                <p>{draft.id ? "Mengedit catatan" : "Catatan baru"}</p>
                <h2>{draft.id ? "Rapikan ceritamu." : "Mulai dari satu tempat."}</h2>
              </div>
              <Button asChild variant="outline">
                <a href="/" target="_blank" rel="noreferrer"><ArrowLeft /> Lihat jurnal</a>
              </Button>
            </div>

            {loading ? (
              <div className="editor-form">
                <Skeleton className="h-16" />
                <Skeleton className="h-64" />
                <Skeleton className="h-40" />
              </div>
            ) : (
              <form className="editor-form" onSubmit={(event) => { event.preventDefault(); void savePost(); }}>
                {error && <div className="editor-error" role="alert">{error}</div>}

                <div className="form-field">
                  <label htmlFor="title">Judul cerita</label>
                  <Input id="title" className="title-input" value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="Apa yang terjadi di perjalanan?" maxLength={120} />
                </div>

                <div className="form-field">
                  <label htmlFor="excerpt">Ringkasan</label>
                  <Textarea id="excerpt" value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} placeholder="Dua kalimat untuk mengundang pembaca masuk." maxLength={280} className="min-h-24" />
                  <small>{draft.excerpt.length}/280 karakter</small>
                </div>

                <div className="cover-zone">
                  <img src={coverPreview} alt="" />
                  <div className="cover-zone-overlay" />
                  <div className="cover-controls">
                    <p>Foto sampul<small>JPG, PNG, atau WebP · otomatis dioptimalkan</small></p>
                    <div className="cover-actions">
                      <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                        <ImagePlus /> Pilih foto
                      </Button>
                      {(selectedFile || draft.coverKey) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="border-white/40 bg-black/20 text-white hover:bg-black/40 hover:text-white"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInput.current) fileInput.current.value = "";
                            update("coverKey", null);
                          }}
                          aria-label="Hapus foto sampul"
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                  </div>
                  <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} />
                </div>

                {selectedFile && (
                  <Attachment className="w-full" state={saving ? "uploading" : "idle"}>
                    <AttachmentMedia variant="image"><img src={localPreview || ""} alt="" /></AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{selectedFile.name}</AttachmentTitle>
                      <AttachmentDescription>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB · siap diunggah saat disimpan</AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction type="button" onClick={() => {
                        setSelectedFile(null);
                        if (fileInput.current) fileInput.current.value = "";
                      }} aria-label="Batalkan gambar"><X /></AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                )}

                <div className="form-field">
                  <label htmlFor="coverAlt">Deskripsi foto</label>
                  <Input id="coverAlt" value={draft.coverAlt} onChange={(event) => update("coverAlt", event.target.value)} placeholder="Contoh: Gunung Bromo saat matahari terbit" maxLength={180} />
                  <small>Membantu pembaca yang menggunakan pembaca layar.</small>
                </div>

                <div className="field-grid">
                  <div className="form-field">
                    <label htmlFor="location">Lokasi</label>
                    <Input id="location" value={draft.location} onChange={(event) => update("location", event.target.value)} placeholder="Bromo, Jawa Timur" maxLength={100} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="tripDate">Tanggal perjalanan</label>
                    <Input id="tripDate" type="date" value={draft.tripDate} onChange={(event) => update("tripDate", event.target.value)} />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="content">Isi cerita</label>
                  <Textarea id="content" className="story-textarea" value={draft.content} onChange={(event) => update("content", event.target.value)} placeholder={"Tuliskan perjalananmu di sini.\n\nPisahkan paragraf dengan satu baris kosong."} maxLength={30000} />
                  <small>{draft.content.length.toLocaleString("id-ID")}/30.000 karakter</small>
                </div>

                <div className="field-grid">
                  <div className="form-field">
                    <label htmlFor="readTime">Waktu baca</label>
                    <Input id="readTime" type="number" min={1} max={60} value={draft.readTime} onChange={(event) => update("readTime", Number(event.target.value))} />
                  </div>
                  <div className="publish-row">
                    <div>
                      <p className="publish-label">Terbitkan</p>
                      <small>{draft.status === "published" ? "Terlihat di halaman jurnal" : "Hanya tersimpan sebagai draf"}</small>
                    </div>
                    <Switch checked={draft.status === "published"} onCheckedChange={(checked) => update("status", checked ? "published" : "draft")} aria-label="Status publikasi" />
                  </div>
                </div>

                <div className="form-actions">
                  <div>
                    {draft.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive"><Trash2 /> Hapus</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus catatan ini?</AlertDialogTitle>
                            <AlertDialogDescription>Catatan dan foto sampulnya akan dihapus secara permanen.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => void deleteCurrent()} disabled={deleting}>
                              {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Hapus catatan
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <Button type="submit" size="lg" disabled={saving}>
                    {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                    {saving ? "Menyimpan…" : "Simpan catatan"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
          </div>
        </TabsContent>
        <TabsContent value="homepage" className="editor-tab-content">
          <SettingsEditor />
        </TabsContent>
      </Tabs>
      <Toaster theme="light" position="top-right" richColors />
    </>
  );
}
