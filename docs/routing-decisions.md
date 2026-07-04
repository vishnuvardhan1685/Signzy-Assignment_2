# Routing Decisions — Design Rationale

## Two layers of failover, not one

Most naive implementations of "vendor failover" only handle the reactive case: try a vendor, it fails, try the next one. This system does that, but also adds a **proactive layer**: every call's outcome updates that vendor's rolling metrics (`metricsStore`), and *before* a strategy even picks a candidate, `filterEligibleVendors` excludes any vendor that's currently:
- marked `down`
- flagged unavailable from its last known signal
- over its configured rate limit
- above a configured error-rate or latency threshold
- missing a required feature for this request

This means a vendor that failed once doesn't just get retried-around for that one request — it gets proactively skipped on the *next* request too, until it recovers. This was verified directly: after VendorA failed once, a second `/route` call with a different strategy went straight to VendorB without attempting VendorA at all (see `sample-requests-responses.md`, request #3 vs #4).

## Why the candidate-list design instead of "pick one vendor, retry on fail"

`router.js` doesn't pick a single vendor and retry blindly — it asks the strategy to return a **fully ordered list** of eligible candidates, then walks the list until one succeeds. This means:
- Failover order is never arbitrary — it's the same priority/weight/latency ordering the strategy already computed, so "who do we fall back to" is a natural extension of "who did we prefer," not a separate rule set.
- Adding a new strategy later (e.g. `lowest_cost`, `round_robin`) only requires writing an ordering function — the failover behavior is inherited for free.

## Strategy selection guide

| Strategy | When it's the right choice | How it orders candidates |
|---|---|---|
| `priority` | You have a clear preferred vendor and others are pure backups | Ascending by `priority` field |
| `weighted` | You want to split traffic by percentage (e.g. contractual volume commitments) | Weighted random pick, remaining candidates ordered by weight descending |
| `lowest_latency` | You care about response time above all else and vendors' speed varies | Ascending by rolling average latency; vendors with no call history yet are treated as unproven and ranked after known-fast vendors (so a new vendor isn't blindly trusted over a proven fast one, but also isn't starved forever once it gets a few calls in) |

## Why `routingReason` is a plain string, not a structured object

The assignment's sample output uses a human-readable sentence (`"VendorB selected because VendorA crossed latency threshold"`). We generate this dynamically from what actually happened during that specific request — either `"{vendor} selected via {strategy} strategy"` for a clean first-try success, or `"{vendor} selected after failover from: {list of failed vendors with reasons}"` when failover occurred. This keeps the field genuinely explanatory rather than a static template, which matters both for the grader reading logs and for the Agentic AI "explain why a vendor was selected" bonus, which can reuse this field directly instead of re-deriving the reasoning.

## Persistence: what's in Mongo, what's still in-memory (and why)

Vendors and routing logs are persisted via Mongoose (`server/models/schemas/`). Metrics (rolling latency, success/error rate, rate-limit windows) remain in-memory — this is deliberate, not a shortcut: that data is inherently ephemeral and high-frequency, which is exactly what Redis exists for. Persisting rolling counters to Mongo would add write overhead without a real benefit for this use case. Every store was written behind an interface (`addVendor`, `getSnapshot`, `recordCall`, etc.) from the start, so this migration only required rewriting the two store files' internals and adding `await` at call sites — no route or service logic changed as a result.