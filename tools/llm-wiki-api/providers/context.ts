import fs from "node:fs/promises";
import path from "node:path";
import { getWikiRoot } from "../../llm-wiki-core/paths.js";

async function readWiki(relative: string): Promise<string> {
  return fs.readFile(path.join(getWikiRoot(), relative), "utf-8");
}

function extractSection(md: string, heading: string): string {
  const re = new RegExp(`## ${heading}[\\s\\S]*?(?=\\n## |$)`);
  const m = md.match(re);
  return m ? m[0] : "";
}

export interface PartyContext {
  specExcerpt: string;
  typeChart: string;
  partyPool: string;
  template: string;
  sampleIndex: string;
  buildingRules: string;
}

export async function loadPartyContext(): Promise<PartyContext> {
  const [spec, types, pool, template, building] = await Promise.all([
    readWiki("docs/pokemon-party-composition.md"),
    readWiki("wiki/concepts/pokemon-type-effectiveness.md"),
    readWiki("wiki/sources/pokemon-party-mega-list.md"),
    readWiki("wiki/parties/_party-main-template.md"),
    readWiki("wiki/concepts/pokemon-party-building.md"),
  ]);

  const specParts = [
    extractSection(spec, "3. 명령 프로토콜"),
    extractSection(spec, "3b. 이중 서브에이전트"),
    extractSection(spec, "11. 평가 루브릭"),
    extractSection(spec, "8. 출력 형식"),
  ].join("\n\n");

  const sampleIndex = await buildSampleIndex();

  return {
    specExcerpt: specParts,
    typeChart: types.slice(0, 12000),
    partyPool: pool,
    template,
    sampleIndex,
    buildingRules: building.slice(0, 8000),
  };
}

async function buildSampleIndex(): Promise<string> {
  const sourcesDir = path.join(getWikiRoot(), "wiki", "sources");
  const files = await fs.readdir(sourcesDir);
  const samples = files
    .filter((f) => f.endsWith("-samples.md"))
    .map((f) => f.replace("-samples.md", ""))
    .sort();
  return `사용 가능한 샘플 파일 (${samples.length}종):\n` + samples.join(", ");
}

export async function loadSampleForMember(name: string): Promise<string | null> {
  const clean = name.replace(/\*\*/g, "").trim();
  const candidates = [clean, `메가${clean}`];
  for (const base of candidates) {
    const rel = `wiki/sources/${base}-samples.md`;
    try {
      const content = await readWiki(rel);
      const builds = extractSection(content, "정리된 빌드");
      return builds || content.slice(0, 4000);
    } catch {
      /* try next */
    }
  }
  return null;
}

export function parsePoolNames(markdownContent: string): Set<string> {
  if (!markdownContent) return new Set();
  
  const lines = markdownContent.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|'));
    
  const names = new Set<string>();

  for (const line of lines) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 3) continue;

    // 1. 첫 번째 칸이 '1', '2' 같은 숫자(순번)인 경우 -> 두 번째 칸이 포켓몬 이름
    if (/^\d+$/.test(cells[1]) && cells[2]) {
      names.add(cells[2]);
    } 
    // 2. 순번 없이 첫 번째 칸부터 바로 포켓몬 이름(한글)이 나오는 경우
    else if (cells[1] && /[가-힣]/.test(cells[1]) && !cells[1].includes('컬럼')) {
      names.add(cells[1]);
    }
  }

  return names;
}
