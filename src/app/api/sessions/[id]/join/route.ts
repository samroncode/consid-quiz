import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const RequestSchema = z.object({
  nickname: z.string().min(1).max(24).trim(),
});

export async function POST(req: Request, { params }: Params) {
  const { id: session_id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "nickname required (max 24 chars)" }, { status: 422 });
  }

  // Zod v4 applies .trim() as a transform after min(1), so check again after trimming
  const nickname = parsed.data.nickname.trim();
  if (!nickname) {
    return NextResponse.json({ error: "nickname required (max 24 chars)" }, { status: 422 });
  }

  const session = db.sessions.byId(session_id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state !== "lobby") {
    return NextResponse.json({ error: "Game has already started" }, { status: 409 });
  }

  const player_id = crypto.randomUUID();
  db.players.insert({
    id: player_id,
    session_id,
    nickname,
    score: 0,
    joined_at: new Date().toISOString(),
  });

  return NextResponse.json({ player_id });
}
