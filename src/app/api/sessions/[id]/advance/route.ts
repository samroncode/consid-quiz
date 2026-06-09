import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const RequestSchema = z.object({ host_token: z.string().min(1) });

export async function POST(req: Request, { params }: Params) {
  const { id: session_id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "host_token required" }, { status: 422 });
  }

  const session = db.sessions.byId(session_id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.host_token !== parsed.data.host_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (session.state === "question") {
    db.sessions.update(session_id, { state: "reveal" });
    return NextResponse.json({ state: "reveal" });
  }

  if (session.state === "reveal") {
    db.sessions.update(session_id, { state: "leaderboard" });
    return NextResponse.json({ state: "leaderboard" });
  }

  if (session.state === "leaderboard") {
    const totalQuestions = db.questions.countByQuizId(session.quiz_id);
    const nextQ = session.current_q + 1;

    if (nextQ >= totalQuestions) {
      db.sessions.update(session_id, { state: "ended" });
      return NextResponse.json({ state: "ended" });
    }

    db.sessions.update(session_id, {
      state: "question",
      current_q: nextQ,
      question_started_at: new Date().toISOString(),
    });
    return NextResponse.json({ state: "question", current_q: nextQ });
  }

  return NextResponse.json({ error: `Cannot advance from state: ${session.state}` }, { status: 409 });
}
