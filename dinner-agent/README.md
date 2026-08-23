# Dinner Decisions

Mobile-first MVP: meal photos → estimated macros → Current State → one dinner recommendation
(what to eat, how much, by when).

## Setup

1. Put your Anthropic API key in `.env.local` (this file is gitignored):

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Start the app:

   ```
   npm install
   npm run dev
   ```

3. Open http://localhost:3000 — or the Network URL printed in the terminal, from a phone on the
   same Wi-Fi, to use the camera.

## How it works

- `lib/store.ts` — in-memory store for settings, meals, and the last recommendation. Resets on
  server restart.
- `lib/agent.ts` — deterministic aggregation and dinner timing, plus the two Claude calls
  (photo → macros, Current State → recommendation).
- `app/api/meal` — logs a meal from a photo or from typed macros.
- `app/api/state` — reads state, saves settings, resets the day.
- `app/page.tsx` — Home, Details, and Settings.

Dinner timing is `usual sleep time − DINNER_SLEEP_BUFFER_MINUTES` (currently 180), set in
`lib/agent.ts`.

## Demo reset

Settings → "Reset today's data".

## Deploying to Vercel

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to `dinner-agent` — the Next.js app is not at the repository root.
   Framework preset, build command, and output directory are detected automatically.
3. Add one environment variable, for Production and Preview:

   | Name | Value |
   |------|-------|
   | `ANTHROPIC_API_KEY` | your Anthropic API key |

   Nothing else is required. There is no database and no authentication.
4. Deploy.

### Known limitation of the deployed demo

State lives in server memory, as specified for the MVP. On Vercel this means the day's
meals are held by whichever serverless instance handles the request: the data can reset
when a new instance starts, and simultaneous visitors may share one instance's data.
This is fine for a single presenter demonstrating the flow, and is the expected trade-off
of running with no database.
