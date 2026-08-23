import { CurrentState, Meal, Recommendation, Settings, store } from "./store";
import { formatClock, toHHMM, toMinutes } from "./format";
import { claude, MODEL, withRetry } from "./claude";

// Demo/product parameter (PRD §6) — minutes between finishing dinner and usual sleep time.
export const DINNER_SLEEP_BUFFER_MINUTES = 180;

export function computeCurrentState(settings: Settings, meals: Meal[], now = new Date()): CurrentState {
  const sum = (pick: (m: Meal) => number) => Math.round(meals.reduce((t, m) => t + pick(m), 0));

  const caloriesConsumed = sum((m) => m.calories);
  const proteinConsumed = sum((m) => m.protein);
  const carbsConsumed = sum((m) => m.carbs);
  const fatConsumed = sum((m) => m.fat);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sleepMinutes = toMinutes(settings.usualSleepTime);
  const latestMinutes = sleepMinutes - DINNER_SLEEP_BUFFER_MINUTES;

  return {
    currentTime: toHHMM(currentMinutes),
    caloriesConsumed,
    caloriesTarget: settings.calorieTarget,
    caloriesRemaining: settings.calorieTarget - caloriesConsumed,
    proteinConsumed,
    proteinTarget: settings.proteinTarget,
    proteinRemaining: settings.proteinTarget - proteinConsumed,
    carbsConsumed,
    carbsTarget: settings.carbsTarget,
    carbsRemaining: settings.carbsTarget - carbsConsumed,
    fatConsumed,
    fatTarget: settings.fatTarget,
    fatRemaining: settings.fatTarget - fatConsumed,
    usualSleepTime: settings.usualSleepTime,
    latestIdealDinnerTime: toHHMM(latestMinutes),
    minutesUntilLatestDinner: latestMinutes - currentMinutes,
    sleepOrRecoveryContext: settings.sleepRecoveryContext,
    dietaryPreferences: settings.dietaryPreferences,
    dinnerLogged: meals.some((m) => m.isDinner),
    mealCount: meals.length,
  };
}

export function currentState(now = new Date()): CurrentState {
  return computeCurrentState(store.settings, store.meals, now);
}

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
    headline: { type: "string", description: "One short sentence naming the dinner to have tonight." },
    what: { type: "string", description: "What to eat or prioritize. One or two short sentences." },
    howMuch: { type: "string", description: "Approximate quantity and macro targets for the meal." },
    byWhen: { type: "string", description: "When to finish dinner, using the latest ideal dinner time given." },
    note: { type: "string", description: "One short line of context. Empty string if nothing useful to add." },
  },
  required: ["headline", "what", "howMuch", "byWhen", "note"],
  additionalProperties: false,
} as const;

const RECOMMENDATION_SYSTEM = [
  "You advise on one dinner decision. You are calm, professional, and restrained.",
  "Write short, plain, operational sentences. No marketing language, no hype, no urgency, no humor, no emoji.",
  "Do not make medical claims and do not diagnose. Keep guidance conservative and practical.",
  "Answer exactly three things: what to eat, how much, and by when.",
  "Base the quantity on the remaining calories and macros you are given. Respect the dietary preferences.",
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

export async function refreshRecommendation(now = new Date()): Promise<void> {
  const state = currentState(now);

  // Regenerate only when the inputs changed (PRD §7), not on every page load.
  const key = JSON.stringify([store.settings, store.meals.map((m) => m.id)]);
  if (key === store.recommendationKey && store.recommendation && !store.recommendation.stale) return;

  try {
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
    store.recommendation = { ...parsed, stale: false };
    store.recommendationKey = key;
  } catch (e) {
    console.error("Recommendation generation failed:", e);
    // PRD §7: keep the last valid recommendation rather than showing a broken screen.
    if (store.recommendation) store.recommendation.stale = true;
  }
}
