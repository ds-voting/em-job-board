import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "EM Job Board",
  description: "Emergency Medicine Physician Job Search",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen antialiased font-sans">
        <header className="bg-white border-b-2 border-ink sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-md bg-signal flex items-center justify-center text-white font-display font-bold text-lg">
                  EM
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-ink leading-tight">
                    EM Job Board
                  </div>
                  <div className="text-xs text-slate-500 leading-tight uppercase tracking-wide">
                    Emergency Medicine Physician Search
                  </div>
                </div>
              </Link>
              <nav className="flex gap-1">
                <Link
                  href="/"
                  className="px-3 py-2 text-sm text-ink hover:text-signal rounded-md font-medium transition-colors"
                >
                  Matches
                </Link>
                <Link
                  href="/rejected"
                  className="px-3 py-2 text-sm text-ink hover:text-signal rounded-md font-medium transition-colors"
                >
                  Rejected
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
        <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-slate-500">
          Automated daily scrapes from PracticeLink, Google Jobs, Adzuna &
          emCareers &middot; Classified by Claude AI
        </footer>
      </body>
    </html>
  );
}
