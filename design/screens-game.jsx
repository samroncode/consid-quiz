// screens-game.jsx — Question, Reveal, Leaderboard, Podium.
const { useState: useStateG, useEffect: useEffectG, useRef: useRefG } = React;

/* ------------------------------------------------------------ QUESTION */
function QuestionScreen({ q, index, total, onAnswer }) {
  const isSlider = q.type === "slider";
  const [remaining, setRemaining] = useStateG(q.time);
  const [picked, setPicked] = useStateG(null);
  const [slider, setSlider] = useStateG(Math.round((q.min + q.max) / 2));
  const startRef = useRefG(performance.now());
  const answeredRef = useRefG(false);
  const sliderRef = useRefG(Math.round((q.min + q.max) / 2));

  // server-style countdown
  useEffectG(() => {
    const id = setInterval(() => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const left = Math.max(0, q.time - elapsed);
      setRemaining(left);
      if (left <= 0 && !answeredRef.current) {
        answeredRef.current = true;
        clearInterval(id);
        if (isSlider) onAnswer({ value: sliderRef.current, timeLeft: 0, total: q.time });
        else onAnswer({ choice: null, timeLeft: 0, total: q.time });
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const choose = (i) => {
    if (answeredRef.current) return;           // reject duplicate / late
    answeredRef.current = true;
    setPicked(i);
    const timeLeft = Math.max(0, q.time - (performance.now() - startRef.current) / 1000);
    setTimeout(() => onAnswer({ choice: i, timeLeft, total: q.time }), 650);
  };

  const lockSlider = () => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const timeLeft = Math.max(0, q.time - (performance.now() - startRef.current) / 1000);
    onAnswer({ value: sliderRef.current, timeLeft, total: q.time });
  };

  const isTwoCol = !isSlider && q.answers.length <= 2;

  return (
    <div className="col" style={{ maxWidth: 720 }}>
      {/* meta header */}
      <div className="rise" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="field-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Question {index + 1} / {total}</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill">{q.category}</span>
            {q.weight > 1 && <span className="pill" style={{ color: "var(--consid-red)", borderColor: "var(--consid-red)" }}>{q.weight}× points</span>}
          </div>
        </div>
        <TimerRing remaining={remaining} total={q.time} />
      </div>

      {/* question text */}
      <h1 className="title rise-2" style={{ fontSize: "clamp(26px,5.5vw,40px)", marginBottom: 22 }}>
        {q.text}
      </h1>

      {/* media placeholder (only if defined) */}
      {q.media && (
        <div className="rise-2" style={{
          height: 150, borderRadius: "var(--radius)", marginBottom: 20,
          border: "1px dashed var(--line-2)",
          background: "repeating-linear-gradient(45deg, var(--surface), var(--surface) 12px, var(--surface-2) 12px, var(--surface-2) 24px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--ink-dim)",
        }}>question media</div>
      )}

      {isSlider ? (
        /* ---- slider answer ---- */
        <div className="rise-3">
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(44px,12vw,72px)", letterSpacing: "-0.03em", color: "var(--consid-red)" }}>
              {slider.toLocaleString()}
            </span>
            {q.unit && <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, color: "var(--ink-mid)", marginLeft: 8 }}>{q.unit}</span>}
          </div>
          <input
            type="range"
            className="slider-input"
            min={q.min} max={q.max} step={q.step || Math.max(1, Math.round((q.max - q.min) / 100))}
            value={slider}
            disabled={answeredRef.current}
            aria-label="Your guess"
            onChange={(e) => { const v = Number(e.target.value); sliderRef.current = v; setSlider(v); }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span className="helper" style={{ margin: 0 }}>{q.min.toLocaleString()}{q.unit ? " " + q.unit : ""}</span>
            <span className="helper" style={{ margin: 0 }}>{q.max.toLocaleString()}{q.unit ? " " + q.unit : ""}</span>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 22 }} disabled={answeredRef.current} onClick={lockSlider}>
            Lock in my guess
          </button>
          <p className="helper" style={{ textAlign: "center", marginTop: 14 }}>Closest guess earns the most points.</p>
        </div>
      ) : (
        /* ---- multiple choice ---- */
        <React.Fragment>
          <div className="rise-3" style={{
            display: "grid",
            gridTemplateColumns: isTwoCol ? "1fr" : "1fr 1fr",
            gap: 12,
          }}>
            {q.answers.map((a, i) => {
              const dim = picked !== null && picked !== i;
              const sel = picked === i;
              return (
                <button key={i} className="answer-tile"
                  onClick={() => choose(i)}
                  disabled={picked !== null}
                  style={{
                    opacity: dim ? 0.4 : 1,
                    borderColor: sel ? "var(--consid-red)" : "var(--line-2)",
                    background: sel ? "color-mix(in srgb, var(--consid-red) 16%, var(--surface))" : "var(--surface)",
                  }}>
                  <span className="answer-shape" style={{ color: sel ? "var(--consid-red)" : "var(--ink-mid)" }}>
                    <Shape kind={SHAPE_ORDER[i]} size={26} />
                  </span>
                  <span className="answer-text">{a.text}</span>
                  <span className="answer-letter">{LETTERS[i]}</span>
                </button>
              );
            })}
          </div>
          <p className="helper" style={{ textAlign: "center", marginTop: 18 }}>
            {picked === null ? "Tap an answer — faster answers score more." : "Answer locked in ✓"}
          </p>
        </React.Fragment>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- REVEAL */
function RevealScreen({ q, result, rank, totalPlayers, gained, streak, onNext }) {
  const isSlider = q.type === "slider";
  const prox = isSlider ? sliderProximity(result.value, q) : 0;
  const correct = isSlider ? prox >= 0.85 : (result.choice !== null && q.answers[result.choice].correct);
  const timedOut = !isSlider && result.choice === null;
  const diff = isSlider ? Math.abs(result.value - q.answer) : 0;
  useEffectG(() => { const id = setTimeout(onNext, 4200); return () => clearTimeout(id); }, []);

  const heading = isSlider
    ? (prox >= 0.97 ? "Bullseye!" : prox >= 0.85 ? "So close!" : prox >= 0.6 ? "Not bad!" : "Way off!")
    : (correct ? "Nice one!" : timedOut ? "Time’s up" : "Not quite");

  return (
    <div className="col" style={{ maxWidth: 620, textAlign: "center" }}>
      <div className="rise" style={{
        width: 84, height: 84, borderRadius: "50%", margin: "0 auto 18px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: correct ? "color-mix(in srgb, var(--ok) 18%, transparent)" : "color-mix(in srgb, var(--consid-red) 16%, transparent)",
        color: correct ? "var(--ok-soft)" : "var(--consid-red-soft)",
        fontSize: 44, fontWeight: 700, fontFamily: "var(--font-display)",
      }}>{correct ? "✓" : "✕"}</div>

      <h1 className="title rise-2" style={{ fontSize: "clamp(30px,7vw,46px)", marginBottom: 8 }}>
        {heading}
      </h1>

      {(correct || isSlider) ? (
        <p className="lede rise-2" style={{ marginBottom: 22 }}>
          <strong style={{ color: gained > 0 ? "var(--ok-soft)" : "var(--ink-mid)", fontFamily: "var(--font-display)", fontSize: 24 }}>
            +<CountUp value={gained} />
          </strong> points
          {streak > 1 && <span style={{ marginLeft: 10, color: "var(--consid-red)" }}>🔥 {streak} in a row</span>}
        </p>
      ) : (
        <p className="lede rise-2" style={{ marginBottom: 22 }}>
          The right answer was highlighted below.
        </p>
      )}

      {isSlider ? (
        /* ---- slider reveal: number line ---- */
        <div className="rise-3" style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 18, flexWrap: "wrap" }}>
            <div>
              <div className="field-label" style={{ margin: "0 0 4px" }}>Correct</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, color: "var(--ok-soft)" }}>{q.answer.toLocaleString()}<span style={{ fontSize: 15, color: "var(--ink-dim)", marginLeft: 4 }}>{q.unit}</span></div>
            </div>
            <div>
              <div className="field-label" style={{ margin: "0 0 4px" }}>Your guess</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30 }}>{result.value.toLocaleString()}<span style={{ fontSize: 15, color: "var(--ink-dim)", marginLeft: 4 }}>{q.unit}</span></div>
            </div>
          </div>
          {/* number line */}
          <div style={{ position: "relative", height: 8, borderRadius: 999, background: "var(--surface-hi)", margin: "30px 4px 6px" }}>
            <span style={{ position: "absolute", top: -5, width: 18, height: 18, marginLeft: -9, borderRadius: "50%", background: "var(--ok)", border: "3px solid var(--bg)",
              left: `${((q.answer - q.min) / ((q.max - q.min) || 1)) * 100}%` }}></span>
            <span style={{ position: "absolute", top: -4, width: 16, height: 16, marginLeft: -8, borderRadius: "50%", background: "var(--consid-red)", border: "3px solid var(--bg)",
              left: `${((result.value - q.min) / ((q.max - q.min) || 1)) * 100}%` }}></span>
          </div>
          <p className="helper" style={{ marginTop: 12 }}>You were <strong style={{ color: "var(--ink-mid)" }}>{diff.toLocaleString()} {q.unit}</strong> away.</p>
        </div>
      ) : (
        /* ---- multiple-choice reveal ---- */
        <div className="rise-3" style={{ display: "grid", gap: 10, marginBottom: 22, textAlign: "left" }}>
          {q.answers.map((a, i) => {
            const isCorrect = a.correct;
            const isMine = result.choice === i;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 15px", borderRadius: "var(--radius-sm)",
                border: "1.5px solid " + (isCorrect ? "var(--ok)" : isMine ? "var(--consid-red)" : "var(--line)"),
                background: isCorrect ? "color-mix(in srgb, var(--ok) 14%, var(--surface))"
                          : isMine ? "color-mix(in srgb, var(--consid-red) 12%, var(--surface))" : "var(--surface)",
                opacity: isCorrect || isMine ? 1 : 0.5,
              }}>
                <span style={{ color: isCorrect ? "var(--ok-soft)" : isMine ? "var(--consid-red)" : "var(--ink-mid)" }}>
                  <Shape kind={SHAPE_ORDER[i]} size={22} />
                </span>
                <span style={{ flex: 1, fontWeight: 600 }}>{a.text}</span>
                {isCorrect && <span style={{ color: "var(--ok-soft)", fontWeight: 700 }}>✓</span>}
                {isMine && !isCorrect && <span style={{ color: "var(--consid-red-soft)", fontWeight: 700, fontSize: 13 }}>you</span>}
              </div>
            );
          })}
        </div>
      )}

      {q.explanation && (
        <p className="helper rise-3" style={{ marginBottom: 22, fontSize: 14.5, lineHeight: 1.5 }}>{q.explanation}</p>
      )}

      <div className="card rise-3" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "var(--ink-mid)", fontWeight: 600 }}>Your position</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22 }}>
          {ordinal(rank)} <span style={{ color: "var(--ink-dim)", fontSize: 15, fontWeight: 500 }}>of {totalPlayers}</span>
        </span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- LEADERBOARD */
