import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { CreateQuizSchema } from "@/lib/quiz-schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const quiz = db.quizzes.byId(id);
  if (!quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const questions = db.questions.byQuizId(id);
  return NextResponse.json({ quiz, questions });
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body?.edit_code) {
    return NextResponse.json({ error: "edit_code required" }, { status: 401 });
  }

  const quiz = db.quizzes.byId(id);
  if (!quiz || quiz.edit_code !== body.edit_code) {
    return NextResponse.json({ error: "Invalid edit code" }, { status: 403 });
  }

  const parsed = CreateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { title, questions } = parsed.data;
  db.quizzes.update(id, { title });

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

  db.questions.replaceForQuiz(id, dbQuestions);

  return NextResponse.json({ id, ok: true });
}
