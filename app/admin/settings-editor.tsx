"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, Music2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin-fetch";
import {
  optimizeImageForUpload,
  readJsonResponse,
  uploadAudioFile,
  validateAudioFile,
  validateImageFile,
} from "@/lib/client-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  SiteSettings,
  SiteSettingsInput,
} from "@/lib/site-settings";
import { mediaUrl } from "@/lib/types";

const emptySettings: SiteSettingsInput = {
  siteName: "",
  ownerName: "",
  heroEyebrow: "",
  heroTitle: "",
  heroAccent: "",
  heroDescription: "",
  openingQuote: "",
  aboutBio: "",
  baseLocation: "",
  journeyStatus: "",
  profileImageKey: null,
  profileImageAlt: "",
  musicEnabled: false,
  musicKey: null,
  musicTitle: "Musik perjalanan",
  musicStart: 0,
  musicEnd: null,
};

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "FB";
}

export default function SettingsEditor() {
  const [draft, setDraft] = useState<SiteSettingsInput>(emptySettings);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioUploadProgress, setAudioUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminFetch("/api/admin/settings", { cache: "no-store" })
      .then(readJsonResponse)
      .then((data) => setDraft(data.settings as SiteSettings))
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

  const profilePreview = useMemo(
    () => localPreview || mediaUrl(draft.profileImageKey),
    [draft.profileImageKey, localPreview],
  );

  const localAudioPreview = useMemo(
    () => (selectedAudioFile ? URL.createObjectURL(selectedAudioFile) : null),
    [selectedAudioFile],
  );

  useEffect(
    () => () => {
      if (localAudioPreview) URL.revokeObjectURL(localAudioPreview);
    },
    [localAudioPreview],
  );

  const audioPreview = localAudioPreview || mediaUrl(draft.musicKey);

  const update = <K extends keyof SiteSettingsInput>(
    key: K,
    value: SiteSettingsInput[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

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

  const chooseAudio = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateAudioFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSelectedAudioFile(file);
    setAudioUploadProgress(0);
    update("musicEnabled", true);
    if (!draft.musicTitle || draft.musicTitle === "Musik perjalanan") {
      update("musicTitle", file.name.replace(/\.[^.]+$/, ""));
    }
    setError(null);
  };

  const saveSettings = async () => {
    setError(null);
    const required = [
      draft.siteName,
      draft.ownerName,
      draft.heroEyebrow,
      draft.heroTitle,
      draft.heroAccent,
      draft.heroDescription,
      draft.openingQuote,
      draft.aboutBio,
      draft.baseLocation,
      draft.journeyStatus,
    ];
    if (required.some((value) => !value.trim())) {
      setError("Lengkapi semua teks utama sebelum menyimpan.");
      return;
    }
    if (draft.musicEnabled && !draft.musicKey && !selectedAudioFile) {
      setError("Pilih lagu terlebih dahulu atau nonaktifkan musik.");
      return;
    }
    if (draft.musicEnd !== null && draft.musicEnd <= draft.musicStart) {
      setError("Waktu selesai lagu harus lebih besar dari waktu mulai.");
      return;
    }

    setSaving(true);
    try {
      let profileImageKey = draft.profileImageKey;
      if (selectedFile) {
        const uploadFile = await optimizeImageForUpload(selectedFile);
        const formData = new FormData();
        formData.append("image", uploadFile, uploadFile.name);
        formData.append("scope", "profile");
        const uploadResponse = await adminFetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const uploaded = await readJsonResponse(uploadResponse);
        profileImageKey = String(uploaded.key);
        setDraft((current) => ({ ...current, profileImageKey }));
        setSelectedFile(null);
        if (fileInput.current) fileInput.current.value = "";
      }

      let musicKey = draft.musicKey;
      if (selectedAudioFile) {
        setAudioUploadProgress(1);
        const uploaded = await uploadAudioFile(
          selectedAudioFile,
          setAudioUploadProgress,
        );
        musicKey = String(uploaded.key);
        setDraft((current) => ({ ...current, musicKey }));
        setSelectedAudioFile(null);
        if (audioInput.current) audioInput.current.value = "";
      }

      const input: SiteSettingsInput = {
        siteName: draft.siteName.trim(),
        ownerName: draft.ownerName.trim(),
        heroEyebrow: draft.heroEyebrow.trim(),
        heroTitle: draft.heroTitle.trim(),
        heroAccent: draft.heroAccent.trim(),
        heroDescription: draft.heroDescription.trim(),
        openingQuote: draft.openingQuote.trim(),
        aboutBio: draft.aboutBio.trim(),
        baseLocation: draft.baseLocation.trim(),
        journeyStatus: draft.journeyStatus.trim(),
        profileImageKey,
        profileImageAlt: draft.profileImageAlt.trim(),
        musicEnabled: draft.musicEnabled,
        musicKey,
        musicTitle: draft.musicTitle.trim() || "Musik perjalanan",
        musicStart: Math.max(0, Math.round(draft.musicStart)),
        musicEnd:
          draft.musicEnd === null
            ? null
            : Math.max(1, Math.round(draft.musicEnd)),
      };
      const response = await adminFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const saved = await readJsonResponse(response);
      setDraft(saved.settings as SiteSettings);
      setAudioUploadProgress(0);
      toast.success("Halaman utama diperbarui");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Halaman utama belum dapat disimpan.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="settings-workspace">
        <div className="settings-panel">
          <Skeleton className="h-20" />
          <Skeleton className="h-72" />
          <Skeleton className="h-96" />
        </div>
      </section>
    );
  }

  return (
    <section className="settings-workspace">
      <div className="settings-panel">
        <div className="editor-heading">
          <div>
            <p>Tampilan jurnal</p>
            <h2>Edit halaman utama.</h2>
          </div>
          <Button asChild variant="outline">
            <a href="/" target="_blank" rel="noreferrer">
              <ArrowLeft /> Lihat jurnal
            </a>
          </Button>
        </div>

        <form
          className="editor-form settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSettings();
          }}
        >
          {error && (
            <div className="editor-error" role="alert">
              {error}
            </div>
          )}

          <div className="settings-section-heading">
            <span>01</span>
            <div>
              <h3>Identitas jurnal</h3>
              <p>Nama yang tampil pada navigasi dan profil penulis.</p>
            </div>
          </div>
          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="siteName">Nama jurnal</label>
              <Input id="siteName" value={draft.siteName} onChange={(event) => update("siteName", event.target.value)} maxLength={80} placeholder="Jejak Farras" />
            </div>
            <div className="form-field">
              <label htmlFor="ownerName">Nama pemilik</label>
              <Input id="ownerName" value={draft.ownerName} onChange={(event) => update("ownerName", event.target.value)} maxLength={80} placeholder="Farras Bayu" />
            </div>
          </div>

          <div className="settings-section-heading">
            <span>02</span>
            <div>
              <h3>Bagian pembuka</h3>
              <p>Ubah judul besar dan pengantar yang pertama dilihat pembaca.</p>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="heroEyebrow">Label kecil</label>
            <Input id="heroEyebrow" value={draft.heroEyebrow} onChange={(event) => update("heroEyebrow", event.target.value)} maxLength={100} />
          </div>
          <div className="field-grid settings-title-grid">
            <div className="form-field">
              <label htmlFor="heroTitle">Judul utama</label>
              <Textarea id="heroTitle" value={draft.heroTitle} onChange={(event) => update("heroTitle", event.target.value)} maxLength={180} className="min-h-28" />
              <small>Gunakan baris baru untuk mengatur pemenggalan judul.</small>
            </div>
            <div className="form-field">
              <label htmlFor="heroAccent">Kata berwarna</label>
              <Input id="heroAccent" value={draft.heroAccent} onChange={(event) => update("heroAccent", event.target.value)} maxLength={80} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="heroDescription">Deskripsi pembuka</label>
            <Textarea id="heroDescription" value={draft.heroDescription} onChange={(event) => update("heroDescription", event.target.value)} maxLength={360} className="min-h-24" />
          </div>
          <div className="form-field">
            <label htmlFor="openingQuote">Kutipan pengantar</label>
            <Textarea id="openingQuote" value={draft.openingQuote} onChange={(event) => update("openingQuote", event.target.value)} maxLength={500} className="min-h-28" />
          </div>

          <div className="settings-section-heading">
            <span>03</span>
            <div>
              <h3>Profil penulis</h3>
              <p>Foto dan cerita singkat yang muncul di bagian Tentang.</p>
            </div>
          </div>
          <div className="profile-editor">
            <div className="profile-photo-preview">
              {profilePreview ? (
                <img src={profilePreview} alt="Pratinjau foto profil" />
              ) : (
                <span>{initials(draft.ownerName)}</span>
              )}
            </div>
            <div>
              <p>Foto profil</p>
              <small>JPG, PNG, atau WebP · otomatis dioptimalkan</small>
              <div className="profile-photo-actions">
                <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                  <ImagePlus /> Pilih foto
                </Button>
                {(selectedFile || draft.profileImageKey) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInput.current) fileInput.current.value = "";
                      update("profileImageKey", null);
                    }}
                  >
                    <X /> Hapus
                  </Button>
                )}
              </div>
              {selectedFile && <small className="selected-image-name">{selectedFile.name}</small>}
            </div>
            <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} />
          </div>
          <div className="form-field">
            <label htmlFor="profileImageAlt">Deskripsi foto profil</label>
            <Input id="profileImageAlt" value={draft.profileImageAlt} onChange={(event) => update("profileImageAlt", event.target.value)} maxLength={180} placeholder="Contoh: Farras di tepi pantai" />
          </div>
          <div className="form-field">
            <label htmlFor="aboutBio">Bio</label>
            <Textarea id="aboutBio" value={draft.aboutBio} onChange={(event) => update("aboutBio", event.target.value)} maxLength={800} className="min-h-36" />
          </div>
          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="baseLocation">Lokasi</label>
              <Input id="baseLocation" value={draft.baseLocation} onChange={(event) => update("baseLocation", event.target.value)} maxLength={120} />
            </div>
            <div className="form-field">
              <label htmlFor="journeyStatus">Catatan singkat</label>
              <Input id="journeyStatus" value={draft.journeyStatus} onChange={(event) => update("journeyStatus", event.target.value)} maxLength={120} />
            </div>
          </div>

          <div className="settings-section-heading">
            <span>04</span>
            <div>
              <h3>Musik jurnal</h3>
              <p>Putar satu lagu berulang di halaman utama dan semua catatan.</p>
            </div>
          </div>
          <div className="publish-row music-switch-row">
            <div>
              <p className="publish-label">Aktifkan musik</p>
              <small>
                Browser dapat meminta pembaca menekan tombol putar terlebih dahulu.
              </small>
            </div>
            <Switch
              checked={draft.musicEnabled}
              onCheckedChange={(checked) => update("musicEnabled", checked)}
              aria-label="Aktifkan musik jurnal"
            />
          </div>
          <div className="music-editor">
            <div className="music-editor-icon" aria-hidden="true">
              <Music2 />
            </div>
            <div className="music-editor-main">
              <p>{selectedAudioFile?.name || draft.musicTitle || "Belum ada lagu"}</p>
              <small>MP3, M4A, AAC, WAV, OGG, atau WebM · maks. 30 MB</small>
              <div className="profile-photo-actions">
                <Button type="button" variant="secondary" size="sm" onClick={() => audioInput.current?.click()}>
                  <Music2 /> Pilih lagu
                </Button>
                {(selectedAudioFile || draft.musicKey) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAudioFile(null);
                      setAudioUploadProgress(0);
                      if (audioInput.current) audioInput.current.value = "";
                      update("musicKey", null);
                      update("musicEnabled", false);
                    }}
                  >
                    <X /> Hapus
                  </Button>
                )}
              </div>
              <input
                ref={audioInput}
                className="sr-only"
                type="file"
                accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm,.mp3,.m4a,.aac,.wav,.ogg,.webm"
                onChange={(event) => chooseAudio(event.target.files?.[0])}
              />
            </div>
            {audioPreview && (
              <audio className="music-editor-preview" src={audioPreview} controls preload="metadata" />
            )}
          </div>
          {audioUploadProgress > 0 && (
            <div className="music-upload-status">
              <div>
                <span>Mengunggah lagu</span>
                <strong>{audioUploadProgress}%</strong>
              </div>
              <Progress value={audioUploadProgress} />
            </div>
          )}
          <div className="form-field">
            <label htmlFor="musicTitle">Judul lagu</label>
            <Input id="musicTitle" value={draft.musicTitle} onChange={(event) => update("musicTitle", event.target.value)} maxLength={120} placeholder="Musik perjalanan" />
          </div>
          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="musicStart">Mulai pada detik</label>
              <Input id="musicStart" type="number" min={0} max={86400} step={1} value={draft.musicStart} onChange={(event) => update("musicStart", Number(event.target.value))} />
            </div>
            <div className="form-field">
              <label htmlFor="musicEnd">Berhenti pada detik</label>
              <Input id="musicEnd" type="number" min={1} max={86400} step={1} value={draft.musicEnd ?? ""} onChange={(event) => update("musicEnd", event.target.value === "" ? null : Number(event.target.value))} placeholder="Kosongkan hingga akhir lagu" />
            </div>
          </div>

          <div className="form-actions settings-actions">
            <span>Perubahan akan langsung digunakan di seluruh jurnal.</span>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
              {saving && audioUploadProgress > 0 && audioUploadProgress < 100
                ? `Mengunggah ${audioUploadProgress}%`
                : saving
                  ? "Menyimpan…"
                  : "Simpan halaman utama"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
