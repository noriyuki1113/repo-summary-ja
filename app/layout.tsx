import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "repo-summary-ja | GitHubリポジトリ日本語要約",
    template: "%s | repo-summary-ja",
  },
  description:
    "GitHubリポジトリのURLやowner/repoを入力すると、用途・内容・スター数などをAIが日本語で要約します。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              repo-summary-ja
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/rankings" className="hover:text-slate-900">
                ランキング
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 py-8 text-xs text-slate-400">
          repo-summary-ja は GitHub の公開情報と Claude API による要約を提供します。
        </footer>
      </body>
    </html>
  );
}
