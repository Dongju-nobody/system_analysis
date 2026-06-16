import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getWikiRoot(): string {
  return process.env.LLM_WIKI_ROOT ?? path.resolve(__dirname, "../../../../");
}

export function getPartiesDir(): string {
  return path.join(getWikiRoot(), "wiki", "parties");
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
