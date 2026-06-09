"use client";

import { Suspense } from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { usePlayers } from "@/lib/realtime";
import { useGameSnapshot, calcTimeLeft } from "@/lib/gameState";

interface QuestionData {
  position: number;
  text: string;
  options: string[];
  correct_index: number;
  time_limit: number;
  total: number;
  question_started_at: string | null;
}

interface SessionMeta {
  pin: string;
  quiz_title: string;
}

const TILE_COLORS = ["#e21b3c", "#1368ce", "#d89e00", "#26890c"];
const TILE_SHAPES = ["▲", "◆", "●", "■"];

export default function HostPage() {
  return (
    <Suspense>
      <HostContent />
    </Suspense>
  );
}

function HostContent() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hostToken = searchParams.get("token") ?? "";

  const snap = useGameSnapshot(params.sessionId);
  const players = usePlayers(params.sessionId);

  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [distribution, setDistribution] = useState<number[]>([0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(20);
  const [advancing, setAdvancing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // Fetch session metadata once
  useEffect(() => {
    if (!params.sessionId) return;
    fetch(`/api/sessions/${params.sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setMeta({ pin: d.pin, quiz_title: d.quiz_title });
      });
  }, [params.sessionId]);

  // Fetch question whenever current_q changes (and not in lobby)
  useEffect(() => {
    if (!snap || snap.state === "lobby" || snap.state === "ended") return;

    fetch(`/api/sessions/${params.sessionId}/question?host_token=${hostToken}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setQuestion(d as QuestionData);
          setAnsweredCount(0);
          setDistribution([0, 0, 0, 0]);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.current_q, snap?.state, params.sessionId, hostToken]);

  // Fetch distribution when moving to reveal
  useEffect(() => {
    if (!snap || snap.state !== "reveal") return;
    fetch(`/api/sessions/${params.sessionId}/answer-distribution?q=${snap.current_q}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setDistribution(d.distribution as number[]);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.state, snap?.current_q, params.sessionId]);

  // Countdown timer
  useEffect(() => {
    if (!question || snap?.state !== "question") return;
    const tick = () => setTimeLeft(Math.ceil(calcTimeLeft(question.question_started_at, question.time_limit)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [question, snap?.state]);

  // Poll answer count while in question state
  useEffect(() => {
    if (!snap || snap.state !== "question") return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/sessions/${params.sessionId}/answer-count?q=${snap.current_q}`);
      if (res.ok) {
        const { count } = await res.json();
        setAnsweredCount(count ?? 0);
      }
    }, 1500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.state, snap?.current_q, params.sessionId]);

  const handleStartGame = useCallback(async () => {
    setStarting(true);
    setError("");
    const res = await fetch(`/api/sessions/${params.sessionId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_token: hostToken }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to start");
    }
    setStarting(false);
  }, [params.sessionId, hostToken]);

  const handleAdvance = useCallback(async () => {
    setAdvancing(true);
    const res = await fetch(`/api/sessions/${params.sessionId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host_token: hostToken }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to advance");
    }
    setAdvancing(false);
  }, [params.sessionId, hostToken]);

  if (!snap || !meta) {
    return (
      <div className="app">
        <header className="topbar"><Wordmark /></header>
        <main className="stage"><p style={{ color: "var(--ink-dim)" }}>Loading…</p></main>
      </div>
    );
  }

  // ── LOBBY ──
  if (snap.state === "lobby") {
    return (
      <div className="app">
        <header className="topbar">
          <Wordmark />
          <span style={{ fontSize: 13, color: "var(--ink-dim)", marginRight: "auto", marginLeft: 16 }}>
            {meta.quiz_title}
          </span>
          <button
            className="btn btn-primary"
            style={{ width: "auto", padding: "0 24px", minHeight: 40 }}
            onClick={handleStartGame}
            disabled={starting || players.length === 0}
          >
            {starting ? "Starting…" : players.length === 0 ? "Waiting for players…" : `Start game (${players.length}) →`}
          </button>
        </header>
        <main className="stage">
          <div className="col" style={{ maxWidth: 640, width: "100%", gap: 40 }}>
            {error && <p style={{ color: "var(--consid-red)", fontSize: 14 }}>{error}</p>}

            <div className="card" style={{ textAlign: "center", padding: "32px 40px" }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Game PIN</p>
              <div style={{
                fontFamily: "var(--font-space, system-ui)", fontWeight: 800,
                fontSize: "clamp(52px, 12vw, 96px)", color: "var(--ink)", lineHeight: 1, letterSpacing: "0.06em",
              }}>
                {meta.pin}
              </div>
              <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 12 }}>
                Players go to <strong style={{ color: "var(--ink)" }}>considquiz.app/join</strong>
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <h2 style={{ fontFamily: "var(--font-space)", fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  Players
                </h2>
                <span style={{ fontFamily: "var(--font-space)", fontSize: 28, fontWeight: 700, color: "var(--consid-red)" }}>
                  {players.length}
                </span>
              </div>
              {players.length === 0 ? (
                <p style={{ color: "var(--ink-dim)", fontSize: 15 }}>No one has joined yet. Share the PIN!</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {players.map((p) => (
                    <span key={p.id} className="pill" style={{ background: "var(--surface-2)", fontSize: 15 }}>
                      {p.nickname}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── QUESTION ──
  if (snap.state === "question" && question) {
    const timerRatio = timeLeft / question.time_limit;
    return (
      <div className="app">
        <header className="topbar" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
              Q{question.position + 1}/{question.total}
            </span>
            {/* Timer */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: timerRatio > 0.5 ? "var(--consid-red)" : timerRatio > 0.25 ? "#d89e00" : "#e21b3c",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-space)", fontWeight: 800, fontSize: 22, color: "#fff",
            }}>
              {timeLeft}
            </div>
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>
            {answeredCount} / {players.length} answered
          </span>
          <button
            className="btn btn-primary"
            style={{ width: "auto", padding: "0 24px", minHeight: 40 }}
            onClick={handleAdvance}
            disabled={advancing}
          >
            {advancing ? "…" : "Reveal →"}
          </button>
        </header>

        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, gap: 24 }}>
          {/* Question text */}
          <div className="card" style={{ padding: "24px 32px", textAlign: "center" }}>
            <p style={{
              fontFamily: "var(--font-space)", fontWeight: 700,
              fontSize: "clamp(20px, 4vw, 32px)", color: "var(--ink)", margin: 0, lineHeight: 1.3,
            }}>
              {question.text}
            </p>
          </div>

          {/* Answer tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1 }}>
            {question.options.map((opt, i) => (
              <div key={i} style={{
                background: TILE_COLORS[i],
                borderRadius: "var(--radius)",
                padding: "20px 16px",
                display: "flex", alignItems: "center", gap: 12,
                color: "#fff",
                border: i === question.correct_index ? "3px solid #fff" : "3px solid transparent",
                boxShadow: i === question.correct_index ? "0 0 0 2px rgba(255,255,255,0.3)" : "none",
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{TILE_SHAPES[i]}</span>
                <span style={{ fontWeight: 600, fontSize: "clamp(14px, 2vw, 17px)" }}>{opt}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── REVEAL ──
  if (snap.state === "reveal" && question) {
    return (
      <div className="app">
        <header className="topbar" style={{ justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
            Q{question.position + 1}/{question.total} — Reveal
          </span>
          <button
            className="btn btn-primary"
            style={{ width: "auto", padding: "0 24px", minHeight: 40 }}
            onClick={handleAdvance}
            disabled={advancing}
          >
            {advancing ? "…" : "Leaderboard →"}
          </button>
        </header>

        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, gap: 24 }}>
          <div className="card" style={{ padding: "20px 32px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-space)", fontWeight: 700, fontSize: "clamp(18px, 3vw, 28px)", color: "var(--ink)", margin: 0 }}>
              {question.text}
            </p>
          </div>

          {/* Answer tiles + distribution bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {(() => {
              const totalAnswers = distribution.reduce((s, n) => s + n, 0);
              const maxCount = Math.max(...distribution, 1);
              return question.options.map((opt, i) => {
                const isCorrect = i === question.correct_index;
                const count = distribution[i] ?? 0;
                const barWidth = totalAnswers > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{
                      background: isCorrect ? TILE_COLORS[i] : "var(--surface)",
                      borderRadius: "var(--radius-sm)",
                      padding: "12px 16px",
                      display: "flex", alignItems: "center", gap: 12,
                      color: isCorrect ? "#fff" : "var(--ink-dim)",
                      opacity: isCorrect ? 1 : 0.5,
                      border: isCorrect ? "2px solid rgba(255,255,255,0.3)" : "1px solid var(--line-2)",
                    }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{TILE_SHAPES[i]}</span>
                      <span style={{ flex: 1, fontWeight: isCorrect ? 700 : 400 }}>{opt}</span>
                      <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, fontSize: 18 }}>
                        {count}
                      </span>
                      {isCorrect && <span style={{ fontSize: 18 }}>✓</span>}
                    </div>
                    {/* Distribution bar */}
                    <div style={{ height: 8, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${barWidth}%`,
                        background: TILE_COLORS[i],
                        opacity: isCorrect ? 1 : 0.4,
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <p style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
            {distribution.reduce((s, n) => s + n, 0)} / {players.length} answered
          </p>
        </main>
      </div>
    );
  }

  // ── LEADERBOARD ──
  if (snap.state === "leaderboard") {
    const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const isLastQuestion = question && question.position + 1 >= question.total;
    return (
      <div className="app">
        <header className="topbar" style={{ justifyContent: "space-between" }}>
          <h2 style={{ fontFamily: "var(--font-space)", fontWeight: 700, fontSize: 18, color: "var(--ink)", margin: 0 }}>
            Leaderboard
          </h2>
          <button
            className="btn btn-primary"
            style={{ width: "auto", padding: "0 24px", minHeight: 40 }}
            onClick={handleAdvance}
            disabled={advancing}
          >
            {advancing ? "…" : isLastQuestion ? "Final results →" : "Next question →"}
          </button>
        </header>

        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560, margin: "0 auto" }}>
            {sorted.slice(0, 10).map((p, i) => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "14px 20px", borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                border: "1px solid var(--line-2)",
              }}>
                <span style={{ fontSize: 22, width: 32 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 18, color: "var(--ink)" }}>{p.nickname}</span>
                <span style={{ fontFamily: "var(--font-space)", fontWeight: 800, fontSize: 20, color: "var(--consid-red)" }}>
                  {p.score ?? 0}
                </span>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── ENDED ──
  if (snap.state === "ended") {
    const sorted = [...players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return (
      <div className="app">
        <header className="topbar">
          <Wordmark />
          <button className="btn btn-ghost" style={{ width: "auto", padding: "0 20px", marginLeft: "auto" }}
            onClick={() => router.push("/")}>
            Done
          </button>
        </header>
        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ textAlign: "center" }}>
              <p className="eyebrow">Game over</p>
              <h1 style={{ fontFamily: "var(--font-space)", fontWeight: 800, fontSize: "clamp(36px, 8vw, 56px)", color: "var(--ink)", margin: 0 }}>
                Final results
              </h1>
            </div>

            {sorted.slice(0, 3).length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16 }}>
                {/* Silver */}
                {sorted[1] && (
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 40 }}>🥈</div>
                    <p style={{ fontWeight: 700, color: "var(--ink)", margin: "4px 0 2px" }}>{sorted[1].nickname}</p>
                    <p style={{ color: "var(--ink-dim)", fontSize: 14, margin: 0 }}>{sorted[1].score} pts</p>
                  </div>
                )}
                {/* Gold */}
                {sorted[0] && (
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 56 }}>🥇</div>
                    <p style={{ fontWeight: 800, fontSize: 18, color: "var(--ink)", margin: "4px 0 2px" }}>{sorted[0].nickname}</p>
                    <p style={{ color: "var(--consid-red)", fontWeight: 700, margin: 0 }}>{sorted[0].score} pts</p>
                  </div>
                )}
                {/* Bronze */}
                {sorted[2] && (
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 40 }}>🥉</div>
                    <p style={{ fontWeight: 700, color: "var(--ink)", margin: "4px 0 2px" }}>{sorted[2].nickname}</p>
                    <p style={{ color: "var(--ink-dim)", fontSize: 14, margin: 0 }}>{sorted[2].score} pts</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sorted.slice(3, 10).map((p, i) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "12px 16px", borderRadius: "var(--radius-sm)",
                  background: "var(--surface)", border: "1px solid var(--line-2)",
                }}>
                  <span style={{ color: "var(--ink-dim)", width: 24 }}>#{i + 4}</span>
                  <span style={{ flex: 1, fontWeight: 600, color: "var(--ink)" }}>{p.nickname}</span>
                  <span style={{ fontFamily: "var(--font-space)", fontWeight: 700, color: "var(--ink-mid)" }}>
                    {p.score ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="stage"><p style={{ color: "var(--ink-dim)" }}>Loading…</p></main>
    </div>
  );
}
