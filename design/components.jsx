// components.jsx — shared visual building blocks for Consid Quiz.
const { useState, useEffect, useRef } = React;

/* Answer shape glyphs — give each tile a non-color identity (accessibility). */
function Shape({ kind, size = 26, stroke = "currentColor", fill = "none", weight = 2.4 }) {
  const c = size / 2;
  const common = { stroke, strokeWidth: weight, fill, strokeLinejoin: "round", strokeLinecap: "round" };
  let el;
  if (kind === "triangle") {
    el = <polygon points={`${c},${size*0.14} ${size*0.9},${size*0.86} ${size*0.1},${size*0.86}`} {...common} />;
  } else if (kind === "diamond") {
    el = <polygon points={`${c},${size*0.1} ${size*0.9},${c} ${c},${size*0.9} ${size*0.1},${c}`} {...common} />;
  } else if (kind === "circle") {
    el = <circle cx={c} cy={c} r={size*0.38} {...common} />;
  } else { // square
    el = <rect x={size*0.14} y={size*0.14} width={size*0.72} height={size*0.72} rx={size*0.1} {...common} />;
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">{el}</svg>;
}
const SHAPE_ORDER = ["triangle", "diamond", "circle", "square"];
const LETTERS = ["A", "B", "C", "D"];

/* Round avatar with initials. */
function Avatar({ name, color, size = 38, ring = false }) {
  const initials = (name || "?").trim().slice(0, 2).toUpperCase();
  return (
    <span style={{
      width: size, height: size, minWidth: size,
      borderRadius: "50%",
      background: color,
      color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-display)", fontWeight: 700,
      fontSize: size * 0.38, letterSpacing: "-0.02em",
      boxShadow: ring ? "0 0 0 3px var(--bg), 0 0 0 5px var(--consid-red)" : "none",
    }}>{initials}</span>
  );
}

/* Countdown ring with seconds in the middle. */
function TimerRing({ remaining, total, size = 76 }) {
  const r = (size - 9) / 2;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remaining / total));
  const danger = remaining <= 5;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line-2)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={danger ? "var(--consid-red)" : "var(--ink)"} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)", fontWeight: 700, fontSize: size * 0.34,
        color: danger ? "var(--consid-red)" : "var(--ink)",
      }}>{Math.ceil(remaining)}</span>
    </div>
  );
}

/* Brand wordmark. */
function Wordmark() {
  return (
    <span className="wordmark">
      <span className="dot"></span>
      Consid <span className="light">Quiz</span>
    </span>
  );
}

/* Animated counting number (interval-based so it ticks even when rAF is throttled). */
function CountUp({ value, duration = 800 }) {
  const [n, setN] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    const a = from.current, b = value;
    if (a === b) { setN(b); return; }
    const start = performance.now();
    setN(a);
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(a + (b - a) * eased));
      if (p >= 1) { clearInterval(id); from.current = b; }
    }, 40);
    return () => clearInterval(id);
  }, [value, duration]);
  return <>{n.toLocaleString()}</>;
}

/* Slider scoring: 1.0 = exact, 0 = furthest. Closeness drives points. */
function sliderProximity(guess, q) {
  const span = (q.max - q.min) || 1;
  return Math.max(0, 1 - Math.abs(guess - q.answer) / span);
}

Object.assign(window, { Shape, SHAPE_ORDER, LETTERS, Avatar, TimerRing, Wordmark, CountUp, sliderProximity });
