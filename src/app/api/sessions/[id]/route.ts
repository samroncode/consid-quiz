import { NextResponse } from "next/server";
import { db } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = db.sessions.byId(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const quiz = db.quizzes.byId(session.quiz_id);

  return NextResponse.json({
    session_id: session.id,
    pin: session.pin,
    state: session.state,
    quiz_title: quiz?.title ?? "Quiz",
  });
}
