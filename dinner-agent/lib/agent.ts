// Server-only. The two Claude calls: photo -> macros, Current State -> recommendation.
// Neither function holds state; the browser owns the day.

import { CurrentState, Recommendation } from "./state";
import { formatClock } from "./format";
import { claude, MODEL, withRetry } from "./claude";

/* Meal photo → estimated calories and macros (FR2) ------------------------- */

const MEAL_SCHEMA = {
  type: "object",
  properties: {
    label: { type: "string", description: "Short name for the meal, e.g. 'Chicken salad bowl'" },
    calories: { type: "number" },
    protein: { type: "number", description: "grams" },
    carbs: { type: "number", description: "grams" },
    fat: { type: "number", description: "grams" },
    confident: { type: "boolean", description: "false if the photo is unclear and the estimate is a rough guess" },
  },
  required: ["label", "calories", "protein", "carbs", "fat", "confident"],
  additionalProperties: false,
} as const;

export type MealEstimate = {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confident: boolean;
};

export async function estimateMealFromPhoto(dataUrl: string): Promise<MealEstimate> {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Unsupported image format");
  const [, mediaType, data] = match;

  const response = await withRetry(() =>
    claude.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system:
        "You estimate the nutrition of a meal from a photo. Give a best-effort estimate of the portion actually " +
        "shown. Never refuse to answer: if the photo is unclear, estimate anyway and set confident to false.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/jpeg", data },
            },
            {
              type: "text",
              text: "Estimate the calories, protein, carbohydrates, and fat in this meal.",
            },
          ],
        },
      ],
      // Low effort: this is a bounded estimation task, and demo latency matters.
      output_config: { effort: "low", format: { type: "json_schema", schema: MEAL_SCHEMA } },
    }),
  );

  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const parsed = JSON.parse(text) as MealEstimate;

  return {
    label: parsed.label || "Meal",
    calories: Math.round(parsed.calories),
    protein: Math.round(parsed.protein),
    carbs: Math.round(parsed.carbs),
    fat: Math.round(parsed.fat),
    confident: Boolean(parsed.confident),
  };
}

/* Current State → one dinner recommendation (FR10, FR11) ------------------- */

const RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string", description: "The action to take, at most 10 words. No preamble." },
    what: { type: "string", description: "The foods to eat. One sentence, at most 16 words." },
    howMuch: { type: "string", description: "Calories and protein first, then any other macro. At most 14 words." },
    byWhen: { type: "string", description: "A time, at most 12 words. Say plainly if that time has passed." },
    note: { type: "string", description: "One reason, at most 14 words. Empty string if there is nothing useful to add." },
  },
  required: ["headline", "what", "howMuch", "byWhen", "note"],
  additionalProperties: false,
} as const;

const RECOMMENDATION_SYSTEM = [
  "You advise on one dinner decision. You are calm, professional, and restrained.",
  "Be brief. Every field is read in a couple of seconds, so respect its word limit strictly.",
  "Write short, plain, operational sentences. No marketing language, no hype, no urgency, no humor, no emoji.",
  "Never repeat a number or a time in more than one field, and never restate the question.",
  "Do not make medical claims and do not diagnose. Keep guidance conservative and practical.",
  "Answer exactly three things: what to eat, how much, and by when.",
  "Base the quantity on the remaining calories and macros you are given.",
  "Respect the dietary preferences exactly. Never name a food that conflicts with them, not even as an alternative.",
  "If recovery or sleep has been poor, keep the meal lighter and easier to digest, and say so in one line.",
  "Use the latest ideal dinner time exactly as provided.",
].join(" ");

function statePrompt(s: CurrentState): string {
  return [
    `current_time: ${formatClock(s.currentTime)}`,
    `calories_consumed: ${s.caloriesConsumed}`,
    `calories_target: ${s.caloriesTarget}`,
    `calories_remaining: ${s.caloriesRemaining}`,
    `protein_consumed: ${s.proteinConsumed}g`,
    `protein_target: ${s.proteinTarget}g`,
    `protein_remaining: ${s.proteinRemaining}g`,
    `carbs_consumed: ${s.carbsConsumed}g`,
    `carbs_target: ${s.carbsTarget}g`,
    `carbs_remaining: ${s.carbsRemaining}g`,
    `fat_consumed: ${s.fatConsumed}g`,
    `fat_target: ${s.fatTarget}g`,
    `fat_remaining: ${s.fatRemaining}g`,
    `usual_sleep_time: ${formatClock(s.usualSleepTime)}`,
    `latest_ideal_dinner_time: ${formatClock(s.latestIdealDinnerTime)}`,
    `minutes_until_latest_dinner_time: ${s.minutesUntilLatestDinner}`,
    `sleep_or_recovery_context: ${s.sleepOrRecoveryContext || "not provided"}`,
    `dietary_preferences: ${s.dietaryPreferences || "none"}`,
    `meals_logged_today: ${s.mealCount}`,
    `dinner_already_logged: ${s.dinnerLogged}`,
    "",
    s.dinnerLogged
      ? "Dinner has been logged. Summarize how the day closed out and whether anything is worth adjusting before sleep."
      : "Give the dinner recommendation for tonight.",
  ].join("\n");
}

export async function generateRecommendation(state: CurrentState): Promise<Recommendation> {
  const response = await withRetry(() =>
    claude.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: RECOMMENDATION_SYSTEM,
      messages: [{ role: "user", content: statePrompt(state) }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: RECOMMENDATION_SCHEMA } },
    }),
  );

  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const parsed = JSON.parse(text) as Omit<Recommendation, "stale">;
  return { ...parsed, stale: false };
}
