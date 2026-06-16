import fs from "node:fs/promises";
import path from "node:path";
import { getWikiRoot, getPartiesDir, filenameFromSlug } from "../../llm-wiki-core/paths.js";
import { syncManifest } from "../../llm-wiki-core/manifest.js";
import { loadPartyContext, parsePoolNames } from "./context.js";
import type { LoopResult } from "./types.js";
import { parsePartyMarkdown } from "../../llm-wiki-core/parse-party.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function injectEvaluationHistory(md: string, result: LoopResult, anchor: string): string {
  const rows = result.history
    .map(
      (h) =>
        `| ${h.round} | ${h.score} | ${h.passed ? "✓" : ""} | ${h.feedback.replace(/\|/g, "/").slice(0, 120)} |`
    )
    .join("\n");

  const summary = `**최종:** ${result.finalStatus} · **선택 회차** ${result.selectedIteration} · **점수** ${result.finalScore}/10`;
  const historyBlock = `## 편성·평가 이력

${summary}

| 회차 | 점수 | 통과 | 요약 피드백 |
|------|------|------|-------------|
${rows}
`;

  if (md.includes("## 편성·평가 이력")) {
    return md.replace(/## 편성·평가 이력[\s\S]*?(?=\n## |$)/, historyBlock.trim());
  }

  const insertBefore = md.includes("## 선발 3 예시")
    ? "## 선발 3 예시"
    : md.includes("## 멤버별 샘플")
      ? "## 멤버별 샘플"
      : null;

  if (insertBefore) {
    return md.replace(insertBefore, `${historyBlock}\n---\n\n${insertBefore}`);
  }
  return md + "\n\n" + historyBlock;
}

function patchFrontmatter(md: string, result: LoopResult, anchor: string): string {
  const updated = today();
  let out = md;
  if (!out.startsWith("---")) {
    out = `---\ntitle: "${anchor} 파티"\nkind: party-main\nanchor: ${anchor}\nupdated: "${updated}"\n---\n\n` + out;
  }
  out = out.replace(/^updated:\s*.+$/m, `updated: "${updated}"`);
  if (!out.includes("evaluation:")) {
    out = out.replace(
      /^(---[\s\S]*?)(---)/m,
      `$1evaluation:\n  iterations: ${result.history.length}\n  final_score: ${result.finalScore}\n  final_status: ${result.finalStatus}\n  selected_iteration: ${result.selectedIteration}\n$2`
    );
  } else {
    out = out
      .replace(/final_score:\s*.+/m, `final_score: ${result.finalScore}`)
      .replace(/final_status:\s*.+/m, `final_status: ${result.finalStatus}`)
      .replace(/iterations:\s*.+/m, `iterations: ${result.history.length}`)
      .replace(/selected_iteration:\s*.+/m, `selected_iteration: ${result.selectedIteration}`);
  }
  return out;
}

export async function validateDraft(md: string, anchor: string): Promise<string[]> {
  const warnings: string[] = [];
  const ctx = await loadPartyContext();
  const pool = parsePoolNames(ctx.partyPool);
  const parsed = parsePartyMarkdown(md, anchor);

  for (const m of parsed.members) {
    const name = m.name.replace(/\*\*/g, "").trim();
    if (name && !pool.has(name)) {
      warnings.push(`풀 밖 멤버: ${name}`);
    }
  }

  const sourcesDir = path.join(getWikiRoot(), "wiki", "sources");
  for (const b of parsed.memberBuilds) {
    if (b.samplePath && !b.samplePath.includes("샘플 없음")) {
      const file = `${b.name}-samples.md`;
      try {
        await fs.access(path.join(sourcesDir, file));
      } catch {
        const megaFile = `메가${b.name}-samples.md`;
        try {
          await fs.access(path.join(sourcesDir, megaFile));
        } catch {
          warnings.push(`샘플 파일 없음: ${b.name}`);
        }
      }
    }
  }

  return warnings;
}

export async function writePartyFile(
  anchor: string,
  result: LoopResult
): Promise<string> {
  let md = patchFrontmatter(result.finalDraft, result, anchor);
  md = injectEvaluationHistory(md, result, anchor);

  const warnings = await validateDraft(md, anchor);
  if (warnings.length > 0) {
    md += `\n\n<!-- 검증 경고: ${warnings.join("; ")} -->\n`;
  }

  const filePath = path.join(getPartiesDir(), filenameFromSlug(anchor));
  await fs.writeFile(filePath, md, "utf-8");

  await updateIndex(anchor);
  await updateLog(anchor);

  await syncManifest();
  return anchor;
}

async function updateIndex(anchor: string): Promise<void> {
  const indexPath = path.join(getWikiRoot(), "wiki", "index.md");
  const content = await fs.readFile(indexPath, "utf-8");
  const link = `[${anchor} 파티](parties/${filenameFromSlug(anchor)})`;
  if (content.includes(link) || content.includes(`${anchor}-party-main.md`)) return;

  const marker = "## 파티 (`parties/`) — `/party-main`";
  if (!content.includes(marker)) return;

  const insertion = `\n- ${link} — 앵커 ${anchor}`;
  const updated = content.replace(marker, marker + insertion);
  await fs.writeFile(indexPath, updated, "utf-8");
}

async function updateLog(anchor: string): Promise<void> {
  const logPath = path.join(getWikiRoot(), "wiki", "log.md");
  const line = `\n## [${today()}] party-main | ${anchor} → parties/${filenameFromSlug(anchor)}`;
  const content = await fs.readFile(logPath, "utf-8");
  if (content.includes(`party-main | ${anchor}`)) return;
  await fs.appendFile(logPath, line + "\n", "utf-8");
}
