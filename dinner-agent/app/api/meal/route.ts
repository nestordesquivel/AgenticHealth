import { NextRequest, NextResponse } from "next/server";
import { estimateMealFromPhoto } from "@/lib/agent";

export const dynamic = "force-dynamic";
// Vercel Hobby caps function duration at 60s; a photo estimate takes roughly 5-10s.
export const maxDuration = 60;

// Stateless: an image in, an estimate out. The browser owns the day's meals.
export async function POST(req: NextRequest) {
  const { imageDataUrl } = (await req.json()) as { imageDataUrl?: string };
  if (!imageDataUrl) return NextResponse.json({ error: "no_image" }, { status: 400 });

  try {
    return NextResponse.json(await estimateMealFromPhoto(imageDataUrl));
  } catch (e) {
    console.error("Meal photo analysis failed:", e);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }
}
