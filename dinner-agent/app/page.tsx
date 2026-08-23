"use client";

import { useEffect, useRef, useState } from "react";
import type { CurrentState, Meal, Recommendation, Settings } from "@/lib/store";
import { formatClock } from "@/lib/format";

type AppState = {
  settings: Settings;
  meals: Meal[];
  currentState: CurrentState;
  recommendation: Recommendation | null;
};

type Tab = "home" | "details" | "settings";

export default function Page() {
  // #details / #settings deep links, handy when demoing.
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "home";
    const h = window.location.hash.slice(1);
    return h === "details" || h === "settings" ? h : "home";
  });
  const [data, setData] = useState<AppState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Could not load today's data. Refresh to try again."));
  }, []);

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

        {tab === "home" && <Home data={data} setData={setData} busy={busy} setBusy={setBusy} setError={setError} />}
        {tab === "details" && <Details data={data} />}
        {tab === "settings" && <SettingsView data={data} setData={setData} setError={setError} />}
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
  setData,
  busy,
  setBusy,
  setError,
}: {
  data: AppState;
  setData: (s: AppState) => void;
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
        body: JSON.stringify({ imageDataUrl, isDinner }),
      });
      if (!res.ok) throw new Error();
      const next = (await res.json()) as AppState & { meal: Meal };
      setData(next);
      setLastMeal(next.meal);
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
            <span className="value">{Math.max(0, s.caloriesRemaining).toLocaleString()}</span>
            <span className="unit">kcal remaining today</span>
          </div>
          <div className="metric-caption">
            {s.caloriesConsumed.toLocaleString()} of {s.caloriesTarget.toLocaleString()} kcal consumed
            {s.caloriesRemaining < 0 && ` · ${Math.abs(s.caloriesRemaining).toLocaleString()} over target`}
          </div>
          <div className="bar">
            <span
              data-over={s.caloriesConsumed > s.caloriesTarget}
              style={{ width: `${Math.min(100, (s.caloriesConsumed / Math.max(1, s.caloriesTarget)) * 100)}%` }}
            />
          </div>
          <div className="macros">
            <Macro name="Protein" remaining={s.proteinRemaining} target={s.proteinTarget} />
            <Macro name="Carbs" remaining={s.carbsRemaining} target={s.carbsTarget} />
            <Macro name="Fat" remaining={s.fatRemaining} target={s.fatTarget} />
          </div>
        </div>

        <div className="card card-quiet">
          <div className="row" style={{ paddingTop: 0 }}>
            <span className="k">Latest ideal dinner</span>
            <span className="v">{formatClock(s.latestIdealDinnerTime)}</span>
          </div>
          <div className="row">
            <span className="k">Usual sleep time</span>
            <span className="v">{formatClock(s.usualSleepTime)}</span>
          </div>
          <div className="row">
            <span className="k">Recovery context</span>
            <span className="v" style={{ textAlign: "right", maxWidth: "60%" }}>
              {s.sleepOrRecoveryContext || "Not provided"}
            </span>
          </div>
        </div>
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
          {busy ? "Estimating nutrition…" : "Take or upload meal photo"}
        </button>
        <label className="checkline">
          <input type="checkbox" checked={isDinner} onChange={(e) => setIsDinner(e.target.checked)} />
          This meal is dinner
        </label>
        <button className="btn btn-quiet" onClick={() => setManual((m) => !m)}>
          {manual ? "Hide manual entry" : "Enter a meal manually"}
        </button>

        {lastMeal && !busy && (
          <div className="status" data-tone={lastMeal.approximate ? "warning" : "success"} style={{ marginTop: 12 }}>
            Logged {lastMeal.label} · {lastMeal.calories} kcal, {lastMeal.protein}g protein.
            {lastMeal.approximate && " This estimate is approximate."}
          </div>
        )}

        {manual && <ManualEntry setData={setData} onDone={() => setManual(false)} setError={setError} isDinner={isDinner} />}
      </section>

      <section>
        <div className="section-label">Recommendation</div>
        {busy && (
          <div className="status" style={{ marginBottom: 12 }}>
            Updating the recommendation with your new meal.
          </div>
        )}
        {data.recommendation ? (
          <div className="card">
            <div className="rec-headline">{data.recommendation.headline}</div>
            <div style={{ marginTop: 12 }}>
              <div className="rec-line">
                <div className="k">What to eat</div>
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
            {data.recommendation.note && (
              <div className="metric-caption" style={{ marginTop: 12 }}>
                {data.recommendation.note}
              </div>
            )}
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

function Macro({ name, remaining, target }: { name: string; remaining: number; target: number }) {
  return (
    <div className="macro">
      <div className="name">{name} left</div>
      <div className="amount">
        {Math.max(0, remaining)}g <span className="of">/ {target}g</span>
      </div>
    </div>
  );
}

function ManualEntry({
  setData,
  onDone,
  setError,
  isDinner,
}: {
  setData: (s: AppState) => void;
  onDone: () => void;
  setError: (e: string | null) => void;
  isDinner: boolean;
}) {
  const [form, setForm] = useState({ label: "", calories: "", protein: "", carbs: "", fat: "" });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isDinner,
          manual: {
            label: form.label || "Meal",
            calories: Number(form.calories) || 0,
            protein: Number(form.protein) || 0,
            carbs: Number(form.carbs) || 0,
            fat: Number(form.fat) || 0,
          },
        }),
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(null);
      onDone();
    } catch {
      setError("The meal could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
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
          <div className="row" style={{ paddingTop: 0 }}>
            <span className="k">Calories</span>
            <span className="v">{s.caloriesRemaining.toLocaleString()} kcal</span>
          </div>
          <div className="row">
            <span className="k">Protein</span>
            <span className="v">{s.proteinRemaining.toLocaleString()} g</span>
          </div>
          <div className="row">
            <span className="k">Carbohydrates</span>
            <span className="v">{s.carbsRemaining.toLocaleString()} g</span>
          </div>
          <div className="row">
            <span className="k">Fat</span>
            <span className="v">{s.fatRemaining.toLocaleString()} g</span>
          </div>
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
  setData,
  setError,
}: {
  data: AppState;
  setData: (s: AppState) => void;
  setError: (e: string | null) => void;
}) {
  const [form, setForm] = useState<Settings>(data.settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calorieTarget: Number(form.calorieTarget) || 0,
          proteinTarget: Number(form.proteinTarget) || 0,
          carbsTarget: Number(form.carbsTarget) || 0,
          fatTarget: Number(form.fatTarget) || 0,
          usualSleepTime: form.usualSleepTime,
          dietaryPreferences: form.dietaryPreferences,
          sleepRecoveryContext: form.sleepRecoveryContext,
        }),
      });
      if (!res.ok) throw new Error();
      const next = (await res.json()) as AppState;
      setData(next);
      setForm(next.settings);
      setSaved(true);
      setError(null);
    } catch {
      setError("Settings could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    const res = await fetch("/api/state", { method: "DELETE" });
    const next = (await res.json()) as AppState;
    setData(next);
    setForm(next.settings);
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
