import fs from "node:fs/promises";
import path from "node:path";
import type { WikiSearchHit } from "./wiki-types.js";
import { getWikiDir } from "./paths.js";

const TOKEN_RE = /\w|[\uAC00-\uD7A3]/gu;
const SKIP = new Set(["queries", "maintenance"]);

function tokenize(text: string): string[] {
  const m = text.match(TOKEN_RE);
  if (!m) return [];
  return m.filter((t) => t.length > 1).map((t) => t.toLowerCase());
}

function splitSections(content: string): { heading: string; body: string }[] {
  const parts = content.split(/^##\s+/m);
  if (parts.length <= 1) return [{ heading: "", body: content }];
  const out: { heading: string; body: string }[] = [];
  const preamble = parts[0]?.trim();
  if (preamble) out.push({ heading: "", body: preamble });
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i] ?? "";
    const nl = block.indexOf("\n");
    const heading = nl >= 0 ? block.slice(0, nl).trim() : block.trim();
    const body = nl >= 0 ? block.slice(nl + 1).trim() : "";
    out.push({ heading, body });
  }
  return out;
}

function shouldIndex(relParts: string[]): boolean {
  if (relParts.some((p) => SKIP.has(p))) return false;
  return relParts.some((p) => ["sources", "notes", "concepts"].includes(p));
}

function scoreChunk(
  queryTokens: string[],
  heading: string,
  body: string,
  relPath: string
): number {
  if (!queryTokens.length) return 0;
  const hay = `${relPath} ${heading} ${body}`.toLowerCase();
  const haySet = new Set(tokenize(hay));
  const qset = new Set(queryTokens);
  let overlap = 0;
  for (const t of qset) if (haySet.has(t)) overlap++;
  if (!overlap) return 0;
  let score = overlap / qset.size;
  const rl = relPath.toLowerCase();
  for (const t of queryTokens) {
    if (rl.includes(t)) score += 0.35;
    if (heading.toLowerCase().includes(t)) score += 0.25;
  }
  score += Math.min(body.length / 8000, 0.15);
  return score;
}

export async function searchWiki(
  query: string,
  topK = 8,
  minScore = 0.12
): Promise<WikiSearchHit[]> {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const wikiDir = getWikiDir();
  const hits: WikiSearchHit[] = [];

  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!ent.name.endsWith(".md") || ent.name.startsWith("_")) continue;
      const rel = path.relative(wikiDir, full).replace(/\\/g, "/");
      const relParts = rel.split("/");
      if (!shouldIndex(relParts)) continue;
      const content = await fs.readFile(full, "utf-8");
      for (const { heading, body } of splitSections(content)) {
        const sc = scoreChunk(queryTokens, heading, body, rel);
        if (sc < minScore) continue;
        const excerpt = body.slice(0, 1200) + (body.length > 1200 ? "…" : "");
        hits.push({
          relPath: rel,
          heading: heading || "(서문)",
          text: excerpt,
          score: sc,
        });
      }
    }
  }

  await walk(wikiDir);
  hits.sort((a, b) => b.score - a.score || a.relPath.localeCompare(b.relPath));

  const seen = new Set<string>();
  const unique: WikiSearchHit[] = [];
  for (const h of hits) {
    const key = `${h.relPath}:${h.heading}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(h);
    if (unique.length >= topK) break;
  }
  return unique;
}
