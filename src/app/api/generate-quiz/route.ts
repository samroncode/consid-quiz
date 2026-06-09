import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import { AIQuizSchema } from "@/lib/quiz-schemas";
import { db, randomCode } from "@/lib/storage";

const RequestSchema = z.object({
  topic: z.string().min(1).max(200),
  difficulty: z.enum(["easy", "medium", "hard"]),
  numQuestions: z.number().int().min(1).max(20).default(5),
});

function buildPrompt(topic: string, difficulty: string, numQuestions: number): string {
  return `Generate a ${difficulty} quiz about "${topic}" with exactly ${numQuestions} multiple-choice questions.

Respond with ONLY valid JSON. No markdown, no code fences, no explanation. The JSON must match this exact schema:

{
  "title": "string",
  "questions": [
    {
      "text": "question text",
      "options": ["A text", "B text", "C text", "D text"],
      "correct_index": 0,
      "time_limit": 20
    }
  ]
}

Rules:
- title: descriptive quiz title
- Each question has exactly 4 options
- correct_index: 0-3 (index of the correct option)
- time_limit: 15 for easy, 20 for medium, 30 for hard
- Questions must be factually accurate
- Do not include lettering (A, B, C, D) inside the option text itself`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { topic, difficulty, numQuestions } = parsed.data;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Groq API key not configured" }, { status: 503 });
  }

  const groq = new Groq({ apiKey });

  async function callAI(): Promise<string> {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You are a quiz generator. Respond only with valid JSON matching the exact schema provided. No prose, no markdown fences.",
        },
        {
          role: "user",
          content: buildPrompt(topic, difficulty, numQuestions),
        },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  }

  let rawText = "";
  try {
    rawText = await callAI();
  } catch {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }

  const clean = (t: string) =>
    t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let aiData: unknown;
  try {
    aiData = JSON.parse(clean(rawText));
  } catch {
    try {
      rawText = await callAI();
      aiData = JSON.parse(clean(rawText));
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response as JSON" }, { status: 500 });
    }
  }

  const validated = AIQuizSchema.safeParse(aiData);
  if (!validated.success) {
    return NextResponse.json(
      { error: "AI output failed schema validation", issues: validated.error.issues },
      { status: 500 }
    );
  }

  const { title, questions } = validated.data;
  const quiz_id = crypto.randomUUID();
  const edit_code = randomCode(8);

  db.quizzes.insert({
    id: quiz_id,
    title,
    topic,
    difficulty,
    created_at: new Date().toISOString(),
    edit_code,
  });

  db.questions.insertMany(
    questions.map((q, i) => ({
      id: crypto.randomUUID(),
      quiz_id,
      position: i,
      text: q.text,
      options: q.options,
      correct_index: q.correct_index,
      time_limit: q.time_limit,
    }))
  );

  return NextResponse.json({ quiz_id, edit_code });
}
