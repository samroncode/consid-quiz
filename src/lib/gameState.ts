"use client";

import { useSession } from "./realtime";
import type { SessionState } from "./database.types";

export interface GameSnapshot {
  state: SessionState;
  current_q: number;
  question_started_at: string | null;
}

/** Returns a stable snapshot of the live session state. */
export function useGameSnapshot(sessionId: string | null): GameSnapshot | null {
  const session = useSession(sessionId);
  if (!session) return null;
  return {
    state: session.state as SessionState,
    current_q: session.current_q,
    question_started_at: session.question_started_at ?? null,
  };
}

/** How many seconds remain in the current question. Returns 0 when time is up. */
export function calcTimeLeft(questionStartedAt: string | null, timeLimit: number): number {
  if (!questionStartedAt) return timeLimit;
  const started = new Date(questionStartedAt).getTime();
  const remaining = (started + timeLimit * 1000 - Date.now()) / 1000;
  return Math.max(0, remaining);
}

/** Kahoot-style speed scoring. elapsed and timeLimit in seconds. */
export function calcScore(isCorrect: boolean, elapsed: number, timeLimit: number): number {
  if (!isCorrect) return 0;
  return Math.max(0, Math.round(1000 * (1 - elapsed / timeLimit / 2)));
}
