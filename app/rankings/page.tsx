import type { Metadata } from "next";
import { RepoCard } from "@/components/RepoCard";
import { getRankedRepos } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ランキング",
  description: "スター数の多いGitHubリポジトリのランキング一覧。",
};

export default async function RankingsPage() {
  const repos = await getRankedRepos(100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ランキング</h1>
        <p className="mt-1 text-sm text-slate-600">
          これまでに調査されたリポジトリをスター数順に表示しています。
        </p>
      </div>

      {repos.length === 0 ? (
        <p className="text-sm text-slate-500">まだ登録されたリポジトリがありません。</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {repos.map((repo, index) => (
            <li key={repo.id} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-400">
                {index + 1}
              </span>
              <div className="flex-1">
                <RepoCard repo={repo} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
