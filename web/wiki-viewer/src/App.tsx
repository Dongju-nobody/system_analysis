import { useCallback, useState } from "react";
import { PartySidebar } from "./PartySidebar";
import { PartyDetail } from "./PartyDetail";
import { ChatPanel } from "./ChatPanel";
import { WikiSidebar } from "./WikiSidebar";
import { WikiDetail } from "./WikiDetail";
import type { WikiSection } from "./api";

type AppTab = "browse" | "parties";

function getTabFromUrl(): AppTab {
  const t = new URLSearchParams(window.location.search).get("tab");
  return t === "parties" ? "parties" : "browse";
}

function getPageFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("page");
}

function getSlugFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("party");
}

function updateUrl(params: { tab?: AppTab; page?: string | null; party?: string | null }) {
  const url = new URL(window.location.href);
  if (params.tab) url.searchParams.set("tab", params.tab);
  if (params.page !== undefined) {
    if (params.page) url.searchParams.set("page", params.page);
    else url.searchParams.delete("page");
  }
  if (params.party !== undefined) {
    if (params.party) url.searchParams.set("party", params.party);
    else url.searchParams.delete("party");
  }
  window.history.replaceState({}, "", url);
}

export default function App() {
  const [tab, setTab] = useState<AppTab>(getTabFromUrl());
  const [wikiSection, setWikiSection] = useState<WikiSection>("notes");
  const [selectedPage, setSelectedPage] = useState<string | null>(getPageFromUrl());
  const [selectedParty, setSelectedParty] = useState<string | null>(getSlugFromUrl());
  const [refreshKey, setRefreshKey] = useState(0);

  const switchTab = useCallback((next: AppTab) => {
    setTab(next);
    updateUrl({ tab: next });
  }, []);

  const handleSelectPage = useCallback((path: string) => {
    setSelectedPage(path);
    updateUrl({ tab: "browse", page: path });
  }, []);

  const handleSelectParty = useCallback((slug: string) => {
    setSelectedParty(slug);
    updateUrl({ tab: "parties", party: slug });
  }, []);

  const handleGenerated = useCallback(
    (slug: string) => {
      setRefreshKey((k) => k + 1);
      switchTab("parties");
      handleSelectParty(slug);
    },
    [handleSelectParty, switchTab]
  );

  return (
    <div className="app-shell">
      <header className="top-bar">
        <span className="brand">LLM Wiki Viewer</span>
        <nav className="main-tabs">
          <button
            type="button"
            className={tab === "browse" ? "main-tab active" : "main-tab"}
            onClick={() => switchTab("browse")}
          >
            Browse
          </button>
          <button
            type="button"
            className={tab === "parties" ? "main-tab active" : "main-tab"}
            onClick={() => switchTab("parties")}
          >
            Parties
          </button>
        </nav>
      </header>
      {tab === "browse" ? (
        <div className="app browse-layout">
          <WikiSidebar
            section={wikiSection}
            onSectionChange={setWikiSection}
            selected={selectedPage}
            onSelect={handleSelectPage}
          />
          <WikiDetail pagePath={selectedPage} />
        </div>
      ) : (
        <div className="app">
          <PartySidebar
            selected={selectedParty}
            onSelect={handleSelectParty}
            refreshKey={refreshKey}
          />
          <PartyDetail slug={selectedParty} />
          <ChatPanel onGenerated={handleGenerated} />
        </div>
      )}
    </div>
  );
}
