"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/wordmark";

type Difficulty = "easy" | "medium" | "hard";

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: "easy", label: "Easy", desc: "15 s / question" },
  { value: "medium", label: "Medium", desc: "20 s / question" },
  { value: "hard", label: "Hard", desc: "30 s / question" },
];

export default function StartPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), difficulty, numQuestions }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate quiz");
        return;
      }
      router.push(`/quiz/${data.quiz_id}/edit?code=${data.edit_code}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <Wordmark />
        <button className="btn btn-ghost" style={{ width: "auto", padding: "0 18px", minHeight: 36, fontSize: 14 }}
          onClick={() => router.push("/create")}>
          Build manually
        </button>
      </header>

      <main className="stage">
        <form
          onSubmit={handleGenerate}
          className="col"
          style={{ maxWidth: 480, width: "100%", gap: 24 }}
        >
          <div style={{ textAlign: "center" }}>
            <p className="eyebrow rise">AI-powered quiz generator</p>
            <h1
              className="rise-2"
              style={{
                fontFamily: "var(--font-space, system-ui)",
                fontWeight: 700,
                fontSize: "clamp(32px, 7vw, 52px)",
                lineHeight: 1.1,
                color: "var(--ink)",
                margin: 0,
              }}
            >
              Generate a quiz<br />
              <span style={{ color: "var(--consid-red)" }}>instantly</span>
            </h1>
          </div>

          {/* Topic input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="eyebrow" style={{ fontSize: 11 }}>
              Topic
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. World War II, JavaScript, The Solar System…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          {/* Difficulty */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="eyebrow" style={{ fontSize: 11 }}>
              Difficulty
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  disabled={loading}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: `2px solid ${difficulty === d.value ? "var(--consid-red)" : "var(--line-2)"}`,
                    background: difficulty === d.value ? "rgba(198,42,72,0.12)" : "var(--surface)",
                    color: difficulty === d.value ? "var(--consid-red)" : "var(--ink-mid)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.label}</div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Number of questions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="eyebrow" style={{ fontSize: 11 }}>
              Questions — {numQuestions}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>1</span>
              <input
                type="range"
                min={1}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                disabled={loading}
                style={{ flex: 1, accentColor: "var(--consid-red)" }}
              />
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>20</span>
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--consid-red)", fontSize: 14, textAlign: "center", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !topic.trim()}
            style={{ marginTop: 8 }}
          >
            {loading ? "Generating…" : "Generate quiz →"}
          </button>

          <p className="helper" style={{ textAlign: "center", marginTop: -8 }}>
            The AI will create {numQuestions} {difficulty} questions about your topic.
            You can edit them before hosting.
          </p>
        </form>
      </main>
    </div>
  );
}
