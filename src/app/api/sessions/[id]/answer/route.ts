import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const RequestSchema = z.object({
  player_id: z.string().uuid(),
  choice: z.number().int().min(0).max(3),
  question_index: z.number().int().min(0),
});

export async function POST(req: Request, { params }: Params) {
  const { id: session_id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  }

  const { player_id, choice, question_index } = parsed.data;
  const now = new Date();

  const session = db.sessions.byId(session_id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state !== "question") {
    return NextResponse.json({ error: "Question is not active" }, { status: 409 });
  }
  if (session.current_q !== question_index) {
    return NextResponse.json({ error: "Wrong question" }, { status: 409 });
  }

  const player = db.players.byId(player_id);
  if (!player || player.session_id !== session_id) {
    return NextResponse.json({ error: "Player not found in session" }, { status: 404 });
  }

  // Prevent double-answer
  if (db.answers.exists(session_id, player_id, question_index)) {
    return NextResponse.json({ error: "Already answered" }, { status: 409 });
  }

  const question = db.questions.byPosition(session.quiz_id, question_index);
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const is_correct = choice === question.correct_index;
  const elapsed = session.question_started_at
    ? Math.max(0, (now.getTime() - new Date(session.question_started_at).getTime()) / 1000)
    : question.time_limit;
  const awarded = is_correct
    ? Math.max(0, Math.round(1000 * (1 - elapsed / question.time_limit / 2)))
    : 0;

  db.answers.insert({
    id: crypto.randomUUID(),
    session_id,
    player_id,
    question_index,
    choice,
    answered_at: now.toISOString(),
    is_correct,
    awarded,
  });

  if (awarded > 0) {
    db.players.update(player_id, { score: (player.score ?? 0) + awarded });
  }

  return NextResponse.json({ is_correct, awarded, correct_index: question.correct_index });
}
