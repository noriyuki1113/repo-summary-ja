import { createHash } from "node:crypto";
import { countRecentSearches, logSearch } from "@/lib/db";

const WINDOW_MINUTES = 60;
const MAX_REQUESTS_PER_WINDOW = 20;

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function checkRateLimit(
  ip: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const count = await countRecentSearches(hashIp(ip), WINDOW_MINUTES);
  return {
    allowed: count < MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - count),
  };
}

export async function recordSearch(ip: string, fullName: string): Promise<void> {
  await logSearch(hashIp(ip), fullName);
}

export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
