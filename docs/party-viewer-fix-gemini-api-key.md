---
title: "Party Viewer — Gemini API 키 오류 수정 패치"
kind: fix-patch
updated: 2026-06-14
applies_to: docs/party-viewer-implementation.md
---

# Party Viewer — Gemini API 키 오류 수정 패치

> **Gemini·Claude·에이전트용:** 이 문서만 읽고 **한 파일**을 수정하면 됩니다.  
> 관련 전체 스펙: [party-viewer-implementation.md](./party-viewer-implementation.md)

---

## 1. 증상

웹 UI에서 Gemini API 키를 붙여넣고 [연동] 후 파티 생성 시 아래 오류:

```
Google Generative AI API key is missing. Pass it using the 'apiKey' parameter
or the GOOGLE_GENERATIVE_AI_API_KEY environment variable.
```

- `/api/health`에서 `google: true` (연동 성공)
- `.env`의 `GOOGLE_API_KEY` 또는 웹 런타임 키를 넣었는데도 발생

---

## 2. 원인

`mcp/party-viewer/src/providers/llm.ts`에서 Vercel AI SDK 호출 방식이 **잘못됨**.

| 잘못된 코드 | 문제 |
|-------------|------|
| `google(modelId, { apiKey })` | 두 번째 인자는 **모델 설정**이지 API 키가 아님 |
| `anthropic(modelId, { apiKey })` | 동일 |
| `openai(modelId, { apiKey })` | 동일 |

기본 `google` 인스턴스는 `GOOGLE_GENERATIVE_AI_API_KEY` 환경변수만 읽음.  
앱은 `GOOGLE_API_KEY` + 런타임 키(`runtime-keys.ts`)를 쓰므로 **키가 전달되지 않음**.

---

## 3. 수정 대상 (1파일만)

**경로:** `mcp/party-viewer/src/providers/llm.ts`

다른 파일(`config.ts`, `runtime-keys.ts`, `ChatPanel.tsx`)은 **수정하지 않음**.

---

## 4. 수정 방법

### 4.1 import 변경

**Before:**

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
```

**After:**

```typescript
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
```

### 4.2 모델 생성 (switch 내부)

**Before:**

```typescript
switch (provider) {
  case "anthropic":
    model = anthropic(modelId, { apiKey });
    break;
  case "google":
    model = google(modelId, { apiKey });
    break;
  case "openai":
    model = openai(modelId, { apiKey });
    break;
  ...
}
```

**After:**

```typescript
switch (provider) {
  case "anthropic":
    model = createAnthropic({ apiKey })(modelId);
    break;
  case "google":
    model = createGoogleGenerativeAI({ apiKey })(modelId);
    break;
  case "openai":
    model = createOpenAI({ apiKey })(modelId);
    break;
  ...
}
```

`apiKey`는 `getApiKey(provider)`에서 가져옴 (런타임 키 > `.env` 우선).

---

## 5. 수정 후 전체 파일 (복사용)

아래 내용으로 `llm.ts` **전체 교체**:

```typescript
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { PartyProvider } from "./types.js";
import { getModelForProvider, getApiKey } from "./config.js";

export async function llmGenerate(
  provider: PartyProvider,
  system: string,
  prompt: string
): Promise<string> {
  const modelId = getModelForProvider(provider);
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(`${provider} API 키가 설정되지 않았습니다.`);
  }

  let model;
  switch (provider) {
    case "anthropic":
      model = createAnthropic({ apiKey })(modelId);
      break;
    case "google":
      model = createGoogleGenerativeAI({ apiKey })(modelId);
      break;
    case "openai":
      model = createOpenAI({ apiKey })(modelId);
      break;
    default:
      throw new Error(`LLM provider not supported: ${provider}`);
  }

  const result = await generateText({
    model,
    system,
    prompt,
    temperature: 0.4,
  });

  return result.text;
}

export function extractMarkdown(text: string): string {
  const fenced = text.match(/```(?:markdown|md)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  if (text.trim().startsWith("---")) return text.trim();
  const h1 = text.match(/(---[\s\S]*)/);
  if (h1) return h1[1].trim();
  return text.trim();
}

export function parseEvalJson(text: string): {
  score: number;
  feedback: string;
  passed: boolean;
} {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { score: 5, feedback: text.slice(0, 500), passed: false };
  }
  try {
    const obj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const score = Number(obj.score) || 5;
    const feedback = String(obj.feedback ?? "");
    const passed = Boolean(obj.passed) || score > 8;
    return { score, feedback, passed };
  } catch {
    return { score: 5, feedback: text.slice(0, 500), passed: false };
  }
}
```

---

## 6. 검증

1. 서버 재시작: `npm run party:dev` (또는 `npm.cmd run party:dev`)
2. 서버 재시작 후 웹에서 Gemini 키 **다시 [연동]** (런타임 키는 재시작 시 소멸)
3. 오른쪽 채팅에서 포켓몬 이름 입력 → 생성
4. SSE에 `[1/3] 구상 에이전트 실행…` 이후 **API key missing 오류 없음**

### 실패 시 체크

| 확인 | 내용 |
|------|------|
| 키 형식 | Google AI Studio 키 (`AIza…`) |
| provider | 드롭다운 **Gemini** 선택 후 연동 |
| 서버 | `party:server` 프로세스 재시작했는지 |

---

## 7. (선택) `.env`만 쓸 때

웹 붙여넣기 없이 `.env`만 사용해도 됨:

```env
GOOGLE_API_KEY=AIza...
PARTY_GENERATE_PROVIDER=google
```

`GOOGLE_GENERATIVE_AI_API_KEY`는 **필수 아님** (수정 후 `getApiKey` → `createGoogleGenerativeAI({ apiKey })` 경로 사용).

---

## 8. Gemini에게 넘길 프롬프트

```
다음 패치 문서를 읽고 Party Viewer의 Gemini API 키 오류를 수정해줘.

문서: docs/party-viewer-fix-gemini-api-key.md

할 일:
1. mcp/party-viewer/src/providers/llm.ts 만 수정 (§5 전체 파일로 교체)
2. 다른 파일은 건드리지 마
3. 수정 후 npm run party:dev 로 서버 재시작 안내

이미 llm.ts가 §5와 동일하면 "이미 적용됨"이라고만 알려줘.
```

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-06-14 | v1.0 — `createGoogleGenerativeAI({ apiKey })` 패턴 수정 |
