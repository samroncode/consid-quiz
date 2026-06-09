// app.jsx — Consid Quiz flow controller: state machine, scoring, simulated players.
const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "#c62a48",
  "corners": "soft"
}/*EDITMODE-END*/;

const CORNER_MAP = {
  sharp:  { lg: "6px",  md: "6px",  sm: "4px" },
  soft:   { lg: "22px", md: "16px", sm: "10px" },
  round:  { lg: "30px", md: "24px", sm: "16px" },
};

/* ----- scoring -------------------------------------------------------- */
const streakBonus = (streak) => (streak >= 2 ? Math.min(500, (streak - 1) * 100) : 0);

/* multiple-choice points: speed-scaled + streak */
function scoreFor(correct, timeLeft, total, weight, streak) {
  if (!correct) return 0;
  const speed = Math.max(0, Math.min(1, timeLeft / total));
  return Math.round((500 + 500 * speed) * weight) + streakBonus(streak);
}

/* slider points: driven by closeness (proximity^1.4), small speed bonus */
function scoreSlider(prox, timeLeft, total, weight, streak) {
  const speed = Math.max(0, Math.min(1, timeLeft / total));
  const base = Math.round((900 * Math.pow(prox, 1.4) + 100 * prox * speed) * weight);
  const isClose = prox >= 0.85;
  return base + (isClose ? streakBonus(streak) : 0);
}

/* simulate one bot answering a question of either type */
function simulateBot(bot, q, streak) {
  if (q.type === "slider") {
    const span = (q.max - q.min) || 1;
    const err = (1 - bot.skill) * span * 0.5 * (Math.random() - 0.5) * 2;
    const guess = Math.max(q.min, Math.min(q.max, q.answer + err));
    const prox = Math.max(0, 1 - Math.abs(guess - q.answer) / span);
    const timeLeft = q.time * (0.3 + Math.random() * 0.5);
    const gained = scoreSlider(prox, timeLeft, q.time, q.weight, streak + 1);
    return { gained, correct: prox >= 0.85 };
  }
  const correct = Math.random() < bot.skill;
  const timeLeft = correct ? q.time * (0.4 + Math.random() * 0.55) * (0.6 + bot.skill * 0.4) : 0;
  return { gained: scoreFor(correct, Math.min(timeLeft, q.time), q.time, q.weight, streak + 1), correct };
}

