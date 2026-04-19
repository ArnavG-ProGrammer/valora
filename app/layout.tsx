import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Valora — Investment Memos",
  description:
    "AI-powered investment memos grounded in real market data.",
  metadataBase: new URL("https://valora-eta.vercel.app"),
  openGraph: {
    title: "Valora",
    description: "Investment memos, grounded in real data.",
    images: ["/opengraph-image.png"],
    type: "website",
    siteName: "Valora",
  },
  twitter: {
    card: "summary_large_image",
    title: "Valora",
    description: "Investment memos, grounded in real data.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text">
        {/* Ambient background orbs */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute"
            style={{
              top: "-10%",
              left: "-10%",
              width: "60vw",
              height: "60vw",
              background: "radial-gradient(circle, rgba(232, 168, 124, 0.08) 0%, transparent 60%)",
              filter: "blur(80px)",
              animation: "drift1 28s ease-in-out infinite",
            }}
          />
          <div
            className="absolute"
            style={{
              bottom: "-15%",
              right: "-10%",
              width: "55vw",
              height: "55vw",
              background: "radial-gradient(circle, rgba(176, 109, 66, 0.06) 0%, transparent 60%)",
              filter: "blur(80px)",
              animation: "drift2 32s ease-in-out infinite",
            }}
          />
          {/* Grain overlay */}
          <svg className="fixed inset-0 h-full w-full opacity-[0.015]" aria-hidden="true">
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
          </svg>
        </div>

        {/* Glass nav */}
        <nav className="glass-nav sticky top-0 z-30 flex items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 transition-all hover:brightness-[1.15] hover:drop-shadow-[0_0_8px_rgba(232,168,124,0.4)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/valora-logo.png"
              alt="Valora"
              className="h-6 w-auto object-contain"
            />
          </Link>
          <Link
            href="/methodology"
            className="text-xs text-text-muted transition-colors hover:text-accent"
          >
            Methodology
          </Link>
        </nav>

        <main className="relative z-10 flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
