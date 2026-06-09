// screens-create.jsx — Quiz authoring (host/creator). Supports multiple-choice
// (up to 4 answers) and slider/numeric questions with min/max.
const { useState: useStateC } = React;

const TIME_OPTIONS = [10, 20, 30, 45, 60];

function blankMC() {
  return {
    type: "mc",
    text: "",
    time: 20,
    answers: [
      { text: "", correct: false },
      { text: "", correct: false },
      { text: "", correct: false },
      { text: "", correct: false },
    ],
  };
}
function blankSlider() {
  return { type: "slider", text: "", time: 25, min: 0, max: 100, answer: 50, unit: "" };
}

/* friendly starter questions so both types are visible immediately */
function starterQuestions() {
  return [
    {
      type: "mc", text: "What does “API” stand for?", time: 20,
      answers: [
        { text: "Application Programming Interface", correct: true },
        { text: "Automated Process Integration", correct: false },
        { text: "Applied Protocol Index", correct: false },
        { text: "", correct: false },
      ],
    },
    { type: "slider", text: "How much does an adult African elephant weigh?", time: 25, min: 0, max: 12000, answer: 6000, unit: "kg" },
  ];
}

/* validation — returns error string or "" */
function questionError(q) {
  if (!q.text.trim()) return "Add a question.";
  if (q.type === "slider") {
    if (!(q.max > q.min)) return "Max must be greater than min.";
    if (q.answer < q.min || q.answer > q.max) return "Correct value must be within min–max.";
    return "";
  }
  const filled = q.answers.filter((a) => a.text.trim());
  if (filled.length < 2) return "Add at least two answers.";
  if (!filled.some((a) => a.correct)) return "Mark at least one answer correct.";
  return "";
}

