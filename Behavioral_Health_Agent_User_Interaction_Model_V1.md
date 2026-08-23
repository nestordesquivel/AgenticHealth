# Behavioral Health Agent

# User Interaction Model (V1)

## Purpose

The MVP is designed around a single daily interaction:

> Help users understand their current state, provide new information,
> and receive one actionable recommendation.

The experience is intentionally minimal. Daily interaction should
require only a few simple actions while the system continuously updates
itself in the background.

------------------------------------------------------------------------

# Information Architecture

The application consists of **three primary areas**.

## 1. Home

The Home is the primary surface of the product.

Users should spend almost all of their time here.

It is composed of three modules.

### Current State

A live snapshot of the user's current condition.

Examples:

-   Nutrition progress
-   Activity
-   Recovery
-   Sleep context

This answers:

> **Where am I right now?**

### Input

The primary interaction with the system.

Initially, this consists of:

-   Take meal photo
-   Upload meal photo

Each new input updates the user's Current State.

### Recommendation

The system's next recommended action.

For MVP V1 this is focused exclusively on dinner.

It answers:

-   What should I eat?
-   How much should I eat?
-   By when should I eat?

------------------------------------------------------------------------

## 2. Details

A secondary area that explains the Current State.

Examples include:

-   Meals consumed today
-   Estimated calories and macronutrients
-   Nutrition breakdown
-   Recovery metrics
-   Daily activity

The Details page exists to answer:

> **Why does my Current State look like this?**

------------------------------------------------------------------------

## 3. Settings

One-time or infrequent configuration.

Includes:

-   User profile
-   Nutrition goals
-   Dietary preferences
-   Wearable connections
-   Notification preferences

------------------------------------------------------------------------

# Navigation

The MVP intentionally minimizes navigation.

``` text
Home

Details

Settings
```

The Home should handle nearly all daily interaction.

------------------------------------------------------------------------

# Daily User Flow

``` text
Open App
      │
      ▼
View Current State
      │
      ▼
Upload Meal Photo
      │
      ▼
Current State Updates
      │
      ▼
Recommendation Updates
      │
      ▼
Repeat Throughout the Day
```

------------------------------------------------------------------------

# Home Mental Model

``` text
                 HOME

──────────────────────────────────

1. CURRENT STATE

Where am I right now?

──────────────────────────────────

2. INPUT

+ Take Meal Photo
+ Upload Meal

──────────────────────────────────

3. RECOMMENDATION

What should I eat?
How much?
By when?

──────────────────────────────────
```

------------------------------------------------------------------------

# Design Principles

## Current State is the center of the product.

Everything else exists to either:

-   Improve the Current State.
-   Generate better recommendations.

## One primary recurring interaction.

The user repeatedly performs one action:

> **Upload a meal photo.**

Everything else should happen automatically whenever possible.

## Recommendations are contextual.

Recommendations are generated from the Current State and update whenever
new information becomes available.

------------------------------------------------------------------------

# MVP Principle

The Home screen should always answer three questions:

1.  Where am I right now?
2.  How do I update my state?
3.  What should I do next?
