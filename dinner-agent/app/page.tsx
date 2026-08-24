"use client";

import { useEffect, useRef, useState } from "react";
import type { CurrentState, Meal, Recommendation, Settings } from "@/lib/state";
import { computeCurrentState, DEFAULT_SETTINGS } from "@/lib/state";
import { formatClock } from "@/lib/format";

type AppState = {
  settings: Settings;
  meals: Meal[];
  currentState: CurrentState;
  recommendation: Recommendation | null;
};

// The day lives in this browser only. Each visitor has their own; the server keeps none.
type Day = {
  date: string; // YYYY-MM-DD, so a new day starts clean
  settings: Settings;
  meals: Meal[];
  recommendation: Recommendation | null;
};

const STORAGE_KEY = "dinner-agent-day-v1";

// Local date, not UTC: toISOString would roll the day over in the evening and
// wipe a day that is still in progress.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function loadDay(): Day {
  const fresh: Day = { date: today(), settings: DEFAULT_SETTINGS, meals: [], recommendation: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Day;
    return saved.date === today() ? saved : fresh;
  } catch {
    return fresh;
  }
}

function saveDay(day: Day) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(day));
  } catch {
    // Photos can overflow the storage quota. Keep the numbers, drop the images.
    try {
      const light = { ...day, meals: day.meals.map(({ imageDataUrl, ...m }) => m) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
    } catch {
      // Storage unavailable. The day still works, it just will not survive a refresh.
    }
  }
}

type Tab = "home" | "details" | "settings";

