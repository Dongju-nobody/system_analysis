import { useCallback, useState } from "react";
import { PartySidebar } from "./PartySidebar";
import { PartyDetail } from "./PartyDetail";
import { ChatPanel } from "./ChatPanel";

function getSlugFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("party");
}

function setSlugInUrl(slug: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("party", slug);
  window.history.replaceState({}, "", url);
}

export default function App() {
  const [selected, setSelected] = useState<string | null>(getSlugFromUrl());
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelect = useCallback((slug: string) => {
    setSelected(slug);
    setSlugInUrl(slug);
  }, []);

  const handleGenerated = useCallback((slug: string) => {
    setRefreshKey((k) => k + 1);
    handleSelect(slug);
  }, [handleSelect]);

  return (
    <div className="app">
      <PartySidebar
        selected={selected}
        onSelect={handleSelect}
        refreshKey={refreshKey}
      />
      <PartyDetail slug={selected} />
      <ChatPanel onGenerated={handleGenerated} />
    </div>
  );
}
