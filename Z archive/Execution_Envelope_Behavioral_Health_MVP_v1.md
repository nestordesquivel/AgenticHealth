# Behavioral Health Agent

## Execution Envelope --- MVP v1

This document defines the execution boundaries for the Behavioral Health
Agent MVP.

All product, engineering, and design decisions must remain within this
execution envelope. When trade-offs arise, prioritize delivering a
complete, functional end-to-end workflow over adding sophistication or
additional features.

------------------------------------------------------------------------

# Project Objective

Build and demonstrate a functional Behavioral Health MVP that helps
users make a better dinner decision.

The MVP should answer one question:

> **Based on what I ate today and how my body is doing, what should I
> have for dinner and by when?**

------------------------------------------------------------------------

# Build Window

Approximately **2.5 hours** of active development time remain.

The product must be functional and demo-ready by the end of the
hackathon.

------------------------------------------------------------------------

# Team

Single builder.

Development is assisted primarily by:

-   Claude Code
-   Codex

Assume limited engineering bandwidth and optimize for rapid execution.

------------------------------------------------------------------------

# Target Fidelity

Deliver a **Functional Hackathon MVP**.

The objective is not production readiness.

The objective is to demonstrate a complete and usable end-to-end product
experience.

A functional workflow is more valuable than technical sophistication.

------------------------------------------------------------------------

# Available Resources

The MVP may leverage existing services whenever they accelerate
development.

Examples include:

-   Foundation model APIs
-   Claude Code
-   Codex
-   Existing frontend frameworks
-   Existing backend services
-   Oura API (if practical)
-   Manual wearable inputs (acceptable fallback)

The implementation should minimize the number of technologies
introduced.

------------------------------------------------------------------------

# Technical Constraints

Prioritize simplicity.

The MVP should avoid unnecessary infrastructure.

Specifically:

-   No custom model training
-   No native mobile application
-   No complex backend architecture
-   No advanced personalization engine
-   No infrastructure that delays the demo

Wearable integration should never become the critical path.

If connecting to Oura or Garmin significantly delays completion, manual
data entry is an acceptable substitute for MVP V1.

------------------------------------------------------------------------

# Success Criteria

By the end of the hackathon, a user should be able to complete the full
product workflow.

Specifically:

1.  Capture or upload meal photos.

2.  Convert meals into estimated calories and macronutrients.

3.  Build the user's Current State.

4.  Incorporate basic recovery or sleep context (API or manual input).

5.  Generate one personalized dinner recommendation that answers:

    -   What should I eat?
    -   How much should I eat?
    -   By when should I eat?

The experience should be navigable, functional, and suitable for a live
demonstration.

------------------------------------------------------------------------

# Execution Principles

When making implementation decisions:

-   Prefer a complete workflow over additional features.
-   Prefer existing services over building new infrastructure.
-   Prefer simple rules over sophisticated intelligence.
-   Prefer working software over architectural perfection.
-   Optimize for demonstrating the complete product concept.

------------------------------------------------------------------------

# Definition of Done

The MVP is complete when a live user can successfully complete the
end-to-end workflow without requiring simulated steps or explaining
missing functionality.

The goal is not to demonstrate individual components.

The goal is to demonstrate a coherent product experience from input to
recommendation.
