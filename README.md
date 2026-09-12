# repo-summary-ja

GitHubリポジトリのURLを指定すると、README・言語構成・メタデータをもとに、Claude APIが日本語でリポジトリの要約を生成するCLIツールです。

## セットアップ

```bash
npm install
cp .env.example .env
# .env に ANTHROPIC_API_KEY を設定してください
```

`GITHUB_TOKEN` は任意ですが、設定するとGitHub APIのレート制限が緩和されます。

## 使い方

```bash
# 開発時
npm run dev -- https://github.com/owner/repo

# ビルドして実行
npm run build
npm start -- owner/repo

# ファイルに保存
npm run dev -- owner/repo --output summary.md
```

`<repository>` には以下の形式を指定できます。

- `https://github.com/owner/repo`
- `owner/repo`

## 環境変数

| 変数名 | 必須 | 説明 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 必須 | Claude APIキー |
| `GITHUB_TOKEN` | 任意 | GitHub Personal Access Token(レート制限緩和用) |
