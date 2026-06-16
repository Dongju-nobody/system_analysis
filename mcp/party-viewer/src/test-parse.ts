import fs from "node:fs/promises";
import path from "node:path";
import { getPartiesDir } from "./core/paths.js";
import { parsePartyMarkdown } from "./core/parse-party.js";

async function main() {
  const dir = getPartiesDir();
  const files = ["메가리자몽Y-party-main.md", "대쓰여너-party-main.md"];
  for (const file of files) {
    const md = await fs.readFile(path.join(dir, file), "utf-8");
    const parsed = parsePartyMarkdown(md, file.replace("-party-main.md", ""));
    console.log(`\n=== ${parsed.anchor} ===`);
    console.log(`members: ${parsed.members.length}`);
    console.log(`weaknesses: ${parsed.weaknesses.length}`);
    console.log(`builds: ${parsed.memberBuilds.length}`);
    console.log(`coverage: ${parsed.attackCoverage.length}`);
  }
  console.log("\nparse OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
