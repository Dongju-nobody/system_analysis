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

export interface WikiSearchHit {
  relPath: string;
  heading: string;
  text: string;
  score: number;
}

export * from "./types.js";
