"use client";

import { useState } from "react";
import { Shape, SHAPE_ORDER, LETTERS } from "@/components/shape";
import type { QuizQuestion, QuizAnswer } from "@/lib/quiz-schemas";

const TIME_OPTIONS = [10, 20, 30, 45, 60];

function blankAnswer(): QuizAnswer {
  return { text: "", correct: false };
}

function blankQuestion(): QuizQuestion {
  return {
    text: "",
    time: 20,
    answers: [blankAnswer(), blankAnswer(), blankAnswer(), blankAnswer()],
  };
}

function validateQuestion(q: QuizQuestion): string {
  if (!q.text.trim()) return "Add a question.";
  const filled = q.answers.filter((a) => a.text.trim());
  if (filled.length < 2) return "Add at least two answers.";
  if (!filled.some((a) => a.correct)) return "Mark one answer correct.";
  return "";
}

interface QuizBuilderProps {
  initialTitle?: string;
  initialQuestions?: QuizQuestion[];
  submitLabel?: string;
  onSubmit: (title: string, questions: QuizQuestion[]) => Promise<void>;
  onBack?: () => void;
}

export function QuizBuilder({
  initialTitle = "My quiz",
  initialQuestions,
  submitLabel = "Save quiz",
  onSubmit,
  onBack,
}: QuizBuilderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuestions ?? [blankQuestion()]
  );
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const update = (i: number, patch: Partial<QuizQuestion>) =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const updateAnswer = (qi: number, ai: number, patch: Partial<QuizAnswer>) =>
    setQuestions((qs) =>
      qs.map((q, j) =>
        j === qi
          ? {
              ...q,
              answers: q.answers.map((a, k) =>
                k === ai ? { ...a, ...patch } : a
              ) as QuizQuestion["answers"],
            }
          : q
      )
    );

  const addQuestion = () =>
    setQuestions((qs) => [...qs, blankQuestion()]);

  const removeQuestion = (i: number) =>
    setQuestions((qs) => qs.filter((_, j) => j !== i));

  const errors = questions.map(validateQuestion);
  const canSubmit =
    title.trim() &&
    questions.length > 0 &&
    errors.every((e) => !e);

  const handleSubmit = async () => {
    if (!canSubmit) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await onSubmit(title.trim(), questions);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="col create"
      style={{ maxWidth: 640, width: "100%", paddingBottom: 40 }}
    >
      {/* Title */}
      <div className="rise" style={{ marginBottom: 22 }}>
        <p className="eyebrow">Quiz builder</p>
        <input
          className="input title-input"
          value={title}
          maxLength={60}
          placeholder="Quiz title"
          aria-label="Quiz title"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Question editors */}
      <div style={{ display: "grid", gap: 16 }}>
        {questions.map((q, i) => (
          <QuestionEditor
            key={i}
            q={q}
            index={i}
            error={showErrors ? errors[i] : ""}
            onUpdate={(p) => update(i, p)}
            onAnswer={(ai, p) => updateAnswer(i, ai, p)}
            onRemove={() => removeQuestion(i)}
            canRemove={questions.length > 1}
          />
        ))}
      </div>

      {/* Add button */}
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={addQuestion}>
          + Add question
        </button>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid var(--line)",
        }}
      >
        {onBack && (
          <button
            className="btn btn-ghost"
            style={{ width: "auto", padding: "0 20px" }}
            onClick={onBack}
            disabled={saving}
          >
            Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        {saveError && (
          <span className="helper error" style={{ margin: 0 }}>
            {saveError}
          </span>
        )}
        {showErrors && !canSubmit && !saveError && (
          <span className="helper error" style={{ margin: 0 }}>
            Fix the highlighted fields.
          </span>
        )}
        <button
          className="btn btn-primary"
          style={{ width: "auto", padding: "0 26px" }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
      <p className="helper" style={{ textAlign: "center", marginTop: 14 }}>
        {questions.length} question{questions.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function QuestionEditor({
  q,
  index,
  error,
  onUpdate,
  onAnswer,
  onRemove,
  canRemove,
}: {
  q: QuizQuestion;
  index: number;
  error: string;
  onUpdate: (p: Partial<QuizQuestion>) => void;
  onAnswer: (ai: number, p: Partial<QuizAnswer>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div
      className="card rise-2"
      style={{
        padding: "18px 18px 20px",
        borderColor: error ? "var(--consid-red)" : "var(--line)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <span className="field-label" style={{ margin: 0 }}>
          Question {index + 1}
        </span>
        <div style={{ flex: 1 }} />
        {canRemove && (
          <button
            className="icon-btn"
            title="Delete question"
            aria-label="Delete question"
            onClick={onRemove}
          >
            ✕
          </button>
        )}
      </div>

      {/* Question text */}
      <input
        className="input"
        style={{ fontSize: 17, marginBottom: 14 }}
        value={q.text}
        maxLength={140}
        placeholder="Type your question…"
        aria-label="Question text"
        onChange={(e) => onUpdate({ text: e.target.value })}
      />

      {/* Answers */}
      <div style={{ display: "grid", gap: 9 }}>
        {q.answers.map((a, ai) => (
          <div key={ai} className="ans-row">
            <span
              style={{
                color: a.correct ? "var(--ok-soft)" : "var(--ink-dim)",
                display: "inline-flex",
              }}
            >
              <Shape kind={SHAPE_ORDER[ai]} size={20} />
            </span>
            <input
              className="input ans-input"
              value={a.text}
              maxLength={80}
              placeholder={`Answer ${LETTERS[ai]}${ai > 1 ? " (optional)" : ""}`}
              aria-label={`Answer ${LETTERS[ai]}`}
              onChange={(e) => onAnswer(ai, { text: e.target.value })}
            />
            <button
              className={"correct-toggle" + (a.correct ? " on" : "")}
              title="Mark correct"
              aria-pressed={a.correct}
              aria-label="Mark correct"
              onClick={() =>
                onAnswer(ai, { correct: !a.correct })
              }
            >
              ✓
            </button>
          </div>
        ))}
        <p className="helper" style={{ margin: "4px 0 0" }}>
          Tap ✓ to mark the correct answer.
        </p>
      </div>

      {/* Timer + error */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}
      >
        <span className="field-label" style={{ margin: 0 }}>
          Timer
        </span>
        <select
          className="time-select"
          value={q.time}
          onChange={(e) => onUpdate({ time: Number(e.target.value) })}
          aria-label="Time limit"
        >
          {TIME_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}s
            </option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        {error && (
          <span className="helper error" style={{ margin: 0 }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
