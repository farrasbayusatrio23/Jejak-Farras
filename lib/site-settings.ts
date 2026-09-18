import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type SiteSettings = {
  id: string;
  siteName: string;
  ownerName: string;
  heroEyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  openingQuote: string;
  aboutBio: string;
  baseLocation: string;
  journeyStatus: string;
  profileImageKey: string | null;
  profileImageAlt: string;
  musicEnabled: boolean;
  musicKey: string | null;
  musicTitle: string;
  musicStart: number;
  musicEnd: number | null;
  updatedAt: string;
};

export type SiteSettingsInput = Omit<SiteSettings, "id" | "updatedAt">;

type SettingsRow = {
  id: string;
  site_name: string;
  owner_name: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_accent: string;
  hero_description: string;
  opening_quote: string;
  about_bio: string;
  base_location: string;
  journey_status: string;
  profile_image_key: string | null;
  profile_image_alt: string;
  music_enabled: boolean;
  music_key: string | null;
  music_title: string;
  music_start: number;
  music_end: number | null;
  updated_at: string;
};

export const defaultSiteSettings: SiteSettings = {
  id: "site",
  siteName: "Jejak Farras",
  ownerName: "Farras Bayu",
  heroEyebrow: "Jurnal perjalanan pribadi",
  heroTitle: "Pergi untuk melihat.\nPulang untuk",
  heroAccent: "mengerti.",
  heroDescription:
    "Catatan Farras Bayu tentang tempat, rasa, dan orang-orang yang membuat perjalanan layak diingat.",
  openingQuote:
    "Saya percaya perjalanan terbaik tidak selalu yang paling jauh, tetapi yang membuat kita pulang dengan cara pandang yang baru.",
  aboutBio:
    "Saya berjalan untuk mengenal tempat baru, lalu menulis agar detail-detail kecilnya tidak hilang. Jurnal ini adalah rumah bagi foto, rute, dan cerita yang saya bawa pulang.",
  baseLocation: "Berbasis di Indonesia",
  journeyStatus: "Selalu mencari jalan berikutnya",
  profileImageKey: null,
  profileImageAlt: "",
  musicEnabled: false,
  musicKey: null,
  musicTitle: "Musik perjalanan",
  musicStart: 0,
  musicEnd: null,
  updatedAt: "2026-09-05T03:48:14.281Z",
};

function mapSettings(row: SettingsRow): SiteSettings {
  return {
    id: row.id,
    siteName: row.site_name,
    ownerName: row.owner_name,
    heroEyebrow: row.hero_eyebrow,
    heroTitle: row.hero_title,
    heroAccent: row.hero_accent,
    heroDescription: row.hero_description,
    openingQuote: row.opening_quote,
    aboutBio: row.about_bio,
    baseLocation: row.base_location,
    journeyStatus: row.journey_status,
    profileImageKey: row.profile_image_key,
    profileImageAlt: row.profile_image_alt,
    musicEnabled: Boolean(row.music_enabled),
    musicKey: row.music_key,
    musicTitle: row.music_title,
    musicStart: row.music_start,
    musicEnd: row.music_end,
    updatedAt: row.updated_at,
  };
}

function inputToRow(input: SiteSettingsInput) {
  return {
    site_name: input.siteName,
    owner_name: input.ownerName,
    hero_eyebrow: input.heroEyebrow,
    hero_title: input.heroTitle,
    hero_accent: input.heroAccent,
    hero_description: input.heroDescription,
    opening_quote: input.openingQuote,
    about_bio: input.aboutBio,
    base_location: input.baseLocation,
    journey_status: input.journeyStatus,
    profile_image_key: input.profileImageKey,
    profile_image_alt: input.profileImageAlt,
    music_enabled: input.musicEnabled,
    music_key: input.musicKey,
    music_title: input.musicTitle,
    music_start: input.musicStart,
    music_end: input.musicEnd,
  };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("site_settings")
    .select("*")
    .eq("id", "site")
    .maybeSingle();
  if (error) throw error;
  return data ? mapSettings(data as SettingsRow) : defaultSiteSettings;
}

export async function updateSiteSettings(input: SiteSettingsInput): Promise<SiteSettings> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("site_settings")
    .upsert({
      id: "site",
      ...inputToRow(input),
      updated_at: now,
    }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return mapSettings(data as SettingsRow);
}
