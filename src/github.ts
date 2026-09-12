import type { RepoInfo } from "./types.js";

const GITHUB_API = "https://api.github.com";

export function parseRepoUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim();

  // owner/repo の短縮形
  const shorthand = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthand && !trimmed.includes("://")) {
    return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, "") };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`リポジトリの指定が不正です: ${input}`);
  }

  if (url.hostname !== "github.com") {
    throw new Error(`GitHub以外のURLには対応していません: ${input}`);
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`リポジトリの指定が不正です: ${input}`);
  }

  return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
}

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function githubFetch(path: string, token?: string): Promise<Response> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: authHeaders(token),
  });
  return response;
}

export async function fetchRepoInfo(
  owner: string,
  repo: string,
  token?: string,
): Promise<RepoInfo> {
  const repoRes = await githubFetch(`/repos/${owner}/${repo}`, token);
  if (repoRes.status === 404) {
    throw new Error(`リポジトリが見つかりません: ${owner}/${repo}`);
  }
  if (!repoRes.ok) {
    throw new Error(
      `GitHub APIエラー (${repoRes.status}): ${await repoRes.text()}`,
    );
  }
  const repoData = (await repoRes.json()) as Record<string, any>;

  const [languagesRes, readmeRes, contentsRes] = await Promise.all([
    githubFetch(`/repos/${owner}/${repo}/languages`, token),
    githubFetch(`/repos/${owner}/${repo}/readme`, token),
    githubFetch(`/repos/${owner}/${repo}/contents`, token),
  ]);

  const languages = languagesRes.ok
    ? ((await languagesRes.json()) as Record<string, number>)
    : {};

  let readme: string | null = null;
  if (readmeRes.ok) {
    const readmeData = (await readmeRes.json()) as { content: string };
    readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
  }

  let topLevelFiles: string[] = [];
  if (contentsRes.ok) {
    const contentsData = (await contentsRes.json()) as Array<{ name: string }>;
    topLevelFiles = contentsData.map((item) => item.name);
  }

  return {
    owner,
    repo,
    fullName: repoData.full_name,
    description: repoData.description,
    htmlUrl: repoData.html_url,
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    openIssues: repoData.open_issues_count,
    defaultBranch: repoData.default_branch,
    license: repoData.license?.name ?? null,
    topics: repoData.topics ?? [],
    createdAt: repoData.created_at,
    updatedAt: repoData.updated_at,
    languages,
    readme,
    topLevelFiles,
  };
}
