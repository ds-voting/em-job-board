import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

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
    <html lang="en">
      <body className="bg-slate-50 min-h-screen antialiased text-slate-900">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm bg-white/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  EM
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900 leading-tight">
                    EM Job Board
                  </div>
                  <div className="text-xs text-slate-500 leading-tight">
                    Emergency Medicine Physician Search
                  </div>
                </div>
              </Link>
              <nav className="flex gap-1">
                <Link
                  href="/"
                  className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md font-medium transition"
                >
                  Matches
                </Link>
                <Link
                  href="/rejected"
                  className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-md font-medium transition"
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
        <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-slate-400">
          Automated daily scrapes from PracticeLink, Google Jobs, Adzuna &
          emCareers &middot; Classified by Claude AI
        </footer>
      </body>
    </html>
  );
}
