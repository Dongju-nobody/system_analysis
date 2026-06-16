import matter from "gray-matter";
import type {
  AttackCoverage,
  Bring3Row,
  EvaluationHistoryRow,
  MemberBuild,
  PartyMember,
  PartyRecord,
  PartyWeakness,
} from "./types.js";
import { filenameFromSlug } from "./paths.js";

function extractSection(body: string, heading: string): string {
  const re = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`);
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function parseTableRows(section: string): string[][] {
  const lines = section.split("\n").filter((l) => l.startsWith("|"));
  if (lines.length < 2) return [];
  return lines.slice(2).map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim().replace(/\*\*/g, ""))
  );
}

function parseMembers(section: string): PartyMember[] {
  return parseTableRows(section).map((cols) => ({
    slot: cols[3] ?? cols[0] ?? "",
    name: cols[1] ?? "",
    types: cols[2] ?? "",
    role: cols[4] ?? cols[3] ?? "",
  }));
}

function parseWeaknesses(section: string): PartyWeakness[] {
  return parseTableRows(section).map((cols) => ({
    type: cols[0] ?? "",
    multiplier: cols[1] ?? "",
    note: cols[2] || undefined,
  }));
}

function parseAttackCoverage(section: string): AttackCoverage[] {
  return parseTableRows(section).map((cols) => ({
    type: cols[0] ?? "",
    owners: cols[1] ?? "",
  }));
}

function parseCodeBlock(section: string): string {
  const m = section.match(/```[\s\S]*?```/);
  return m ? m[0].replace(/```/g, "").trim() : section.trim();
}

function parseEvaluationHistory(section: string): EvaluationHistoryRow[] {
  const rows = parseTableRows(section);
  return rows.map((cols) => ({
    round: parseInt(cols[0] ?? "0", 10) || 0,
    score: parseFloat(cols[1] ?? "0") || 0,
    passed: (cols[2] ?? "").includes("✓"),
    feedback: cols[3] ?? "",
  }));
}

function parseBring3(section: string): Bring3Row[] {
  const rows = parseTableRows(section).filter((cols) => cols[0] && !isNaN(Number(cols[0])));
  return rows.map((cols) => ({
    name: cols[1] ?? "",
    mega: (cols[2] ?? "").includes("예"),
    reason: cols[3] ?? "",
  }));
}

function parseMemberBuilds(section: string): MemberBuild[] {
  const blocks = section.split(/^### /m).filter(Boolean);
  return blocks.map((block) => {
    const header = block.split("\n")[0] ?? "";
    const [namePart, rolePart] = header.split(" — ");
    const nameTypes = namePart?.trim() ?? "";
    const role = rolePart?.trim() ?? "";
    const typesMatch = nameTypes.match(/\(([^)]+)\)/);
    const name = nameTypes.replace(/\s*\([^)]*\)/, "").trim();

    const cover = block.match(/\*\*보완:\*\*\s*(.+)/)?.[1]?.trim();
    const recommended = block.match(/\*\*추천 빌드:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
    const sampleLine = block.match(/\*\*샘플:\*\*\s*\[([^\]]+)\]/)?.[1];
    const buildCountMatch = block.match(/\((\d+)빌드\)/);
    const allBuilds = [...block.matchAll(/^\s*-\s*빌드\s+\d+[^\n]*/gm)].map((m) =>
      m[0].replace(/^\s*-\s*/, "").trim()
    );

    return {
      name,
      types: typesMatch?.[1] ?? "",
      role,
      cover,
      recommended,
      samplePath: sampleLine,
      buildCount: buildCountMatch ? parseInt(buildCountMatch[1], 10) : undefined,
      allBuilds,
    };
  });
}

function parseSwaps(section: string): { remove: string; add: string; reason: string }[] {
  return parseTableRows(section).map((cols) => ({
    remove: cols[0] ?? "",
    add: cols[1] ?? "",
    reason: cols[2] ?? "",
  }));
}

function normalizeUpdated(value: unknown, content: string): string {
  const fromBody = content.match(/\*\*작성일:\*\*\s*(\S+)/)?.[1];
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value) return value;
  if (typeof value === "number" && value > 1900 && value < 3000) {
    return fromBody ?? String(value);
  }
  return fromBody ?? "";
}

export function parsePartyMarkdown(md: string, slug?: string): PartyRecord {
  const { data, content } = matter(md);
  const anchor = (data.anchor as string) ?? slug ?? "";
  const resolvedSlug = slug ?? anchor;

  const anchorLine = content.match(/\*\*앵커:\*\*\s*([^(]+)\(([^)]+)\)/);
  const types = anchorLine?.[2]?.trim() ?? "";
  const updated = normalizeUpdated(data.updated, content);

  const membersSection = extractSection(content, "파티 구성");
  const weaknessSection = extractSection(content, "앵커 약점");
  const chainSection = extractSection(content, "약점 연쇄");
  const coverageSection = extractSection(content, "공격 타입 커버");
  const evalSection = extractSection(content, "편성·평가 이력");
  const bring3Section = extractSection(content, "선발 3 예시");
  const buildsSection = extractSection(content, "멤버별 샘플");
  const swapsSection = extractSection(content, "교체 후보");

  const resistMatch = weaknessSection.match(/\*\*저항·면역:\*\*\s*(.+)/);
  const altMatch = coverageSection.match(/\*\*[^*]+→ 대안:\*\*\s*(.+)/);

  let evaluation: PartyRecord["evaluation"];
  if (data.evaluation && typeof data.evaluation === "object") {
    const ev = data.evaluation as Record<string, unknown>;
    evaluation = {
      iterations: Number(ev.iterations) || 0,
      finalScore: Number(ev.final_score ?? ev.finalScore) || 0,
      finalStatus: (ev.final_status ?? ev.finalStatus) as "passed" | "best_of_10",
      selectedIteration: Number(ev.selected_iteration ?? ev.selectedIteration) || 0,
    };
  }

  const evalSummaryMatch = evalSection.match(/\*\*최종:\*\*\s*(.+)/);
  const megaBringMatch = bring3Section.match(/\*\*메가 선발:\*\*\s*(.+)/);

  return {
    slug: resolvedSlug,
    anchor,
    types,
    updated,
    filePath: `wiki/parties/${filenameFromSlug(resolvedSlug)}`,
    resistances: resistMatch?.[1]?.trim(),
    evaluation,
    members: parseMembers(membersSection),
    weaknesses: parseWeaknesses(weaknessSection),
    weaknessChain: parseCodeBlock(chainSection),
    attackCoverage: parseAttackCoverage(coverageSection),
    attackAlternatives: altMatch?.[1]?.trim(),
    evaluationHistory: parseEvaluationHistory(evalSection),
    evaluationSummary: evalSummaryMatch?.[1]?.trim(),
    bring3: parseBring3(bring3Section),
    megaBringNote: megaBringMatch?.[1]?.trim(),
    memberBuilds: parseMemberBuilds(buildsSection),
    swaps: swapsSection ? parseSwaps(swapsSection) : undefined,
  };
}
