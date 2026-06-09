import { NextResponse } from "next/server";
import { db } from "@/lib/storage";

type Params = { params: Promise<{ pin: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { pin } = await params;
  const session = db.sessions.byPin(pin);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.state === "ended") {
    return NextResponse.json({ error: "This game has ended" }, { status: 410 });
  }

  const quiz = db.quizzes.byId(session.quiz_id);

  return NextResponse.json({
    session_id: session.id,
    state: session.state,
    quiz_title: quiz?.title ?? "Quiz",
  });
}
