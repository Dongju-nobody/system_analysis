import type { PartyProvider } from "./types.js";

const runtimeKeys = new Map<PartyProvider, string>();

const ENV_KEY: Record<PartyProvider, string> = {
  cursor: "CURSOR_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  openai: "OPENAI_API_KEY",
};

export function setRuntimeKey(provider: PartyProvider, apiKey: string): void {
  runtimeKeys.set(provider, apiKey.trim());
}

export function getRuntimeKey(provider: PartyProvider): string | undefined {
  return runtimeKeys.get(provider);
}

export function clearRuntimeKey(provider: PartyProvider): void {
  runtimeKeys.delete(provider);
}

export function getEnvKey(provider: PartyProvider): string | undefined {
  const envName = ENV_KEY[provider];
  const value = process.env[envName];
  return value?.trim() || undefined;
}

export function isValidProvider(value: string): value is PartyProvider {
  return value === "cursor" || value === "anthropic" || value === "google" || value === "openai";
}
