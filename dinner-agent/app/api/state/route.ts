import { NextRequest, NextResponse } from "next/server";
import { resetStore, Settings, store } from "@/lib/store";
import { currentState } from "@/lib/agent";
import { refreshRecommendation } from "@/lib/agent";

export const dynamic = "force-dynamic";

function payload() {
  return {
    settings: store.settings,
    meals: store.meals,
    currentState: currentState(),
    recommendation: store.recommendation,
  };
}

// Reads never block on a model call. Meals and settings changes drive generation;
// this only covers recovery when an earlier generation failed.
export async function GET() {
  if (store.meals.length > 0 && !store.recommendation) await refreshRecommendation();
  return NextResponse.json(payload());
}

// Update settings, then recompute state and recommendation (FR11, PRD §7).
export async function PUT(req: NextRequest) {
  const incoming = (await req.json()) as Partial<Settings>;
  store.settings = { ...store.settings, ...incoming };
  await refreshRecommendation();
  return NextResponse.json(payload());
}

// Demo reset.
export async function DELETE() {
  resetStore();
  return NextResponse.json(payload());
}
