export interface ParsedRepo {
  owner: string;
  repo: string;
}

/**
 * "owner/repo" 形式または GitHubのURLを owner/repo に分解する。
 * 不正な入力の場合は null を返す。
 */
export function parseRepoInput(input: string): ParsedRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (!trimmed.includes("://") && /^[^/\s]+\/[^/\s]+$/.test(trimmed)) {
    const [owner, repo] = trimmed.split("/");
    return { owner, repo: repo.replace(/\.git$/, "") };
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}
