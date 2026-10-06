import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MusicPlayer } from "@/components/music-player";
import { getPublishedPostBySlug, starterPosts } from "@/lib/posts";
import {
  defaultSiteSettings,
  getSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings";
import { mediaUrl } from "@/lib/types";

export const dynamic = "force-dynamic";

type CatatanPageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

async function resolvePost(slug: string) {
  try {
    const post = await getPublishedPostBySlug(slug);
    if (post) return post;
  } catch (error) {
    console.error("Unable to load post", error);
  }
  return starterPosts.find((post) => post.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: CatatanPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) return { title: "Catatan tidak ditemukan" };
  return { title: post.title, description: post.excerpt };
}

export default async function CatatanPage({ params }: CatatanPageProps) {
  const { slug } = await params;
  const post = await resolvePost(slug);
  if (!post) notFound();

  let settings: SiteSettings = defaultSiteSettings;
  try {
    settings = await getSiteSettings();
  } catch (error) {
    console.error("Unable to load site settings", error);
  }

  const cover =
    mediaUrl(post.coverKey) ??
    (post.id === "starter-bromo" ? "/bromo-sunrise.webp" : "/bromo-sunrise.webp");
  const paragraphs = post.content.split(/\n\n+/).filter(Boolean);

  return (
    <main className="article-page">
      <header className="article-header">
        <img
          src={cover}
          alt={post.coverAlt || `Pemandangan dari ${post.location}`}
          width={1536}
          height={1024}
        />
        <div className="article-header-copy">
          <p>{post.location}</p>
          <h1>{post.title}</h1>
          <div className="article-meta">
            <time dateTime={post.tripDate}>{formatDate(post.tripDate)}</time>
            <span>{post.readTime} menit baca</span>
          </div>
        </div>
      </header>

      <article className="article-body">
        <Link className="back-link" href="/">
          <span aria-hidden="true">←</span> Kembali ke jurnal
        </Link>
        <p className="lead-paragraph">{post.excerpt}</p>
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
        ))}
      </article>

      <footer className="article-footer">
        <span>{settings.siteName}</span>
        <Link href="/">Beranda →</Link>
      </footer>

      <MusicPlayer
        enabled={settings.musicEnabled}
        musicKey={settings.musicKey}
        title={settings.musicTitle}
        startAt={settings.musicStart}
        endAt={settings.musicEnd}
      />
    </main>
  );
}
