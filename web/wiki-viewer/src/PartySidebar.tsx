import { useEffect, useState } from "react";
import type { PartyListItem } from "./api";
import { fetchParties, syncParties } from "./api";

interface Props {
  selected: string | null;
  onSelect: (slug: string) => void;
  refreshKey: number;
}

export function PartySidebar({ selected, onSelect, refreshKey }: Props) {
  const [parties, setParties] = useState<PartyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setParties(await fetchParties());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncParties();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "동기화 오류");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>파티 기록</h2>
        <button type="button" onClick={handleSync} disabled={syncing}>
          {syncing ? "…" : "새로고침"}
        </button>
      </div>
      {loading && <p className="muted">로딩…</p>}
      {error && <p className="error">{error}</p>}
      <ul className="party-list">
        {parties.map((p) => (
          <li key={p.slug}>
            <button
              type="button"
              className={`party-item ${selected === p.slug ? "active" : ""}`}
              onClick={() => onSelect(p.slug)}
            >
              <span className="party-anchor">{p.anchor}</span>
              {p.types && <span className="party-types">{p.types}</span>}
              <span className="party-meta">
                {p.finalScore != null && (
                  <span className="badge">{p.finalScore}/10</span>
                )}
                <span className="date">{p.updated}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
