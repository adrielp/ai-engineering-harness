---
name: observability-driven-development
description: >
  Observability Driven Development (ODD) — design the trace before the feature.
  Auto-activates when the user wants to "drive with observability", "ODD",
  "instrument first", "narrative-first", "telemetry-driven", or wants to set
  up a local OTel feedback loop with the Aspire dashboard. Pairs with
  /validate_telemetry to verify behaviour against a written narrative.
allowed-tools: Read, Bash, Grep, Glob, Write, Edit
---

# Observability Driven Development (ODD)

> "A feature isn't 'done' when its tests pass; it's done when its trace
> accurately and legibly narrates the entire request lifecycle."
> — *Observability 4.0 is Inferable*, Adriel Perkins

ODD treats **the trace as a first-class design artifact**. You design the span
tree before you write the feature, then run code against a local OTel stack so
every change produces a trace you can read in seconds. No guessing, no
post-hoc instrumentation.

## When to Use ODD

Reach for ODD when **any** of the following are true:

- The work touches a request lifecycle that crosses async boundaries, services,
  or external APIs.
- The system has AI agents, MCP servers, or LLM calls (the five domains:
  context engineering, tool selection & invocation, state management, error
  recovery, memory access).
- Past production debugging stalled because the existing telemetry didn't
  narrate what the code was doing.
- You're about to write code where "the trace" is the only honest spec.

If the work is a pure-compute helper, a config tweak, or a CSS change,
**don't** use ODD — it's overhead.

## The Inner Loop

```
Write Code → Instrument (OTel spans) → Run Locally → OTel Collector → Aspire → Observe → [repeat]
```

Every code change produces a trace. Every trace answers a question. The loop
is measured in seconds, not hours. Detail in [loop.md](loop.md).

## Workflow

1. **Write the narrative spec** before the implementation. Format: see
   [narrative.md](narrative.md). Save to
   `thoughts/shared/telemetry/<feature>.md`. Template:
   `thoughts/shared/telemetry/narrative-template.md`.
2. **Stand up the local stack** if it isn't already running. See
   [local-setup.md](local-setup.md). Prefer the Aspire dashboard via Docker.
3. **Instrument and implement** the feature. For SDK setup, span design, and
   validation rules, route to **`otel_instrumentation`**. For attribute names,
   route to **`otel_semantic_conventions`**.
4. **Observe** in the dashboard after each meaningful change. The trace shape
   should converge toward the spec.
5. **Validate** with `/validate_telemetry thoughts/shared/telemetry/<feature>.md`.

## Cross-Skill Routing

| Concern | Route to |
|---|---|
| SDK setup, span/metric/log design, sensitive-data rules | `otel_instrumentation` |
| Attribute naming, namespaces, `gen_ai.*`, `http.*`, etc. | `otel_semantic_conventions` |
| Collector pipelines, sampling, RED metrics derivation | `otel_collector` |
| OTTL transforms, redaction, normalisation | `otel_ottl` |

ODD owns *the loop*. Routing skills own *the mechanics*.

## Validation

The `/validate_telemetry` slash command activates this section.

### Mode A: Spec-Driven Validation — `/validate_telemetry <spec-path>`

1. Read the narrative spec at `<spec-path>` completely.
2. Confirm the local Aspire dashboard is reachable (see
   [local-setup.md](local-setup.md)).
3. Trigger the feature locally (HTTP call, CLI invocation, message publish).
4. Capture the resulting trace. Prefer Aspire MCP if wired and working
   (see [local-setup.md](local-setup.md) for the standalone-Docker MCP bug);
   fall back to the dashboard's JSON export or an OTLP HTTP intercept.
5. Diff observed vs. spec on three axes:
   - **Shape**: every spec span exists, parented as drawn; no orphan spans;
     no extra `INTERNAL` noise.
   - **Attributes**: every required attribute is present with a non-empty
     value and the right placement (resource vs. span vs. metric).
   - **Metrics**: every required instrument is present with the right unit
     and bounded attribute cardinality.
6. Emit a report:

   ```markdown
   ## Telemetry Validation Report — <feature>

   ### Spec
   - File: <spec-path>
   - Captured trace ID: <id>

   ### Shape
   ✓ Matches | ✗ Missing: <span-name> | ⚠ Extra: <span-name>

   ### Attributes
   ✓ <span>.<attr> present
   ✗ <span>.<attr> missing
   ⚠ <span>.<attr> high-cardinality (sample: <values>)

   ### Metrics
   ✓ <metric> present, unit `<u>`, <N> series
   ✗ <metric> missing

   ### Recommendations
   - <Specific code or config change>
   ```

### Mode B: Generic Health Check — `/validate_telemetry` (no argument)

1. Confirm the local Aspire dashboard is reachable.
2. Sample the most-recent N traces (default 20) and the live metrics list.
3. Validate against the rules already encoded in `otel_instrumentation`
   (see its §7 Validation Checklist) and `otel_semantic_conventions`:
   - Resource attributes: `service.name`, `service.version`,
     `deployment.environment.name`, `service.instance.id`,
     `service.namespace`.
   - Span names low-cardinality (no IDs, query params, request bodies).
   - No CLIENT root spans, no orphan spans, ≤ ~10 INTERNAL/trace.
   - Trace-log correlation: logs carry `trace_id` + `span_id`.
   - Metrics: bounded cardinality, correct units, RED pattern present
     for HTTP services.
   - No sensitive data (`password`, `token`, `authorization`,
     `cookie`, credit-card-shaped strings) in any attribute.
4. Emit a report keyed by the same checklist.

In both modes, **never modify code or config silently**. The report is the
output. The user decides what to fix.

## See Also

- [narrative.md](narrative.md) — narrative spec format
- [loop.md](loop.md) — the inner loop with examples
- [local-setup.md](local-setup.md) — Aspire dashboard, MCP, fallbacks
