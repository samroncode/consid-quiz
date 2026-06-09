import fs from "fs";
import path from "path";
import type { Quiz, Question, Session, Player, Answer } from "./database.types";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readCollection<T>(name: string): T[] {
  ensureDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf-8");
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T[];
  } catch {
    return [];
  }
}

function writeCollection<T>(name: string, data: T[]): void {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), "utf-8");
}

export function randomCode(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export const db = {
  quizzes: {
    all: (): Quiz[] => readCollection<Quiz>("quizzes"),
    byId: (id: string): Quiz | undefined => readCollection<Quiz>("quizzes").find((q) => q.id === id),
    insert: (quiz: Quiz): void => {
      const all = readCollection<Quiz>("quizzes");
      all.push(quiz);
      writeCollection("quizzes", all);
    },
    update: (id: string, patch: Partial<Quiz>): void =>
      writeCollection("quizzes", readCollection<Quiz>("quizzes").map((q) => (q.id === id ? { ...q, ...patch } : q))),
    delete: (id: string): void =>
      writeCollection("quizzes", readCollection<Quiz>("quizzes").filter((q) => q.id !== id)),
  },

  questions: {
    byQuizId: (quizId: string): Question[] =>
      readCollection<Question>("questions")
        .filter((q) => q.quiz_id === quizId)
        .sort((a, b) => a.position - b.position),
    byPosition: (quizId: string, position: number): Question | undefined =>
      readCollection<Question>("questions").find((q) => q.quiz_id === quizId && q.position === position),
    countByQuizId: (quizId: string): number =>
      readCollection<Question>("questions").filter((q) => q.quiz_id === quizId).length,
    insertMany: (questions: Question[]): void => {
      const all = readCollection<Question>("questions");
      all.push(...questions);
      writeCollection("questions", all);
    },
    replaceForQuiz: (quizId: string, questions: Question[]): void => {
      const others = readCollection<Question>("questions").filter((q) => q.quiz_id !== quizId);
      writeCollection("questions", [...others, ...questions]);
    },
  },

  sessions: {
    byId: (id: string): Session | undefined => readCollection<Session>("sessions").find((s) => s.id === id),
    byPin: (pin: string): Session | undefined => readCollection<Session>("sessions").find((s) => s.pin === pin),
    pinExists: (pin: string): boolean => readCollection<Session>("sessions").some((s) => s.pin === pin),
    insert: (session: Session): void => {
      const all = readCollection<Session>("sessions");
      all.push(session);
      writeCollection("sessions", all);
    },
    update: (id: string, patch: Partial<Session>): void =>
      writeCollection("sessions", readCollection<Session>("sessions").map((s) => (s.id === id ? { ...s, ...patch } : s))),
  },

  players: {
    bySessionId: (sessionId: string): Player[] =>
      readCollection<Player>("players")
        .filter((p) => p.session_id === sessionId)
        .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()),
    byId: (id: string): Player | undefined => readCollection<Player>("players").find((p) => p.id === id),
    insert: (player: Player): void => {
      const all = readCollection<Player>("players");
      all.push(player);
      writeCollection("players", all);
    },
    update: (id: string, patch: Partial<Player>): void =>
      writeCollection("players", readCollection<Player>("players").map((p) => (p.id === id ? { ...p, ...patch } : p))),
  },

  answers: {
    bySessionAndQ: (sessionId: string, questionIndex: number): Answer[] =>
      readCollection<Answer>("answers").filter(
        (a) => a.session_id === sessionId && a.question_index === questionIndex
      ),
    exists: (sessionId: string, playerId: string, questionIndex: number): boolean =>
      readCollection<Answer>("answers").some(
        (a) => a.session_id === sessionId && a.player_id === playerId && a.question_index === questionIndex
      ),
    insert: (answer: Answer): void => {
      const all = readCollection<Answer>("answers");
      all.push(answer);
      writeCollection("answers", all);
    },
  },
};
