import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Jejak Farras — Jurnal Perjalanan",
    template: "%s · Jejak Farras",
  },
  description:
    "Catatan Farras Bayu tentang tempat, rasa, dan orang-orang yang membuat perjalanan layak diingat.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* next/font would need network access at build time; a plain link
            keeps builds reproducible offline. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300..700;1,8..60,300..700&display=swap"
        />
      </head>
      <body className="antialiased">
        {/* Motion states are opt-in: without JS nothing is ever hidden. The
            fallback re-shows everything if the runtime never takes over. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.add('motion-ready');" +
              "setTimeout(function(){" +
              "if(!document.documentElement.dataset.journalMotion)" +
              "document.documentElement.classList.add('motion-fallback');" +
              "},2000);",
          }}
        />
        {children}
      </body>
    </html>
  );
}
