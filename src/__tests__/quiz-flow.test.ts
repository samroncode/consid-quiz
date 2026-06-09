import { describe, it, expect, beforeAll } from "vitest";
import { POST as createQuiz } from "@/app/api/quizzes/route";
import { POST as createSession } from "@/app/api/sessions/route";
import { POST as joinSession } from "@/app/api/sessions/[id]/join/route";
import { POST as startSession } from "@/app/api/sessions/[id]/start/route";
import { GET as getQuestion } from "@/app/api/sessions/[id]/question/route";
import { POST as submitAnswer } from "@/app/api/sessions/[id]/answer/route";
import { POST as advanceState } from "@/app/api/sessions/[id]/advance/route";
import { GET as getState } from "@/app/api/sessions/[id]/state/route";
import { GET as getPlayers } from "@/app/api/sessions/[id]/players/route";

// ----- helpers ---------------------------------------------------------------

function p(id: string) {
  return { params: Promise.resolve({ id }) };
}

function post(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function get(url = "http://localhost/api/test") {
  return new Request(url);
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

// A minimal single-question quiz payload matching CreateQuizSchema
const ONE_QUESTION_QUIZ = {
  title: "Test Quiz",
  questions: [
    {
      text: "What is 2 + 2?",
      time: 20,
      answers: [
        { text: "3", correct: false },
        { text: "4", correct: true },
        { text: "5", correct: false },
        { text: "6", correct: false },
      ],
    },
  ],
};

// Two-question quiz for the multi-question flow test
const TWO_QUESTION_QUIZ = {
  title: "Two Question Quiz",
  questions: [
    {
      text: "Capital of France?",
      time: 20,
      answers: [
        { text: "Paris", correct: true },
        { text: "Berlin", correct: false },
        { text: "Rome", correct: false },
        { text: "Madrid", correct: false },
      ],
    },
    {
      text: "Capital of Germany?",
      time: 20,
      answers: [
        { text: "Paris", correct: false },
        { text: "Berlin", correct: true },
        { text: "Rome", correct: false },
        { text: "Madrid", correct: false },
      ],
    },
  ],
};

// ----- main flow -------------------------------------------------------------

describe("full quiz flow (1 question)", () => {
  let quizId: string;
  let editCode: string;
  let sessionId: string;
  let hostToken: string;
  let playerId: string;

  it("creates a quiz", async () => {
    const res = await createQuiz(post(ONE_QUESTION_QUIZ));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(typeof data.id).toBe("string");
    expect(typeof data.edit_code).toBe("string");
    quizId = data.id as string;
    editCode = data.edit_code as string;
  });

  it("rejects quiz creation with empty title", async () => {
    const res = await createQuiz(post({ ...ONE_QUESTION_QUIZ, title: "" }));
    expect(res.status).toBe(422);
  });

  it("creates a session", async () => {
    const res = await createSession(post({ quiz_id: quizId, edit_code: editCode }));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(typeof data.session_id).toBe("string");
    expect(String(data.pin)).toMatch(/^\d{6}$/);
    expect(typeof data.host_token).toBe("string");
    sessionId = data.session_id as string;
    hostToken = data.host_token as string;
    void data.pin; // PIN is used by players to join — not needed in this server-side test
  });

  it("rejects session creation with wrong edit_code", async () => {
    const res = await createSession(post({ quiz_id: quizId, edit_code: "WRONG" }));
    expect(res.status).toBe(403);
  });

  it("player joins the lobby", async () => {
    const res = await joinSession(post({ nickname: "Alice" }), p(sessionId));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(typeof data.player_id).toBe("string");
    playerId = data.player_id as string;
  });

  it("rejects join with blank nickname", async () => {
    const res = await joinSession(post({ nickname: "   " }), p(sessionId));
    expect(res.status).toBe(422);
  });

  it("multiple players can join", async () => {
    const res = await joinSession(post({ nickname: "Bob" }), p(sessionId));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.player_id).not.toBe(playerId);
  });

  it("GET /players lists joined players", async () => {
    const res = await getPlayers(get(), p(sessionId));
    expect(res.status).toBe(200);
    const data = await json(res);
    const players = data.players as Array<{ nickname: string }>;
    expect(players.length).toBeGreaterThanOrEqual(2);
    expect(players.some((pl) => pl.nickname === "Alice")).toBe(true);
  });

  it("rejects wrong host_token on start", async () => {
    const res = await startSession(post({ host_token: "bad-token" }), p(sessionId));
    expect(res.status).toBe(403);
  });

  it("host starts the game", async () => {
    const res = await startSession(post({ host_token: hostToken }), p(sessionId));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.ok).toBe(true);
  });

  it("rejects starting an already-started game", async () => {
    const res = await startSession(post({ host_token: hostToken }), p(sessionId));
    expect(res.status).toBe(409);
  });

  it("rejects joining after game started", async () => {
    const res = await joinSession(post({ nickname: "LatePlayer" }), p(sessionId));
    expect(res.status).toBe(409);
  });

  it("gets the current question (no correct_index for players)", async () => {
    const res = await getQuestion(get(), p(sessionId));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.text).toBe("What is 2 + 2?");
    expect(Array.isArray(data.options)).toBe(true);
    expect((data.options as string[]).length).toBe(4);
    expect(data.time_limit).toBe(20);
    expect(data.position).toBe(0);
    expect(data.total).toBe(1);
    expect("correct_index" in data).toBe(false);
  });

  it("exposes correct_index to authenticated host", async () => {
    const url = `http://localhost/api/test?host_token=${hostToken}`;
    const res = await getQuestion(get(url), p(sessionId));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(typeof data.correct_index).toBe("number");
    expect(data.correct_index).toBe(1); // "4" is index 1
  });

  it("player submits correct answer", async () => {
    const res = await submitAnswer(
      post({ player_id: playerId, choice: 1, question_index: 0 }),
      p(sessionId)
    );
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.is_correct).toBe(true);
    expect(data.awarded as number).toBeGreaterThan(0);
    expect(data.correct_index).toBe(1);
  });

  it("rejects duplicate answer from same player", async () => {
    const res = await submitAnswer(
      post({ player_id: playerId, choice: 1, question_index: 0 }),
      p(sessionId)
    );
    expect(res.status).toBe(409);
  });

  it("rejects answer with non-existent player_id", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await submitAnswer(
      post({ player_id: fakeId, choice: 1, question_index: 0 }),
      p(sessionId)
    );
    expect(res.status).toBe(404);
  });

  it("rejects answer for wrong question_index", async () => {
    // Bob (second player) tries to answer question 99
    const bobRes = await getPlayers(get(), p(sessionId));
    const players = ((await json(bobRes)).players as Array<{ id: string; nickname: string }>);
    const bob = players.find((pl) => pl.nickname === "Bob")!;
    const res = await submitAnswer(
      post({ player_id: bob.id, choice: 1, question_index: 99 }),
      p(sessionId)
    );
    expect(res.status).toBe(409);
  });

  it("advances to reveal", async () => {
    const res = await advanceState(post({ host_token: hostToken }), p(sessionId));
    expect(res.status).toBe(200);
    expect((await json(res)).state).toBe("reveal");
  });

  it("advances to leaderboard", async () => {
    const res = await advanceState(post({ host_token: hostToken }), p(sessionId));
    expect(res.status).toBe(200);
    expect((await json(res)).state).toBe("leaderboard");
  });

  it("advances to ended (only 1 question)", async () => {
    const res = await advanceState(post({ host_token: hostToken }), p(sessionId));
    expect(res.status).toBe(200);
    expect((await json(res)).state).toBe("ended");
  });

  it("rejects advancing past ended", async () => {
    const res = await advanceState(post({ host_token: hostToken }), p(sessionId));
    expect(res.status).toBe(409);
  });

  it("GET /state confirms ended", async () => {
    const res = await getState(get(), p(sessionId));
    expect(res.status).toBe(200);
    expect((await json(res)).state).toBe("ended");
  });

  it("Alice's score is reflected in player list", async () => {
    const res = await getPlayers(get(), p(sessionId));
    const players = ((await json(res)).players as Array<{ id: string; score: number }>);
    const alice = players.find((pl) => pl.id === playerId)!;
    expect(alice.score).toBeGreaterThan(0);
  });
});

