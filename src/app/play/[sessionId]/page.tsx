"use client";

import { Suspense } from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { useGameSnapshot, calcTimeLeft } from "@/lib/gameState";
import { usePlayers } from "@/lib/realtime";

interface QuestionData {
  position: number;
  text: string;
  options: string[];
  time_limit: number;
  total: number;
  question_started_at: string | null;
}

interface AnswerResult {
  is_correct: boolean;
  awarded: number;
  correct_index: number;
}

// Kahoot-style tile config
const TILES = [
  { shape: "▲", color: "#e21b3c", label: "A" },
  { shape: "◆", color: "#1368ce", label: "B" },
  { shape: "●", color: "#d89e00", label: "C" },
  { shape: "■", color: "#26890c", label: "D" },
] as const;

export default function PlayPage() {
  return (
    <Suspense>
      <PlayContent />
    </Suspense>
  );
}

function PlayContent() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerId = searchParams.get("player") ?? "";

  const snap = useGameSnapshot(params.sessionId);
  const players = usePlayers(params.sessionId);

  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answered, setAnswered] = useState<number | null>(null); // choice index
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [submitting, setSubmitting] = useState(false);
  const lastQRef = useRef<number>(-1);

  // Fetch question whenever current_q changes
  useEffect(() => {
    if (!snap) return;
    if (snap.state === "lobby" || snap.state === "ended") return;
    if (snap.current_q === lastQRef.current) return;

    lastQRef.current = snap.current_q;
    setAnswered(null);
    setResult(null);

    fetch(`/api/sessions/${params.sessionId}/question`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setQuestion(d as QuestionData);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.current_q, snap?.state, params.sessionId]);

  // Countdown timer
  useEffect(() => {
    if (!question || snap?.state !== "question") return;
    const tick = () => {
      setTimeLeft(Math.ceil(calcTimeLeft(question.question_started_at, question.time_limit)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [question, snap?.state]);

  const submitAnswer = useCallback(
    async (choice: number) => {
      if (!snap || answered !== null || submitting) return;
      setAnswered(choice);
      setSubmitting(true);
      try {
        const res = await fetch(`/api/sessions/${params.sessionId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: playerId, choice, question_index: snap.current_q }),
        });
        const data = await res.json();
        if (res.ok) setResult(data as AnswerResult);
      } finally {
        setSubmitting(false);
      }
    },
    [snap, answered, submitting, playerId, params.sessionId]
  );

  // Get player's score from the live list
  const myPlayer = players.find((p) => p.id === playerId);

  if (!snap) {
    return (
      <div className="app">
        <header className="topbar"><Wordmark /></header>
        <main className="stage"><p style={{ color: "var(--ink-dim)" }}>Connecting…</p></main>
      </div>
    );
  }

  if (snap.state === "lobby") {
    return (
      <div className="app">
        <header className="topbar"><Wordmark /></header>
        <main className="stage">
          <div className="col" style={{ alignItems: "center", gap: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "var(--consid-red)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 700, color: "var(--on-red)",
            }}>
              {myPlayer?.nickname?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <p style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>
              {myPlayer?.nickname ?? "Waiting…"}
            </p>
            <p style={{ color: "var(--ink-dim)" }}>Waiting for the host to start…</p>
            <div className="card" style={{ textAlign: "center", padding: "12px 32px" }}>
              <p className="eyebrow">Players</p>
              <p style={{ fontFamily: "var(--font-space)", fontSize: 36, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                {players.length}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (snap.state === "question" && question) {
    const timerRatio = timeLeft / question.time_limit;
    return (
      <div className="app" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        {/* Top bar: timer + question count */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", background: "var(--surface)", borderBottom: "1px solid var(--line-2)",
        }}>
          <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>
            Q {question.position + 1} / {question.total}
          </span>
          {/* Timer circle */}
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: timerRatio > 0.5 ? "var(--consid-red)" : timerRatio > 0.25 ? "#d89e00" : "#e21b3c",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-space, system-ui)", fontWeight: 800, fontSize: 20, color: "#fff",
            transition: "background 0.5s",
          }}>
            {timeLeft}
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>
            {myPlayer?.score ?? 0} pts
          </span>
        </div>

        {/* Question text */}
        <div style={{
          flex: "0 0 auto", padding: "24px 20px", textAlign: "center",
          background: "var(--bg)",
        }}>
          <p style={{
            fontFamily: "var(--font-space, system-ui)",
            fontWeight: 700,
            fontSize: "clamp(18px, 5vw, 28px)",
            color: "var(--ink)",
            margin: 0,
            lineHeight: 1.3,
          }}>
            {question.text}
          </p>
        </div>

        {/* Answer tiles */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 8,
          padding: 8,
        }}>
          {question.options.map((opt, i) => {
            const tile = TILES[i];
            const isChosen = answered === i;
            const isDisabled = answered !== null || timeLeft === 0;
            return (
              <button
                key={i}
                onClick={() => submitAnswer(i)}
                disabled={isDisabled}
                style={{
                  background: tile.color,
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius)",
                  padding: "16px 12px",
                  cursor: isDisabled ? "default" : "pointer",
                  opacity: isDisabled && !isChosen ? 0.45 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "var(--font-hanken, system-ui)",
                  fontSize: "clamp(14px, 3vw, 17px)",
                  fontWeight: 600,
                  textAlign: "left",
                  transform: isChosen ? "scale(0.97)" : "scale(1)",
                  transition: "opacity 0.2s, transform 0.1s",
                  outline: isChosen ? "3px solid rgba(255,255,255,0.8)" : "none",
                  outlineOffset: -3,
                }}
              >
                <span style={{ fontSize: "clamp(18px, 5vw, 24px)", flexShrink: 0 }}>{tile.shape}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {answered !== null && !result && (
          <div style={{ padding: "12px", textAlign: "center", color: "var(--ink-dim)", fontSize: 14 }}>
            Answer locked in — waiting for reveal…
          </div>
        )}
      </div>
    );
  }

  if (snap.state === "reveal" && question && result) {
    return (
      <div className="app">
        <main className="stage">
          <div className="col" style={{ alignItems: "center", gap: 32, maxWidth: 400, width: "100%" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: result.is_correct ? "#26890c" : "#e21b3c",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36,
            }}>
              {result.is_correct ? "✓" : "✗"}
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-space)", fontSize: 32, fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                {result.is_correct ? "Correct!" : "Wrong!"}
              </p>
              {result.awarded > 0 && (
                <p style={{ fontSize: 18, color: "#26890c", marginTop: 8, fontWeight: 700 }}>
                  +{result.awarded} pts
                </p>
              )}
            </div>
            <div className="card" style={{ width: "100%", textAlign: "center", padding: "12px 24px" }}>
              <p className="eyebrow">Total score</p>
              <p style={{ fontFamily: "var(--font-space)", fontSize: 40, fontWeight: 800, color: "var(--ink)", margin: 0 }}>
                {myPlayer?.score ?? (result.awarded || 0)}
              </p>
            </div>
            <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Waiting for next question…</p>
          </div>
        </main>
      </div>
    );
  }

  if (snap.state === "reveal" && answered === null) {
    return (
      <div className="app">
        <main className="stage">
          <div className="col" style={{ alignItems: "center", gap: 24 }}>
            <p style={{ fontSize: 20, color: "var(--ink-dim)" }}>Time&apos;s up!</p>
            <p style={{ color: "var(--ink-dim)", fontSize: 14 }}>Waiting for next question…</p>
          </div>
        </main>
      </div>
    );
  }

  if (snap.state === "leaderboard") {
    const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const myRank = sorted.findIndex((p) => p.id === playerId) + 1;
    return (
      <div className="app">
        <header className="topbar"><Wordmark /></header>
        <main className="stage">
          <div className="col" style={{ maxWidth: 400, width: "100%", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <p className="eyebrow">Leaderboard</p>
              {myRank > 0 && (
                <p style={{ fontFamily: "var(--font-space)", fontSize: 40, fontWeight: 800, color: "var(--consid-red)", margin: 0 }}>
                  #{myRank}
                </p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sorted.slice(0, 5).map((p, i) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", borderRadius: "var(--radius-sm)",
                  background: p.id === playerId ? "rgba(198,42,72,0.12)" : "var(--surface)",
                  border: p.id === playerId ? "1px solid var(--consid-red)" : "1px solid var(--line-2)",
                }}>
                  <span style={{ fontFamily: "var(--font-space)", fontWeight: 800, width: 28, color: "var(--ink-dim)" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, color: "var(--ink)" }}>{p.nickname}</span>
                  <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, color: "var(--consid-red)" }}>
                    {p.score ?? 0}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ color: "var(--ink-dim)", fontSize: 14, textAlign: "center" }}>
              Waiting for next question…
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (snap.state === "ended") {
    const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const myRank = sorted.findIndex((p) => p.id === playerId) + 1;
    return (
      <div className="app">
        <header className="topbar"><Wordmark /></header>
        <main className="stage">
          <div className="col" style={{ maxWidth: 400, width: "100%", gap: 32, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <p className="eyebrow rise">Game over</p>
              <h1 style={{
                fontFamily: "var(--font-space, system-ui)", fontWeight: 800,
                fontSize: "clamp(36px, 9vw, 56px)", color: "var(--ink)", margin: 0,
              }}>
                {myRank === 1 ? "You won! 🎉" : myRank === 2 ? "Runner up! 🥈" : myRank === 3 ? "Third place! 🥉" : "Final results"}
              </h1>
              {myRank > 0 && (
                <p style={{ fontSize: 18, color: "var(--ink-dim)", marginTop: 8 }}>
                  You finished #{myRank} with {myPlayer?.score ?? 0} points
                </p>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              {sorted.slice(0, 5).map((p, i) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", borderRadius: "var(--radius-sm)",
                  background: p.id === playerId ? "rgba(198,42,72,0.12)" : "var(--surface)",
                  border: p.id === playerId ? "1px solid var(--consid-red)" : "1px solid var(--line-2)",
                }}>
                  <span style={{ fontSize: 20, width: 28 }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, color: "var(--ink)" }}>{p.nickname}</span>
                  <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, color: "var(--consid-red)" }}>
                    {p.score ?? 0}
                  </span>
                </div>
              ))}
            </div>

            <button className="btn btn-ghost" onClick={() => router.push("/")} style={{ minHeight: 44 }}>
              Play again →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Loading / transition state
  return (
    <div className="app">
      <main className="stage">
        <p style={{ color: "var(--ink-dim)" }}>Loading…</p>
      </main>
    </div>
  );
}
