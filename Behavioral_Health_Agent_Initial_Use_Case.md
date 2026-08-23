# Behavioral Health Agent
## Initial Use Case — Dinner Decisions for Better Sleep

### Problem

Dinner is a recurring health decision with an immediate trade-off.

People want to meet their nutritional needs, but eating too much, too late, or with the wrong composition can negatively affect sleep.

Most health apps track nutrition and sleep separately. They explain what happened after the fact, but they do not help users decide **what and when to eat tonight**.

---

## Objective

Help users make a better dinner decision by combining:

- What they have eaten during the day
- Their nutritional needs
- Their current activity and recovery context
- Their historical sleep patterns

The goal is to recommend a dinner that helps meet nutritional needs while minimizing potential disruption to sleep.

---

## Core Question

> **Based on what I ate today and how my body is doing, what should I have for dinner and by when?**

---

## Inputs

The system considers:

- Meals consumed during the day
- Estimated calories and macronutrients
- Activity and workout data
- Recent sleep and recovery
- Historical sleep patterns
- User nutrition goals
- Current time

---

## Decision

The system determines:

- What the user should eat
- How much the user should eat
- The latest ideal time to have dinner

---

## Output

One personalized dinner recommendation.

Example:

> Aim for approximately 550 kcal and 45–50 g of protein, with moderate carbohydrates. Ideally have dinner within the next hour and finish by approximately 8:15 PM.

---

## Feedback

After dinner, the system captures what the user actually ate and when.

The following morning, sleep data provides an outcome that can later be used to evaluate and improve recommendations.

---

## Product Hypothesis

**Personalized dinner recommendations, delivered before the decision is made, can help users meet their nutritional needs while reducing dinner-related disruption to sleep.**
