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

- `lib/state.ts` — types plus the deterministic logic: daily aggregation, nutrition gaps, and
  the dinner timing rule. Pure, so both the browser and the API routes use it.
- `lib/agent.ts` — the two Claude calls: photo → macros, Current State → recommendation.
- `app/api/meal` — an image in, an estimate out.
- `app/api/recommendation` — a Current State in, one recommendation out.
- `app/page.tsx` — Home, Details, and Settings. Holds the day and saves it to `localStorage`.

The API routes keep no state. The day belongs to the browser, so each visitor has their own
and nothing is shared between them.

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

### State on the deployed demo

Each visitor's day is held in their own browser and persists across a refresh. It is scoped
to the calendar date, so a new day starts clean. Clearing site data, or using a different
browser or device, starts a new day — there is no account and no database, by design.
