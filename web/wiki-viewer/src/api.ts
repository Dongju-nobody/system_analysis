export type PartyProvider = "cursor" | "anthropic" | "google" | "openai";

export interface PartyListItem {
  slug: string;
  anchor: string;
  updated: string;
  finalScore?: number;
  finalStatus?: string;
  types?: string;
}

export interface PartyMember {
  slot: string;
  name: string;
  types: string;
  role: string;
}

export interface PartyWeakness {
  type: string;
  multiplier: string;
  note?: string;
}

export interface AttackCoverage {
  type: string;
  owners: string;
}

export interface EvaluationHistoryRow {
  round: number;
  score: number;
  passed: boolean;
  feedback: string;
}

export interface Bring3Row {
  name: string;
  mega: boolean;
  reason: string;
}

export interface MemberBuild {
  name: string;
  types: string;
  role: string;
  cover?: string;
  recommended: string;
  samplePath?: string;
  buildCount?: number;
  allBuilds: string[];
}

export interface PartyRecord {
  slug: string;
  anchor: string;
  types: string;
  updated: string;
  filePath: string;
  resistances?: string;
  evaluation?: {
    iterations: number;
    finalScore: number;
    finalStatus: "passed" | "best_of_10" | "best_of_3";
    selectedIteration: number;
  };
  members: PartyMember[];
  weaknesses: PartyWeakness[];
  weaknessChain: string;
  attackCoverage: AttackCoverage[];
  attackAlternatives?: string;
  evaluationHistory: EvaluationHistoryRow[];
  evaluationSummary?: string;
  bring3: Bring3Row[];
  megaBringNote?: string;
  memberBuilds: MemberBuild[];
  swaps?: { remove: string; add: string; reason: string }[];
}

export interface HealthResponse {
  ok: boolean;
  providers: Record<PartyProvider, boolean>;
  defaultProvider: PartyProvider;
  maxIterations: number;
}

const PROVIDER_LABELS: Record<PartyProvider, string> = {
  cursor: "Cursor",
  anthropic: "Claude",
  google: "Gemini",
  openai: "OpenAI",
};

export function providerLabel(p: PartyProvider): string {
  return PROVIDER_LABELS[p];
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("서버 상태 확인 실패");
  return res.json();
}

export async function fetchParties(): Promise<PartyListItem[]> {
  const res = await fetch("/api/parties");
  if (!res.ok) throw new Error("목록 로드 실패");
  const data = await res.json();
  return data.parties;
}

export async function fetchParty(slug: string): Promise<PartyRecord> {
  const res = await fetch(`/api/parties/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error("파티 로드 실패");
  const data = await res.json();
  return data.party;
}

export async function syncParties(): Promise<void> {
  const res = await fetch("/api/parties/sync", { method: "POST" });
  if (!res.ok) throw new Error("동기화 실패");
}

export type WikiSection = "sources" | "notes" | "concepts" | "parties";

export interface WikiTreeItem {
  path: string;
  relPath: string;
  title: string;
  section: WikiSection;
}

export interface WikiTree {
  sections: Record<WikiSection, WikiTreeItem[]>;
}

export interface WikiPage {
  path: string;
  relPath: string;
  section: WikiSection;
  frontmatter: Record<string, unknown>;
  body: string;
}

export async function fetchWikiTree(): Promise<WikiTree> {
  const res = await fetch("/api/wiki/tree");
  if (!res.ok) throw new Error("위키 목록 로드 실패");
  return res.json();
}

export async function fetchWikiPage(path: string): Promise<WikiPage> {
  const res = await fetch(`/api/wiki/page?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error("페이지 로드 실패");
  const data = await res.json();
  return data.page;
}

export async function startGenerate(
  anchor: string,
  provider: PartyProvider
): Promise<{ jobId: string }> {
  const res = await fetch("/api/parties/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anchor, provider }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "생성 요청 실패");
  return data;
}

export function streamGenerate(
  jobId: string,
  onMessage: (text: string) => void,
  onDone: (slug: string) => void,
  onError: (err: string) => void
): () => void {
  const es = new EventSource(`/api/parties/generate/${jobId}/stream`);

  es.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (data.type === "message") onMessage(data.text);
    if (data.type === "done") {
      es.close();
      onDone(data.slug);
    }
    if (data.type === "error") {
      es.close();
      onError(data.error);
    }
  };

  es.onerror = () => {
    es.close();
    onError("스트림 연결 오류");
  };

  return () => es.close();
}
