const GITHUB_API = "https://api.github.com";

export interface GithubRepoMeta {
  description: string | null;
  stars: number;
  forks: number;
  license: string | null;
  primaryLanguage: string | null;
  lastCommitAt: string | null;
  topics: string[];
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** リポジトリの基本情報を取得する。存在しない場合は null。 */
export async function fetchGithubRepo(
  owner: string,
  name: string,
): Promise<GithubRepoMeta | null> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${name}`, {
    headers: authHeaders(),
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub APIエラー (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as Record<string, any>;
  return {
    description: data.description ?? null,
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    license: data.license?.name ?? null,
    primaryLanguage: data.language ?? null,
    lastCommitAt: data.pushed_at ?? null,
    topics: data.topics ?? [],
  };
}

/** READMEを取得し、maxCharsで切り詰める。取得できない場合は null。 */
export async function fetchReadmeExcerpt(
  owner: string,
  name: string,
  maxChars = 8000,
): Promise<string | null> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${name}/readme`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { content: string };
  try {
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    return decoded.slice(0, maxChars);
  } catch {
    return null;
  }
}
