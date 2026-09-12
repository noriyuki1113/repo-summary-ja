import { NextRequest, NextResponse } from "next/server";
import { getOrFetchRepo, RepoNotFoundError } from "@/lib/lookup";
import { checkRateLimit, getClientIp, recordSearch } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  let body: { owner?: string; repo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 },
    );
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();
  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner と repo は必須です" },
      { status: 400 },
    );
  }

  const ip = getClientIp(request.headers);
  const { allowed } = await checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらく待って再試行してください。" },
      { status: 429 },
    );
  }
  await recordSearch(ip, `${owner}/${repo}`);

  try {
    const repoData = await getOrFetchRepo(owner, repo);
    return NextResponse.json({ repo: repoData });
  } catch (error) {
    if (error instanceof RepoNotFoundError) {
      return NextResponse.json(
        { error: `リポジトリが見つかりません: ${owner}/${repo}` },
        { status: 404 },
      );
    }
    console.error("lookup failed", error);
    return NextResponse.json(
      { error: "リポジトリの取得中にエラーが発生しました" },
      { status: 500 },
    );
  }
}
