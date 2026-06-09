"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { QuizBuilder } from "@/components/quiz-builder";
import type { QuizQuestion } from "@/lib/quiz-schemas";
import type { Question } from "@/lib/database.types";

interface QuizWithQuestions {
  quiz: { id: string; title: string; edit_code: string };
  questions: Question[];
}

function dbToFormQuestions(dbQs: Question[]): QuizQuestion[] {
  return dbQs.map((q) => {
    const answers: QuizQuestion["answers"] = [
      { text: q.options[0] ?? "", correct: q.correct_index === 0 },
      { text: q.options[1] ?? "", correct: q.correct_index === 1 },
      { text: q.options[2] ?? "", correct: q.correct_index === 2 },
      { text: q.options[3] ?? "", correct: q.correct_index === 3 },
    ];
    return { text: q.text, time: q.time_limit, answers };
  });
}

export default function EditQuizPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editCode = searchParams.get("code") ?? "";

  const [data, setData] = useState<QuizWithQuestions | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quizzes/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        if (d.quiz.edit_code !== editCode) {
          setError("Invalid edit code. Check your link.");
          return;
        }
        setData(d);
      })
      .catch(() => setError("Failed to load quiz"))
      .finally(() => setLoading(false));
  }, [params.id, editCode]);

  const handleSubmit = async (title: string, questions: QuizQuestion[]) => {
    const res = await fetch(`/api/quizzes/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, questions, edit_code: editCode }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "Failed to save");
    }
  };

  const [hosting, setHosting] = useState(false);
  const [hostError, setHostError] = useState("");

  const handleStartHosting = async () => {
    setHosting(true);
    setHostError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: params.id, edit_code: editCode }),
      });
      const d = await res.json();
      if (!res.ok) {
        setHostError(d.error ?? "Failed to create session");
        return;
      }
      router.push(`/host/${d.session_id}?token=${d.host_token}`);
    } catch {
      setHostError("Network error — try again");
    } finally {
      setHosting(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <header className="topbar"><Wordmark /></header>
        <main className="stage">
          <p className="lede" style={{ color: "var(--ink-dim)" }}>Loading quiz…</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="topbar"><Wordmark /></header>
        <main className="stage">
          <div className="col" style={{ textAlign: "center" }}>
            <p className="eyebrow muted">Error</p>
            <h1 className="title" style={{ fontSize: "clamp(28px,6vw,42px)" }}>
              Can&apos;t load quiz
            </h1>
            <p className="lede">{error}</p>
            <button className="btn btn-ghost" onClick={() => router.push("/")}>
              Go home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <Wordmark />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {hostError && (
            <span style={{ fontSize: 12, color: "var(--consid-red)" }}>{hostError}</span>
          )}
          <button className="btn btn-primary" style={{ width: "auto", padding: "0 22px", minHeight: 40 }}
            onClick={handleStartHosting} disabled={hosting}>
            {hosting ? "Creating…" : "Start hosting →"}
          </button>
        </div>
      </header>

      <main className="stage scroll">
        {data && (
          <QuizBuilder
            initialTitle={data.quiz.title}
            initialQuestions={dbToFormQuestions(data.questions)}
            submitLabel="Save changes"
            onSubmit={handleSubmit}
            onBack={() => router.push("/")}
          />
        )}
      </main>
    </div>
  );
}
