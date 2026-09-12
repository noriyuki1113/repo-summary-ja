import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrFetchRepo, RepoNotFoundError } from "@/lib/lookup";

export const revalidate = 3600; // 1時間ごとに再生成（ISR）

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
}

async function loadRepo(params: PageProps["params"]) {
  const { owner, repo } = await params;
  try {
    return await getOrFetchRepo(owner, repo);
  } catch (error) {
    if (error instanceof RepoNotFoundError) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const repo = await loadRepo(params);
  const title = `${repo.fullName} の使い方・概要`;
  const description =
    repo.summaryJa ?? repo.description ?? `${repo.fullName} の情報`;
  return {
    title,
    description,
    alternates: { canonical: `/${repo.owner}/${repo.name}` },
  };
}

export default async function RepoPage({ params }: PageProps) {
  const repo = await loadRepo(params);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-slate-500">
          <Link href="/" className="hover:underline">
            repo-summary-ja
          </Link>{" "}
          / {repo.fullName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {repo.fullName}
        </h1>
        {repo.description && (
          <p className="text-slate-600">{repo.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
          <span>★ {repo.stars?.toLocaleString() ?? "-"}</span>
          <span>🍴 {repo.forks?.toLocaleString() ?? "-"}</span>
          {repo.primaryLanguage && <span>💻 {repo.primaryLanguage}</span>}
          {repo.license && <span>📄 {repo.license}</span>}
          {repo.isArchived && (
            <span className="text-amber-600">
              ⚠ このリポジトリはGitHub上で見つかりませんでした（削除・rename済みの可能性）
            </span>
          )}
        </div>
        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {repo.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
        <a
          href={`https://github.com/${repo.fullName}`}
          target="_blank"
          rel="noreferrer noopener"
          className="w-fit text-sm text-slate-500 underline hover:text-slate-800"
        >
          GitHubで見る ↗
        </a>
      </header>

      {repo.summaryJa ? (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-lg font-semibold">概要</h2>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">
              {repo.summaryJa}
            </p>
          </section>

          {repo.useCaseJa && (
            <section>
              <h2 className="text-lg font-semibold">主な使い道</h2>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">
                {repo.useCaseJa}
              </p>
            </section>
          )}

          {repo.targetUserJa && (
            <section>
              <h2 className="text-lg font-semibold">想定ユーザー</h2>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">
                {repo.targetUserJa}
              </p>
            </section>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            {repo.category && <span>カテゴリ: {repo.category}</span>}
            {repo.alternativeTo && <span>代替候補: {repo.alternativeTo}</span>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          このリポジトリはスター数が少ないため、詳細な要約は生成されていません。
        </p>
      )}
    </article>
  );
}
