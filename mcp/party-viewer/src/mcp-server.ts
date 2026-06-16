import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadEnvFile } from "./env.js";
import { listParties, getParty, syncManifest } from "./core/manifest.js";

loadEnvFile();

const server = new McpServer({
  name: "party-viewer",
  version: "1.0.0",
});

server.registerTool(
  "party_list",
  {
    description: "wiki/parties manifest 기반 파티 목록 반환",
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
    description: "slug로 파티 상세 JSON 반환",
    inputSchema: z.object({
      slug: z.string().describe("파티 slug (예: 메가리자몽Y)"),
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
    description: "wiki/parties 디렉터리 스캔 후 manifest.json 갱신",
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
    description: "로컬 Party Viewer 웹 URL 힌트 반환",
    inputSchema: z.object({
      slug: z.string().describe("파티 slug"),
    }),
  },
  async ({ slug }) => {
    const url = `http://localhost:5173?party=${encodeURIComponent(slug)}`;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { url, hint: "npm run party:dev 실행 후 브라우저에서 열기" },
            null,
            2
          ),
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
