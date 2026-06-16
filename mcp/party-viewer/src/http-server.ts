import express from "express";
import cors from "cors";
import { loadEnvFile } from "./env.js";
import { listParties, getParty, syncManifest } from "./core/manifest.js";
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
import {
  setRuntimeKey,
  clearRuntimeKey,
  isValidProvider,
} from "./providers/runtime-keys.js";

loadEnvFile();

const PORT = Number(process.env.PARTY_VIEWER_PORT ?? 3847);

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

app.post("/api/providers/key", (req, res) => {
  const provider = String(req.body?.provider ?? "").toLowerCase();
  const apiKey = String(req.body?.apiKey ?? "").trim();

  if (!isValidProvider(provider)) {
    res.status(400).json({ error: "유효하지 않은 provider입니다." });
    return;
  }
  if (!apiKey) {
    res.status(400).json({ error: "apiKey가 필요합니다." });
    return;
  }

  setRuntimeKey(provider, apiKey);
  res.json({ ok: true, provider, connected: true, providers: getProviderAvailability() });
});

app.delete("/api/providers/key/:provider", (req, res) => {
  const provider = req.params.provider.toLowerCase();
  if (!isValidProvider(provider)) {
    res.status(400).json({ error: "유효하지 않은 provider입니다." });
    return;
  }
  clearRuntimeKey(provider);
  res.json({ ok: true, provider, connected: false, providers: getProviderAvailability() });
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
  console.log(`Party Viewer API http://localhost:${PORT}`);
});
