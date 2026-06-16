import { getWikiRoot } from "../../llm-wiki-core/paths.js";
import { syncManifest, getPartyByAnchor } from "../../llm-wiki-core/manifest.js";
import type { ProgressCallback } from "./types.js";
import { runPartyLoop } from "./party-loop.js";
import { writePartyFile } from "./write-party.js";
import { getApiKey } from "./config.js";

export async function runCursorGenerate(
  anchor: string,
  onProgress: ProgressCallback
): Promise<string> {
  const apiKey = getApiKey("cursor");
  if (!apiKey) throw new Error("CURSOR_API_KEY가 설정되지 않았습니다.");

  const { Agent } = await import("@cursor/sdk");
  const cwd = getWikiRoot();
  const prompt = `/party-main ${anchor}`;

  onProgress("Cursor SDK 에이전트 시작…");
  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: "composer-2.5" },
    local: { cwd },
  });
  onProgress(`에이전트 완료: ${result.status}`);

  await syncManifest();
  const party = await getPartyByAnchor(anchor);
  return party?.slug ?? anchor;
}

export async function runLlmGenerate(
  provider: "anthropic" | "google" | "openai",
  anchor: string,
  onProgress: ProgressCallback
): Promise<string> {
  const loopResult = await runPartyLoop(provider, anchor, onProgress);
  onProgress("파티 MD 저장 중…");
  const slug = await writePartyFile(anchor, loopResult);
  onProgress(`저장 완료: ${slug} (${loopResult.finalScore}/10, ${loopResult.finalStatus})`);
  return slug;
}
