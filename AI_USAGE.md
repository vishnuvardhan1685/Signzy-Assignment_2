# AI Usage

## Overview
This entire project was built collaboratively with Claude (Anthropic) as an AI pair-programmer across
the full stack: architecture, implementation, and documentation.

## What was AI-assisted vs. human-directed

- **Architecture decisions** (Node/Express + Mongoose core, separate Python/FastAPI agent service,
  store-interface pattern for swappable persistence) were human-directed, with Claude proposing
  options and tradeoffs.
- **Core routing/failover/metrics logic** (`server/services/router.js`, strategy modules) was
  AI-assisted implementation of a human-specified design: 2-layer failover (proactive exclusion +
  reactive retry), 3 strategies (priority, weighted, lowest-latency).
- **Mongoose migration** (in-memory → MongoDB-backed stores) was AI-assisted, preserving the existing
  store interface so no route/service code needed to change.
- **Bug found & fixed during migration**: the in-memory rate-limit default of `Infinity` had to become
  `null` for Mongo/JSON compatibility, which silently broke the eligibility check in `failover.js`
  (`null !== undefined` evaluates true, so `callsInLastMinute >= null` coerced to `>= 0`). Fixed by
  checking `!= null` instead. Caught via manual review, not a test suite — worth adding a regression
  test if this project continues.

## Agentic AI bonus feature

Two Gemini-Flash-powered endpoints in a separate `ai-agent/` FastAPI service:

1. **`POST /generate-routing-config`** — takes a plain-English instruction (e.g. "Use Vendor A for 70%
   traffic, Vendor B for 30%, switch to Vendor C if latency crosses 2s or error rate exceeds 5%") and
   returns structured JSON matching the platform's routing-rule schema. Prompted with an explicit
   schema + rules (strategy inference, threshold parsing) rather than open-ended generation, to keep
   output deterministic enough to use directly as config.
2. **`POST /explain-routing`** — takes the `routingReason` string already generated deterministically
   by `router.js` and rewrites it as a natural-language sentence for non-technical stakeholders. This
   is a presentation layer only — the underlying routing decision is unchanged and fully deterministic;
   Gemini never influences which vendor is actually selected.

Both are proxied through Node (`server/services/aiAgentClient.js`, mounted at `/ai/*`) but also usable
standalone by curling the FastAPI service directly on port 8001. The Node proxy fails soft: if the AI
agent is down or slow, `/explain-routing` falls back to the raw `routingReason` rather than breaking
the response.

## What was NOT AI-generated
- The choice of MongoDB vs Redis for metrics (deliberate, human decision based on data lifecycle —
  ephemeral high-frequency counters vs. persistent vendor/log records).
- Final verification that routing/failover/metrics behavior is correct — done via manual curl testing
  against a running server, not just code review.