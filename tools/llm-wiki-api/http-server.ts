import express from "express";
import cors from "cors";
import { loadEnvFile } from "./env.js";
import {
  buildWikiTree,
  getWikiPage,
  searchWiki,
  listParties,
  getParty,
  syncManifest,
} from "../llm-wiki-core/index.js";
import {
  createJob,
  getJob,
  normalizeAnchor,
  runGenerateJob,
  resolveProvider,
  validateProvider,
} from "./generate.js";
import {
  getDefaultProvider,
  getProviderAvailability,
  getMaxIterations,
} from "./providers/config.js";

loadEnvFile();

const PORT = Number(process.env.PARTY_VIEWER_PORT ?? process.env.WIKI_VIEWER_PORT ?? 3847);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    providers: getProviderAvailability(),
    defaultProvider: getDefaultProvider(),
    maxIterations: getMaxIterations(),
  });
});

app.get("/api/wiki/tree", async (_req, res) => {
  try {
    const tree = await buildWikiTree();
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/wiki/page", async (req, res) => {
  try {
    const pagePath = String(req.query.path ?? "");
    if (!pagePath) {
      res.status(400).json({ error: "path query required" });
      return;
    }
    const page = await getWikiPage(pagePath);
    if (!page) {
      res.status(404).json({ error: "page not found" });
      return;
    }
    res.json({ page });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/wiki/search", async (req, res) => {
  try {
    const q = String(req.query.q ?? "");
    const hits = await searchWiki(q);
    res.json({ hits });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/parties", async (_req, res) => {
  try {
    const parties = await listParties();
    res.json({ parties });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/parties/:slug", async (req, res) => {
  try {
    const party = await getParty(req.params.slug);
    if (!party) {
      res.status(404).json({ error: "파티를 찾을 수 없습니다." });
      return;
    }
    res.json({ party });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/parties/sync", async (_req, res) => {
  try {
    const manifest = await syncManifest();
    res.json({ manifest });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/parties/generate", async (req, res) => {
  const anchor = normalizeAnchor(String(req.body?.anchor ?? ""));
  if (!anchor) {
    res.status(400).json({ error: "anchor가 필요합니다." });
    return;
  }

  const provider = resolveProvider(req.body?.provider);
  const providerError = validateProvider(provider);
  if (providerError) {
    res.status(503).json({
      error: providerError,
      hint: ".env.example을 참고해 해당 프로바이더 API 키를 설정하세요.",
      providers: getProviderAvailability(),
    });
    return;
  }

  const job = createJob(anchor, provider);
  runGenerateJob(job).catch(() => {});

  res.status(202).json({ jobId: job.id, anchor: job.anchor, provider: job.provider });
});

app.get("/api/parties/generate/:jobId/stream", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "작업을 찾을 수 없습니다." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let sent = 0;
  const interval = setInterval(() => {
    while (sent < job.messages.length) {
      const msg = job.messages[sent++];
      res.write(`data: ${JSON.stringify({ type: "message", text: msg })}\n\n`);
    }

    if (job.status === "done") {
      res.write(
        `data: ${JSON.stringify({ type: "done", slug: job.slug, anchor: job.anchor })}\n\n`
      );
      clearInterval(interval);
      res.end();
    } else if (job.status === "error") {
      res.write(`data: ${JSON.stringify({ type: "error", error: job.error })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on("close", () => clearInterval(interval));
});

app.get("/api/parties/generate/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "작업을 찾을 수 없습니다." });
    return;
  }
  res.json({ job });
});

app.listen(PORT, () => {
  console.log(`LLM Wiki API http://localhost:${PORT}`);
});
