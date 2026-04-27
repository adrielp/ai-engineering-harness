# Writing a Telemetry Narrative

A narrative spec is a short markdown document that describes the trace your
feature **should** produce, written before you write the feature. It's the
contract `/validate_telemetry` checks against.

Specs live in `thoughts/shared/telemetry/<feature>.md`. The template lives at
`thoughts/shared/telemetry/narrative-template.md`.

## Why Prose First, Tree Second

If you can't write the prose paragraph, you don't understand the feature well
enough to instrument it. The trace tree falls out of the prose: each verb that
crosses a boundary (network, process, async) becomes a span; each noun that
matters in production becomes an attribute.

## The Five Sections

### 1. Behaviour Under Observation

One paragraph, present tense, end-to-end. Cover the request entering the
system, every external dependency it touches, and the response leaving the
system. If the feature is async, write the prose for the full causal chain,
not just the synchronous part.

### 2. Target Trace Shape

A tree of spans, indented for parent/child. Each span gets:

- A name in `{verb} {object}` form (route `otel_instrumentation` §2 for the
  full naming rules).
- A `[KIND]` annotation: `[SERVER]`, `[CLIENT]`, `[PRODUCER]`, `[CONSUMER]`,
  `[INTERNAL]`.

Don't include sub-millisecond INTERNAL spans unless they carry diagnostic
value. The cap is roughly ~10 INTERNAL spans per trace.

### 3. Required Span Attributes

For each attribute that must be present, list:

- The span it lives on (or `resource` if it's set at SDK level).
- The attribute name (route `otel_semantic_conventions` if unsure).
- The source of the value (path param, header, business object).
- Why it matters in production debugging — if you can't justify it,
  don't instrument it.

### 4. Required Metrics

For each metric instrument:

- Type (`Counter`, `UpDownCounter`, `Histogram`, `Gauge`).
- Name (dot-separated, no unit suffix).
- UCUM unit.
- Attributes — keep the cartesian product under 1K series. Never include
  user IDs, request IDs, or trace IDs.

### 5. Out of Scope

Sensitive fields, internal helpers below the noise threshold, anything you've
explicitly decided **not** to instrument. This section prevents future drift
into "let's just add a span here" creep.

## What a Good Narrative Looks Like

A good narrative:

- Is shorter than the implementation it describes.
- Survives a refactor — the prose and tree don't reference internal types or
  function names.
- Has every attribute defended by a "why" — production debugging, capacity
  planning, billing, etc.
- Lists what is **not** instrumented.

## What to Skip

- Don't write a narrative for trivial CRUD endpoints unless the
  business logic inside them is non-trivial.
- Don't write a narrative for code that's about to be deleted.
- Don't list every internal helper as a span. The cap is a real cap.

## After You Write It

1. Save to `thoughts/shared/telemetry/<feature>.md`.
2. Implement the feature, instrumenting as you go (see [loop.md](loop.md)).
3. Run `/validate_telemetry thoughts/shared/telemetry/<feature>.md`.
4. Iterate until the report is clean.
