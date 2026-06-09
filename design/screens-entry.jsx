// screens-entry.jsx — Join, Nickname, Lobby, Get-ready screens.
const { useState: useStateE, useEffect: useEffectE, useRef: useRefE } = React;

/* ---------------------------------------------------------------- JOIN */
function JoinScreen({ onJoin, onCreate }) {
  const [pin, setPin] = useStateE("");
  const [err, setErr] = useStateE("");
  const expected = QUIZ.pin.replace(/\s/g, "");

  const submit = (e) => {
    e.preventDefault();
    const clean = pin.replace(/\s/g, "");
    if (clean.length < 6) { setErr("A game PIN is 6 digits."); return; }
    if (clean !== expected) { setErr("That PIN didn’t match a live game. Try " + QUIZ.pin + "."); return; }
    onJoin();
  };

  return (
    <div className="col" style={{ textAlign: "center" }}>
      <p className="eyebrow rise">Live quiz · real-time</p>
      <h1 className="title rise-2">Ready to<br/>play?</h1>
      <p className="lede rise-3" style={{ maxWidth: 360, margin: "0 auto 30px" }}>
        Enter the game PIN shown on the host’s screen to jump in.
      </p>
      <form onSubmit={submit} className="rise-3" style={{ display: "grid", gap: 16 }}>
        <input
          className="input pin"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000000"
          maxLength={7}
          value={pin}
          aria-label="Game PIN"
          onChange={(e) => {
            let v = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
            if (v.length > 3) v = v.slice(0, 3) + " " + v.slice(3);
            setPin(v); setErr("");
          }}
        />
        {err
          ? <p className="helper error" style={{ margin: 0 }}>{err}</p>
          : <p className="helper" style={{ margin: 0 }}>Demo PIN: <strong style={{ color: "var(--ink-mid)" }}>{QUIZ.pin}</strong></p>}
        <button type="submit" className="btn btn-primary" disabled={pin.replace(/\s/g,"").length < 6}>
          Enter game
        </button>
      </form>
      <div className="rise-3" style={{ display: "flex", alignItems: "center", gap: 12, margin: "26px auto 0", maxWidth: 360 }}>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }}></span>
        <span className="helper" style={{ margin: 0 }}>or</span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }}></span>
      </div>
      <button type="button" className="btn btn-ghost rise-3" style={{ marginTop: 16 }} onClick={onCreate}>
        Create your own quiz
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ NICKNAME */
const PROFANITY = ["damn", "hell", "stupid"]; // tiny illustrative filter
function NicknameScreen({ onConfirm, taken, pin }) {
  const [name, setName] = useStateE("");
  const [err, setErr] = useStateE("");
  const trimmed = name.trim();

  const validate = (v) => {
    if (v.length < 2) return "At least 2 characters.";
    if (v.length > 14) return "Keep it under 15 characters.";
    if (PROFANITY.some((p) => v.toLowerCase().includes(p))) return "Let’s keep it friendly.";
    if (taken.map((t) => t.toLowerCase()).includes(v.toLowerCase())) return "Someone already took that name.";
    return "";
  };

  const submit = (e) => {
    e.preventDefault();
    const v = trimmed;
    const e2 = validate(v);
    if (e2) { setErr(e2); return; }
    onConfirm(v);
  };

  return (
    <div className="col">
      <p className="eyebrow rise">You’re in · PIN {pin}</p>
      <h1 className="title rise-2">Pick a<br/>nickname</h1>
      <form onSubmit={submit} className="rise-3" style={{ display: "grid", gap: 16, marginTop: 8 }}>
        <div>
          <input
            className="input"
            placeholder="Your name on the board"
            value={name}
            maxLength={16}
            autoFocus
            aria-label="Nickname"
            onChange={(e) => { setName(e.target.value); setErr(""); }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span className="helper" style={{ margin: 0 }}>{err && <span className="error">{err}</span>}</span>
            <span className="helper" style={{ margin: 0 }}>{trimmed.length}/14</span>
          </div>
        </div>

        <div>
          <span className="field-label">Need ideas?</span>
          <div className="chips">
            {NICKNAME_SUGGESTIONS.slice(0, 6).map((s) => (
              <button type="button" key={s} className="chip"
                onClick={() => { setName(s); setErr(""); }}>{s}</button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={!trimmed}>Join the lobby</button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- LOBBY */
function LobbyScreen({ me, players, onStart }) {
  const [dots, setDots] = useStateE(1);
  useEffectE(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => clearInterval(id);
  }, []);
  // auto-"host starts" after players have gathered
  useEffectE(() => {
    const id = setTimeout(onStart, 6500);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="col">
      <div className="rise" style={{ textAlign: "center", marginBottom: 22 }}>
        <Avatar name={me.name} color={me.color} size={84} ring />
        <h1 className="title" style={{ fontSize: "clamp(28px,7vw,40px)", margin: "18px 0 6px" }}>
          {me.name}
        </h1>
        <p className="lede" style={{ margin: 0 }}>
          You’re in! Hang tight{".".repeat(dots)}
          <br/>Waiting for the host to start.
        </p>
      </div>

      <div className="card rise-2" style={{ padding: "18px 18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span className="field-label" style={{ margin: 0 }}>In the lobby</span>
          <span className="pill"><span className="pulse"></span>{players.length} players</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {players.map((p, i) => (
            <span key={p.name} className="lobby-chip" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--surface-2)", border: "1px solid var(--line)",
              borderRadius: 999, padding: "6px 12px 6px 6px",
              animation: `pop 0.4s ${i * 0.12}s both`,
              outline: p.name === me.name ? "1.5px solid var(--consid-red)" : "none",
            }}>
              <Avatar name={p.name} color={p.color} size={26} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{p.name}</span>
            </span>
          ))}
        </div>
      </div>

      <button className="btn btn-ghost rise-3" style={{ marginTop: 16 }} onClick={onStart}>
        Skip waiting — start now
      </button>
    </div>
  );
}

/* ----------------------------------------------------------- GET READY */
function GetReadyScreen({ index, total, category, onGo }) {
  const [count, setCount] = useStateE(3);
  useEffectE(() => {
    if (count <= 0) { const id = setTimeout(onGo, 450); return () => clearTimeout(id); }
    const id = setTimeout(() => setCount((c) => c - 1), 850);
    return () => clearTimeout(id);
  }, [count]);

  return (
    <div className="col" style={{ textAlign: "center" }}>
      <p className="eyebrow rise">Question {index + 1} of {total}</p>
      <h1 className="title rise-2" style={{ marginBottom: 10 }}>{category}</h1>
      <p className="lede rise-2">Get ready…</p>
      <div key={count} style={{
        fontFamily: "var(--font-display)", fontWeight: 700,
        fontSize: "clamp(90px, 30vw, 180px)", lineHeight: 1,
        color: count <= 0 ? "var(--consid-red)" : "var(--ink)",
        animation: "pop 0.5s both", marginTop: 8,
      }}>
        {count <= 0 ? "Go" : count}
      </div>
    </div>
  );
}

Object.assign(window, { JoinScreen, NicknameScreen, LobbyScreen, GetReadyScreen });
