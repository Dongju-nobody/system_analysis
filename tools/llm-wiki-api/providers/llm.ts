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