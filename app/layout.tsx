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
  title: "Valora — Investment Memo Engine",
  description:
    "AI-generated investment memos backed by real financial data. Zero hallucinated numbers.",
  metadataBase: new URL("https://valora.vercel.app"),
  openGraph: {
    title: "Valora — Investment Memo Engine",
    description:
      "AI-generated investment memos backed by real financial data. Zero hallucinated numbers.",
    type: "website",
    siteName: "Valora",
  },
  twitter: {
    card: "summary_large_image",
    title: "Valora — Investment Memo Engine",
    description:
      "AI-generated investment memos backed by real financial data. Zero hallucinated numbers.",
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
        <nav className="flex items-center justify-between border-b border-border px-6 py-3">
          <Link
            href="/"
            className="font-mono text-sm font-medium tracking-widest text-text-muted transition-colors hover:text-text"
          >
            VALORA
          </Link>
          <Link
            href="/methodology"
            className="text-xs text-text-muted transition-colors hover:text-accent"
          >
            Methodology
          </Link>
        </nav>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
