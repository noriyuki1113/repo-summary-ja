import { NextRequest, NextResponse } from "next/server";
import { getRefreshCandidates, updateRepoStats } from "@/lib/db";
import { fetchGithubRepo } from "@/lib/github";

export const maxDuration = 60;

const CANDIDATE_LIMIT = 500;
const CONCURRENCY = 10;

async function refreshOne(owner: string, name: string): Promise<"updated" | "archived"> {
  const meta = await fetchGithubRepo(owner, name);
  if (!meta) {
    await updateRepoStats(owner, name, { isArchived: true });
    return "archived";
  }
  await updateRepoStats(owner, name, {
    stars: meta.stars,
    forks: meta.forks,
    lastCommitAt: meta.lastCommitAt,
    isArchived: false,
  });
  return "updated";
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await getRefreshCandidates(CANDIDATE_LIMIT);

  let updated = 0;
  let archived = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(({ owner, name }) => refreshOne(owner, name)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value === "archived") archived++;
        else updated++;
      } else {
        console.error("refresh-stars: failed to refresh a repo", result.reason);
      }
    }
  }

  return NextResponse.json({ processed: candidates.length, updated, archived });
}
