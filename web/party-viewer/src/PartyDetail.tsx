import { useEffect, useState } from "react";
import type { PartyRecord } from "./api";
import { fetchParty } from "./api";

interface Props {
  slug: string | null;
}

export function PartyDetail({ slug }: Props) {
  const [party, setParty] = useState<PartyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setParty(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchParty(slug)
      .then(setParty)
      .catch((e) => setError(e instanceof Error ? e.message : "오류"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!slug) {
    return (
      <main className="detail empty">
        <p>왼쪽에서 파티를 선택하세요.</p>
      </main>
    );
  }

  if (loading) return <main className="detail"><p className="muted">로딩…</p></main>;
  if (error) return <main className="detail"><p className="error">{error}</p></main>;
  if (!party) return null;

  return (
    <main className="detail">
      <header className="detail-header">
        <h1>{party.anchor}</h1>
        <p className="sub">
          {party.types} · {party.updated}
          {party.evaluation && (
            <span className="badge">
              {party.evaluation.finalScore}/10 ({party.evaluation.finalStatus})
            </span>
          )}
        </p>
        {party.resistances && <p className="muted small">{party.resistances}</p>}
      </header>

      <section>
        <h3>파티 구성</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>포켓몬</th>
              <th>타입</th>
              <th>슬롯</th>
              <th>역할</th>
            </tr>
          </thead>
          <tbody>
            {party.members.map((m, i) => (
              <tr key={i}>
                <td>{m.name.startsWith("★") || m.slot === "1인 슬롯" ? "★" : i}</td>
                <td>{m.name}</td>
                <td>{m.types}</td>
                <td>{m.slot}</td>
                <td>{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>앵커 약점</h3>
        <table>
          <thead>
            <tr>
              <th>타입</th>
              <th>배율</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {party.weaknesses.map((w, i) => (
              <tr key={i}>
                <td>{w.type}</td>
                <td>{w.multiplier}</td>
                <td>{w.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>약점 연쇄</h3>
        <pre className="chain">{party.weaknessChain}</pre>
      </section>

      <section>
        <h3>공격 타입 커버</h3>
        <table>
          <thead>
            <tr>
              <th>타입</th>
              <th>담당</th>
            </tr>
          </thead>
          <tbody>
            {party.attackCoverage.map((a, i) => (
              <tr key={i}>
                <td>{a.type}</td>
                <td>{a.owners}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {party.attackAlternatives && (
          <p className="muted small">{party.attackAlternatives}</p>
        )}
      </section>

      {party.evaluationHistory.length > 0 && (
        <section>
          <h3>편성·평가 이력</h3>
          {party.evaluationSummary && <p>{party.evaluationSummary}</p>}
          <table>
            <thead>
              <tr>
                <th>회차</th>
                <th>점수</th>
                <th>통과</th>
                <th>피드백</th>
              </tr>
            </thead>
            <tbody>
              {party.evaluationHistory.map((r) => (
                <tr key={r.round}>
                  <td>{r.round}</td>
                  <td>{r.score}</td>
                  <td>{r.passed ? "✓" : ""}</td>
                  <td>{r.feedback}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {party.bring3.length > 0 && (
        <section>
          <h3>선발 3 예시</h3>
          {party.megaBringNote && <p className="muted small">{party.megaBringNote}</p>}
          <table>
            <thead>
              <tr>
                <th>순위</th>
                <th>포켓몬</th>
                <th>메가</th>
                <th>이유</th>
              </tr>
            </thead>
            <tbody>
              {party.bring3.map((b, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{b.name}</td>
                  <td>{b.mega ? "예" : ""}</td>
                  <td>{b.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h3>멤버별 추천 빌드</h3>
        <div className="build-cards">
          {party.memberBuilds.map((b) => (
            <article key={b.name} className="build-card">
              <h4>
                {b.name} <span className="muted">({b.types})</span>
              </h4>
              <p className="role">{b.role}</p>
              {b.cover && <p className="small">보완: {b.cover}</p>}
              <p className="recommended">{b.recommended}</p>
              {b.samplePath && <p className="muted small">샘플: {b.samplePath}</p>}
            </article>
          ))}
        </div>
      </section>

      {party.swaps && party.swaps.length > 0 && (
        <section>
          <h3>교체 후보</h3>
          <table>
            <thead>
              <tr>
                <th>빼기</th>
                <th>넣기</th>
                <th>이유</th>
              </tr>
            </thead>
            <tbody>
              {party.swaps.map((s, i) => (
                <tr key={i}>
                  <td>{s.remove}</td>
                  <td>{s.add}</td>
                  <td>{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
