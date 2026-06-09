"use client";

import { useEffect, useState } from "react";
import type { Session, Player, SessionState } from "./database.types";

const POLL_MS = 1000;

/** Polls the session state endpoint every second. */
export function useSession(sessionId: string | null): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/state`);
        if (res.ok && active) setSession(await res.json());
      } catch {
        // ignore network errors between polls
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [sessionId]);

  return session;
}

/** Polls the player list for a session every second. */
export function usePlayers(sessionId: string | null): Player[] {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/players`);
        if (res.ok && active) {
          const data = await res.json();
          setPlayers(data.players ?? []);
        }
      } catch {
        // ignore network errors between polls
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [sessionId]);

  return players;
}

/** Derived from useSession. */
export function useSessionState(sessionId: string | null): SessionState | null {
  const session = useSession(sessionId);
  return session?.state ?? null;
}

/** No-op without Supabase Presence — kept for API compatibility. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function usePresence(_sessionId: string | null, _myInfo: unknown): string[] {
  return [];
}
