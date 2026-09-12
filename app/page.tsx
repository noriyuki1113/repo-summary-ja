import { SearchForm } from "@/components/SearchForm";
import { RepoCard } from "@/components/RepoCard";
import { getPopularRepos } from "@/lib/db";

// リポジトリ一覧は都度DBから最新の状態を取得する（オンデマンド収集の性質上、頻繁に更新されるため）
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const popularRepos = await getPopularRepos(20);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          GitHubリポジトリを日本語で理解する
        </h1>
        <p className="text-slate-600">
          気になるリポジトリのURLや owner/repo を入力すると、用途・特徴・スター数などをAIが日本語で要約します。
        </p>
        <div className="mx-auto w-full max-w-xl text-left">
          <SearchForm />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">人気のリポジトリ</h2>
        {popularRepos.length === 0 ? (
          <p className="text-sm text-slate-500">
            まだ登録されたリポジトリがありません。上の検索フォームから調べてみてください。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {popularRepos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
