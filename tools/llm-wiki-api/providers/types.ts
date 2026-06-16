export type PartyProvider = "cursor" | "anthropic" | "google" | "openai";

export interface ProviderAvailability {
  cursor: boolean;
  anthropic: boolean;
  google: boolean;
  openai: boolean;
}

export interface EvalResult {
  score: number;
  feedback: string;
  passed: boolean;
  breakdown?: Record<string, number>;
}

export interface LoopHistoryEntry {
  round: number;
  score: number;
  passed: boolean;
  feedback: string;
  draft: string;
}

export interface LoopResult {
  finalDraft: string;
  finalStatus: "passed" | "best_of_3";
  finalScore: number;
  selectedIteration: number;
  history: LoopHistoryEntry[];
}

export type ProgressCallback = (message: string) => void;
