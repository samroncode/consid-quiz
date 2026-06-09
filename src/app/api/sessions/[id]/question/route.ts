import { NextResponse } from "next/server";
import { db } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id: session_id } = await params;
  const hostToken = new URL(req.url).searchParams.get("host_token");

  const session = db.sessions.byId(session_id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state === "lobby") {
    return NextResponse.json({ error: "Game not started" }, { status: 409 });
  }

  const question = db.questions.byPosition(session.quiz_id, session.current_q);
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const total = db.questions.countByQuizId(session.quiz_id);
  const isHost = hostToken === session.host_token;

  return NextResponse.json({
    position: question.position,
    text: question.text,
    options: question.options as string[],
    time_limit: question.time_limit,
    total,
    question_started_at: session.question_started_at,
    ...(isHost ? { correct_index: question.correct_index } : {}),
  });
}
