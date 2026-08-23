# **Behavioral Health Agent — Product Requirements Document**

*Dinner decisions for better sleep*

## Execution Envelope

| Field | Definition |
| :---- | :---- |
| Product | Behavioral Health Agent — MVP V1 / Dinner Decision Agent |
| Objective | Build and demonstrate a functional MVP that helps a user decide **what to have for dinner, how much, and by when**, based on what they ate during the day and how their body is doing. |
| Primary Use Case | **Based on what I ate today and how my body is doing, what should I have for dinner and by when?** |
| Product Type | Functional Hackathon MVP |
| Build Window | Approximately **2.5 hours of active development time** remaining; demo-ready by end of day. |
| Team | **1 builder**, assisted primarily by Claude Code and Codex. |
| Target Fidelity | Navigable, functional end-to-end MVP. Working flow takes priority over polish or production readiness. |
| Available Resources | Foundation-model APIs; Claude Code; Codex; existing frontend/backend frameworks; Oura API if practical; manual wearable input as an acceptable fallback. |
| Tech Stack (V1) | **Next.js** (single app, frontend + API routes) as the frontend/backend framework. **Claude (Anthropic API)** as the single model for both meal-photo vision estimation and dinner-recommendation text generation, to avoid managing two providers. |
| Existing Infrastructure | Reuse existing frameworks/services where possible. Introduce the minimum number of new technologies. |
| Technical Constraints | No model training; no native app; no complex backend; no advanced personalization engine; wearable integration cannot block completion. |
| Expected Deliverable | A functional mobile-first web MVP that can be demonstrated live from meal-photo input through dinner recommendation. |
| Success Criteria | A live user can upload meal photos, obtain estimated calories/macros, see an updated Current State, incorporate basic sleep/recovery context, and receive a dinner recommendation with **what + how much + by when**. |

**Execution rule:** when choosing between completeness and sophistication, choose completeness. Manual or simplified substitutes are acceptable where they preserve the end-to-end product concept.

---

# **1. Product Summary**

**Problem.** Dinner is a recurring health decision with an immediate trade-off. People want to meet their nutritional needs, but eating too much, too late, or with the wrong composition can negatively affect sleep. Most health apps track nutrition and sleep separately and explain what happened after the fact; they do not help the user decide what and when to eat tonight.

**Core Value Proposition.** One recommendation, delivered before the decision is made — not a log of what already happened.

**MVP Objective.** Demonstrate a working loop in which meal photos and basic body context are converted into a simple Current State and then into one actionable dinner recommendation.

| Core Loop |
| :---- |
| Meal photos + user targets + sleep/recovery context → Current State → dinner recommendation (what + how much + by when) → actual dinner → next-morning sleep outcome |

---

# **2. Target User and User Story**

**Target Persona.** A health-conscious individual who wants simple daily guidance on dinner, already tracks or is willing to provide basic nutrition and sleep/recovery information, and does not want to manually maintain a detailed nutrition log.

**Primary User Story.** As a user, I want to take or upload photos of what I eat during the day, see a simple picture of where I stand, and receive one useful dinner recommendation that tells me what to eat, how much, and by when.

---

# **3. MVP Scope**

| In Scope | Out of Scope |
| :---- | :---- |
| Mobile-first web app | Native iOS / Android app |
| Take or upload meal photos | Manual full nutrition logging as the primary workflow |
| AI estimation of calories, protein, carbohydrates, and fat from meal photos | Micronutrient optimization |
| Daily nutrition targets | Medical diagnosis or treatment recommendations |
| Simple Current State | Historical analytics dashboard |
| Basic sleep/recovery context | Advanced physiological modeling |
| Manual wearable inputs as a P0 fallback | Wearable integration as a hard dependency |
| Oura integration if it can be completed without threatening the deadline | Garmin integration if it delays the demo |
| Dinner recommendation: what, how much, by when | Full-day meal planning |
| Simple Details view for meal/nutrition breakdown | Complex chat or general-purpose AI coach |
| Simple Settings for targets, preferences, and recovery/sleep inputs | Advanced personalization / learning engine |
| Capture actual dinner and preserve next-morning sleep outcome when practical | Reinforcement learning, custom ML, or model training |

