import fs from "node:fs/promises";
import path from "node:path";
import type { WikiSection, WikiTree, WikiTreeItem } from "./wiki-types.js";
import { getWikiDir } from "./paths.js";

const SECTIONS: WikiSection[] = ["sources", "notes", "concepts", "parties"];

function titleFromFile(name: string, content: string): string {
  const m = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (m) return m[1].trim();
  return name.replace(/\.md$/, "").replace(/-party-main$/, "");
}

export async function buildWikiTree(): Promise<WikiTree> {
  const wikiDir = getWikiDir();
  const sections = {} as WikiTree["sections"];

  for (const section of SECTIONS) {
    const dir = path.join(wikiDir, section);
    const items: WikiTreeItem[] = [];
    try {
      const entries = await fs.readdir(dir);
      for (const file of entries.sort()) {
        if (!file.endsWith(".md") || file.startsWith("_")) continue;
        if (section === "parties" && !file.endsWith("-party-main.md")) continue;
        const full = path.join(dir, file);
        const content = await fs.readFile(full, "utf-8");
        const relPath = `wiki/${section}/${file}`;
        items.push({
          path: relPath,
          relPath: `${section}/${file}`,
          title: titleFromFile(file, content),
          section,
        });
      }
    } catch {
      /* empty section */
    }
    sections[section] = items;
  }

  return { sections };
}

export async function listWikiPages(section?: WikiSection): Promise<WikiTreeItem[]> {
  const tree = await buildWikiTree();
  if (section) return tree.sections[section] ?? [];
  return SECTIONS.flatMap((s) => tree.sections[s] ?? []);
}