function CreateScreen({ onLaunch, onBack }) {
  const [title, setTitle] = useStateC("My quiz");
  const [questions, setQuestions] = useStateC(starterQuestions);
  const [showErrors, setShowErrors] = useStateC(false);

  const update = (i, patch) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const updateAnswer = (qi, ai, patch) =>
    setQuestions((qs) => qs.map((q, j) => (j === qi
      ? { ...q, answers: q.answers.map((a, k) => (k === ai ? { ...a, ...patch } : a)) }
      : q)));
  const setType = (i, type) =>
    setQuestions((qs) => qs.map((q, j) => {
      if (j !== i) return q;
      if (type === q.type) return q;
      return type === "slider"
        ? { ...blankSlider(), text: q.text, time: q.time }
        : { ...blankMC(), text: q.text, time: q.time };
    }));
  const addQuestion = (type) => setQuestions((qs) => [...qs, type === "slider" ? blankSlider() : blankMC()]);
  const removeQuestion = (i) => setQuestions((qs) => qs.filter((_, j) => j !== i));

  const errors = questions.map(questionError);
  const canLaunch = title.trim() && questions.length > 0 && errors.every((e) => !e);

  const launch = () => {
    if (!canLaunch) { setShowErrors(true); return; }
    const built = {
      title: title.trim(),
      questions: questions.map((q) => q.type === "slider"
        ? { type: "slider", text: q.text.trim(), category: "Guess the number", time: q.time, weight: 1, media: null,
            min: Number(q.min), max: Number(q.max), answer: Number(q.answer),
            step: Math.max(1, Math.round((q.max - q.min) / 100)), unit: q.unit.trim() }
        : { type: "mc", text: q.text.trim(), category: "Multiple choice", time: q.time, weight: 1, media: null,
            answers: q.answers.filter((a) => a.text.trim()).map((a) => ({ text: a.text.trim(), correct: a.correct })) }),
    };
    onLaunch(built);
  };

  return (
    <div className="col create" style={{ maxWidth: 640, width: "100%" }}>
      <div className="rise" style={{ marginBottom: 22 }}>
        <p className="eyebrow">Quiz builder</p>
        <input className="input title-input" value={title} maxLength={60}
          placeholder="Quiz title" aria-label="Quiz title"
          onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {questions.map((q, i) => (
          <QuestionEditor key={i} q={q} index={i} error={showErrors ? errors[i] : ""}
            onType={(t) => setType(i, t)} onUpdate={(p) => update(i, p)}
            onAnswer={(ai, p) => updateAnswer(i, ai, p)} onRemove={() => removeQuestion(i)}
            canRemove={questions.length > 1} />
        ))}
      </div>

      {/* add buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" style={{ flex: 1, minWidth: 180 }} onClick={() => addQuestion("mc")}>+ Multiple choice</button>
        <button className="btn btn-ghost" style={{ flex: 1, minWidth: 180 }} onClick={() => addQuestion("slider")}>+ Slider question</button>
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
        <button className="btn btn-ghost" style={{ width: "auto", padding: "0 20px" }} onClick={onBack}>Back</button>
        <div style={{ flex: 1 }}></div>
        {showErrors && !canLaunch && <span className="helper error" style={{ margin: 0 }}>Fix the highlighted fields.</span>}
        <button className="btn btn-primary" style={{ width: "auto", padding: "0 26px" }}
          disabled={false} onClick={launch}>Launch game →</button>
      </div>
      <p className="helper" style={{ textAlign: "center", marginTop: 14 }}>
        {questions.length} question{questions.length === 1 ? "" : "s"} · launching generates a game PIN
      </p>
    </div>
  );
}

/* ------------------------------------------------------- question card */
function QuestionEditor({ q, index, error, onType, onUpdate, onAnswer, onRemove, canRemove }) {
  return (
    <div className="card rise-2" style={{ padding: "18px 18px 20px", borderColor: error ? "var(--consid-red)" : "var(--line)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span className="field-label" style={{ margin: 0 }}>Question {index + 1}</span>
        <div style={{ flex: 1 }}></div>
        <div className="seg">
          <button className={"seg-btn" + (q.type === "mc" ? " on" : "")} onClick={() => onType("mc")}>Multiple choice</button>
          <button className={"seg-btn" + (q.type === "slider" ? " on" : "")} onClick={() => onType("slider")}>Slider</button>
        </div>
        {canRemove && <button className="icon-btn" title="Delete question" aria-label="Delete question" onClick={onRemove}>✕</button>}
      </div>

      {/* question text */}
      <input className="input" style={{ fontSize: 17, marginBottom: 14 }} value={q.text} maxLength={140}
        placeholder="Type your question…" aria-label="Question text"
        onChange={(e) => onUpdate({ text: e.target.value })} />

      {q.type === "mc" ? (
        <div style={{ display: "grid", gap: 9 }}>
          {q.answers.map((a, ai) => (
            <div key={ai} className="ans-row">
              <span style={{ color: a.correct ? "var(--ok-soft)" : "var(--ink-dim)", display: "inline-flex" }}>
                <Shape kind={SHAPE_ORDER[ai]} size={20} />
              </span>
              <input className="input ans-input" value={a.text} maxLength={80}
                placeholder={`Answer ${LETTERS[ai]}${ai > 1 ? " (optional)" : ""}`}
                aria-label={`Answer ${LETTERS[ai]}`}
                onChange={(e) => onAnswer(ai, { text: e.target.value })} />
              <button className={"correct-toggle" + (a.correct ? " on" : "")} title="Mark correct"
                aria-pressed={a.correct} aria-label="Mark correct"
                onClick={() => onAnswer(ai, { correct: !a.correct })}>✓</button>
            </div>
          ))}
          <p className="helper" style={{ margin: "4px 0 0" }}>Tap ✓ to mark the correct answer(s).</p>
        </div>
      ) : (
        <div>
          <div className="slider-fields">
            <label>Min<input className="input num" type="number" value={q.min}
              onChange={(e) => onUpdate({ min: Number(e.target.value) })} /></label>
            <label>Max<input className="input num" type="number" value={q.max}
              onChange={(e) => onUpdate({ max: Number(e.target.value) })} /></label>
            <label>Correct<input className="input num" type="number" value={q.answer}
              onChange={(e) => onUpdate({ answer: Number(e.target.value) })} /></label>
            <label>Unit<input className="input num" value={q.unit} maxLength={8} placeholder="kg"
              onChange={(e) => onUpdate({ unit: e.target.value })} /></label>
          </div>
          {/* preview */}
          <div style={{ marginTop: 14 }}>
            <span className="field-label" style={{ margin: "0 0 8px" }}>Player preview</span>
            <input type="range" className="slider-input" disabled
              min={q.min} max={q.max > q.min ? q.max : q.min + 1}
              value={Math.min(Math.max(q.answer, q.min), q.max)} readOnly />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span className="helper" style={{ margin: 0 }}>{Number(q.min).toLocaleString()} {q.unit}</span>
              <span className="helper" style={{ margin: 0, color: "var(--ok-soft)" }}>correct: {Number(q.answer).toLocaleString()} {q.unit}</span>
              <span className="helper" style={{ margin: 0 }}>{Number(q.max).toLocaleString()} {q.unit}</span>
            </div>
          </div>
        </div>
      )}

      {/* time + error */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <span className="field-label" style={{ margin: 0 }}>Timer</span>
        <select className="time-select" value={q.time} onChange={(e) => onUpdate({ time: Number(e.target.value) })} aria-label="Time limit">
          {TIME_OPTIONS.map((s) => <option key={s} value={s}>{s}s</option>)}
        </select>
        <div style={{ flex: 1 }}></div>
        {error && <span className="helper error" style={{ margin: 0 }}>{error}</span>}
      </div>
    </div>
  );
}

Object.assign(window, { CreateScreen });
