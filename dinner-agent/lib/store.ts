// Single in-memory server-side store (PRD §9). Resets on server restart.

export type Settings = {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  usualSleepTime: string; // "HH:MM", 24h
  dietaryPreferences: string;
  sleepRecoveryContext: string;
};

export type Meal = {
  id: string;
  loggedAt: string; // ISO
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  approximate: boolean; // model was not confident, or manual entry
  source: "photo" | "manual";
  isDinner: boolean;
  imageDataUrl?: string;
};

export type CurrentState = {
  currentTime: string; // "HH:MM"
  caloriesConsumed: number;
  caloriesTarget: number;
  caloriesRemaining: number;
  proteinConsumed: number;
  proteinTarget: number;
  proteinRemaining: number;
  carbsConsumed: number;
  carbsTarget: number;
  carbsRemaining: number;
  fatConsumed: number;
  fatTarget: number;
  fatRemaining: number;
  usualSleepTime: string;
  latestIdealDinnerTime: string;
  minutesUntilLatestDinner: number;
  sleepOrRecoveryContext: string;
  dietaryPreferences: string;
  dinnerLogged: boolean;
  mealCount: number;
};

export type Recommendation = {
  headline: string;
  what: string;
  howMuch: string;
  byWhen: string;
  note: string;
  stale: boolean; // true when served from last known data after an API failure
};

const DEFAULT_SETTINGS: Settings = {
  calorieTarget: 2200,
  proteinTarget: 150,
  carbsTarget: 220,
  fatTarget: 70,
  usualSleepTime: "22:30",
  dietaryPreferences: "No restrictions",
  sleepRecoveryContext: "Slept about 6 hours last night. Feeling a little run down.",
};

type Store = {
  settings: Settings;
  meals: Meal[];
  recommendation: Recommendation | null;
  recommendationKey: string; // inputs the current recommendation was generated from
};

// Survives hot reloads in dev by hanging off globalThis.
const g = globalThis as unknown as { __dinnerStore?: Store };

export const store: Store =
  g.__dinnerStore ??
  (g.__dinnerStore = { settings: { ...DEFAULT_SETTINGS }, meals: [], recommendation: null, recommendationKey: "" });

export function resetStore() {
  store.settings = { ...DEFAULT_SETTINGS };
  store.meals = [];
  store.recommendation = null;
  store.recommendationKey = "";
}
