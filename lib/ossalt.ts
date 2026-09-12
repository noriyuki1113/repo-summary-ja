import { createClient } from "@supabase/supabase-js";
import type { Repo } from "@/types/repo";

const SITE_URL = process.env.SITE_URL ?? "https://repo-summary-ja.vercel.app";

function getClient() {
  const url = process.env.OSSALT_SUPABASE_URL;
  const serviceRoleKey = process.env.OSSALT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "OSSALT_SUPABASE_URL / OSSALT_SUPABASE_SERVICE_ROLE_KEY が設定されていません",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * ossalt-next の import_candidates（非公開のレビュー待ちテーブル）に登録する。
 * 既存レコード（レビュー済み・却下済みを含む）は絶対に上書きしない
 * （ignoreDuplicates: true）。公開用の projects / alternative_relations には
 * 一切書き込まない — 昇格はossalt-next側の人間によるレビューを経て行う。
 */
export async function submitImportCandidate(repo: Repo): Promise<void> {
  const client = getClient();

  const { error } = await client.from("import_candidates").upsert(
    {
      source_name: "repo-summary-ja",
      source_url: `${SITE_URL}/${repo.owner}/${repo.name}`,
      source_slug: repo.fullName,
      category_path: repo.category ? [repo.category] : [],
      name: repo.fullName,
      description: repo.description,
      license_hint: repo.license,
      stars_hint: repo.stars != null ? String(repo.stars) : null,
      import_state: "pending",
    },
    { onConflict: "source_name,source_slug", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`ossalt-nextへの登録に失敗しました: ${error.message}`);
  }
}