/* short, human-friendly game PIN */
function makePin() {
  const n = Math.floor(100000 + Math.random() * 900000).toString();
  return n.slice(0, 3) + " " + n.slice(3);
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [phase, setPhase] = useState("join");        // join|nickname|lobby|getready|question|reveal|leaderboard|podium
  const [me, setMe] = useState(null);
  const [players, setPlayers] = useState([]);         // lobby roster (streams in)
  const [board, setBoard] = useState([]);             // [{name,color,score,streak}]
  const [qIndex, setQIndex] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [lastGained, setLastGained] = useState(0);
  const [quiz, setQuiz] = useState(QUIZ);            // active quiz (default demo, or a created one)

  const questions = quiz.questions;
  const roster = useMemo(() => BOTS.slice(0, 6), []);

  /* apply theme + tweak-driven CSS vars */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = t.theme;
    root.style.setProperty("--consid-red", t.accent);
    const c = CORNER_MAP[t.corners] || CORNER_MAP.soft;
    root.style.setProperty("--radius-lg", c.lg);
    root.style.setProperty("--radius", c.md);
    root.style.setProperty("--radius-sm", c.sm);
  }, [t.theme, t.accent, t.corners]);

  /* stream bots into the lobby */
  useEffect(() => {
    if (phase !== "lobby" || !me) return;
    setPlayers([me]);
    const timers = roster.map((b, i) =>
      setTimeout(() => setPlayers((p) => [...p, { name: b.name, color: b.color }]), 500 + i * 750)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, me]);

  const startNickname = () => { setQuiz(QUIZ); setPhase("nickname"); };
  const openCreate = () => setPhase("create");

  /* launch a freshly-authored quiz straight into a game */
  const launchQuiz = (built) => {
    setQuiz({ ...built, pin: makePin() });
    setPhase("nickname");
  };

  const confirmName = (name) => {
    const used = AVATAR_COLORS.filter((c) => !roster.some((b) => b.color === c));
    const color = used[0] || "#c62a48";
    const m = { name, color };
    setMe(m);
    setBoard([
      { name, color, score: 0, streak: 0 },
      ...roster.map((b) => ({ name: b.name, color: b.color, score: 0, streak: 0 })),
    ]);
    setQIndex(0);
    setPhase("lobby");
  };

  const startGame = () => setPhase("getready");

  const handleAnswer = (result) => {
    const q = questions[qIndex];
    const isSlider = q.type === "slider";

    setBoard((prev) => {
      const next = prev.map((row) => {
        if (row.name === me.name) {
          let gained, correct;
          if (isSlider) {
            const prox = sliderProximity(result.value, q);
            correct = prox >= 0.85;
            gained = scoreSlider(prox, result.timeLeft, result.total, q.weight, row.streak + 1);
          } else {
            correct = result.choice !== null && q.answers[result.choice].correct;
            gained = scoreFor(correct, result.timeLeft, result.total, q.weight, row.streak + 1);
          }
          setLastGained(gained);
          return { ...row, score: row.score + gained, streak: correct ? row.streak + 1 : 0 };
        }
        const bot = roster.find((b) => b.name === row.name);
        const { gained, correct } = simulateBot(bot, q, row.streak);
        return { ...row, score: row.score + gained, streak: correct ? row.streak + 1 : 0 };
      });
      return next.sort((a, b) => b.score - a.score);
    });

    setLastResult(result);
    setPhase("reveal");
  };

  const afterReveal = () => setPhase("leaderboard");

  const afterLeaderboard = () => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      setPhase("getready");
    } else {
      setPhase("podium");
    }
  };

  const replay = () => {
    setPhase("join");
    setMe(null);
    setPlayers([]);
    setBoard([]);
    setQIndex(0);
    setLastResult(null);
    setQuiz(QUIZ);
  };

  const isLastQuestion = qIndex === questions.length - 1;
  const myRank = useMemo(() => (me ? board.findIndex((p) => p.name === me.name) + 1 : 0), [board, me]);
  const myStreak = useMemo(() => (me ? (board.find((p) => p.name === me.name)?.streak || 0) : 0), [board, me]);

  return (
    <div className="app">
      <header className="topbar">
        <Wordmark />
        {(phase === "question" || phase === "reveal" || phase === "leaderboard") && me && (
          <span className="pill"><Avatar name={me.name} color={me.color} size={22} />{me.name}</span>
        )}
      </header>

      <main className={"stage" + (phase === "create" ? " scroll" : "")}>
        {phase === "join" && <JoinScreen onJoin={startNickname} onCreate={openCreate} />}
        {phase === "create" && <CreateScreen onLaunch={launchQuiz} onBack={() => setPhase("join")} />}
        {phase === "nickname" && <NicknameScreen pin={quiz.pin} onConfirm={confirmName} taken={roster.map((b) => b.name)} />}
        {phase === "lobby" && me && <LobbyScreen me={me} players={players} onStart={startGame} />}
        {phase === "getready" && (
          <GetReadyScreen index={qIndex} total={questions.length}
            category={questions[qIndex].category} onGo={() => setPhase("question")} />
        )}
        {phase === "question" && (
          <QuestionScreen key={qIndex} q={questions[qIndex]} index={qIndex}
            total={questions.length} onAnswer={handleAnswer} />
        )}
        {phase === "reveal" && lastResult && (
          <RevealScreen q={questions[qIndex]} result={lastResult} rank={myRank}
            totalPlayers={board.length} gained={lastGained} streak={myStreak} onNext={afterReveal} />
        )}
        {phase === "leaderboard" && (
          <LeaderboardScreen key={qIndex} board={board} me={me}
            final={isLastQuestion} onNext={afterLeaderboard} />
        )}
        {phase === "podium" && <PodiumScreen board={board} me={me} quizTitle={quiz.title} onReplay={replay} />}
      </main>

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={t.theme} options={["dark", "light"]}
          onChange={(v) => setTweak("theme", v)} />
        <TweakColor label="Accent" value={t.accent}
          options={["#c62a48", "#b5223f", "#8e1b32", "#d6334f"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakRadio label="Corners" value={t.corners} options={["sharp", "soft", "round"]}
          onChange={(v) => setTweak("corners", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
