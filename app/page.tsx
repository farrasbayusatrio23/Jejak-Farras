import type { Metadata } from "next";
import Link from "next/link";
import { JournalAtmosphere } from "@/components/journal-atmosphere";
import { MusicPlayer } from "@/components/music-player";
import { PostMotif } from "@/components/post-motif";
import { listPublishedPosts, starterPosts } from "@/lib/posts";
import {
  defaultSiteSettings,
  getSiteSettings,
  type SiteSettings,
} from "@/lib/site-settings";
import { mediaUrl, type TravelPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let settings = defaultSiteSettings;
  try {
    settings = await getSiteSettings();
  } catch (error) {
    console.error("Unable to load site metadata", error);
  }
  return {
    title: { absolute: `${settings.siteName} — Jurnal Perjalanan` },
    description: settings.heroDescription,
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function coverFor(post: TravelPost) {
  return mediaUrl(post.coverKey) ?? "/bromo-sunrise.webp";
}

function archiveCoverFor(post: TravelPost) {
  return (
    mediaUrl(post.coverKey) ??
    (post.id === "starter-bromo" ? "/bromo-sunrise.webp" : null)
  );
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FB"
  );
}

/** Shorten a place name so the ticker keeps a steady rhythm. */
function shortPlace(location: string) {
  return location.split(",")[0].trim();
}

const ROUTE_SECTIONS = [
  { id: "cerita", label: "Cerita" },
  { id: "arsip", label: "Arsip" },
  { id: "tentang", label: "Tentang" },
];

export default async function Home() {
  let posts: TravelPost[];
  let settings: SiteSettings = defaultSiteSettings;
  try {
    posts = await listPublishedPosts();
  } catch (error) {
    console.error("Unable to load published posts", error);
    posts = starterPosts;
  }
  try {
    settings = await getSiteSettings();
  } catch (error) {
    console.error("Unable to load site settings", error);
  }

  const featured = posts[0] ?? starterPosts[0];
  const archive = posts;
  const paragraphs = featured.content.split(/\n\n+/).filter(Boolean);
  const heroLines = settings.heroTitle.split(/\n+/).filter(Boolean);
  const ownerInitials = initials(settings.ownerName);
  const profileImage = mediaUrl(settings.profileImageKey);
  const ticker = archive.length > 1 ? archive : starterPosts;

  return (
    <main className="journal-site" id="beranda">
      <JournalAtmosphere sections={ROUTE_SECTIONS} />

      <header className="public-header">
        <a className="public-brand" href="#beranda" aria-label={`${settings.siteName}, kembali ke atas`}>
          <span className={`brand-avatar${profileImage ? " has-photo" : ""}`}>
            {profileImage ? <img src={profileImage} alt="" /> : ownerInitials}
          </span>
          <strong>{settings.siteName}</strong>
        </a>
        <nav aria-label="Navigasi utama">
          <a href="#cerita">Cerita</a>
          <a href="#arsip">Arsip</a>
          <a href="#tentang">Tentang</a>
          <Link className="editor-link" href="/admin">Editor</Link>
        </nav>
      </header>

      <section className="journal-hero" aria-labelledby="hero-title">
        <img
          src={coverFor(featured)}
          alt={featured.coverAlt || `Pemandangan dari ${featured.location}`}
          width={1536}
          height={1024}
          fetchPriority="high"
        />
        <div className="hero-overlay" />
        <div className="hero-grid" />
        <div className="hero-mist" />
        <div className="hero-coordinates">
          <span>{settings.heroEyebrow}</span>
          <span>{settings.baseLocation.replace(/^Berbasis di\s+/i, "")} · {new Date(featured.tripDate).getUTCFullYear()}</span>
        </div>
        <div className="hero-copy">
          <p>Catatan terbaru · {featured.location}</p>
          <h1 id="hero-title">
            {heroLines.map((line, index) => (
              <span
                className="hero-line"
                key={`${line}-${index}`}
                style={{ "--line-index": index } as React.CSSProperties}
              >
                <span>
                  {line}
                  {index === heroLines.length - 1 && <> <em>{settings.heroAccent}</em></>}
                </span>
              </span>
            ))}
          </h1>
          <div className="hero-caption">
            <p>{settings.heroDescription}</p>
            <a href="#cerita">Baca cerita <span aria-hidden="true">↘</span></a>
          </div>
        </div>
        <div className="hero-scroll-cue" aria-hidden="true">
          <i />
          <span>Gulir</span>
        </div>
      </section>

      <section className="journal-opening">
        <div className="date-stamp" data-reveal="scale" aria-hidden="true">
          <strong>{String(new Date(featured.tripDate).getUTCDate()).padStart(2, "0")}</strong>
          <span>CAT<br />{new Date(featured.tripDate).getUTCFullYear()}</span>
        </div>
        <p data-reveal="left">{settings.openingQuote}</p>
        <div data-reveal style={{ "--reveal-delay": "0.12s" } as React.CSSProperties}>
          <span className="micro-label">Tentang jurnal ini</span>
          <p>Ditulis pelan-pelan dari kereta, warung kecil, puncak bukit, dan kamar penginapan yang lampunya terlalu redup.</p>
        </div>
      </section>

      <div className="coord-band" aria-hidden="true">
        <div className="coord-track">
          {[0, 1].map((pass) => (
            <div className="coord-set" key={pass}>
              {ticker.map((post) => (
                <span className="coord-item" key={`${pass}-${post.id}`}>
                  {shortPlace(post.location)}
                  <em style={{ fontStyle: "normal", opacity: 0.55 }}>
                    {formatDate(post.tripDate)}
                  </em>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="featured-entry" id="cerita" aria-labelledby="featured-title">
        <div className="section-cap" data-reveal="fade">
          <p><span>01</span> Catatan terbaru</p>
          <time dateTime={featured.tripDate}>{formatDate(featured.tripDate)} · {featured.readTime} menit baca</time>
        </div>
        <figure className="featured-figure" data-reveal="clip" data-parallax-figure>
          <img src={coverFor(featured)} alt={featured.coverAlt || `Pemandangan dari ${featured.location}`} />
          <figcaption>{featured.location}</figcaption>
        </figure>
        <div className="featured-layout">
          <div data-reveal>
            <h2 id="featured-title">{featured.title}</h2>
            <div className="entry-pills"><span>{featured.location}</span><span>Perjalanan</span></div>
          </div>
          <article data-reveal style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}>
            <p className="lead-paragraph">{featured.excerpt}</p>
            {paragraphs.slice(0, 3).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {paragraphs.length > 3 && (
              <Link className="read-more" href={`/catatan/${featured.slug}`}>Baca catatan lengkap →</Link>
            )}
          </article>
        </div>
        <div className="entry-footer"><span>{featured.location}</span><i /><span>{featured.readTime} menit baca</span></div>
      </section>

      <section className="archive-section" id="arsip" aria-labelledby="archive-title">
        <div className="archive-intro">
          <p className="section-kicker" data-reveal="fade"><span>02</span> Dari arsip</p>
          <h2 id="archive-title" data-reveal>Cerita dari<br />jalan lainnya.</h2>
          <p data-reveal style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}>{archive.length} catatan terbit, semuanya dapat dibaca dari sini.</p>
        </div>
        <div className="archive-grid">
          {archive.length ? archive.map((post, index) => {
            const archiveCover = archiveCoverFor(post);
            return (
              <div
                className="archive-slot"
                key={post.id}
                data-reveal
                style={{ "--reveal-delay": `${index * 0.07}s` } as React.CSSProperties}
              >
                <Link
                  className={`archive-card archive-card-${(index % 3) + 1}${archiveCover ? " has-cover" : ""}`}
                  href={`/catatan/${post.slug}`}
                  data-tilt=""
                  data-tilt-max="6"
                >
                  {archiveCover ? (
                    <img className="archive-cover" src={archiveCover} alt={post.coverAlt || `Pemandangan dari ${post.location}`} />
                  ) : (
                    <div className="archive-motif">
                      <PostMotif seed={post.slug} />
                    </div>
                  )}
                  <div className="archive-card-top"><span>{String(index + 1).padStart(2, "0")} / Catatan</span><time dateTime={post.tripDate}>{formatDate(post.tripDate)}</time></div>
                  <div className="archive-card-copy">
                    <p>{post.location}</p>
                    <h3>{post.title}</h3>
                    <span>{post.readTime} menit baca</span>
                  </div>
                </Link>
              </div>
            );
          }) : (
            <p className="archive-empty">Catatan berikutnya sedang ditulis.</p>
          )}
        </div>
      </section>

      <section className="about-section" id="tentang" aria-labelledby="about-title">
        <div className={`author-mark${settings.profileImageKey ? " has-photo" : ""}`} data-reveal="scale" aria-hidden={settings.profileImageKey ? undefined : true}>
          {settings.profileImageKey ? (
            <img src={mediaUrl(settings.profileImageKey) || ""} alt={settings.profileImageAlt || `Foto ${settings.ownerName}`} />
          ) : (
            <>{ownerInitials.slice(0, 1)}<span>/</span>{ownerInitials.slice(1, 2)}</>
          )}
        </div>
        <div className="author-copy" data-reveal style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}>
          <p className="section-kicker"><span>03</span> Tentang penulis</p>
          <h2 id="about-title">Halo, saya<br /><em>{settings.ownerName}.</em></h2>
          <p>{settings.aboutBio}</p>
          <div className="author-note"><span>{settings.baseLocation}</span><span>{settings.journeyStatus}</span></div>
        </div>
      </section>

      <footer className="journal-footer">
        <div className="public-brand"><span>{ownerInitials}</span><strong>{settings.siteName}</strong></div>
        <p>Tempat boleh berlalu.<br />Cerita tinggal lebih lama.</p>
        <div><span>© {new Date().getUTCFullYear()} {settings.ownerName}</span><a href="#beranda">Kembali ke atas ↑</a></div>
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
