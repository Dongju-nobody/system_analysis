import fs from "node:fs/promises";
import path from "node:path";
import { getWikiRoot, filenameFromSlug } from "../../llm-wiki-core/paths.js";
import { syncManifest } from "../../llm-wiki-core/manifest.js";
import type { LoopHistoryEntry, LoopResult, ProgressCallback } from "./types.js";
import type { PartyProvider } from "./types.js";
import { getMaxIterations } from "./config.js";
import { loadPartyContext, loadSampleForMember, parsePoolNames } from "./context.js";
import { llmGenerate, extractMarkdown, parseEvalJson } from "./llm.js";

const BUILDER_SYSTEM = `당신은 포켓몬 싱글 배틀 파티 구상 에이전트입니다.
반드시 한국어로 작성하고, 출력은 완전한 party-main 마크다운 파일 하나만 반환하세요.
150종 풀 밖 포켓몬 금지. 샘플에 없는 빌드 날조 금지. 메가 체인 거리>3, 선발3 메가≤1.`;

const EVALUATOR_SYSTEM = `당신은 포켓몬 파티 평가 에이전트입니다.
§11 루브릭(10점 만점)으로 채점합니다. 반드시 JSON만 출력:
{"score": number, "feedback": "string", "passed": boolean}
passed는 score>8 일 때 true. 회차 1이면 score는 반드시 7 미만이어야 합니다.`;

function extractMemberNames(draft: string): string[] {
  const section = draft.match(/## 파티 구성[\s\S]*?(?=\n## |$)/)?.[0] ?? "";
  const names: string[] = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cols = line.split("|").map((c) => c.trim().replace(/\*\*/g, ""));
    const name = cols[2];
    if (name && name !== "포켓몬" && !name.startsWith("---")) names.push(name);
  }
  return names;
}

async function callBuilder(
  provider: PartyProvider,
  ctx: Awaited<ReturnType<typeof loadPartyContext>>,
  anchor: string,
  iteration: number,
  feedback: string | null,
  maxIter: number
): Promise<string> {
  const prompt = `
앵커: ${anchor}
회차: ${iteration}/${maxIter}
이전 피드백: ${feedback ?? "없음 (1회차)"}

## 스펙
${ctx.specExcerpt}

## 파티 구성 원칙
${ctx.buildingRules}

## 타입 상성
${ctx.typeChart.slice(0, 6000)}

## 150종 풀
${ctx.partyPool}

## 샘플 인덱스
${ctx.sampleIndex}

## 출력 템플릿
${ctx.template}

요구사항:
- 위 템플릿 구조를 따른 완전한 MD 파일 (frontmatter 포함)
- ## 파티 구성, ## 앵커 약점, ## 약점 연쇄, ## 공격 타입 커버, ## 멤버별 샘플, ## 편성·평가 이력, ## 선발 3 예시 섹션 포함
- evaluation frontmatter에 iterations, final_score 등 placeholder 대신 현재 회차 정보 반영
- 멤버별 샘플은 wiki/sources/{이름}-samples.md 에 실제 존재하는 파일만 링크
- 2회차 이상이면 이전 피드백의 감점 항목을 우선 수정

마크다운만 출력하세요.
`;
  const raw = await llmGenerate(provider, BUILDER_SYSTEM, prompt);
  let draft = extractMarkdown(raw);

  const members = extractMemberNames(draft);
  const sampleBlocks: string[] = [];
  for (const m of members.slice(0, 6)) {
    const sample = await loadSampleForMember(m);
    if (sample) sampleBlocks.push(`### ${m} 샘플 발췌\n${sample.slice(0, 1500)}`);
  }
  if (iteration > 1 && sampleBlocks.length > 0) {
    const revisePrompt = `
아래 초안을 피드백에 맞게 수정하세요. 샘플 발췌만 인용하세요.

피드백: ${feedback}

초안:
${draft}

샘플 발췌:
${sampleBlocks.join("\n\n")}
`;
    const revised = await llmGenerate(provider, BUILDER_SYSTEM, revisePrompt);
    draft = extractMarkdown(revised);
  }

  return draft;
}

async function callEvaluator(
  provider: PartyProvider,
  ctx: Awaited<ReturnType<typeof loadPartyContext>>,
  anchor: string,
  draft: string,
  iteration: number
): Promise<{ score: number; feedback: string; passed: boolean }> {
  const prompt = `
회차: ${iteration}
앵커: ${anchor}

## 루브릭
${ctx.specExcerpt}

## 제출 파티
${draft.slice(0, 12000)}

JSON만 출력: {"score": number, "feedback": "string", "passed": boolean}
`;
  const raw = await llmGenerate(provider, EVALUATOR_SYSTEM, prompt);
  return parseEvalJson(raw);
}

export async function runPartyLoop(
  provider: PartyProvider,
  anchor: string,
  onProgress: ProgressCallback
): Promise<LoopResult> {
  const maxIter = getMaxIterations();
  const ctx = await loadPartyContext();
  const pool = parsePoolNames(ctx.partyPool);

  if (!pool.has(anchor)) {
    throw new Error(`앵커 "${anchor}"가 150종 풀에 없습니다.`);
  }

  const history: LoopHistoryEntry[] = [];
  let best = { score: -1, draft: "", round: 0 };
  let finalDraft = "";
  let finalStatus: LoopResult["finalStatus"] = "best_of_3";
  let finalScore = 0;
  let selectedIteration = 0;

  onProgress(`구상·평가 루프 시작 (${provider}, 최대 ${maxIter}회)`);

  for (let i = 1; i <= maxIter; i++) {
    const prevFeedback = i > 1 ? history[history.length - 1]?.feedback : null;
    onProgress(`[${i}/${maxIter}] 구상 에이전트 실행…`);
    const draft = await callBuilder(provider, ctx, anchor, i, prevFeedback, maxIter);

    onProgress(`[${i}/${maxIter}] 평가 에이전트 실행…`);
    let evalResult = await callEvaluator(provider, ctx, anchor, draft, i);
    let score = evalResult.score;

    if (i === 1 && score >= 7) {
      score = 6.5;
      evalResult = {
        ...evalResult,
        score,
        feedback: evalResult.feedback + " [1회차 7점 미만 강제]",
        passed: false,
      };
    }

    const passed = score > 8;
    history.push({
      round: i,
      score,
      passed,
      feedback: evalResult.feedback,
      draft,
    });

    onProgress(`[${i}/${maxIter}] 점수 ${score}/10 ${passed ? "통과!" : ""}`);

    if (score > best.score) {
      best = { score, draft, round: i };
    }

    if (passed) {
      finalDraft = draft;
      finalStatus = "passed";
      finalScore = score;
      selectedIteration = i;
      onProgress(`[${i}/${maxIter}] 통과 — 저장 준비`);
      break;
    }
  }

  if (!finalDraft) {
    finalDraft = best.draft;
    finalStatus = "best_of_3";
    finalScore = best.score;
    selectedIteration = best.round;
    onProgress(`3회 미통과 — 최고점 ${finalScore}/10 (${selectedIteration}회차) 저장`);
  }

  return {
    finalDraft,
    finalStatus,
    finalScore,
    selectedIteration,
    history,
  };
}
