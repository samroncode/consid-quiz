import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/storage";

const RequestSchema = z.object({
  quiz_id: z.string().uuid(),
  edit_code: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "quiz_id and edit_code required" }, { status: 422 });
  }

  const { quiz_id, edit_code } = parsed.data;

  const quiz = db.quizzes.byId(quiz_id);
  if (!quiz || quiz.edit_code !== edit_code) {
    return NextResponse.json({ error: "Invalid quiz or edit code" }, { status: 403 });
  }

  const host_token = crypto.randomUUID();

  // Generate a unique 6-digit PIN
  let pin = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    if (!db.sessions.pinExists(candidate)) {
      pin = candidate;
      break;
    }
  }
  if (!pin) {
    return NextResponse.json({ error: "Could not generate unique PIN" }, { status: 500 });
  }

  const session_id = crypto.randomUUID();
  db.sessions.insert({
    id: session_id,
    quiz_id,
    pin,
    host_token,
    state: "lobby",
    current_q: -1,
    question_started_at: null,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ session_id, pin, host_token });
}
