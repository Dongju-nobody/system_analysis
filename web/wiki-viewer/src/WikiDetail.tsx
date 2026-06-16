import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { WikiPage } from "./api";
import { fetchWikiPage } from "./api";

interface Props {
  pagePath: string | null;
}

export function WikiDetail({ pagePath }: Props) {
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pagePath) {
      setPage(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await fetchWikiPage(pagePath);
        if (!cancelled) setPage(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "오류");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pagePath]);

  if (!pagePath) {
    return (
      <main className="detail">
        <p className="muted pad">Browse에서 페이지를 선택하세요.</p>
      </main>
    );
  }

  if (loading) return <main className="detail"><p className="muted pad">로딩…</p></main>;
  if (error) return <main className="detail"><p className="error pad">{error}</p></main>;
  if (!page) return null;

  return (
    <main className="detail">
      <header className="detail-head">
        <h1>{String(page.frontmatter.title ?? page.relPath)}</h1>
        <p className="muted">{page.path}</p>
      </header>
      <article className="md-body">
        <ReactMarkdown>{page.body}</ReactMarkdown>
      </article>
    </main>
  );
}
