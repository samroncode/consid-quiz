import { z } from "zod";

export const MCAnswerSchema = z.object({
  text: z.string(),
  correct: z.boolean(),
});

export const QuizQuestionSchema = z.object({
  text: z.string().min(1, "Question text required"),
  time: z.number().int().min(5).max(120),
  answers: z
    .array(MCAnswerSchema)
    .length(4, "Exactly 4 answer slots required"),
});

export const CreateQuizSchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(QuizQuestionSchema).min(1).max(50),
});

export type QuizAnswer = z.infer<typeof MCAnswerSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type CreateQuizPayload = z.infer<typeof CreateQuizSchema>;

/** Schema for the AI-generated quiz response */
export const AIQuizSchema = z.object({
  title: z.string().min(1),
  questions: z
    .array(
      z.object({
        text: z.string().min(1),
        options: z.array(z.string()).length(4),
        correct_index: z.number().int().min(0).max(3),
        time_limit: z.number().int().min(5).max(120).default(20),
      })
    )
    .min(1)
    .max(50),
});

export type AIQuizPayload = z.infer<typeof AIQuizSchema>;