// ----- multi-question flow ---------------------------------------------------

describe("multi-question game (2 questions)", () => {
  let sessionId: string;
  let hostToken: string;
  let playerId: string;

  beforeAll(async () => {
    // Create quiz
    const qRes = await createQuiz(post(TWO_QUESTION_QUIZ));
    const { id: quizId, edit_code: editCode } = await json(qRes);

    // Create session
    const sRes = await createSession(post({ quiz_id: quizId, edit_code: editCode }));
    ({ session_id: sessionId, host_token: hostToken } = await json(sRes));

    // Player joins
    const jRes = await joinSession(post({ nickname: "Charlie" }), p(sessionId));
    ({ player_id: playerId } = await json(jRes));

    // Start game
    await startSession(post({ host_token: hostToken }), p(sessionId));
  });

  it("first question is at position 0", async () => {
    const res = await getQuestion(get(), p(sessionId));
    const data = await json(res);
    expect(data.position).toBe(0);
    expect(data.total).toBe(2);
  });

  it("answer Q0, advance to reveal → leaderboard → Q1", async () => {
    // Answer Q0 correctly (Paris = index 0)
    await submitAnswer(
      post({ player_id: playerId, choice: 0, question_index: 0 }),
      p(sessionId)
    );

    // question → reveal
    await advanceState(post({ host_token: hostToken }), p(sessionId));
    // reveal → leaderboard
    await advanceState(post({ host_token: hostToken }), p(sessionId));
    // leaderboard → question (Q1)
    const res = await advanceState(post({ host_token: hostToken }), p(sessionId));
    const data = await json(res);
    expect(data.state).toBe("question");
    expect(data.current_q).toBe(1);
  });

  it("second question is at position 1", async () => {
    const res = await getQuestion(get(), p(sessionId));
    const data = await json(res);
    expect(data.position).toBe(1);
    expect(data.text).toBe("Capital of Germany?");
  });

  it("answer Q1, advance through to ended", async () => {
    // Answer Q1 correctly (Berlin = index 1)
    await submitAnswer(
      post({ player_id: playerId, choice: 1, question_index: 1 }),
      p(sessionId)
    );

    await advanceState(post({ host_token: hostToken }), p(sessionId)); // → reveal
    await advanceState(post({ host_token: hostToken }), p(sessionId)); // → leaderboard
    const res = await advanceState(post({ host_token: hostToken }), p(sessionId)); // → ended
    expect((await json(res)).state).toBe("ended");
  });

  it("player has accumulated score from both questions", async () => {
    const res = await getPlayers(get(), p(sessionId));
    const players = ((await json(res)).players as Array<{ score: number }>);
    expect(players[0].score).toBeGreaterThan(0);
  });
});

// ----- error / edge cases ----------------------------------------------------

describe("edge cases", () => {
  it("GET /state for unknown session returns 404", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await getState(get(), p(fakeId));
    expect(res.status).toBe(404);
  });

  it("GET /question on lobby session returns 409", async () => {
    // Create a fresh session in lobby state
    const qRes = await createQuiz(post(ONE_QUESTION_QUIZ));
    const { id: quizId, edit_code: editCode } = await json(qRes);
    const sRes = await createSession(post({ quiz_id: quizId, edit_code: editCode }));
    const { session_id } = await json(sRes);

    const res = await getQuestion(get(), p(session_id as string));
    expect(res.status).toBe(409);
  });

  it("POST /sessions with unknown quiz_id returns 403", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await createSession(post({ quiz_id: fakeId, edit_code: "FAKE" }));
    expect(res.status).toBe(403);
  });
});
