"use client";

import { useEffect, useState, useRef } from "react";
import type { Session, Player, SessionState } from "./database.types";

const POLL_MS = 1000;

/** Polls the session state endpoint every second.
 *  Automatically stops when:
 *  - sessionId is null
 *  - state reaches "ended"
 *  - server returns 404 (session not found)
 *  - the browser tab is hidden (resumes on visibility)
 */
export function useSession(sessionId: string | null): Session | null {
  const [session, setSession] = useState<Session | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current || document.hidden) return;
      try {
        const res = await fetch(`/api/sessions/${sessionId}/state`);
        if (!active) return;
        if (res.status === 404) {
          stoppedRef.current = true;
          return;
        }
        if (res.ok) {
          const data: Session = await res.json();
          setSession(data);
          if (data.state === "ended") stoppedRef.current = true;
        }
      } catch {
        // ignore transient network errors
      }
    };

    const onVisibility = () => {
      if (!document.hidden && !stoppedRef.current) poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    poll();
    const id = setInterval(() => { if (!stoppedRef.current) poll(); }, POLL_MS);

    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sessionId]);

  return session;
}

/** Polls the player list for a session every second.
 *  Pauses when the tab is hidden and stops on 404 or "ended" state. */
export function usePlayers(sessionId: string | null): Player[] {
  const [players, setPlayers] = useState<Player[]>([]);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    stoppedRef.current = false;

    const poll = async () => {
      if (stoppedRef.current || document.hidden) return;
      try {
        const res = await fetch(`/api/sessions/${sessionId}/players`);
        if (!active) return;
        if (res.status === 404) {
          stoppedRef.current = true;
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setPlayers(data.players ?? []);
        }
      } catch {
        // ignore transient network errors
      }
    };

    const onVisibility = () => {
      if (!document.hidden && !stoppedRef.current) poll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    poll();
    const id = setInterval(() => { if (!stoppedRef.current) poll(); }, POLL_MS);

    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
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
