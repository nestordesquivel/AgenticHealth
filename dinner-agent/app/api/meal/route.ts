import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { currentState, estimateMealFromPhoto, refreshRecommendation } from "@/lib/agent";

export const dynamic = "force-dynamic";
// Vercel Hobby caps function duration at 60s; the photo estimate plus the
// recommendation runs in roughly 8-15s.
export const maxDuration = 60;

type Body = {
  imageDataUrl?: string;
  isDinner?: boolean;
  manual?: { label: string; calories: number; protein: number; carbs: number; fat: number };
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;

  let meal;
  if (body.manual) {
    // Fallback path: photo/camera failed, or the user prefers to type it (PRD §7).
    meal = {
      id: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
      label: body.manual.label || "Meal",
      calories: Math.round(body.manual.calories),
      protein: Math.round(body.manual.protein),
      carbs: Math.round(body.manual.carbs),
      fat: Math.round(body.manual.fat),
      approximate: false,
      source: "manual" as const,
      isDinner: Boolean(body.isDinner),
    };
  } else if (body.imageDataUrl) {
    try {
      const estimate = await estimateMealFromPhoto(body.imageDataUrl);
      meal = {
        id: crypto.randomUUID(),
        loggedAt: new Date().toISOString(),
        label: estimate.label,
        calories: estimate.calories,
        protein: estimate.protein,
        carbs: estimate.carbs,
        fat: estimate.fat,
        approximate: !estimate.confident,
        source: "photo" as const,
        isDinner: Boolean(body.isDinner),
        imageDataUrl: body.imageDataUrl,
      };
    } catch (e) {
      console.error("Meal photo analysis failed:", e);
      return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
    }
  } else {
    return NextResponse.json({ error: "no_meal_provided" }, { status: 400 });
  }

  store.meals.push(meal);
  await refreshRecommendation();

  return NextResponse.json({
    settings: store.settings,
    meals: store.meals,
    currentState: currentState(),
    recommendation: store.recommendation,
    meal,
  });
}
