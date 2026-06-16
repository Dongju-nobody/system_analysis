import fs from "node:fs/promises";
import matter from "gray-matter";
import path from "node:path";
import type { WikiPage, WikiSection } from "./wiki-types.js";
import { getWikiDir, resolveWikiPagePath } from "./paths.js";

function sectionFromRel(rel: string): WikiSection {
  const part = rel.replace(/^wiki\//, "").split("/")[0];
  if (part === "sources" || part === "notes" || part === "concepts" || part === "parties") {
    return part;
  }
  throw new Error("Unknown wiki section");
}

export async function getWikiPage(pagePath: string): Promise<WikiPage | null> {
  try {
    const normalized = pagePath.replace(/\\/g, "/");
    const rel = normalized.replace(/^wiki\//, "");
    const full = resolveWikiPagePath(rel);
    const content = await fs.readFile(full, "utf-8");
    const { data, content: body } = matter(content);
    return {
      path: `wiki/${rel}`,
      relPath: rel,
      section: sectionFromRel(`wiki/${rel}`),
      frontmatter: data as Record<string, unknown>,
      body,
    };
  } catch {
    return null;
  }
}

export async function getWikiPageByRel(relPath: string): Promise<WikiPage | null> {
  const p = relPath.startsWith("wiki/") ? relPath : `wiki/${relPath}`;
  return getWikiPage(p);
}

export function listWikiDir(): string {
  return getWikiDir();
}
