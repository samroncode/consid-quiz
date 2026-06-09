export interface Quiz {
  id: string;
  title: string;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  created_at: string;
  edit_code: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  position: number;
  text: string;
  options: string[];
  correct_index: number;
  time_limit: number;
}

export interface Session {
  id: string;
  quiz_id: string;
  pin: string;
  host_token: string;
  state: "lobby" | "question" | "reveal" | "leaderboard" | "ended";
  current_q: number;
  question_started_at: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  session_id: string;
  nickname: string;
  score: number;
  joined_at: string;
}

export interface Answer {
  id: string;
  session_id: string;
  player_id: string;
  question_index: number;
  choice: number;
  answered_at: string;
  is_correct: boolean | null;
  awarded: number;
}

export type SessionState = Session["state"];