**MVP boundary:** the first version must reliably demonstrate:

**Photos → Macros → Current State → Sleep/Recovery Context → Dinner Recommendation + Latest Ideal Dinner Time**

---

# **4. User Interaction Model**

| Component | Description |
| :---- | :---- |
| Home | Primary surface. Shows **Current State**, the main **Input** action, and the current **Recommendation**. |
| Details | Secondary view explaining the Current State through meals consumed, estimated calories/macros, nutrition breakdown, and available recovery/activity context. |
| Settings | Infrequent configuration for user profile, nutrition goals, dietary preferences, sleep/recovery inputs, and wearable connection if used. |

**Primary User Flow**

```text
Open App
   │
   ▼
View Current State
   │
   ▼
Take / Upload Meal Photo
   │
   ▼
Meal Nutrition Estimated
   │
   ▼
Current State Updates
   │
   ▼
Dinner Recommendation Updates
   │
   ▼
Repeat During the Day
```

At dinner time, the Home should clearly surface:

```text
WHAT TO EAT
HOW MUCH
BY WHEN
```

**Navigation**

```text
Home
Details
Settings
```

The Home should handle nearly all recurring daily interaction.

**Home mental model**

```text
CURRENT STATE
Where am I right now?

INPUT
How do I update my state?

RECOMMENDATION
What should I do next?
```

---

# **5. Functional Requirements**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| FR1 | User can take or upload a meal photo from the mobile web interface. | P0 |
| FR2 | System sends the meal image to a vision-capable model and returns estimated calories, protein, carbohydrates, and fat. | P0 |
| FR3 | System stores the meal estimate in the current-day session/state. | P0 |
| FR4 | System aggregates all logged meals into daily calories and macros consumed. | P0 |
| FR5 | User can define daily calorie and macro targets. | P0 |
| FR6 | System calculates remaining calorie and macro gaps for the current day. | P0 |
| FR7 | System can receive basic sleep/recovery context through manual input. | P0 |
| FR8 | System can optionally retrieve Oura data if integration is practical within the build window. | P1 |
| FR9 | Home displays a minimal Current State combining nutrition progress and available sleep/recovery context. | P0 |
| FR10 | System generates one dinner recommendation containing what to prioritize, approximate quantity/targets, and latest ideal dinner time. | P0 |
| FR11 | Recommendation updates when a new meal is logged or relevant settings/context change. | P0 |
| FR12 | Details view shows today's logged meals and estimated calories/macros. | P0 |
| FR13 | Settings view allows the user to edit targets, dietary preferences, usual sleep time, and manual recovery/sleep context. | P0 |
| FR14 | User can log dinner using the same photo workflow as other meals. | P0 |
| FR15 | System can retain the next-morning sleep outcome when available for later evaluation. | P1 |
| FR16 | The end-to-end flow is navigable without requiring simulated screens or missing core steps. | P0 |

---

# **6. V1 Decision Logic**

V1 uses simple deterministic calculations plus model-generated language. It does **not** require a trained personalization model.

| Input | Logic | Output |
| :---- | :---- | :---- |
| Meal-photo estimates | Sum calories and macros across meals logged today. | Calories/macros consumed |
| Nutrition targets | Subtract consumed values from daily targets. | Calories/macros remaining |
| Current time | Compare current time with the user's usual sleep time. | Remaining dinner window |
| Usual sleep time | Apply a configurable pre-sleep dinner buffer. | Latest ideal dinner time |
| Recent sleep/recovery context | Use as qualitative context to keep the recommendation conservative and simple; do not make medical claims. | Recovery-aware recommendation context |
| Dietary preferences | Constrain meal composition suggestions. | Compatible meal guidance |
| Nutrition gap + dinner window + context | Generate one concise dinner recommendation. | What to eat + how much + by when |

### Current State

The Current State is the normalized object used by the recommendation step.

