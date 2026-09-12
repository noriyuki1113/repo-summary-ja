@AGENTS.md

# repo-summary-ja

GitHubリポジトリを日本語で要約する公開Webサービス。Next.js (App Router) + Postgres (Vercel Postgres/Neon) + Claude API。

## コマンド

- `npm run dev` / `npm run build` / `npm start`
- `npm run migrate` — `scripts/migrate.sql` をDBに適用（`POSTGRES_URL` が必要）

## 設計上の要点

- **オンデマンド収集**: リポジトリ情報はユーザーがアクセスした時点で初めてGitHub/Claudeから取得し、Postgresに永続化する。`lib/lookup.ts` の `getOrFetchRepo` がその中核ロジック。DB→GitHub→(スター数30以上なら)Claude要約→upsert、の順。
- **`/[owner]/[repo]` ページはISR**（`revalidate = 3600`）。`headers()`/`cookies()` など動的APIを呼ぶとキャッシュが効かなくなるため使用しないこと。IPレート制限は `/api/lookup`（検索フォーム経由）にのみ適用し、直接アクセスされるパーマリンクページには適用しない（コストはリポジトリ単位で一度きりに抑えられているため）。
- **`getOrFetchRepo` は React `cache()` でメモ化**している。`generateMetadata` とページ本体の両方から呼ばれるため、外すとGitHub/Claude呼び出しが2重に走る。
- **DBアクセスは `pg` を使用**（`@vercel/postgres` は非推奨のため不採用）。`POSTGRES_URL` があれば Vercel Postgres でも Neon 直結でも動作する。
- **Cronバッチ**（`/api/cron/refresh-stars`）はスター数等の鮮度更新のみを行い、Claude要約は再生成しない（コスト抑制）。`CRON_SECRET` による認証必須。
