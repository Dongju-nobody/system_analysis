import { useState, useRef, useEffect, useCallback } from "react";
import {
  startGenerate,
  streamGenerate,
  fetchHealth,
  providerLabel,
  type PartyProvider,
} from "./api";

export interface ChatMessage {
  id: string;
  role: "user" | "system" | "error";
  text: string;
}

const ALL_PROVIDERS: PartyProvider[] = ["google", "anthropic", "openai", "cursor"];

interface Props {
  onGenerated: (slug: string) => void;
}

function buildWelcome(available: Record<PartyProvider, boolean>, maxIter: number): string {
  const names = ALL_PROVIDERS.filter((p) => available[p]).map(providerLabel).join(", ");
  const base =
    "파티 목록·상세는 키 없이 조회 가능합니다. 생성은 `.env`에 GOOGLE_API_KEY(또는 ANTHROPIC_API_KEY, OPENAI_API_KEY, CURSOR_API_KEY)를 설정한 뒤 API 서버를 재시작하세요. GitHub에는 `.env`를 커밋하지 마세요.";
  if (names) {
    return `${base} 사용 가능: ${names} · 최대 ${maxIter}회 루프`;
  }
  return `${base} 현재 env에 설정된 provider 키가 없습니다. .env.example을 참고하세요.`;
}

export function ChatPanel({ onGenerated }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<PartyProvider>("google");
  const [available, setAvailable] = useState<Record<PartyProvider, boolean>>({
    cursor: false,
    anthropic: false,
    google: false,
    openai: false,
  });
  const [maxIterations, setMaxIterations] = useState(3);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshHealth = useCallback(async () => {
    const h = await fetchHealth();
    setAvailable(h.providers);
    setProvider(h.defaultProvider);
    setMaxIterations(h.maxIterations);
    return h;
  }, []);

  useEffect(() => {
    refreshHealth()
      .then((h) => {
        setMessages([
          { id: "welcome", role: "system", text: buildWelcome(h.providers, h.maxIterations) },
        ]);
      })
      .catch(() => {
        setMessages([
          {
            id: "welcome",
            role: "error",
            text: "API 서버에 연결할 수 없습니다. npm run wiki:dev가 실행 중인지 확인하세요.",
          },
        ]);
      });
  }, [refreshHealth]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (role: ChatMessage["role"], text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text },
    ]);
  };

  const canGenerate = available[provider];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw || busy || !canGenerate) return;

    const anchor = raw.replace(/^\/party-main\s*/i, "").trim();
    setInput("");
    addMessage("user", raw.startsWith("/") ? raw : anchor);
    setBusy(true);
    addMessage(
      "system",
      `${providerLabel(provider)}로 구상·평가 루프 실행 중… (최대 ${maxIterations}회, 수 분 소요)`
    );

    try {
      const { jobId } = await startGenerate(anchor, provider);
      streamGenerate(
        jobId,
        (text) => addMessage("system", text),
        (slug) => {
          addMessage("system", `완료! 파티가 생성되었습니다: ${slug}`);
          onGenerated(slug);
          setBusy(false);
        },
        (err) => {
          addMessage("error", err);
          setBusy(false);
        }
      );
    } catch (err) {
      addMessage("error", err instanceof Error ? err.message : "요청 실패");
      setBusy(false);
    }
  };

  return (
    <aside className="chat">
      <div className="chat-header">
        <h2>파티 생성</h2>
      </div>
      <div className="provider-row">
        <label htmlFor="provider-select">AI</label>
        <select
          id="provider-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value as PartyProvider)}
          disabled={busy}
        >
          {ALL_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {providerLabel(p)}
              {!available[p] ? " (키 없음)" : " ✓"}
            </option>
          ))}
        </select>
        {available[provider] && (
          <span className="key-connected">{providerLabel(provider)} (env)</span>
        )}
      </div>
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="포켓몬 이름 또는 /party-main 이름"
          disabled={busy || !canGenerate}
        />
        <button type="submit" disabled={busy || !input.trim() || !canGenerate}>
          {busy ? "실행 중…" : "생성"}
        </button>
      </form>
    </aside>
  );
}
