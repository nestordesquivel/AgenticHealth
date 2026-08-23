# Behavioral Health Agent
## MVP V1 — Dinner Decision Agent

### MVP Goal

Every evening, answer:

> **Based on what I ate today and how my body is doing, what should I have for dinner and by when?**

---

# Input

## 1. Food Intake

The user takes photos of meals throughout the day.

The system converts each meal into:

- Calories
- Protein
- Carbohydrates
- Fat

## 2. Wearable Data

Connect Garmin and/or Oura.

Around 7:30 PM, retrieve the latest available snapshot:

- Recent sleep
- Recovery / readiness
- Activity
- Energy expenditure
- Historical sleep and wake patterns
- Body Battery or equivalent signal, when available

## 3. User Targets

- Daily calorie target
- Protein target
- Carbohydrate target
- Fat target
- Dietary preferences

---

# Process

## 1. Calculate Nutrition Gap

From all meals logged during the day, calculate:

- Calories remaining
- Protein remaining
- Carbohydrates remaining
- Fat remaining

## 2. Determine Dinner Window

Use:

- Current time
- Historical sleep patterns
- Recent sleep and recovery
- Current activity / recovery state

to estimate the **latest ideal dinner time**.

## 3. Generate Recommendation

Combine:

**Nutrition Gap + Dinner Window + Wearable Context**

to determine:

- What to eat
- How much to eat
- By when to eat it

---

# Output

One dinner recommendation with two components.

### Dinner

Example:

> Aim for approximately 550 kcal, 45–50 g of protein, moderate carbohydrates, and a relatively light overall meal.

### Timing

Example:

> Ideally eat within the next 45–60 minutes and finish dinner by approximately 8:15 PM.

---

# Feedback

After dinner, capture:

- Actual dinner
- Estimated calories and macros
- Actual dinner time

The following morning, capture:

- Sleep outcome from Garmin / Oura

For MVP V1, this information is **stored for later evaluation**. A personalized learning engine is not required yet.

---

# MVP V1 Workflow

```text
Meal Photos
     │
     ▼
Nutrition Extraction
     │
     ├───────────────┐
     │               │
     ▼               ▼
Nutrition Gap    Garmin / Oura
                     Snapshot
     │               │
     └───────┬───────┘
             ▼
      Dinner Decision
             │
             ▼
   ┌───────────────────┐
   │ What should I eat?│
   │ How much?         │
   │ By when?          │
   └───────────────────┘
             │
             ▼
        Actual Dinner
             │
             ▼
     Next Morning Sleep
```

---

# MVP V1 Scope

The first version must be able to:

**Photos → Macros → Evening wearable snapshot → Dinner recommendation + latest ideal dinner time**

Everything beyond that is secondary to proving this core workflow.
