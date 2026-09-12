#!/usr/bin/env node
import { Command } from "commander";
import { writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { fetchRepoInfo, parseRepoUrl } from "./github.js";
import { summarizeRepo } from "./summarize.js";

const program = new Command();

program
  .name("repo-summary-ja")
  .description("GitHubリポジトリの内容をClaude APIで解析し、日本語で要約するCLIツール")
  .version("0.1.0")
  .argument("<repository>", "GitHubリポジトリのURL、または owner/repo 形式")
  .option("-t, --token <token>", "GitHub Personal Access Token (省略時は環境変数 GITHUB_TOKEN)")
  .option("-o, --output <file>", "要約の出力先ファイル (省略時は標準出力)")
  .action(async (repository: string, options: { token?: string; output?: string }) => {
    try {
      const { owner, repo } = parseRepoUrl(repository);
      const githubToken = options.token ?? process.env.GITHUB_TOKEN;

      console.error(`[1/2] ${owner}/${repo} の情報を取得中...`);
      const info = await fetchRepoInfo(owner, repo, githubToken);

      console.error("[2/2] Claude APIで要約を生成中...");
      const summary = await summarizeRepo(info);

      if (options.output) {
        writeFileSync(options.output, summary, "utf-8");
        console.error(`要約を ${options.output} に保存しました`);
      } else {
        console.log(summary);
      }
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("エラー: Claude APIキーが無効です。ANTHROPIC_API_KEY を確認してください。");
      } else if (error instanceof Anthropic.RateLimitError) {
        console.error("エラー: Claude APIのレート制限に達しました。しばらく待って再試行してください。");
      } else if (error instanceof Anthropic.APIError) {
        console.error(`Claude APIエラー (${error.status}): ${error.message}`);
      } else if (error instanceof Error) {
        console.error(`エラー: ${error.message}`);
      } else {
        console.error("不明なエラーが発生しました", error);
      }
      process.exitCode = 1;
    }
  });

program.parse();
