"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { usePlayers, useSessionState } from "@/lib/realtime";

type Step = "pin" | "nickname" | "lobby";

interface SessionInfo {
  session_id: string;
  quiz_title: string;
  state: string;
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState(searchParams.get("pin") ?? "");
  const [nickname, setNickname] = useState("");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const players = usePlayers(step === "lobby" ? session?.session_id ?? null : null);
  const sessionState = useSessionState(step === "lobby" ? session?.session_id ?? null : null);

  // Auto-advance to PIN step with pre-filled PIN from query param
  useEffect(() => {
    const queryPin = searchParams.get("pin");
    if (queryPin && queryPin.length === 6) {
      setPin(queryPin);
    }
  }, [searchParams]);

  // Navigate to play page when game starts
  useEffect(() => {
    if (sessionState && sessionState !== "lobby" && session && playerId) {
      router.push(`/play/${session.session_id}?player=${playerId}`);
    }
  }, [sessionState, session, playerId, router]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pin.trim().replace(/\D/g, "");
    if (trimmed.length !== 6) {
      setError("Enter the 6-digit game PIN");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/by-pin/${trimmed}`);
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 410 ? "This game has already ended" : "PIN not found — check with your host");
        return;
      }
      if (data.state !== "lobby") {
        setError("This game has already started");
        return;
      }
      setSession({ session_id: data.session_id, quiz_title: data.quiz_title, state: data.state });
      setStep("nickname");
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${session!.session_id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 409 ? "Game already started — too late to join" : data.error ?? "Failed to join");
        return;
      }
      setPlayerId(data.player_id);
      setStep("lobby");
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <Wordmark />
      </header>

      <main className="stage">
        {step === "pin" && (
          <form onSubmit={handlePinSubmit} className="col" style={{ maxWidth: 360, width: "100%", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <p className="eyebrow rise">Enter game code</p>
              <h1 className="rise-2" style={{
                fontFamily: "var(--font-space, system-ui)",
                fontWeight: 700,
                fontSize: "clamp(32px, 8vw, 52px)",
                color: "var(--ink)",
                margin: 0,
                lineHeight: 1.1,
              }}>
                Join a quiz
              </h1>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="6-digit PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                disabled={loading}
                autoFocus
                style={{ textAlign: "center", fontSize: 28, letterSpacing: "0.2em", fontFamily: "var(--font-space, monospace)" }}
              />
            </div>

            {error && (
              <p style={{ color: "var(--consid-red)", fontSize: 14, textAlign: "center", margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || pin.length !== 6}
            >
              {loading ? "Checking…" : "Continue →"}
            </button>
          </form>
        )}

        {step === "nickname" && (
          <form onSubmit={handleNicknameSubmit} className="col" style={{ maxWidth: 360, width: "100%", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <p className="eyebrow">{session?.quiz_title}</p>
              <h1 style={{
                fontFamily: "var(--font-space, system-ui)",
                fontWeight: 700,
                fontSize: "clamp(28px, 7vw, 44px)",
                color: "var(--ink)",
                margin: 0,
                lineHeight: 1.1,
              }}>
                What&apos;s your<br />
                <span style={{ color: "var(--consid-red)" }}>name?</span>
              </h1>
            </div>

            <input
              className="input"
              type="text"
              maxLength={24}
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setError(""); }}
              disabled={loading}
              autoFocus
              style={{ textAlign: "center", fontSize: 20 }}
            />

            {error && (
              <p style={{ color: "var(--consid-red)", fontSize: 14, textAlign: "center", margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !nickname.trim()}
            >
              {loading ? "Joining…" : "Join game →"}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setStep("pin"); setError(""); }}
              style={{ minHeight: 36 }}
            >
              ← Back
            </button>
          </form>
        )}

        {step === "lobby" && (
          <div className="col" style={{ maxWidth: 480, width: "100%", gap: 32, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <p className="eyebrow">{session?.quiz_title}</p>
              <h1 style={{
                fontFamily: "var(--font-space, system-ui)",
                fontWeight: 700,
                fontSize: "clamp(28px, 7vw, 44px)",
                color: "var(--ink)",
                margin: 0,
              }}>
                You&apos;re in!
              </h1>
              <p style={{ color: "var(--ink-dim)", fontSize: 15, marginTop: 8 }}>
                Waiting for the host to start…
              </p>
            </div>

            {/* Player avatar / name */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--consid-red)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--on-red)",
              fontFamily: "var(--font-space, system-ui)",
            }}>
              {nickname.charAt(0).toUpperCase()}
            </div>

            <p style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              {nickname}
            </p>

            {/* Live player count */}
            <div className="card" style={{ width: "100%", textAlign: "center", padding: "16px 24px" }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>Players joined</p>
              <p style={{
                fontFamily: "var(--font-space, system-ui)",
                fontSize: 48,
                fontWeight: 700,
                color: "var(--ink)",
                margin: 0,
                lineHeight: 1,
              }}>
                {players.length}
              </p>
            </div>

            {/* Scrollable player list */}
            {players.length > 0 && (
              <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {players.map((p) => (
                  <span
                    key={p.id}
                    className="pill"
                    style={{
                      background: p.id === playerId ? "var(--consid-red)" : "var(--surface-2)",
                      color: p.id === playerId ? "var(--on-red)" : "var(--ink-mid)",
                      fontWeight: p.id === playerId ? 700 : 500,
                    }}
                  >
                    {p.nickname}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
