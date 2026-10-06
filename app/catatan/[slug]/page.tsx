import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JournalAtmosphere } from "@/components/journal-atmosphere";
import { MusicPlayer } from "@/components/music-player";
import { getPublishedPostBySlug, listPublishedPosts, starterPosts } from "@/lib/posts";
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

  /* Catatan berikutnya untuk penutup — memberi alasan untuk terus menggulir.
     Arsip diurutkan terbaru-dulu, jadi tetangga yang lebih lama datang dulu. */
  let nextPost: { slug: string; title: string; location: string } | null = null;
  let stream: { slug: string; title: string; location: string }[] = [];
  try {
    stream = await listPublishedPosts();
  } catch (error) {
    console.error("Unable to load archive for next post", error);
    stream = starterPosts;
  }
  const position = stream.findIndex((candidate) => candidate.slug === post.slug);
  if (position !== -1) {
    const neighbour = stream[position + 1] ?? stream[position - 1];
    if (neighbour) {
      nextPost = {
        slug: neighbour.slug,
        title: neighbour.title,
        location: neighbour.location,
      };
    }
  }

  const cover =
    mediaUrl(post.coverKey) ??
    (post.id === "starter-bromo" ? "/bromo-sunrise.webp" : "/bromo-sunrise.webp");
  const paragraphs = post.content.split(/\n\n+/).filter(Boolean);

  // Lagu milik catatan ini; bila belum diisi, jatuh ke musik jurnal.
  // ponytail: lagu catatan selalu diputar penuh (tanpa potong mulai/selesai);
  // tambahkan kolom music_start/music_end di posts bila perlu memotong lagu.
  const music = post.musicKey
    ? {
        enabled: true,
        key: post.musicKey,
        title: post.musicTitle || settings.musicTitle,
        startAt: 0,
        endAt: null as number | null,
      }
    : {
        enabled: settings.musicEnabled,
        key: settings.musicKey,
        title: settings.musicTitle,
        startAt: settings.musicStart,
        endAt: settings.musicEnd,
      };

  return (
    <main className="article-page">
      <JournalAtmosphere />
      <div className="article-progress" aria-hidden="true" />

      <header className="article-header">
        <img
          src={cover}
          alt={post.coverAlt || `Pemandangan dari ${post.location}`}
          width={1536}
          height={1024}
          fetchPriority="high"
        />
        <div className="article-header-copy">
          <p data-reveal="fade">{post.location}</p>
          <h1 className="hero-line">
            <span>{post.title}</span>
          </h1>
          <div className="article-meta" data-reveal style={{ "--reveal-delay": "0.12s" } as React.CSSProperties}>
            <time dateTime={post.tripDate}>{formatDate(post.tripDate)}</time>
            <span>{post.readTime} menit baca</span>
          </div>
        </div>
      </header>

      <article className="article-body">
        <Link className="back-link" href="/">
          <span aria-hidden="true">←</span> Kembali ke jurnal
        </Link>
        <p className="lead-paragraph" data-reveal>{post.excerpt}</p>
        {paragraphs.map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 16)}`}
            data-reveal
            style={index === 0 ? undefined : ({ "--reveal-delay": `${Math.min(index, 4) * 0.05}s` } as React.CSSProperties)}
          >
            {paragraph}
          </p>
        ))}
      </article>

      {nextPost && (
        <section className="next-entry" aria-labelledby="next-title">
          <p className="section-kicker" data-reveal="fade"><span>→</span> Catatan berikutnya</p>
          <h2 id="next-title" data-reveal>
            <Link href={`/catatan/${nextPost.slug}`}>
              <span>{nextPost.title}</span>
              <em>{nextPost.location}</em>
            </Link>
          </h2>
        </section>
      )}

      <footer className="article-footer">
        <span>{settings.siteName}</span>
        <Link href="/">Beranda →</Link>
      </footer>

      <MusicPlayer
        enabled={music.enabled}
        musicKey={music.key}
        title={music.title}
        startAt={music.startAt}
        endAt={music.endAt}
      />
    </main>
  );
}
