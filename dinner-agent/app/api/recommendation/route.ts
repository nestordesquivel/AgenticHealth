import { NextRequest, NextResponse } from "next/server";
import { generateRecommendation } from "@/lib/agent";
import { CurrentState } from "@/lib/state";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stateless: a Current State in, one recommendation out.
export async function POST(req: NextRequest) {
  const { currentState } = (await req.json()) as { currentState?: CurrentState };
  if (!currentState) return NextResponse.json({ error: "no_state" }, { status: 400 });

  try {
    return NextResponse.json(await generateRecommendation(currentState));
  } catch (e) {
    console.error("Recommendation generation failed:", e);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }
}
