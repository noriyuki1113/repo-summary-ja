const GITHUB_API = "https://api.github.com";

export interface DiscoveredRepo {
  owner: string;
  name: string;
}

interface SearchBand {
  label: string;
  query: string;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// GitHubに公式の「トレンド」APIは存在しないため、Search APIで
// 「直近アクティブ」×「スター帯」の組み合わせを日替わりでローテーションして
// 幅広いカテゴリの人気OSSを継続的に発見する。
function buildSearchBands(): SearchBand[] {
  return [
    { label: "flagship", query: `stars:>20000 pushed:>${daysAgo(30)}` },
    { label: "large", query: `stars:5000..20000 pushed:>${daysAgo(14)}` },
    { label: "mid", query: `stars:1000..5000 pushed:>${daysAgo(7)}` },
    { label: "emerging", query: `stars:300..1000 pushed:>${daysAgo(7)}` },
  ];
}

export function pickSearchBand(date = new Date()): SearchBand {
  const bands = buildSearchBands();
  const startOfYear = new Date(date.getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000);
  return bands[dayOfYear % bands.length];
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function discoverActiveRepos(limit = 20): Promise<DiscoveredRepo[]> {
  const band = pickSearchBand();
  const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(band.query)}&sort=stars&order=desc&per_page=${limit}`;

  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`GitHub検索APIエラー (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { items: Array<{ full_name: string }> };
  return data.items.map((item) => {
    const [owner, name] = item.full_name.split("/");
    return { owner, name };
  });
}
