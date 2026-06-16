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

export interface PartyEvaluation {
  iterations: number;
  finalScore: number;
    finalStatus: "passed" | "best_of_10" | "best_of_3";
  selectedIteration: number;
}

export interface PartyRecord {
  slug: string;
  anchor: string;
  types: string;
  updated: string;
  filePath: string;
  resistances?: string;
  evaluation?: PartyEvaluation;
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

export interface PartyManifestEntry {
  slug: string;
  anchor: string;
  file: string;
  updated: string;
  finalScore?: number;
  finalStatus?: string;
}

export interface PartyManifest {
  parties: PartyManifestEntry[];
}

export interface PartyListItem {
  slug: string;
  anchor: string;
  updated: string;
  finalScore?: number;
  finalStatus?: string;
  types?: string;
}
