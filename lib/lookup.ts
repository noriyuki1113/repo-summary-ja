import { cache } from "react";
import { fetchGithubRepo, fetchReadmeExcerpt } from "@/lib/github";
import { summarizeRepo } from "@/lib/claude";
import { getRepoByFullName, upsertRepo } from "@/lib/db";
import type { Repo } from "@/types/repo";

const STAR_THRESHOLD_FOR_SUMMARY = 30;
const README_MAX_CHARS = 8000;

export class RepoNotFoundError extends Error {}

/**
 * DBに登録済みなら取得。未登録ならGitHub/Claudeから収集して保存する。
 * generateMetadataとページ本体の両方から呼ばれるため、同一リクエスト内では
 * React cache() で結果を共有し、GitHub/Claude呼び出しの重複を防ぐ。
 */
export const getOrFetchRepo = cache(async (
  owner: string,
  name: string,
): Promise<Repo> => {
  const existing = await getRepoByFullName(owner, name);
  if (existing) return existing;

  const meta = await fetchGithubRepo(owner, name);
  if (!meta) {
    throw new RepoNotFoundError(`${owner}/${name}`);
  }

  let readmeExcerpt: string | null = null;
  let summary = null;

  if (meta.stars >= STAR_THRESHOLD_FOR_SUMMARY) {
    readmeExcerpt = await fetchReadmeExcerpt(owner, name, README_MAX_CHARS);
    try {
      summary = await summarizeRepo({
        fullName: `${owner}/${name}`,
        description: meta.description,
        topics: meta.topics,
        primaryLanguage: meta.primaryLanguage,
        readmeExcerpt,
      });
    } catch (error) {
      // Claude要約が失敗しても基本情報だけは保存して表示する
      console.error(`要約に失敗しました (${owner}/${name}):`, error);
    }
  }

  return upsertRepo({
    owner,
    name,
    description: meta.description,
    stars: meta.stars,
    forks: meta.forks,
    license: meta.license,
    primaryLanguage: meta.primaryLanguage,
    lastCommitAt: meta.lastCommitAt,
    topics: meta.topics,
    summaryJa: summary?.summaryJa ?? null,
    useCaseJa: summary?.useCaseJa ?? null,
    targetUserJa: summary?.targetUserJa ?? null,
    alternativeTo: summary?.alternativeTo ?? null,
    category: summary?.category ?? null,
    rawReadmeExcerpt: readmeExcerpt,
  });
});