Minimum fields:

```text
current_time
calories_consumed
calories_target
calories_remaining
protein_consumed
protein_target
protein_remaining
carbs_consumed
carbs_target
carbs_remaining
fat_consumed
fat_target
fat_remaining
usual_sleep_time
sleep_or_recovery_context
dietary_preferences
```

### Dinner timing rule

For the hackathon MVP, dinner timing should be rule-based and configurable.

```text
latest_ideal_dinner_time =
usual_sleep_time - DINNER_SLEEP_BUFFER
```

`DINNER_SLEEP_BUFFER` is a **demo/product parameter**, not a medical claim. It should be configurable in code so the team can refine it later without changing the product flow.

### Recommendation shape

The final recommendation must answer exactly:

1. **What should I eat?**
2. **How much should I eat?**
3. **By when should I eat it?**

Example structure:

```text
Dinner target
~550 kcal
~45–50 g protein
Moderate carbohydrates

Timing
Ideally finish dinner by ~8:15 PM
```

---

# **7. Adaptation Rules**

For MVP V1, "adaptation" means **recomputing the Current State and recommendation when new information arrives**. It does not mean machine learning.

| Condition | System Behavior |
| :---- | :---- |
| New meal photo is logged | Recalculate calories/macros consumed and remaining; refresh Current State; regenerate recommendation. |
| User changes nutrition targets | Recalculate nutrition gap and regenerate recommendation. |
| User changes usual sleep time | Recalculate latest ideal dinner time and regenerate recommendation. |
| Sleep/recovery context changes | Regenerate recommendation using the updated context. |
| Dinner is logged | Update Current State and preserve actual dinner data; recommendation may switch to a completed/summary state. |
| Oura integration is unavailable | Use manual sleep/recovery inputs without blocking the core workflow. |
| Model cannot confidently estimate a meal | Return a best-effort estimate and flag that it is approximate rather than failing the flow. |
| Photo upload/camera fails or times out | Allow manual macro entry as a fallback so a single failed capture never blocks the flow. |
| Claude API call times out or errors | Retry once; if it still fails, show the last valid Current State/recommendation with a "using last known data" note instead of a blank/broken screen. |

**Personalization assumptions (V1):** the dinner-sleep buffer, macro logic, and recommendation rules are the same for every user — no per-user adjustment or learning happens in V1. A personalized learning engine is explicitly **not required**; dinner and sleep outcomes may be stored for later analysis, not for real-time adaptation.

---

# **8. Data and External Resources**

**External Dependencies**

| Resource | Purpose |
| :---- | :---- |
| Claude API (Anthropic) | Single model for both jobs: (1) convert meal photos into estimated calories/macros, (2) convert the structured Current State into a concise dinner recommendation. One provider, one API key, fewer moving parts. |
| Oura API | Optional source of sleep/recovery context if integration can be completed quickly. |
| Manual sleep/recovery form | P0 fallback so wearable integration never blocks the demo. |
| Browser camera / file upload | Capture meal photos from mobile web. |
| Minimal web framework | Deliver Home, Details, and Settings in one mobile-first application. |

**Dependency principle:** prefer one model provider and one application framework wherever possible.

---

# **9. Technical Approach**

**Architecture**

Recommended hackathon architecture:

```text
Mobile Web App
      │
      ├── Home
      ├── Details
      └── Settings
      │
      ▼
Single Application Backend / API Routes
      │
      ├── Meal Photo Analysis
      ├── Current State Calculator
      └── Dinner Recommendation
      │
      ├───────────────┐
      ▼               ▼
Foundation Model   Oura API
                   (optional)
                       │
                       ▼
                Manual fallback
```

### Implementation strategy

Use a **single mobile-first web application** and avoid introducing separate services unless already available.

A practical V1 implementation can use:

- One frontend framework with server/API-route capability.
- One vision-capable foundation-model API.
- Deterministic application code for aggregation, nutrition gaps, and dinner timing.
- Manual sleep/recovery inputs as the default reliable fallback.
- Oura integration only if it can be added without threatening completion.

