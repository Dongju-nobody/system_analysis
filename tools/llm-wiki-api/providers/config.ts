import type { PartyProvider, ProviderAvailability } from "./types.js";
import { getEnvKey } from "./runtime-keys.js";

const PROVIDERS: PartyProvider[] = ["cursor", "anthropic", "google", "openai"];

export function getMaxIterations(): number {
  const n = Number(process.env.PARTY_MAX_ITERATIONS ?? 3);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 3;
}

export function getDefaultProvider(): PartyProvider {
  const raw = (process.env.PARTY_GENERATE_PROVIDER ?? "").toLowerCase();
  if (PROVIDERS.includes(raw as PartyProvider) && hasProviderKey(raw as PartyProvider)) {
    return raw as PartyProvider;
  }
  for (const p of ["google", "anthropic", "openai", "cursor"] as PartyProvider[]) {
    if (hasProviderKey(p)) return p;
  }
  return "google";
}

export function getApiKey(provider: PartyProvider): string | undefined {
  return getEnvKey(provider);
}

export function hasProviderKey(provider: PartyProvider): boolean {
  return Boolean(getApiKey(provider));
}

export function getProviderAvailability(): ProviderAvailability {
  return {
    cursor: hasProviderKey("cursor"),
    anthropic: hasProviderKey("anthropic"),
    google: hasProviderKey("google"),
    openai: hasProviderKey("openai"),
  };
}

export function resolveProvider(requested?: string): PartyProvider {
  const raw = (requested ?? getDefaultProvider()).toLowerCase();
  if (PROVIDERS.includes(raw as PartyProvider)) return raw as PartyProvider;
  return getDefaultProvider();
}

export function getModelForProvider(provider: PartyProvider): string {
  switch (provider) {
    case "anthropic":
      return process.env.PARTY_MODEL_ANTHROPIC ?? "claude-sonnet-4-5";
    case "google":
      return process.env.PARTY_MODEL_GOOGLE ?? "gemini-2.0-flash";
    case "openai":
      return process.env.PARTY_MODEL_OPENAI ?? "gpt-4o";
    default:
      return "composer-2.5";
  }
}

export function providerLabel(provider: PartyProvider): string {
  switch (provider) {
    case "cursor":
      return "Cursor";
    case "anthropic":
      return "Claude";
    case "google":
      return "Gemini";
    case "openai":
      return "OpenAI";
  }
}
