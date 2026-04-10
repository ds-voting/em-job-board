import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "EM Job Board",
  description: "Emergency Medicine Physician Job Search Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-gray-900">
              EM Job Board
            </Link>
            <div className="flex gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Jobs
              </Link>
              <Link
                href="/rejected"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Rejected
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