Do not introduce a separate Python service, queue, worker, vector database, custom model, or event architecture for this MVP.

**Data Storage**

V1 uses a **single in-memory server-side store** (a plain object/session held by the Next.js API routes) — no database, no file writes. It resets on server restart, which is acceptable for a live demo.

Minimum data objects:

```text
UserSettings
Meal
CurrentState
Recommendation
SleepRecoveryContext
```

The application should preserve current-day data across normal navigation within the same server session. Persistence across devices, server restarts, or long-term history is explicitly not a P0 requirement — if there's spare time at the end, upgrading to a simple JSON file or SQLite is a safe fallback, not a redesign.

---

# **10. UI Requirements**

| Screen | Required Content |
| :---- | :---- |
| Home | **Current State**: calories/macros progress plus minimal recovery/sleep context. **Input**: prominent Take/Upload Meal Photo action. **Recommendation**: what to eat, how much, and by when. |
| Details | Today's meal list with image/label when available; calories and macros per meal; daily totals; remaining targets; basic recovery/activity context. |
| Settings | Daily calorie/macro targets; dietary preferences; usual sleep time; manual sleep/recovery inputs; optional Oura connection if implemented. |

### UI principles

- Mobile-first.
- One primary recurring action: **Take / Upload Meal Photo**.
- Home must remain visually minimal.
- Current State is the center of the product.
- Details explain the Current State but do not clutter the Home.
- Recommendation must be immediately understandable.
- No chat interface is required for V1.
- No historical dashboard is required for V1.

---

# **11. MVP Success / Acceptance Criteria**

The MVP is successful when all P0 criteria below work in one live, navigable flow.

- User can open the mobile web app and move between Home, Details, and Settings.
- User can set nutrition targets and basic sleep/recovery context.
- User can take or upload a real meal photo.
- The system returns estimated calories, protein, carbohydrates, and fat from that photo.
- The meal is added to today's data.
- Current State updates after the meal is added.
- Details shows the logged meal and its estimated nutrition.
- The system calculates remaining daily nutrition needs.
- The system calculates a latest ideal dinner time from current time and the configured sleep pattern.
- The Home displays one dinner recommendation containing:
  - what to eat / prioritize,
  - how much,
  - by when.
- Logging another meal changes the Current State and causes the recommendation to update.
- The workflow works even if Oura is not connected, using manual sleep/recovery context.
- No core demo step requires an explanation of missing functionality or a simulated placeholder.

**Nice-to-have, not required for success:**

- Live Oura API connection.
- Next-morning sleep outcome capture.
- Additional visual polish.

---

# **12. Execution Plan**

| Phase / Time | Deliverable |
| :---- | :---- |
| **0:00–0:25** | Scaffold one mobile-first Next.js app with Home / Details / Settings and basic navigation. Define the in-memory data shape for settings, meals, Current State, and recommendation. |
| **0:25–0:55** | Implement Take/Upload Meal Photo → vision API → calories/macros. Confirm this works with a real meal photo before continuing. |
| **0:55–1:20** | Implement daily aggregation, nutrition gaps, manual sleep/recovery settings, usual sleep time, and Current State. |
| **1:20–1:45** | Implement dinner timing rule and recommendation generation. Connect recommendation to Current State so it updates after new inputs. |
| **1:45–2:05** | Build Details and Settings to the minimum required fidelity. Ensure meal logging and settings changes update Home. |
| **2:05–2:25** | Run one complete end-to-end demo using real photos. Fix blockers only. |
| **2:25–2:30** | Final demo reset, sanity check, and prepare a clean starting state. |

**Critical dependency:** real meal photo → usable calorie/macro estimate must work early. If it does not, fix or switch model/API before spending time on polish.

**Wearable rule:** attempt Oura only after the P0 photo → state → recommendation loop works. If Oura is not integrated by then, use the manual fallback and ship the complete flow.

---

## Demo Thesis

> **Based on what I ate today and how my body is doing, the agent tells me what I should have for dinner, how much, and by when.**
