import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getWikiRoot(): string {
  return process.env.LLM_WIKI_ROOT ?? path.resolve(__dirname, "../..");
}

export function getWikiDir(): string {
  return path.join(getWikiRoot(), "wiki");
}

export function getRawDir(): string {
  return path.join(getWikiRoot(), "raw");
}

export function getPartiesDir(): string {
  return path.join(getWikiDir(), "parties");
}

export function getManifestPath(): string {
  return path.join(getPartiesDir(), "manifest.json");
}

export function slugFromFilename(filename: string): string {
  return filename.replace(/-party-main\.md$/, "");
}

export function filenameFromSlug(slug: string): string {
  return `${slug}-party-main.md`;
}

export function resolveWikiPagePath(relativePath: string): string {
  const wikiDir = getWikiDir();
  const normalized = relativePath.replace(/\\/g, "/").replace(/^wiki\//, "");
  const full = path.resolve(wikiDir, normalized);
  if (!full.startsWith(wikiDir)) {
    throw new Error("Invalid wiki path");
  }
  return full;
}
