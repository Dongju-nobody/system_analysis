import { useEffect, useState } from "react";
import type { WikiSection, WikiTreeItem } from "./api";
import { fetchWikiTree } from "./api";

const SECTION_LABELS: Record<WikiSection, string> = {
  sources: "Sources",
  notes: "Notes",
  concepts: "Concepts",
  parties: "Parties",
};

interface Props {
  section: WikiSection;
  onSectionChange: (s: WikiSection) => void;
  selected: string | null;
  onSelect: (path: string) => void;
}

export function WikiSidebar({ section, onSectionChange, selected, onSelect }: Props) {
  const [items, setItems] = useState<WikiTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const tree = await fetchWikiTree();
        if (!cancelled) setItems(tree.sections[section] ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2>Wiki Browse</h2>
      </div>
      <div className="section-tabs">
        {(Object.keys(SECTION_LABELS) as WikiSection[]).map((s) => (
          <button
            key={s}
            type="button"
            className={s === section ? "section-tab active" : "section-tab"}
            onClick={() => onSectionChange(s)}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>
      {loading && <p className="muted pad">로딩…</p>}
      {error && <p className="error pad">{error}</p>}
      <ul className="party-list">
        {items.map((item) => (
          <li key={item.path}>
            <button
              type="button"
              className={selected === item.path ? "party-item active" : "party-item"}
              onClick={() => onSelect(item.path)}
            >
              <span className="party-name">{item.title}</span>
              <span className="party-meta">{item.relPath}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