export default function Page() {
  // #details / #settings deep links, handy when demoing.
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "home";
    const h = window.location.hash.slice(1);
    return h === "details" || h === "settings" ? h : "home";
  });
  const [day, setDay] = useState<Day | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirrors `day` synchronously, so a change made while a recommendation request is
  // still in flight builds on the newest day rather than a stale render's copy.
  const dayRef = useRef<Day | null>(null);
  const latestRequest = useRef(0);

  function commit(next: Day) {
    dayRef.current = next;
    setDay(next);
    saveDay(next);
  }

  // Read storage after mount so the server and client first render match.
  useEffect(() => commit(loadDay()), []);

  // Apply a change, then regenerate the recommendation from the new state (FR11).
  async function apply(next: Day) {
    const request = ++latestRequest.current;
    commit(next);
    setBusy(true);
    try {
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentState: computeCurrentState(next.settings, next.meals) }),
      });
      if (!res.ok) throw new Error();
      const recommendation = (await res.json()) as Recommendation;
      // Ignore a response that a newer change has already superseded.
      if (request === latestRequest.current && dayRef.current) {
        commit({ ...dayRef.current, recommendation });
      }
    } catch {
      // PRD §7: keep the last valid recommendation rather than showing a broken screen.
      if (request === latestRequest.current && dayRef.current) {
        const previous = dayRef.current.recommendation;
        commit({ ...dayRef.current, recommendation: previous ? { ...previous, stale: true } : null });
      }
    } finally {
      if (request === latestRequest.current) setBusy(false);
    }
  }

  const logMeal = (meal: Meal) => {
    const current = dayRef.current;
    if (current) apply({ ...current, meals: [...current.meals, meal] });
  };
  const saveSettings = (settings: Settings) => {
    const current = dayRef.current;
    if (current) apply({ ...current, settings });
  };
  const resetDay = () =>
    commit({ date: today(), settings: DEFAULT_SETTINGS, meals: [], recommendation: null });

  const data: AppState | null = day
    ? { ...day, currentState: computeCurrentState(day.settings, day.meals) }
    : null;

  if (!data) {
    return (
      <div className="app">
        <div className="topbar">
          <h1>Today</h1>
          <div className="sub">Loading current state</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1>{tab === "home" ? "Today" : tab === "details" ? "Details" : "Settings"}</h1>
        <div className="sub">
          {tab === "home"
            ? `${formatClock(data.currentState.currentTime)} · ${data.currentState.mealCount} meal${
                data.currentState.mealCount === 1 ? "" : "s"
              } logged`
            : tab === "details"
              ? "Today's meals and nutrition"
              : "Targets, preferences, and recovery context"}
        </div>
      </div>

      <div className="screen">
        {error && (
          <div className="status" data-tone="error">
            {error}
          </div>
        )}

        {tab === "home" && (
          <Home data={data} logMeal={logMeal} busy={busy} setBusy={setBusy} setError={setError} />
        )}
        {tab === "details" && <Details data={data} />}
        {tab === "settings" && <SettingsView data={data} saveSettings={saveSettings} resetDay={resetDay} />}
      </div>

      <nav className="nav">
        {(["home", "details", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            data-active={tab === t}
            onClick={() => {
              setTab(t);
              window.history.replaceState(null, "", t === "home" ? "#" : `#${t}`);
            }}
          >
            {t === "home" ? "Home" : t === "details" ? "Details" : "Settings"}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* Home ---------------------------------------------------------------------- */

function Home({
  data,
  logMeal,
  busy,
  setBusy,
  setError,
}: {
  data: AppState;
  logMeal: (meal: Meal) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (e: string | null) => void;
}) {
  const s = data.currentState;
  const fileRef = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState(false);
  const [isDinner, setIsDinner] = useState(false);
  const [lastMeal, setLastMeal] = useState<Meal | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const imageDataUrl = await readAsDataUrl(file);
      const res = await fetch("/api/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      if (!res.ok) throw new Error();
      const estimate = (await res.json()) as {
        label: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        confident: boolean;
      };
      const meal: Meal = {
        id: crypto.randomUUID(),
        loggedAt: new Date().toISOString(),
        label: estimate.label,
        calories: estimate.calories,
        protein: estimate.protein,
        carbs: estimate.carbs,
        fat: estimate.fat,
        approximate: !estimate.confident,
        source: "photo",
        isDinner,
        imageDataUrl,
      };
      setLastMeal(meal);
      logMeal(meal);
    } catch {
      setError("The photo could not be analyzed. Enter the meal manually to continue.");
      setManual(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section>
        <div className="section-label">Current state</div>
        <div className="card">
          <div className="metric-primary">
            <span className="value" data-over={s.caloriesRemaining < 0}>
              {Math.abs(s.caloriesRemaining).toLocaleString()}
            </span>
            <span className="unit">{s.caloriesRemaining < 0 ? "kcal over target" : "kcal left today"}</span>
          </div>
          <div className="macro-line">
            <Macro name="Protein" remaining={s.proteinRemaining} />
            <Macro name="Carbs" remaining={s.carbsRemaining} />
            <Macro name="Fat" remaining={s.fatRemaining} />
          </div>
        </div>

        <p className="context-line">
          Dinner by {formatClock(s.latestIdealDinnerTime)}, sleep at {formatClock(s.usualSleepTime)}.
          {s.sleepOrRecoveryContext ? ` ${s.sleepOrRecoveryContext}` : ""}
        </p>
      </section>

      <section>
        <div className="section-label">Log a meal</div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Estimating nutrition…" : "Log what I eat"}
        </button>
        <label className="checkline">
          <input type="checkbox" checked={isDinner} onChange={(e) => setIsDinner(e.target.checked)} />
          This meal is dinner
        </label>
        <button className="btn btn-quiet" onClick={() => setManual((m) => !m)}>
          {manual ? "Hide manual entry" : "Enter it manually"}
        </button>

        {lastMeal && !busy && (
          <div className="status" data-tone={lastMeal.approximate ? "warning" : "success"} style={{ marginTop: 12 }}>
            Logged {lastMeal.label} · {lastMeal.calories} kcal, {lastMeal.protein}g protein.
            {lastMeal.approximate && " This estimate is approximate."}
          </div>
        )}

        {manual && <ManualEntry logMeal={logMeal} onDone={() => setManual(false)} isDinner={isDinner} />}
      </section>

      <section>
        <div className="section-label">Recommendation</div>
        {busy && (
          <div className="status" style={{ marginBottom: 12 }}>
            Updating the recommendation with your new meal.
          </div>
        )}
        {data.recommendation ? (
          <div className="card card-primary">
            <div className="rec-headline">{data.recommendation.headline}</div>
            <div className="rec-lines">
              <div className="rec-line">
                <div className="k">What</div>
                <div className="v">{data.recommendation.what}</div>
              </div>
              <div className="rec-line">
                <div className="k">How much</div>
                <div className="v">{data.recommendation.howMuch}</div>
              </div>
              <div className="rec-line">
                <div className="k">By when</div>
                <div className="v">{data.recommendation.byWhen}</div>
              </div>
            </div>
            {data.recommendation.note && <p className="rec-note">{data.recommendation.note}</p>}
            {data.recommendation.stale && (
              <div className="status" data-tone="warning" style={{ marginTop: 12 }}>
                Using last known data. The recommendation could not be refreshed.
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="empty">
              {busy
                ? "Preparing tonight's recommendation."
                : "No recommendation yet. Log a meal, or open Settings to confirm your targets."}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

// Over target is a real state, not a zero.
function Macro({ name, remaining }: { name: string; remaining: number }) {
  const over = remaining < 0;
  return (
    <span className="macro">
      <span className="name">{name}</span>
      <span className="amount" data-over={over}>
        {Math.abs(remaining)}g {over ? "over" : "left"}
      </span>
    </span>
  );
}

function ManualEntry({
  logMeal,
  onDone,
  isDinner,
}: {
  logMeal: (meal: Meal) => void;
  onDone: () => void;
  isDinner: boolean;
}) {
  const [form, setForm] = useState({ label: "", calories: "", protein: "", carbs: "", fat: "" });
  const [saving, setSaving] = useState(false);

  // No model call needed, so this path keeps working even when the API is unavailable.
  function save() {
    setSaving(true);
    logMeal({
      id: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
      label: form.label || "Meal",
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      approximate: false,
      source: "manual",
      isDinner,
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="field">
        <label>Meal</label>
        <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Lunch" />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Calories</label>
          <input inputMode="numeric" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
        </div>
        <div className="field">
          <label>Protein (g)</label>
          <input inputMode="numeric" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Carbs (g)</label>
          <input inputMode="numeric" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
        </div>
        <div className="field">
          <label>Fat (g)</label>
          <input inputMode="numeric" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
        </div>
      </div>
      <button className="btn" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Add meal"}
      </button>
    </div>
  );
}

/* Details ------------------------------------------------------------------- */

function Details({ data }: { data: AppState }) {
  const s = data.currentState;
  return (
    <>
      <section>
        <div className="section-label">Meals today</div>
        <div className="card">
          {data.meals.length === 0 ? (
            <div className="empty">No meals logged yet.</div>
          ) : (
            data.meals.map((m) => (
              <div className="meal" key={m.id}>
                {m.imageDataUrl ? <img src={m.imageDataUrl} alt="" /> : <div className="meal-placeholder" style={{ width: 52, height: 52, background: "var(--surface)", borderRadius: 4 }} />}
                <div style={{ flex: 1 }}>
                  <div className="name">{m.label}</div>
                  <div className="detail">
                    {m.calories} kcal · {m.protein}g P · {m.carbs}g C · {m.fat}g F
                  </div>
                  <div className="detail">
                    {new Date(m.loggedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {m.isDinner && " · Dinner"}
                    {m.approximate && " · Approximate"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="section-label">Daily totals</div>
        <div className="card">
          <TotalRow k="Calories" consumed={s.caloriesConsumed} target={s.caloriesTarget} unit="kcal" />
          <TotalRow k="Protein" consumed={s.proteinConsumed} target={s.proteinTarget} unit="g" />
          <TotalRow k="Carbohydrates" consumed={s.carbsConsumed} target={s.carbsTarget} unit="g" />
          <TotalRow k="Fat" consumed={s.fatConsumed} target={s.fatTarget} unit="g" />
        </div>
      </section>

      <section>
        <div className="section-label">Remaining</div>
        <div className="card">
          <RemainingRow k="Calories" value={s.caloriesRemaining} unit="kcal" first />
          <RemainingRow k="Protein" value={s.proteinRemaining} unit="g" />
          <RemainingRow k="Carbohydrates" value={s.carbsRemaining} unit="g" />
          <RemainingRow k="Fat" value={s.fatRemaining} unit="g" />
        </div>
      </section>

      <section>
        <div className="section-label">Recovery context</div>
        <div className="card">
          <div className="small">{s.sleepOrRecoveryContext || "Not provided"}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="k">Usual sleep time</span>
            <span className="v">{formatClock(s.usualSleepTime)}</span>
          </div>
          <div className="row">
            <span className="k">Latest ideal dinner</span>
            <span className="v">{formatClock(s.latestIdealDinnerTime)}</span>
          </div>
          <div className="row">
            <span className="k">Dietary preferences</span>
            <span className="v">{s.dietaryPreferences || "None"}</span>
          </div>
        </div>
      </section>
    </>
  );
}

// Same treatment as Home: over target is stated, not shown as a negative.
function RemainingRow({ k, value, unit, first }: { k: string; value: number; unit: string; first?: boolean }) {
  const over = value < 0;
  return (
    <div className="row" style={first ? { paddingTop: 0 } : undefined}>
      <span className="k">{k}</span>
      <span className="v" data-over={over}>
        {Math.abs(value).toLocaleString()} {unit}
        {over ? " over" : ""}
      </span>
    </div>
  );
}

function TotalRow({ k, consumed, target, unit }: { k: string; consumed: number; target: number; unit: string }) {
  return (
    <div className="row">
      <span className="k">{k}</span>
      <span className="v">
        {consumed.toLocaleString()} <span className="muted">/ {target.toLocaleString()} {unit}</span>
      </span>
    </div>
  );
}

/* Settings ------------------------------------------------------------------ */

function SettingsView({
  data,
  saveSettings,
  resetDay,
}: {
  data: AppState;
  saveSettings: (settings: Settings) => void;
  resetDay: () => void;
}) {
  const [form, setForm] = useState<Settings>(data.settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function save() {
    setSaving(true);
    setSaved(false);
    const settings: Settings = {
      calorieTarget: Number(form.calorieTarget) || 0,
      proteinTarget: Number(form.proteinTarget) || 0,
      carbsTarget: Number(form.carbsTarget) || 0,
      fatTarget: Number(form.fatTarget) || 0,
      usualSleepTime: form.usualSleepTime,
      dietaryPreferences: form.dietaryPreferences,
      sleepRecoveryContext: form.sleepRecoveryContext,
    };
    saveSettings(settings);
    setForm(settings);
    setSaved(true);
    setSaving(false);
  }

  function reset() {
    resetDay();
    setForm(DEFAULT_SETTINGS);
    setSaved(false);
  }

  return (
    <>
      <section>
        <div className="section-label">Daily targets</div>
        <div className="card">
          <div className="field-row">
            <div className="field">
              <label>Calories (kcal)</label>
              <input inputMode="numeric" value={form.calorieTarget} onChange={(e) => setForm({ ...form, calorieTarget: e.target.value as unknown as number })} />
            </div>
            <div className="field">
              <label>Protein (g)</label>
              <input inputMode="numeric" value={form.proteinTarget} onChange={(e) => setForm({ ...form, proteinTarget: e.target.value as unknown as number })} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Carbohydrates (g)</label>
              <input inputMode="numeric" value={form.carbsTarget} onChange={(e) => setForm({ ...form, carbsTarget: e.target.value as unknown as number })} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Fat (g)</label>
              <input inputMode="numeric" value={form.fatTarget} onChange={(e) => setForm({ ...form, fatTarget: e.target.value as unknown as number })} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section-label">Preferences</div>
        <div className="card">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Dietary preferences</label>
            <input value={form.dietaryPreferences} onChange={(e) => setForm({ ...form, dietaryPreferences: e.target.value })} placeholder="No restrictions" />
          </div>
        </div>
      </section>

      <section>
        <div className="section-label">Sleep and recovery</div>
        <div className="card">
          <div className="field">
            <label>Usual sleep time</label>
            <input type="time" value={form.usualSleepTime} onChange={(e) => setForm({ ...form, usualSleepTime: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Last night&apos;s sleep and how you feel</label>
            <textarea
              value={form.sleepRecoveryContext}
              onChange={(e) => setForm({ ...form, sleepRecoveryContext: e.target.value })}
              placeholder="Slept 6 hours. Recovery is low today."
            />
          </div>
          <div className="metric-caption" style={{ marginTop: 12 }}>
            Latest ideal dinner is calculated as your usual sleep time minus a 3 hour buffer.
          </div>
        </div>
      </section>

      <section>
        <button className="btn" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && (
          <div className="status" data-tone="success" style={{ marginTop: 12 }}>
            Settings saved. The recommendation has been updated.
          </div>
        )}
        <button className="btn btn-quiet" style={{ marginTop: 10 }} onClick={reset}>
          Reset today&apos;s data
        </button>
      </section>
    </>
  );
}

/* Helpers ------------------------------------------------------------------- */

// Downscale before upload: keeps the request small and the estimate fast.
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => resolve(String(reader.result));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
