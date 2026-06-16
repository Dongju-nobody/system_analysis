import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadEnvFile } from "../llm-wiki-api/env.js";
import {
  getWikiPage,
  getWikiPageByRel,
  searchWiki,
  listWikiPages,
  listParties,
  getParty,
  syncManifest,
} from "../llm-wiki-core/index.js";

loadEnvFile();

const server = new McpServer({
  name: "llm-wiki",
  version: "2.0.0",
});

server.registerTool(
  "wiki_list",
  {
    description: "wiki/ MD 목록 (section: sources|notes|concepts|parties, 생략 시 전체)",
    inputSchema: z.object({
      section: z
        .enum(["sources", "notes", "concepts", "parties"])
        .optional()
        .describe("섹션 필터"),
    }),
  },
  async ({ section }) => {
    const pages = await listWikiPages(section);
    return {
      content: [{ type: "text", text: JSON.stringify({ pages }, null, 2) }],
    };
  }
);

server.registerTool(
  "wiki_get",
  {
    description: "wiki 페이지 JSON (path: wiki/notes/foo.md 또는 notes/foo.md)",
    inputSchema: z.object({
      path: z.string().describe("wiki 상대 또는 절대 경로"),
    }),
  },
  async ({ path: pagePath }) => {
    const page =
      (await getWikiPage(pagePath)) ?? (await getWikiPageByRel(pagePath.replace(/^wiki\//, "")));
    if (!page) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ page }, null, 2) }],
    };
  }
);

server.registerTool(
  "wiki_search",
  {
    description: "wiki sources+notes+concepts 키워드 검색",
    inputSchema: z.object({
      query: z.string().describe("검색어"),
    }),
  },
  async ({ query }) => {
    const hits = await searchWiki(query);
    return {
      content: [{ type: "text", text: JSON.stringify({ hits }, null, 2) }],
    };
  }
);

server.registerTool(
  "wiki_open_in_viewer",
  {
    description: "로컬 Wiki Viewer URL",
    inputSchema: z.object({
      path: z.string().describe("wiki/notes/foo.md"),
    }),
  },
  async ({ path: pagePath }) => {
    const url = `http://localhost:5173?tab=browse&page=${encodeURIComponent(pagePath)}`;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ url, hint: "npm run wiki:dev 실행 후 브라우저에서 열기" }, null, 2),
        },
      ],
    };
  }
);

server.registerTool(
  "party_list",
  {
    description: "wiki/parties manifest 기반 파티 목록",
  },
  async () => {
    const parties = await listParties();
    return {
      content: [{ type: "text", text: JSON.stringify({ parties }, null, 2) }],
    };
  }
);

server.registerTool(
  "party_get",
  {
    description: "slug로 파티 상세 JSON",
    inputSchema: z.object({
      slug: z.string(),
    }),
  },
  async ({ slug }) => {
    const party = await getParty(slug);
    if (!party) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "not found" }) }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ party }, null, 2) }],
    };
  }
);

server.registerTool(
  "party_sync",
  {
    description: "wiki/parties 스캔 후 manifest.json 갱신",
  },
  async () => {
    const manifest = await syncManifest();
    return {
      content: [{ type: "text", text: JSON.stringify({ manifest }, null, 2) }],
    };
  }
);

server.registerTool(
  "party_open_in_viewer",
  {
    description: "Parties 탭 URL",
    inputSchema: z.object({
      slug: z.string(),
    }),
  },
  async ({ slug }) => {
    const url = `http://localhost:5173?tab=parties&party=${encodeURIComponent(slug)}`;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ url, hint: "npm run wiki:dev 실행 후 브라우저에서 열기" }, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
