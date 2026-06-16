import fs from "node:fs/promises";
import path from "node:path";
import type { PartyListItem, PartyManifest, PartyRecord } from "./types.js";
import { parsePartyMarkdown } from "./parse-party.js";
import {
  filenameFromSlug,
  getManifestPath,
  getPartiesDir,
  slugFromFilename,
} from "./paths.js";

async function readManifest(): Promise<PartyManifest> {
  const manifestPath = getManifestPath();
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(raw) as PartyManifest;
  } catch {
    return { parties: [] };
  }
}

async function writeManifest(manifest: PartyManifest): Promise<void> {
  await fs.writeFile(getManifestPath(), JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

export async function syncManifest(): Promise<PartyManifest> {
  const partiesDir = getPartiesDir();
  const entries = await fs.readdir(partiesDir);
  const manifest = await readManifest();
  const existing = new Map(manifest.parties.map((p) => [p.slug, p]));

  for (const file of entries) {
    if (!file.endsWith("-party-main.md") || file.startsWith("_")) continue;
    const slug = slugFromFilename(file);
    const filePath = path.join(partiesDir, file);
    const stat = await fs.stat(filePath);
    const md = await fs.readFile(filePath, "utf-8");
    const parsed = parsePartyMarkdown(md, slug);
    const updated = String(parsed.updated || stat.mtime.toISOString().slice(0, 10));

    existing.set(slug, {
      slug,
      anchor: parsed.anchor || slug,
      file,
      updated,
      finalScore: parsed.evaluation?.finalScore,
      finalStatus: parsed.evaluation?.finalStatus,
    });
  }

  const parties = [...existing.values()].sort((a, b) =>
    String(b.updated ?? "").localeCompare(String(a.updated ?? ""))
  );
  const next = { parties };
  await writeManifest(next);
  return next;
}

export async function listParties(): Promise<PartyListItem[]> {
  let manifest = await readManifest();
  if (manifest.parties.length === 0) {
    manifest = await syncManifest();
  }

  const items: PartyListItem[] = [];
  for (const entry of manifest.parties) {
    let types: string | undefined;
    try {
      const md = await fs.readFile(path.join(getPartiesDir(), entry.file), "utf-8");
      types = parsePartyMarkdown(md, entry.slug).types;
    } catch {
      /* skip */
    }
    items.push({
      slug: entry.slug,
      anchor: entry.anchor,
      updated: entry.updated,
      finalScore: entry.finalScore,
      finalStatus: entry.finalStatus,
      types,
    });
  }
  return items;
}

export async function getParty(slug: string): Promise<PartyRecord | null> {
  const file = path.join(getPartiesDir(), filenameFromSlug(slug));
  try {
    const md = await fs.readFile(file, "utf-8");
    return parsePartyMarkdown(md, slug);
  } catch {
    return null;
  }
}

export async function getPartyByAnchor(anchor: string): Promise<PartyRecord | null> {
  await syncManifest();
  const manifest = await readManifest();
  const entry = manifest.parties.find((p) => p.anchor === anchor || p.slug === anchor);
  if (!entry) return null;
  return getParty(entry.slug);
}
