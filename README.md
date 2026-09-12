# repo-summary-ja

GitHubリポジトリのURLまたは `owner/repo` を入力すると、用途・内容・スター数などを日本語で要約して表示する公開Webサービスです。

## スタック

Next.js (App Router) / Postgres (Vercel Postgres・Neon) / Vercel / Claude API

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に POSTGRES_URL / GITHUB_TOKEN / ANTHROPIC_API_KEY / CRON_SECRET を設定
npm run migrate   # scripts/migrate.sql をDBに適用
npm run dev
```

## ディレクトリ構成

```
app/
├── page.tsx                          検索フォーム＋人気repo一覧
├── [owner]/[repo]/page.tsx           個別ページ（恒久URL・ISR）
├── rankings/page.tsx                 ランキング
└── api/
    ├── lookup/route.ts               オンデマンド収集エンドポイント
    └── cron/refresh-stars/route.ts   Vercel Cronによる鮮度維持バッチ

lib/
├── github.ts       GitHub API連携
├── claude.ts        Claude APIによる日本語要約
├── db.ts             Postgres接続・クエリ
├── lookup.ts         収集ロジック（DB→なければGitHub/Claude→保存）
└── rate-limit.ts     IPベースのレート制限

scripts/migrate.sql  DBスキーマ定義
```

## 処理フロー

1. `/{owner}/{repo}` へのアクセス、または検索フォームからの `/api/lookup` 呼び出し
2. DBに既存レコードがあればそれを返す
3. なければGitHub APIでリポジトリ情報を取得（404なら終了）
4. スター数が30以上ならREADMEを取得しClaude APIで要約、30未満ならスキップ
5. DBにupsertして表示

日次バッチ（`/api/cron/refresh-stars`）はスター数・フォーク数などの鮮度のみを更新し、Claude要約の再生成は行いません。

## 環境変数

| 変数名 | 必須 | 説明 |
| --- | --- | --- |
| `POSTGRES_URL` | 必須 | Vercel Postgres / Neon 接続文字列 |
| `GITHUB_TOKEN` | 任意 | GitHub Fine-grained PAT（public_repo read）。レート制限緩和用 |
| `ANTHROPIC_API_KEY` | 必須 | Claude APIキー |
| `CRON_SECRET` | 必須 | `/api/cron/*` を保護するための任意の文字列 |
