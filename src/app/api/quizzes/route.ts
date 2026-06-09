import { NextResponse } from "next/server";
import { db, randomCode } from "@/lib/storage";
import { CreateQuizSchema } from "@/lib/quiz-schemas";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = CreateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { title, questions } = parsed.data;
  const id = crypto.randomUUID();
  const edit_code = randomCode(8);

  db.quizzes.insert({
    id,
    title,
    topic: null,
    difficulty: null,
    created_at: new Date().toISOString(),
    edit_code,
  });

  const dbQuestions = questions
    .filter((q) => q.text.trim() && q.answers.filter((a) => a.text.trim()).length >= 2)
    .map((q, i) => {
      const filled = q.answers.filter((a) => a.text.trim());
      const options = filled.map((a) => a.text.trim());
      const correctIdx = filled.findIndex((a) => a.correct);
      return {
        id: crypto.randomUUID(),
        quiz_id: id,
        position: i,
        text: q.text.trim(),
        options,
        correct_index: correctIdx >= 0 ? correctIdx : 0,
        time_limit: q.time,
      };
    });

  db.questions.insertMany(dbQuestions);

  return NextResponse.json({ id, edit_code });
}
