import { NextRequest, NextResponse } from "next/server";
import { discoverActiveRepos } from "@/lib/github-discovery";
import { getOrFetchRepo } from "@/lib/lookup";
import { submitImportCandidate } from "@/lib/ossalt";

export const maxDuration = 60;

const DISCOVER_LIMIT = 20;
const CONCURRENCY = 5;

async function processOne(owner: string, name: string): Promise<"submitted" | "failed"> {
  try {
    const repo = await getOrFetchRepo(owner, name);
    await submitImportCandidate(repo);
    return "submitted";
  } catch (error) {
    console.error(`discover: failed for ${owner}/${name}`, error);
    return "failed";
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await discoverActiveRepos(DISCOVER_LIMIT);

  let submitted = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(({ owner, name }) => processOne(owner, name)),
    );
    for (const result of results) {
      if (result === "submitted") submitted++;
      else failed++;
    }
  }

  return NextResponse.json({ found: candidates.length, submitted, failed });
}
