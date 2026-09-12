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
- **`/api/cron/discover`（自動発見 → ossalt-next連携）は絶対に `ossalt-next` の `projects` / `alternative_relations`（公開テーブル）へ書き込んではならない**。書き込み先は必ず `import_candidates`（非公開のレビュー待ちステージングテーブル）のみ。これはossalt-next自身の設計方針（根拠のない情報は公開しない・人間のレビューを経て初めて昇格する）を尊重するための制約であり、変更・緩和しないこと。`lib/ossalt.ts` の `submitImportCandidate` は `ignoreDuplicates: true` で既存レコード（レビュー済み・却下済み含む）を絶対に上書きしない設計にしている — これも変更しないこと。
- Vercel Hobbyプランはcron jobを最大2つまでしか登録できない。既に `refresh-stars` / `discover` の2つで上限。
