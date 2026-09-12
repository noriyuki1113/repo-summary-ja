import { Pool, type QueryResultRow } from "pg";
import type { Category, Repo } from "@/types/repo";

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL;
    pool = new Pool({
      connectionString,
      ssl: connectionString?.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

interface RepoRow {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  stars: number | null;
  forks: number | null;
  license: string | null;
  primary_language: string | null;
  last_commit_at: string | null;
  topics: string[] | null;
  is_archived: boolean;
  summary_ja: string | null;
  use_case_ja: string | null;
  target_user_ja: string | null;
  alternative_to: string | null;
  category: string | null;
  raw_readme_excerpt: string | null;
  created_at: string;
  updated_at: string;
  stars_updated_at: string | null;
}

function rowToRepo(row: RepoRow): Repo {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    stars: row.stars,
    forks: row.forks,
    license: row.license,
    primaryLanguage: row.primary_language,
    lastCommitAt: row.last_commit_at,
    topics: row.topics ?? [],
    isArchived: row.is_archived,
    summaryJa: row.summary_ja,
    useCaseJa: row.use_case_ja,
    targetUserJa: row.target_user_ja,
    alternativeTo: row.alternative_to,
    category: row.category as Category | null,
    rawReadmeExcerpt: row.raw_readme_excerpt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    starsUpdatedAt: row.stars_updated_at,
  };
}

export async function getRepoByFullName(
  owner: string,
  name: string,
): Promise<Repo | null> {
  const rows = await query<RepoRow>(
    `select * from repos where owner = $1 and name = $2 limit 1`,
    [owner, name],
  );
  return rows[0] ? rowToRepo(rows[0]) : null;
}

export interface UpsertRepoInput {
  owner: string;
  name: string;
  description: string | null;
  stars: number | null;
  forks: number | null;
  license: string | null;
  primaryLanguage: string | null;
  lastCommitAt: string | null;
  topics: string[];
  summaryJa: string | null;
  useCaseJa: string | null;
  targetUserJa: string | null;
  alternativeTo: string | null;
  category: string | null;
  rawReadmeExcerpt: string | null;
}

export async function upsertRepo(input: UpsertRepoInput): Promise<Repo> {
  const rows = await query<RepoRow>(
    `insert into repos (
      owner, name, description, stars, forks, license, primary_language,
      last_commit_at, topics, summary_ja, use_case_ja, target_user_ja,
      alternative_to, category, raw_readme_excerpt, stars_updated_at, updated_at
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now(), now()
    )
    on conflict (owner, name) do update set
      description = excluded.description,
      stars = excluded.stars,
      forks = excluded.forks,
      license = excluded.license,
      primary_language = excluded.primary_language,
      last_commit_at = excluded.last_commit_at,
      topics = excluded.topics,
      summary_ja = excluded.summary_ja,
      use_case_ja = excluded.use_case_ja,
      target_user_ja = excluded.target_user_ja,
      alternative_to = excluded.alternative_to,
      category = excluded.category,
      raw_readme_excerpt = excluded.raw_readme_excerpt,
      stars_updated_at = now(),
      updated_at = now()
    returning *`,
    [
      input.owner,
      input.name,
      input.description,
      input.stars,
      input.forks,
      input.license,
      input.primaryLanguage,
      input.lastCommitAt,
      input.topics,
      input.summaryJa,
      input.useCaseJa,
      input.targetUserJa,
      input.alternativeTo,
      input.category,
      input.rawReadmeExcerpt,
    ],
  );
  return rowToRepo(rows[0]);
}

export async function getPopularRepos(limit = 20): Promise<Repo[]> {
  const rows = await query<RepoRow>(
    `select * from repos
     where is_archived = false
     order by stars desc nulls last
     limit $1`,
    [limit],
  );
  return rows.map(rowToRepo);
}

export async function getRankedRepos(limit = 100): Promise<Repo[]> {
  const rows = await query<RepoRow>(
    `select * from repos
     where is_archived = false
     order by stars desc nulls last
     limit $1`,
    [limit],
  );
  return rows.map(rowToRepo);
}

export interface RefreshCandidate {
  owner: string;
  name: string;
}

export async function getRefreshCandidates(
  limit = 500,
): Promise<RefreshCandidate[]> {
  return query<RefreshCandidate>(
    `select owner, name from repos
     order by stars desc nulls last, stars_updated_at asc nulls first
     limit $1`,
    [limit],
  );
}

export interface UpdateRepoStatsInput {
  stars?: number;
  forks?: number;
  lastCommitAt?: string | null;
  isArchived: boolean;
}

export async function updateRepoStats(
  owner: string,
  name: string,
  input: UpdateRepoStatsInput,
): Promise<void> {
  if (input.isArchived) {
    await query(
      `update repos set is_archived = true, stars_updated_at = now(), updated_at = now()
       where owner = $1 and name = $2`,
      [owner, name],
    );
    return;
  }

  await query(
    `update repos set
       stars = $3,
       forks = $4,
       last_commit_at = $5,
       is_archived = false,
       stars_updated_at = now(),
       updated_at = now()
     where owner = $1 and name = $2`,
    [owner, name, input.stars ?? null, input.forks ?? null, input.lastCommitAt ?? null],
  );
}

export async function logSearch(
  ipHash: string,
  fullName: string,
): Promise<void> {
  await query(
    `insert into search_logs (ip_hash, full_name) values ($1, $2)`,
    [ipHash, fullName],
  );
}

export async function countRecentSearches(
  ipHash: string,
  windowMinutes: number,
): Promise<number> {
  const rows = await query<{ count: string }>(
    `select count(*) as count from search_logs
     where ip_hash = $1
       and created_at > now() - ($2 || ' minutes')::interval`,
    [ipHash, windowMinutes],
  );
  return Number(rows[0]?.count ?? 0);
}
