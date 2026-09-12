import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, type Category } from "@/types/repo";

const MODEL = "claude-opus-5";

export interface RepoSummary {
  summaryJa: string;
  useCaseJa: string;
  targetUserJa: string;
  alternativeTo: string | null;
  category: Category;
}

export interface SummarizeRepoInput {
  fullName: string;
  description: string | null;
  topics: string[];
  primaryLanguage: string | null;
  readmeExcerpt: string | null;
}

function buildPrompt(input: SummarizeRepoInput): string {
  return `以下はGitHubリポジトリ「${input.fullName}」の情報です。この内容をもとに、日本語で要約してください。

# リポジトリ情報
- 説明: ${input.description ?? "(説明なし)"}
- トピック: ${input.topics.join(", ") || "なし"}
- 主な言語: ${input.primaryLanguage ?? "不明"}

# README${input.readmeExcerpt ? "" : "（取得できませんでした）"}
${input.readmeExcerpt ?? "(なし)"}

# 出力形式
説明文以外は一切出力せず、以下のJSONオブジェクトのみを出力してください（コードブロックや前置きは不要）。

{
  "summary_ja": "3行以内、専門用語を避けた説明",
  "use_case_ja": "具体的にどんな場面で使うか",
  "target_user_ja": "個人開発者 / チーム / 企業インフラ担当 など",
  "alternative_to": "Notion, Airtable など（該当なければnull）",
  "category": "次のいずれか1つ: ${CATEGORIES.join(", ")}"
}`;
}

function extractJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Claudeの応答からJSONを抽出できませんでした");
  }
  return JSON.parse(match[0]);
}

export async function summarizeRepo(
  input: SummarizeRepoInput,
): Promise<RepoSummary> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(input) }],
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

  const parsed = extractJson(textBlock.text);
  const category = CATEGORIES.includes(parsed.category as Category)
    ? (parsed.category as Category)
    : "Miscellaneous";

  return {
    summaryJa: String(parsed.summary_ja ?? ""),
    useCaseJa: String(parsed.use_case_ja ?? ""),
    targetUserJa: String(parsed.target_user_ja ?? ""),
    alternativeTo: parsed.alternative_to ? String(parsed.alternative_to) : null,
    category,
  };
}
