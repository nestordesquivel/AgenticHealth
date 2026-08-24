// Types and deterministic logic. Pure and isomorphic: imported by both the browser
// and the API routes, so it must never import the Anthropic SDK.

import { toHHMM, toMinutes } from "./format";

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

export const DEFAULT_SETTINGS: Settings = {
  calorieTarget: 2200,
  proteinTarget: 150,
  carbsTarget: 220,
  fatTarget: 70,
  usualSleepTime: "22:30",
  dietaryPreferences: "No restrictions",
  sleepRecoveryContext: "Slept about 6 hours last night. Feeling a little run down.",
};


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
