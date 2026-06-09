// data.jsx — sample quiz content + simulated opponents for the prototype.
// Kept separate so the real app can swap in server-driven data.

const QUIZ = {
  title: "Digital Transformation 101",
  pin: "472 815",
  questions: [
    {
      text: "What does the “API” in modern software stand for?",
      category: "Tech basics",
      time: 20,
      weight: 1,
      media: null,
      answers: [
        { text: "Application Programming Interface", correct: true },
        { text: "Automated Process Integration", correct: false },
        { text: "Applied Protocol Index", correct: false },
        { text: "Advanced Platform Instance", correct: false },
      ],
      explanation: "An API lets two systems talk to each other through a defined contract.",
    },
    {
      text: "A WebSocket connection is best described as…",
      category: "Real-time",
      time: 25,
      weight: 2, // double points
      media: null,
      answers: [
        { text: "A persistent, two-way channel", correct: true },
        { text: "A one-time file download", correct: false },
        { text: "An email protocol", correct: false },
        { text: "A type of database index", correct: false },
      ],
      explanation: "WebSockets keep an open, bidirectional connection — ideal for live quizzes.",
    },
    {
      text: "True or false: the server should be the single source of truth for scoring.",
      category: "Architecture",
      time: 15,
      weight: 1,
      media: null,
      answers: [
        { text: "True", correct: true },
        { text: "False", correct: false },
      ],
      explanation: "Clients render state; the server validates timers and scores to prevent cheating.",
    },
    {
      text: "Which keeps a real-time layer scalable across many servers?",
      category: "Scale",
      time: 20,
      weight: 1,
      media: null,
      answers: [
        { text: "A pub/sub backplane", correct: true },
        { text: "A single big server", correct: false },
        { text: "Disabling reconnects", correct: false },
        { text: "Longer timeouts", correct: false },
      ],
      explanation: "A pub/sub backplane lets WebSocket servers share session state and scale out.",
    },
    {
      type: "slider",
      text: "How much does an adult African elephant weigh?",
      category: "Guess the number",
      time: 25,
      weight: 1,
      media: null,
      min: 0,
      max: 12000,
      step: 100,
      answer: 6000,      // correct value — closest guesses earn the most
      unit: "kg",
      explanation: "An adult African bush elephant averages around 6,000 kg.",
    },
    {
      text: "Why add distinct shapes to colored answer tiles?",
      category: "Accessibility",
      time: 20,
      weight: 1,
      media: null,
      answers: [
        { text: "So players don’t rely on color alone", correct: true },
        { text: "To slow players down", correct: false },
        { text: "To save bandwidth", correct: false },
        { text: "Shapes are just decoration", correct: false },
      ],
      explanation: "Color-blind players need a non-color cue — shapes + labels do the job.",
    },
  ],
};

// Simulated opponents. Each has a "skill" 0–1 that biases their accuracy & speed.
const BOTS = [
  { name: "Astrid", skill: 0.86, color: "#e0566f" },
  { name: "Mikael", skill: 0.72, color: "#4f9bd6" },
  { name: "Yusuf",  skill: 0.64, color: "#e0a23f" },
  { name: "Lena",   skill: 0.55, color: "#3fce8c" },
  { name: "Priya",  skill: 0.79, color: "#a07fe0" },
  { name: "Tom",    skill: 0.41, color: "#d67f4f" },
  { name: "Saga",   skill: 0.60, color: "#4fd6c4" },
];

const NICKNAME_SUGGESTIONS = [
  "QuizWhiz", "RedRocket", "ByteSize", "PixelPro",
  "NordicNinja", "LoopMaster", "CtrlAltElite", "DataDuck",
];

const AVATAR_COLORS = ["#c62a48", "#4f9bd6", "#e0a23f", "#3fce8c", "#a07fe0", "#4fd6c4", "#d67f4f", "#e0566f"];

Object.assign(window, { QUIZ, BOTS, NICKNAME_SUGGESTIONS, AVATAR_COLORS });
