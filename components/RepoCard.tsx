import Link from "next/link";
import type { Repo } from "@/types/repo";

export function RepoCard({ repo }: { repo: Repo }) {
  return (
    <Link
      href={`/${repo.owner}/${repo.name}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-400"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium">{repo.fullName}</p>
          {repo.summaryJa ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
              {repo.summaryJa}
            </p>
          ) : (
            <p className="mt-1 truncate text-sm text-slate-500">
              {repo.description ?? "説明なし"}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right text-sm text-slate-500">
          ★ {repo.stars?.toLocaleString() ?? "-"}
        </div>
      </div>
    </Link>
  );
}
