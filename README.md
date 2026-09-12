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

## デプロイ

Vercel + Vercel Postgres(Neon統合)でのデプロイを想定。

1. Vercelでリポジトリをimportし、Storageタブから Postgres(Neon) を作成してプロジェクトに接続
2. `POSTGRES_URL` / `GITHUB_TOKEN` / `ANTHROPIC_API_KEY` / `CRON_SECRET` をEnvironment Variablesに設定
   - 値を保存したら、プレースホルダーのまま(例: `postgres://user:pass@db.example.com/app` や `sk-ant-xxxxxxxx` のような例示文字列)になっていないか必ず確認する。これが原因で動作しないケースが多い
3. Neon の SQL Editor(または `npm run migrate`)で `scripts/migrate.sql` を適用
4. Redeployして動作確認

`vercel.json` の設定により、日次バッチ(`/api/cron/refresh-stars`)はVercel Cronとして自動登録される。Vercel管理画面の「Run」ボタンによる手動実行は`CRON_SECRET`ヘッダーが付与されないため401になるのが正常(実際のスケジュール実行時のみ自動でヘッダーが付与される)。

## 運用

### 日常運用

リポジトリの追加はすべてユーザーの検索行動が起点(オンデマンド収集)のため、手動でのデータ登録は不要。日次バッチもVercel Cronで自動実行されるため、基本的に放置でよい。

### 定期的に確認する項目

| 項目 | 場所 | 頻度目安 |
| --- | --- | --- |
| エラーの有無 | Vercel → Runtime Logs | 週1〜気になったとき |
| Cron実行結果 | Vercel → Settings → Cron Jobs | 週1 |
| DB容量 | Neon → Dashboard(Storage使用量) | 月1(無料枠0.5GB) |
| Claude API利用料 | console.anthropic.com → Usage | 週1〜 |

### コストについて

- Claude要約はリポジトリ単位で初回1回のみ生成しDBに永続化されるため、コストは「新規に検索されるリポジトリの数」に比例する
- `/api/lookup` はIPごとに1時間20回のレート制限があり、単一ユーザーによる大量検索は抑制される
- スター数30未満のリポジトリは要約自体をスキップするため、無名リポジトリの乱発によるコスト増も抑制される

### 未対応のメンテナンス項目

- `search_logs` テーブルの自動削除バッチは未実装。増え続けるため、定期的に手動で削除するか、削除バッチの追加を検討する
  ```sql
  delete from search_logs where created_at < now() - interval '30 days';
  ```
- 規模拡大時は、Cronのバッチサイズ(`CANDIDATE_LIMIT`、現状500件/日)や、スター上位を毎日・それ以外を週1にするなどのティア分けを検討する

### トラブルシューティング

動作しない場合は以下の順に疑う。

1. 環境変数がプレースホルダーのままになっていないか(Vercelの設定画面で値を直接確認)
2. Vercel Runtime Logsで実際のエラーメッセージを確認
3. Neon側でDBがスリープから復帰しているか(無料枠は非アクティブ時にサスペンドする場合がある)
