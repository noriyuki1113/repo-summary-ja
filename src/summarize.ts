import Anthropic from "@anthropic-ai/sdk";
import type { RepoInfo } from "./types.js";

const MODEL = "claude-opus-5";
const README_CHAR_LIMIT = 12000;

function buildPrompt(info: RepoInfo): { prompt: string; truncated: boolean } {
  const languageList = Object.keys(info.languages).join(", ") || "不明";
  let readme = info.readme ?? "(READMEなし)";
  let truncated = false;
  if (readme.length > README_CHAR_LIMIT) {
    readme = readme.slice(0, README_CHAR_LIMIT);
    truncated = true;
  }

  const prompt = `以下はGitHubリポジトリ「${info.fullName}」の情報です。この内容をもとに、日本語でリポジトリの要約を作成してください。

# リポジトリ情報
- URL: ${info.htmlUrl}
- 説明: ${info.description ?? "(説明なし)"}
- スター数: ${info.stars}
- フォーク数: ${info.forks}
- ライセンス: ${info.license ?? "不明"}
- トピック: ${info.topics.join(", ") || "なし"}
- 主な言語: ${languageList}
- トップレベルのファイル/ディレクトリ: ${info.topLevelFiles.join(", ") || "不明"}

# README${truncated ? "（一部を抜粋）" : ""}
${readme}

# 出力形式
以下の見出しを使い、Markdown形式で簡潔にまとめてください。
## 概要
## 主な機能
## 技術スタック
## 使い方
## 対象ユーザー
`;

  return { prompt, truncated };
}

export async function summarizeRepo(info: RepoInfo): Promise<string> {
  const client = new Anthropic();
  const { prompt, truncated } = buildPrompt(info);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("要約の生成が拒否されました");
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  if (!textBlock) {
    throw new Error("Claude APIから有効な応答が得られませんでした");
  }

  let result = textBlock.text;
  if (truncated) {
    result += "\n\n> ※ READMEが長いため一部のみを解析対象としています。";
  }
  return result;
}
