import { NextResponse } from "next/server";
import { db } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id: session_id } = await params;
  const q = Number(new URL(req.url).searchParams.get("q") ?? "0");

  const answers = db.answers.bySessionAndQ(session_id, q);
  return NextResponse.json({ count: answers.length });
}
