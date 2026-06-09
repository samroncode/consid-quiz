import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default function StartPage() {
  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <Wordmark />
        <Link href="/join" className="pill">
          Join a game
        </Link>
      </header>

      {/* Main stage */}
      <main className="stage">
        <div className="col" style={{ textAlign: "center" }}>
          <p className="eyebrow rise">Real-time multiplayer quiz</p>

          <h1
            className="rise-2"
            style={{
              fontFamily: "var(--font-space, system-ui)",
              fontWeight: 700,
              fontSize: "clamp(44px, 11vw, 72px)",
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              margin: "0 0 20px",
              textWrap: "balance",
            } as React.CSSProperties}
          >
            Think fast,
            <br />
            score big.
          </h1>

          <p
            className="rise-3"
            style={{
              fontSize: 17,
              lineHeight: 1.5,
              color: "var(--ink-mid)",
              margin: "0 auto 36px",
              maxWidth: 380,
            }}
          >
            Host live quiz sessions with AI-powered generation, speed-based
            scoring, and real-time leaderboards.
          </p>

          <div
            className="rise-3"
            style={{ display: "grid", gap: 12, maxWidth: 400, margin: "0 auto" }}
          >
            <Link href="/start" className="btn btn-primary">
              Start a quiz →
            </Link>
            <Link href="/create" className="btn btn-ghost">
              Create your own quiz
            </Link>
          </div>
        </div>
      </main>

      {/* Footer note */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "0 20px 28px",
        }}
      >
        <p className="helper" style={{ margin: 0 }}>
          Joining someone else&apos;s game?{" "}
          <Link
            href="/join"
            style={{
              color: "var(--consid-red)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Enter a PIN
          </Link>
        </p>
      </footer>
    </div>
  );
}
