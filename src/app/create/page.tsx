"use client";

import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { QuizBuilder } from "@/components/quiz-builder";
import type { QuizQuestion } from "@/lib/quiz-schemas";

export default function CreatePage() {
  const router = useRouter();

  const handleSubmit = async (title: string, questions: QuizQuestion[]) => {
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, questions }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to save quiz");
    }

    const { id, edit_code } = await res.json();
    router.push(`/quiz/${id}/edit?code=${edit_code}`);
  };

  return (
    <div className="app">
      <header className="topbar">
        <Wordmark />
      </header>

      <main className="stage scroll">
        <QuizBuilder
          submitLabel="Save quiz →"
          onSubmit={handleSubmit}
          onBack={() => router.push("/")}
        />
      </main>
    </div>
  );
}