function LeaderboardScreen({ board, me, final, onNext }) {
  const top = board.slice(0, 5);
  const meInTop = top.some((p) => p.name === me.name);
  const meRow = board.find((p) => p.name === me.name);
  const meRank = board.findIndex((p) => p.name === me.name) + 1;
  const max = board[0]?.score || 1;
  useEffectG(() => { if (final) return; const id = setTimeout(onNext, 4500); return () => clearTimeout(id); }, []);

  return (
    <div className="col" style={{ maxWidth: 600 }}>
      <div className="rise" style={{ textAlign: "center", marginBottom: 22 }}>
        <p className="eyebrow">Scoreboard</p>
        <h1 className="title" style={{ fontSize: "clamp(30px,7vw,46px)" }}>Standings</h1>
      </div>

      <div style={{ display: "grid", gap: 9 }}>
        {top.map((p, i) => {
          const mine = p.name === me.name;
          return (
            <div key={p.name} className={`rise-${Math.min(i + 1, 3)}`} style={{
              position: "relative", overflow: "hidden",
              display: "flex", alignItems: "center", gap: 12,
              padding: "13px 16px", borderRadius: "var(--radius-sm)",
              background: mine ? "color-mix(in srgb, var(--consid-red) 14%, var(--surface))" : "var(--surface)",
              border: "1px solid " + (mine ? "var(--consid-red)" : "var(--line)"),
            }}>
              <div style={{ position: "absolute", inset: 0, width: `${(p.score / max) * 100}%`,
                background: mine ? "color-mix(in srgb, var(--consid-red) 12%, transparent)" : "color-mix(in srgb, var(--ink) 5%, transparent)" }}></div>
              <span style={{ position: "relative", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, width: 24, color: i === 0 ? "var(--consid-red)" : "var(--ink-dim)" }}>{i + 1}</span>
              <span style={{ position: "relative" }}><Avatar name={p.name} color={p.color} size={34} /></span>
              <span style={{ position: "relative", flex: 1, fontWeight: 700, fontFamily: "var(--font-display)" }}>{p.name}{mine && <span style={{ color: "var(--consid-red)", marginLeft: 6, fontSize: 13 }}>you</span>}</span>
              <span style={{ position: "relative", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}><CountUp value={p.score} /></span>
            </div>
          );
        })}
      </div>

      {!meInTop && meRow && (
        <div className="rise-3" style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 12,
          padding: "13px 16px", borderRadius: "var(--radius-sm)",
          background: "color-mix(in srgb, var(--consid-red) 14%, var(--surface))", border: "1px solid var(--consid-red)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, width: 24, color: "var(--consid-red)" }}>{meRank}</span>
          <Avatar name={meRow.name} color={meRow.color} size={34} />
          <span style={{ flex: 1, fontWeight: 700, fontFamily: "var(--font-display)" }}>{meRow.name}<span style={{ color: "var(--consid-red)", marginLeft: 6, fontSize: 13 }}>you</span></span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{meRow.score.toLocaleString()}</span>
        </div>
      )}

      {final && (
        <button className="btn btn-primary rise-3" style={{ marginTop: 22 }} onClick={onNext}>See the podium</button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- PODIUM */
function PodiumScreen({ board, me, quizTitle, onReplay }) {
  const [first, second, third] = board;
  const meRank = board.findIndex((p) => p.name === me.name) + 1;
  const meRow = board[meRank - 1];
  const won = meRank === 1;
  const order = [second, first, third]; // visual L-C-R
  const heights = [120, 168, 92];
  const ranks = [2, 1, 3];

  return (
    <div className="col" style={{ maxWidth: 640, textAlign: "center" }}>
      <p className="eyebrow rise">Final results</p>
      <h1 className="title rise-2" style={{ fontSize: "clamp(32px,8vw,54px)", marginBottom: 6 }}>
        {won ? "You won! 🏆" : "Good game!"}
      </h1>
      <p className="lede rise-2">{quizTitle}</p>

      <div className="rise-3" style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, margin: "26px 0 24px" }}>
        {order.map((p, idx) => p && (
          <div key={p.name} style={{ flex: 1, maxWidth: 150, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar name={p.name} color={p.color} size={ranks[idx] === 1 ? 64 : 48} ring={p.name === me.name} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, margin: "10px 0 2px", fontSize: ranks[idx] === 1 ? 17 : 15 }}>{p.name}</span>
            <span style={{ color: "var(--ink-dim)", fontSize: 13, marginBottom: 8 }}>{p.score.toLocaleString()}</span>
            <div style={{
              width: "100%", height: heights[idx],
              borderRadius: "12px 12px 0 0",
              background: ranks[idx] === 1 ? "var(--consid-red)" : "var(--surface-hi)",
              border: "1px solid " + (ranks[idx] === 1 ? "var(--consid-red)" : "var(--line-2)"),
              borderBottom: "none",
              display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 14,
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30,
              color: ranks[idx] === 1 ? "#fff" : "var(--ink-dim)",
              animation: `grow 0.7s ${idx * 0.12}s cubic-bezier(.2,.8,.2,1) both`, transformOrigin: "bottom",
            }}>{ranks[idx]}</div>
          </div>
        ))}
      </div>

      {meRow && (
        <div className="card rise-3" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--consid-red)" }}>{ordinal(meRank)}</span>
          <Avatar name={meRow.name} color={meRow.color} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>{meRow.name}</div>
            <div style={{ color: "var(--ink-dim)", fontSize: 13 }}>Your final score</div>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24 }}>{meRow.score.toLocaleString()}</span>
        </div>
      )}

      <button className="btn btn-primary rise-3" style={{ marginTop: 20 }} onClick={onReplay}>Play again</button>
    </div>
  );
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

Object.assign(window, { QuestionScreen, RevealScreen, LeaderboardScreen, PodiumScreen, ordinal });
