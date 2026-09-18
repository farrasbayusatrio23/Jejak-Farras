import { z } from "zod";
import { getAuthorizedEditor } from "@/lib/editor-auth";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/site-settings";
import { getBucket } from "@/lib/storage";
import { deleteAudioAsset } from "@/lib/audio-storage";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  siteName: z.string().trim().min(1).max(80),
  ownerName: z.string().trim().min(1).max(80),
  heroEyebrow: z.string().trim().min(1).max(100),
  heroTitle: z.string().trim().min(1).max(180),
  heroAccent: z.string().trim().min(1).max(80),
  heroDescription: z.string().trim().min(1).max(360),
  openingQuote: z.string().trim().min(1).max(500),
  aboutBio: z.string().trim().min(1).max(800),
  baseLocation: z.string().trim().min(1).max(120),
  journeyStatus: z.string().trim().min(1).max(120),
  profileImageKey: z
    .string()
    .max(300)
    .refine((key) => key.startsWith("profiles/"), "Foto profil tidak valid.")
    .nullable(),
  profileImageAlt: z.string().trim().max(180),
  musicEnabled: z.boolean(),
  musicKey: z
    .string()
    .max(300)
    .refine(
      (key) => key.startsWith("audio/") && key.endsWith(".json"),
      "Berkas musik tidak valid.",
    )
    .nullable(),
  musicTitle: z.string().trim().min(1).max(120),
  musicStart: z.number().int().min(0).max(86400),
  musicEnd: z.number().int().min(1).max(86400).nullable(),
}).refine(
  (settings) =>
    settings.musicEnd === null || settings.musicEnd > settings.musicStart,
  {
    message: "Waktu selesai harus lebih besar dari waktu mulai.",
    path: ["musicEnd"],
  },
).refine(
  (settings) => !settings.musicEnabled || settings.musicKey !== null,
  {
    message: "Pilih lagu terlebih dahulu atau nonaktifkan musik.",
    path: ["musicKey"],
  },
);

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
    return Response.json({ settings: await getSiteSettings() });
  } catch (error) {
    console.error("Unable to read site settings", error);
    return Response.json(
      { error: "Pengaturan halaman belum dapat dimuat." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (!auth.editor) return auth.response;

  try {
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Periksa kembali isian halaman utama." },
        { status: 400 },
      );
    }

    const current = await getSiteSettings();
    const settings = await updateSiteSettings(parsed.data);
    if (
      current.profileImageKey &&
      current.profileImageKey !== settings.profileImageKey
    ) {
      await getBucket().delete(current.profileImageKey).catch((error) => {
        console.error("Unable to remove replaced profile image", error);
      });
    }
    if (current.musicKey && current.musicKey !== settings.musicKey) {
      await deleteAudioAsset(current.musicKey).catch((error) => {
        console.error("Unable to remove replaced audio", error);
      });
    }
    return Response.json({ settings });
  } catch (error) {
    console.error("Unable to update site settings", error);
    return Response.json(
      { error: "Perubahan belum dapat disimpan. Isian Anda tetap ada." },
      { status: 500 },
    );
  }
}
