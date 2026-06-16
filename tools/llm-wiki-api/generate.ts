import type { PartyProvider } from "./providers/types.js";
import {
  hasProviderKey,
  resolveProvider,
  providerLabel,
} from "./providers/config.js";
import { runCursorGenerate, runLlmGenerate } from "./providers/cursor.js";

export type JobStatus = "pending" | "running" | "done" | "error";

export interface GenerateJob {
  id: string;
  anchor: string;
  provider: PartyProvider;
  status: JobStatus;
  messages: string[];
  slug?: string;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, GenerateJob>();

export function createJob(anchor: string, provider: PartyProvider): GenerateJob {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const job: GenerateJob = {
    id,
    anchor,
    provider,
    status: "pending",
    messages: [],
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): GenerateJob | undefined {
  return jobs.get(id);
}

function pushMessage(job: GenerateJob, text: string) {
  job.messages.push(text);
}

export function normalizeAnchor(input: string): string {
  return input
    .trim()
    .replace(/^\/party-main\s*/i, "")
    .trim();
}

export function validateProvider(provider: PartyProvider): string | null {
  if (!hasProviderKey(provider)) {
    const keyName =
      provider === "cursor"
        ? "CURSOR_API_KEY"
        : provider === "anthropic"
          ? "ANTHROPIC_API_KEY"
          : provider === "google"
            ? "GOOGLE_API_KEY"
            : "OPENAI_API_KEY";
    return `${providerLabel(provider)} 사용에 ${keyName}가 필요합니다. .env를 확인하세요.`;
  }
  return null;
}

export async function runGenerateJob(job: GenerateJob): Promise<void> {
  const err = validateProvider(job.provider);
  if (err) {
    job.status = "error";
    job.error = err;
    return;
  }

  job.status = "running";
  pushMessage(job, `구상·평가 루프 실행 중… (${providerLabel(job.provider)}, /party-main ${job.anchor})`);

  const onProgress = (text: string) => pushMessage(job, text);

  try {
    let slug: string;
    if (job.provider === "cursor") {
      slug = await runCursorGenerate(job.anchor, onProgress);
    } else {
      slug = await runLlmGenerate(job.provider, job.anchor, onProgress);
    }

    job.slug = slug;
    job.status = "done";
    pushMessage(job, `파티 저장 완료: ${slug}`);
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : String(err);
    pushMessage(job, `오류: ${job.error}`);
  }
}

export { resolveProvider, hasProviderKey };
export type { PartyProvider };
