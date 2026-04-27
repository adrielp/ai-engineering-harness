# Add Observability Driven Development (ODD) Skill Implementation Plan

## Overview

Introduce **Observability Driven Development (ODD)** to the harness as a first-class workflow alongside TDD. The deliverable is a new auto-triggered skill (`observability-driven-development`) plus a `/validate_telemetry` slash command, both shipped in all four supported tools (OpenCode, Claude Code, Gemini CLI, Pi). The skill teaches a feedback loop where the trace shape is designed *before* feature logic, code runs against a local Aspire-based OTel stack, and observed telemetry is validated against a written narrative spec.

The skill routes deeper OTel concerns to the existing OTel skills:

- SDK setup → `otel_instrumentation`
- Attribute naming → `otel_semantic_conventions`
- Collector pipelines → `otel_collector`
- Redaction / OTTL transforms → `otel_ottl`

This plan is the sister to the existing `add-mattpocock-skills.md` plan: same multi-tool fan-out, same per-tool frontmatter conventions, but additionally introduces a new slash command and a new MCP entry.

## Current State Analysis

**Skills directory**:

| Tool | Path | Naming convention | Notes |
|---|---|---|---|
| OpenCode | `opencode/skills/` | kebab-case | 14 skills |
| Claude | `claude/skills/` | kebab-case | 24 skills (8 manual + 16 auto) |
| Gemini | `gemini/skills/` | snake_case | 22 skills |
| Pi | `pi/skills/` | kebab-case | 20 skills |

**Slash command surface per tool**:

| Tool | Mechanism | Existing example |
|---|---|---|
| OpenCode | `opencode/commands/<name>.md` | `validate_plan.md` |
| Claude | `claude/skills/<name>/SKILL.md` with `disable-model-invocation: true` | `validate_plan/SKILL.md` |
| Gemini | `gemini/commands/<name>.toml` delegates to skill | `validate_plan.toml` (`prompt = "Activate the validate_plan skill."`) |
| Pi | `pi/prompts/<name>.md` | `validate_plan.md` |

**Existing OTel skills** (verified via `ls claude/skills/otel_*`): `otel_instrument` (orchestrator), `otel_instrumentation`, `otel_collector`, `otel_semantic_conventions`, `otel_ottl`. All use snake_case folder names — they pre-date the kebab-case migration. We will not rename them in this plan.

**MCP wiring**:

- `claude/.mcp.json` currently has only `kubernetes` (disabled).
- `opencode/opencode.json` currently has `kubernetes`, `bifrost`, `todoist` (all disabled).
- Gemini and Pi do not expose MCP wiring in this repo (Gemini handles it elsewhere; Pi's `extensions/` is the analogue).

**`thoughts/shared/`** has `tickets/`, `plans/`, `research/` — no `telemetry/`.

**Key reference content**:

- ODD definition (blog): "intentionally instrumenting code's narrative during development, observing its behavior locally, and using feedback to guide development."
- Core tenet (blog): "treating the trace as a first-class design artifact" — "a feature isn't 'done' when its tests pass; it's done when its trace accurately and legibly narrates the entire request lifecycle."
- Inner loop (talk, `slides/inner-loop.md`): `Write Code → Instrument (OTel spans) → Run Locally → OTel Collector → Aspire → Observe → [repeat]`.
- Five Domains of AI Harness Observability (talk `AGENTS.md`): Context Engineering, Tool Selection & Invocation, State Management, Error Recovery, Memory Access.
- Aspire dashboard standalone Docker (canonical command from <https://aspire.dev/dashboard/configuration/>):

  ```bash
  docker run --rm -it -p 18888:18888 -p 4317:18889 -p 4318:18890 -d --name aspire-dashboard \
    mcr.microsoft.com/dotnet/aspire-dashboard:latest
  ```

  Default MCP endpoint: `http://localhost:18891`. Disable auth in dev: `ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true`.
- Aspire MCP standalone bug: [microsoft/aspire#14733](https://github.com/microsoft/aspire/issues/14733) — MCP icon shown but endpoint fails with `fetch failed` against the Docker image. Skill must document this and provide a fallback (read traces via dashboard UI, OTLP HTTP intercept, or curl against the Aspire JSON endpoints when they exist).

## Desired End State

After this plan completes:

1. Each of the four tools has an `observability-driven-development` skill (snake_case for Gemini) with three companion files: `narrative.md`, `loop.md`, `local-setup.md`.
2. Each tool has a `/validate_telemetry` slash command that delegates to the ODD skill's Validation section.
3. `claude/.mcp.json` and `opencode/opencode.json` each contain a disabled-by-default `aspire-dashboard` MCP entry pointing at `http://localhost:18891`, with comments referencing the bug.
4. `thoughts/shared/telemetry/narrative-template.md` exists and is referenced from the skill.
5. `otel_instrument` (all four tools) routes "local instrumentation feedback loop" / "trace as design artifact" requests to ODD.
6. `/create_plan` (all four tools) mentions ODD as a delegation target during plan-shape phase, parallel to its existing `interview` reference.
7. `AGENTS.md` "Commands & Skills" table lists ODD and `/validate_telemetry`. README and CLAUDE.md skill tables are updated.

### Verification

```bash
# All skill files exist
for t in opencode claude pi; do
  ls "$t/skills/observability-driven-development/"{SKILL,narrative,loop,local-setup}.md
done
ls gemini/skills/observability_driven_development/{SKILL,narrative,loop,local-setup}.md

# Slash command entrypoints exist
ls claude/skills/validate_telemetry/SKILL.md
ls opencode/commands/validate_telemetry.md
ls gemini/commands/validate_telemetry.toml
ls pi/prompts/validate_telemetry.md

# MCP entries
grep -A2 aspire-dashboard claude/.mcp.json opencode/opencode.json

# Cross-skill integration
grep -l observability-driven-development \
  claude/skills/otel_instrument/SKILL.md \
  opencode/skills/otel_instrument/SKILL.md \
  gemini/skills/otel_instrument/SKILL.md \
  pi/skills/otel_instrument/SKILL.md

# /create_plan integration
grep -l observability \
  claude/skills/create_plan/SKILL.md \
  opencode/commands/create_plan.md \
  gemini/skills/create_plan/SKILL.md \
  pi/prompts/create_plan.md

# Stow doesn't break
./setup.sh all --restow --dry-run
```

## What We're NOT Doing

- Not building a custom telemetry-diff CLI; `/validate_telemetry` validates by curling the Aspire dashboard's JSON endpoints, by intercepting OTLP HTTP exports, or via the Aspire MCP when working. It's a procedure, not a tool.
- Not bundling docker-compose / DevContainer templates. The skill documents the canonical commands; project-specific scaffolding stays out of the harness.
- Not fixing or working around [microsoft/aspire#14733](https://github.com/microsoft/aspire/issues/14733). We document it.
- Not renaming the existing `otel_*` skills from snake_case to kebab-case — out of scope.
- Not modifying `setup.sh`, `install.ts`, or stow wiring.
- Not adding metadata-validation tests or CI.
- Not adding a `gemini/skills/validate_telemetry/SKILL.md` body — Gemini's TOML command pattern already delegates to a skill, but in our case the skill being delegated to is the ODD skill, not a separate `validate_telemetry` skill. (Pattern detail in Phase 3.)
- Not introducing a `gen_ai.*` semantic-conventions skill in this plan; that belongs in `otel_semantic_conventions` and is its own follow-up.

## Implementation Approach

**Strategy**: Six phases. Phases 1–3 build the new content; phase 4 wires the MCP; phase 5 integrates with existing skills; phase 6 updates documentation. Within each phase, when fanning out across tools, change all four tools in the same phase so the harness stays consistent at every commit boundary.

**Decided naming and frontmatter map** (locked up front):

| Field | OpenCode | Claude | Gemini | Pi |
|---|---|---|---|---|
| Skill folder | `observability-driven-development` | `observability-driven-development` | `observability_driven_development` | `observability-driven-development` |
| `name:` | `observability-driven-development` | `observability-driven-development` | `observability_driven_development` | `observability-driven-development` |
| `allowed-tools:` | `Read, Bash, Grep, Glob, Write, Edit` | `Read, Bash, Grep, Glob, Write, Edit` | `read_file, run_shell_command, glob, write_file, replace` | `Read, Bash, Grep, Glob, Write, Edit` |
| `disable-model-invocation:` | omit | omit | omit | omit |

For the `/validate_telemetry` entrypoint:

| Tool | Entrypoint file | Body |
|---|---|---|
| OpenCode | `opencode/commands/validate_telemetry.md` | Markdown that activates the ODD skill in validation mode |
| Claude | `claude/skills/validate_telemetry/SKILL.md` | `disable-model-invocation: true` skill that activates ODD |
| Gemini | `gemini/commands/validate_telemetry.toml` | TOML with `prompt = "Activate the observability_driven_development skill and run its Validation workflow with $ARGUMENTS."` |
| Pi | `pi/prompts/validate_telemetry.md` | Prompt template that activates ODD |

The body content for OpenCode/Claude/Pi is the same prose modulo frontmatter. The Gemini TOML is a one-liner.

**Decided ODD skill content shape**:

- `SKILL.md` — philosophy, when-to-use, the inner loop diagram, routing to OTel skills, **Validation** section that handles both `/validate_telemetry <spec>` and `/validate_telemetry` no-arg modes.
- `narrative.md` — the spec format. References `thoughts/shared/telemetry/narrative-template.md`.
- `loop.md` — five-step inner loop with the `gen_ai.*` agent example from `slides/inner-loop.md`. Note: the talk's `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4137` is a typo; we use `:4317`.
- `local-setup.md` — Aspire dashboard via Docker, OTLP env vars, MCP endpoint, the standalone bug, fallbacks.

---

## Phase 1: Foundations

### Overview

Lay down the shared scaffolding that the per-tool skills will reference: the `thoughts/shared/telemetry/` directory and a narrative spec template.

### Changes Required

#### 1. Create `thoughts/shared/telemetry/` directory + narrative template

**File**: `thoughts/shared/telemetry/narrative-template.md`

**Contents** (template format that ODD's `narrative.md` will document):

```markdown
---
feature: <feature-name>
created: <YYYY-MM-DD>
status: draft | implemented | validated
related-ticket: thoughts/shared/tickets/<file>.md
related-plan: thoughts/shared/plans/<file>.md
---

# <Feature> Telemetry Narrative

## Behaviour Under Observation

<One paragraph: what does this feature do, from the request entering the system
to the response leaving it? Write the prose first — the trace shape will fall
out of it.>

## Target Trace Shape

<Tree of expected spans. Indent for parent/child. Mark span kind in [brackets].>

```
GET /api/orders/{id}                       [SERVER]
├── auth.verify                             [INTERNAL]
├── orders.lookup                           [INTERNAL]
│   └── SELECT orders                       [CLIENT]
└── enrich.customer                         [INTERNAL]
    └── GET customer-service                [CLIENT]
```

## Required Span Attributes

| Span | Attribute | Source | Why |
|---|---|---|---|
| `GET /api/orders/{id}` | `http.route` | route template | low-cardinality grouping |
| `orders.lookup` | `order.id` | path param | needed for production debugging |

## Required Metrics

| Instrument | Name | Unit | Attributes |
|---|---|---|---|
| Histogram | `http.server.request.duration` | `s` | `http.route`, `http.response.status_code` |

## Out of Scope (Will Not Be Instrumented)

- <Sensitive fields, internal helpers below the noise threshold, etc.>

## Validation

Run `/validate_telemetry thoughts/shared/telemetry/<this-file>.md` after the
feature lands locally. Expected outcome: every span and attribute above is
present in the local Aspire dashboard for at least one captured trace.
```

### Success Criteria

#### Automated Verification

- [x] `ls thoughts/shared/telemetry/narrative-template.md` returns the file.
- [x] Template parses as YAML+Markdown (front-matter delimited by `---`).

#### Manual Verification

- [ ] Template reads cleanly to a developer who has never seen it before.
- [ ] Template references `/validate_telemetry` so a reader can find the validation entrypoint.

---

## Phase 2: ODD Skill Across All Four Tools

### Overview

Create the `observability-driven-development` skill in all four tools, with `SKILL.md` plus three companions (`narrative.md`, `loop.md`, `local-setup.md`). Content is identical across tools modulo frontmatter (see naming/frontmatter map above).

### Changes Required

#### 1. SKILL.md (per tool, content-identical)

**Files**:
- `opencode/skills/observability-driven-development/SKILL.md`
- `claude/skills/observability-driven-development/SKILL.md`
- `gemini/skills/observability_driven_development/SKILL.md`
- `pi/skills/observability-driven-development/SKILL.md`

**Frontmatter** (OpenCode/Claude/Pi):

```yaml
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
```

**Frontmatter** (Gemini):

```yaml
---
name: observability_driven_development
description: <same body>
allowed-tools: read_file, run_shell_command, glob, write_file, replace
---
```

**Body** (verbatim across all four tools):

```markdown
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
```

#### 2. narrative.md (per tool, content-identical)

**Files**: `<tool>/skills/observability-driven-development/narrative.md` (Gemini path uses snake_case folder)

**Body**:

```markdown
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
```

#### 3. loop.md (per tool, content-identical)

**Files**: `<tool>/skills/observability-driven-development/loop.md`

**Body**:

```markdown
# The ODD Inner Loop

```
Write Code → Instrument (OTel spans) → Run Locally → OTel Collector → Aspire → Observe → [repeat]
```

> Every code change produces a trace. Every trace answers a question.
> No guessing. — *OTel Me More: ODD in the AI Era*

## Step-By-Step

### 1. Write Code

Implement the smallest unit that moves the narrative forward. Don't write the
whole feature; write the next span.

### 2. Instrument

Add the span as designed in the narrative. Use the SDK patterns from
`otel_instrumentation` for your language. The span name comes from the
narrative; the attributes come from the narrative. You are not designing here,
you are transcribing.

### 3. Run Locally

Trigger the code path. HTTP request, CLI invocation, message publish — whatever
exercises the new span. The local stack must be running (see
[local-setup.md](local-setup.md)).

### 4. OTel Collector → Aspire

The SDK exports OTLP to the Collector or directly to the Aspire dashboard.
Aspire indexes the spans and exposes them in the UI at
`http://localhost:18888`.

### 5. Observe

Open the trace in the dashboard. Three questions, in order:

1. **Does the trace exist?** If not, the SDK isn't exporting. Check
   `OTEL_EXPORTER_OTLP_ENDPOINT` (must be `http://localhost:4317` for gRPC or
   `http://localhost:4318` for HTTP — the Aspire docker mapping is
   `4317→18889`, `4318→18890`). Check the dashboard logs for receive errors.
2. **Does it match the narrative?** Span name, kind, parent, attributes.
3. **Is anything surprising?** Unexpected spans, retry storms, duplicate
   work, missing context propagation across async boundaries — all of these
   are bugs in the code, not the instrumentation.

### 6. Repeat

Each cycle is seconds, not hours.

## Worked Example: Instrumenting an AI Agent

From the talk's `slides/inner-loop.md`, an agent traced through retrieval and
tool execution:

```python
# Root span: the entire agent turn
with tracer.start_as_current_span("create_agent") as root:

    # Tool selection span
    with tracer.start_as_current_span("retrieval") as ts:
        ts.set_attribute("gen_ai.prompt.tokens", 4200)
        ts.set_attribute("gen_ai.reasoning.steps", 3)
        tool = select_tool(context)

    # Tool invocation span
    with tracer.start_as_current_span(f"execute_tool {tool.name}") as ti:
        ti.set_attribute("gen_ai.tool.name", tool.name)
        result = tool.execute(args)
```

The narrative for this might read:

```
create_agent                              [INTERNAL]
├── retrieval                              [INTERNAL]
│   └── (gen_ai.prompt.tokens, gen_ai.reasoning.steps)
└── execute_tool {name}                    [INTERNAL]
    └── (gen_ai.tool.name)
```

After the first cycle, the dashboard shows the root span. After the second,
the retrieval child appears with `gen_ai.prompt.tokens` populated. After the
third, the tool execution. If the agent loops on tool selection, you see it
immediately as a fan of `execute_tool` siblings — that's a bug the narrative
didn't anticipate, and the loop is what surfaces it.

## Common Pitfalls

| Symptom | Likely cause |
|---|---|
| No traces appear | Wrong OTLP endpoint or wrong protocol (gRPC vs HTTP) |
| Spans appear but no parent/child | Context not propagated across async boundary |
| Attributes missing | Set on wrong scope (resource vs span vs metric) |
| Trace ends mid-flow | Span never ended (missing `try/finally` or `with`) |
| Cardinality explodes | IDs in span name or metric attributes |

For each, route to `otel_instrumentation` for the language-specific fix.
```

#### 4. local-setup.md (per tool, content-identical)

**Files**: `<tool>/skills/observability-driven-development/local-setup.md`

**Body**:

```markdown
# Local OTel Stack — Aspire Dashboard

The fastest local setup is the standalone Aspire dashboard via Docker. It
embeds an OTel-compatible OTLP receiver and a UI for traces, metrics, and
logs at `http://localhost:18888`.

## Quick Start

```bash
docker run --rm -it -d \
  --name aspire-dashboard \
  -p 18888:18888 \
  -p 4317:18889 \
  -p 4318:18890 \
  -p 18891:18891 \
  -e ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true \
  -e DASHBOARD__TELEMETRYLIMITS__MAXLOGCOUNT=1000 \
  -e DASHBOARD__TELEMETRYLIMITS__MAXTRACECOUNT=1000 \
  -e DASHBOARD__TELEMETRYLIMITS__MAXMETRICSCOUNT=1000 \
  mcr.microsoft.com/dotnet/aspire-dashboard:latest
```

| Port mapping | What it is |
|---|---|
| `18888:18888` | Dashboard UI (browse to `http://localhost:18888`) |
| `4317:18889` | OTLP/gRPC receiver (point your SDK here) |
| `4318:18890` | OTLP/HTTP receiver |
| `18891:18891` | MCP endpoint (see caveat below) |

Stop the dashboard with `docker stop aspire-dashboard`.

## Pointing Your SDK At It

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_EXPORTER_OTLP_PROTOCOL=grpc
# Or HTTP:
# export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

For language-specific SDK setup (resource attributes, batching, log/metric
exporters), route to **`otel_instrumentation`**.

## Aspire MCP Integration (Preferred When Working)

When the Aspire MCP endpoint is reachable, an AI agent can query traces and
metrics directly via MCP tool calls instead of scraping the UI.

Default endpoint: `http://localhost:18891`. Auth in dev: unsecured (we set
`ASPIRE_DASHBOARD_UNSECURED_ALLOW_ANONYMOUS=true` above).

The harness ships a disabled-by-default `aspire-dashboard` MCP entry in
`claude/.mcp.json` and `opencode/opencode.json`. Enable it after starting the
dashboard:

```jsonc
// claude/.mcp.json
{
  "mcpServers": {
    "aspire-dashboard": {
      "type": "http",
      "url": "http://localhost:18891",
      "disabled": false   // flip from true
    }
  }
}
```

### Known Bug — Standalone Docker MCP

[microsoft/aspire#14733](https://github.com/microsoft/aspire/issues/14733)
reports that the MCP icon shows in the dashboard UI but the endpoint fails
with `fetch failed` against the standalone Docker image. As of the latest
checked image, MCP is reliable when the dashboard is started by the Aspire
AppHost (full SDK), and *unreliable* via the bare Docker image.

**Fallback strategy when MCP is broken:**

1. Use the dashboard UI directly (`http://localhost:18888`) — copy traceIDs,
   inspect span trees, eyeball attributes.
2. Capture OTLP HTTP exports by running a parallel collector that mirrors
   exports to a JSON file (route to `otel_collector` for the
   `file` exporter recipe).
3. Use the dashboard's REST API for trace listing if the version exposes one
   (varies by image tag).

`/validate_telemetry` will detect when MCP is unreachable and degrade to the
fallbacks automatically. Validation logic lives in the ODD `SKILL.md`
Validation section.

## Alternative Local Stacks

| Stack | When to prefer |
|---|---|
| Aspire dashboard (recommended) | Single-binary, agent-friendly, MCP path |
| Jaeger + Prometheus + Grafana | Already running, want long retention |
| SigNoz / OpenObserve / Tempo | Production-mirror in dev |

The ODD loop works against any of them; only the inspection commands change.
For non-Aspire stacks, route the receiver/exporter wiring to
**`otel_collector`**.

## DevContainer Tip

For repeatable team setup, add a `docker-compose.yml` service for the Aspire
dashboard alongside your app, with the same port mapping above. The harness
does not ship this file — projects own their compose surface.
```

### Success Criteria

#### Automated Verification

- [x] `find {opencode,claude,pi}/skills/observability-driven-development -name '*.md' -type f | wc -l` returns 12 (4 files × 3 tools).
- [x] `find gemini/skills/observability_driven_development -name '*.md' -type f | wc -l` returns 4.
- [x] All four `SKILL.md` files contain the string `Validation` (their validation section).
- [x] All `SKILL.md` files contain a `name:` line that matches their folder name.
- [x] Internal cross-references resolve as siblings: `grep -l "loop.md\|narrative.md\|local-setup.md" {opencode,claude,gemini,pi}/skills/observability*-development/SKILL.md` returns all four.

#### Manual Verification

- [ ] Companion files render legibly (mermaid/ascii blocks aren't garbled).
- [ ] Frontmatter `allowed-tools` uses correct tool names per host (Claude/OpenCode/Pi PascalCase, Gemini snake_case).
- [ ] Worked example in `loop.md` is byte-equivalent to the talk's `slides/inner-loop.md` block, modulo the corrected `4317` port.

---

## Phase 3: `/validate_telemetry` Slash Command

### Overview

Add the slash command in each tool. The command body is intentionally thin: it
delegates to the ODD skill's Validation section. This is the "section inside
the ODD skill, command delegates to it" pattern decided in planning.

### Changes Required

#### 1. Claude — skill with `disable-model-invocation: true`

**File**: `claude/skills/validate_telemetry/SKILL.md`

```yaml
---
name: validate_telemetry
description: >
  Validate locally-emitted telemetry against a written narrative spec, or
  run a generic health check on the local OTel stack. Delegates to the
  observability-driven-development skill's Validation section.
disable-model-invocation: true
argument-hint: "[spec-file-path]"
allowed-tools: Read, Bash, Grep, Glob
---

# Validate Telemetry

Activate the **observability-driven-development** skill and run its
**Validation** section.

## Mode Detection

- If an argument was provided and it resolves to an existing file under
  `thoughts/shared/telemetry/`, run **Mode A — Spec-Driven Validation**.
- Otherwise (no argument, or argument doesn't resolve), run
  **Mode B — Generic Health Check**.

## Pre-Flight

Before running either mode, confirm:

1. The local Aspire dashboard is reachable (`curl -sf http://localhost:18888`
   returns 2xx).
2. The user's service is configured to export to the dashboard
   (`OTEL_EXPORTER_OTLP_ENDPOINT` set).

If either fails, surface a one-line setup hint pointing at
`observability-driven-development/local-setup.md` and stop.

## Output

Per the report format in the ODD skill's Validation section. Don't modify
code or config silently — the report is the output.

## Relationship to Other Commands

```
Ticket → /create_plan → [ODD: write narrative]
       → /implement_plan → /validate_plan (correctness)
       → /validate_telemetry (telemetry) → /commit
```
```

#### 2. OpenCode — slash command markdown

**File**: `opencode/commands/validate_telemetry.md`

Same body as the Claude SKILL.md above, with frontmatter swapped to the
OpenCode style (no `disable-model-invocation`):

```yaml
---
name: validate_telemetry
description: Validate locally-emitted telemetry against a narrative spec, or run a generic health check.
argument-hint: "[spec-file-path]"
---
```

The body is identical otherwise.

#### 3. Gemini — TOML delegate

**File**: `gemini/commands/validate_telemetry.toml`

```toml
description = "Validate Telemetry"
prompt = """
Activate the observability_driven_development skill and run its Validation
workflow. Argument: $ARGUMENTS. If $ARGUMENTS resolves to an existing file
under thoughts/shared/telemetry/, use spec-driven mode; otherwise run the
generic health check.
"""
```

(No new `gemini/skills/validate_telemetry/SKILL.md` is created — Gemini's TOML
delegates straight to the ODD skill, which already contains the validation
content.)

#### 4. Pi — prompt template

**File**: `pi/prompts/validate_telemetry.md`

```yaml
---
description: Validate Telemetry
---
```

Body identical to OpenCode.

### Success Criteria

#### Automated Verification

- [x] `ls claude/skills/validate_telemetry/SKILL.md opencode/commands/validate_telemetry.md gemini/commands/validate_telemetry.toml pi/prompts/validate_telemetry.md` returns 4 files.
- [x] `grep -l 'observability' claude/skills/validate_telemetry/SKILL.md opencode/commands/validate_telemetry.md gemini/commands/validate_telemetry.toml pi/prompts/validate_telemetry.md` returns all 4 (each delegates to ODD by name).
- [x] `claude/skills/validate_telemetry/SKILL.md` declares `disable-model-invocation: true`.

#### Manual Verification

- [ ] In Claude, typing `/validate_telemetry` lists the command and `/validate_telemetry <path>` accepts the argument.
- [ ] In Gemini, the TOML file is picked up by the CLI's command list.
- [ ] In Pi, the prompt template appears under `pi prompts list` (or equivalent).

---

## Phase 4: Aspire Dashboard MCP Wiring

### Overview

Register the Aspire dashboard's MCP endpoint in the two tools that have JSON
MCP wiring (Claude, OpenCode), disabled by default.

### Changes Required

#### 1. Edit `claude/.mcp.json`

Add an entry under `mcpServers`:

```json
{
  "mcpServers": {
    "kubernetes": {
      "command": "npx",
      "args": ["-y", "kubernetes-mcp-server@latest"],
      "disabled": true
    },
    "aspire-dashboard": {
      "type": "http",
      "url": "http://localhost:18891",
      "disabled": true
    }
  }
}
```

(JSON does not allow comments. The bug caveat lives in
`local-setup.md`, not in `.mcp.json`.)

#### 2. Edit `opencode/opencode.json`

Add under `mcp`:

```json
{
  "mcp": {
    "kubernetes": { "...": "unchanged" },
    "bifrost": { "...": "unchanged" },
    "todoist": { "...": "unchanged" },
    "aspire-dashboard": {
      "type": "remote",
      "url": "http://localhost:18891",
      "enabled": false
    }
  }
}
```

(OpenCode uses `enabled: false`, not `disabled: true` — match its existing
key shape.)

### Success Criteria

#### Automated Verification

- [x] `grep -A3 aspire-dashboard claude/.mcp.json` shows `"disabled": true`.
- [x] `grep -A3 aspire-dashboard opencode/opencode.json` shows `"enabled": false`.
- [x] Both files still parse as valid JSON: `python3 -c 'import json; json.load(open("claude/.mcp.json"))' && python3 -c 'import json; json.load(open("opencode/opencode.json"))'`.

#### Manual Verification

- [ ] Enabling the Aspire MCP entry (after `docker run` from `local-setup.md`)
      surfaces tool calls in Claude's `/mcp` panel — *or* fails per
      [microsoft/aspire#14733](https://github.com/microsoft/aspire/issues/14733),
      in which case `local-setup.md`'s fallback path is exercised.

---

## Phase 5: Cross-Skill Integration

### Overview

Two integrations: the OTel orchestrator routes ODD-shaped requests to the new
skill; `/create_plan` mentions ODD as a delegation target alongside the
existing `interview` mention.

### Changes Required

#### 1. Edit `otel_instrument` orchestrator (all four tools)

**Files**:
- `claude/skills/otel_instrument/SKILL.md`
- `opencode/skills/otel_instrument/SKILL.md` (verify exists; if not, this
  bullet doesn't apply for OpenCode — `otel_instrument` is Claude-flavoured
  in some tools)
- `gemini/skills/otel_instrument/SKILL.md`
- `pi/skills/otel_instrument/SKILL.md`

**Verification step before editing**: run
`ls {opencode,claude,gemini,pi}/skills/otel_instrument/SKILL.md` and only edit
the files that exist. Implementation note: based on the existing harness, all
four tools currently host `otel_instrument` (skipped only if a tool's directory
is missing).

**Edit**: in §2 "Route", add a row to the routing table:

```markdown
| Local instrumentation feedback loop, "drive with observability", trace-as-design-artifact, narrative-first, ODD | `observability-driven-development` |
```

Place this row above `otel_instrumentation` (the loop wraps SDK setup; SDK
setup is a sub-step inside the loop).

Also add to §3 "Multi-Skill Sequencing":

```markdown
| ODD on a new feature | `observability-driven-development` (write narrative) → `otel_instrumentation` (instrument) → `observability-driven-development` (validate) |
```

#### 2. Edit `/create_plan` (all four tools)

**Files**:
- `claude/skills/create_plan/SKILL.md`
- `opencode/commands/create_plan.md`
- `gemini/skills/create_plan/SKILL.md`
- `pi/prompts/create_plan.md`

**Edit**: append a section near the existing "Stress-testing the plan"
section (introduced in `add-mattpocock-skills.md`):

```markdown
### Telemetry-bearing features

When the plan touches a request lifecycle, an AI agent/MCP, or any work where
the trace is the spec, delegate to the `observability-driven-development`
skill. The plan should include:

- A reference to the narrative spec at `thoughts/shared/telemetry/<feature>.md`
  (to be written before implementation).
- A `/validate_telemetry` step in Phase verification, parallel to
  `/validate_plan`.
```

### Success Criteria

#### Automated Verification

- [x] `grep -l observability-driven-development {opencode,claude,gemini,pi}/skills/otel_instrument/SKILL.md` returns every file that exists in the glob.
- [x] `grep -l observability-driven-development claude/skills/create_plan/SKILL.md opencode/commands/create_plan.md gemini/skills/create_plan/SKILL.md pi/prompts/create_plan.md` returns all 4.
- [x] Routing tables in `otel_instrument/SKILL.md` still parse as markdown tables (no broken pipes).

#### Manual Verification

- [ ] Asking "I want to drive this feature with observability" in any of the
      four tools surfaces ODD via `otel_instrument` routing.
- [ ] `/create_plan` of a telemetry-bearing ticket produces a plan that
      references `thoughts/shared/telemetry/` and `/validate_telemetry`.

---

## Phase 6: Documentation

### Overview

Update `AGENTS.md`, `README.md`, and `CLAUDE.md` to reflect the new skill,
command, and directory.

### Changes Required

#### 1. AGENTS.md

In the "Commands & Skills" table, add two rows:

```markdown
| `/validate_telemetry` | ✓ | ✓ | ✓ | ✓ | Manual | Validate local telemetry against a narrative spec |
| `observability_driven_development` | ✓ | ✓ | ✓ | ✓ | Auto | Design the trace before the feature; local OTel feedback loop |
```

(Use `observability_driven_development` snake_case in the AGENTS.md table to
match its existing canonical-name convention.)

In the Repository Structure tree, update skill counts:

- `opencode/skills/` → +1
- `claude/skills/` → +2 (ODD + `validate_telemetry`)
- `gemini/skills/` → +1 (Gemini's `validate_telemetry` is a command, not a
  skill)
- `pi/skills/` → +1

In the "MCP Configuration" section, add `aspire-dashboard` to the available
servers list:

```markdown
Available MCP servers: `kubernetes` (disabled by default), `aspire-dashboard`
(disabled by default; see [microsoft/aspire#14733](https://github.com/microsoft/aspire/issues/14733)
for the standalone-Docker MCP caveat)
```

In the Workflow section, add the validate_telemetry step to the workflow
diagram:

```markdown
Ticket → /create_plan → /implement_plan → /validate_plan → /validate_telemetry → /commit
```

(Note: `/validate_telemetry` is optional — only for telemetry-bearing
features. Mark accordingly.)

#### 2. CLAUDE.md

In "Key Skills (Claude Code)" table, add:

```markdown
| `observability_driven_development` | (auto) | Design the trace before the feature; local OTel feedback loop |
| `validate_telemetry` | `/validate_telemetry` | Validate local telemetry against a narrative spec |
```

In the OpenTelemetry Skills section, add a row:

| Skill | Scope |
|---|---|
| `observability_driven_development` | The ODD inner loop, narrative specs, local Aspire setup, `/validate_telemetry` |

#### 3. README.md

Verify whether README.md lists skills explicitly. If yes, add ODD and
`validate_telemetry` with one-line descriptions to the appropriate section.
If README.md only describes the harness generically, no per-skill update is
needed — the AGENTS.md table is the canonical surface.

### Success Criteria

#### Automated Verification

- [x] `grep observability_driven_development AGENTS.md` returns ≥ 1 hit (Commands & Skills table row; tree uses counts not names).
- [x] `grep validate_telemetry AGENTS.md` returns ≥ 2 hits (table row + workflow diagram + workflow step).
- [x] `grep observability_driven_development CLAUDE.md` returns ≥ 1 hit.
- [x] Skill counts in AGENTS.md tree match `ls <tool>/skills | wc -l`.

#### Manual Verification

- [ ] Tables render correctly with check marks.
- [ ] Workflow diagram is consistent across AGENTS.md and CLAUDE.md.

---

## Testing Strategy

### Per-Phase

Each phase's automated checks run before marking the phase complete. Stop and
fix on first failure rather than batching.

### End-to-End

After all phases:

```bash
# Skill counts per tool — sanity check
for t in opencode claude gemini pi; do
  echo "$t: $(ls $t/skills 2>/dev/null | wc -l) skills"
done

# All ODD skill files exist
for t in opencode claude pi; do
  ls -1 "$t/skills/observability-driven-development/"
done
ls -1 gemini/skills/observability_driven_development/

# All slash command entrypoints exist
ls -1 claude/skills/validate_telemetry/SKILL.md \
       opencode/commands/validate_telemetry.md \
       gemini/commands/validate_telemetry.toml \
       pi/prompts/validate_telemetry.md

# Frontmatter validity (requires PyYAML)
find {opencode,claude,gemini,pi}/skills/observability*-development \
     {opencode,claude,gemini,pi}/skills/validate_telemetry \
     -name 'SKILL.md' 2>/dev/null | while read f; do
  python3 -c "
import sys, yaml
content = open('$f').read()
parts = content.split('---', 2)
if len(parts) < 3:
    print('NO FRONTMATTER:', '$f'); sys.exit(1)
fm = yaml.safe_load(parts[1])
assert 'name' in fm, 'missing name in $f'
assert 'description' in fm, 'missing description in $f'
print('OK:', '$f')
"
done

# JSON validity
python3 -c 'import json; json.load(open("claude/.mcp.json"))'
python3 -c 'import json; json.load(open("opencode/opencode.json"))'

# Stow doesn't break
./setup.sh all --restow --dry-run
```

### Manual Smoke Tests

After stowing one tool (`./setup.sh claude --restow`):

1. **Auto-trigger**: in a fresh Claude session, prompt "I want to drive this
   feature with observability — let's design the trace first." Expect ODD to
   surface.
2. **Slash command**: `/validate_telemetry` with no args prompts for a
   running Aspire dashboard and runs the generic health check.
3. **Spec mode**: copy `thoughts/shared/telemetry/narrative-template.md` to
   `thoughts/shared/telemetry/smoke-test.md`, fill in a trivial trace shape,
   and run `/validate_telemetry thoughts/shared/telemetry/smoke-test.md`.
   Expect a report keyed by the spec.
4. **Aspire dashboard**: run the docker command from `local-setup.md` and
   confirm `http://localhost:18888` loads. Set
   `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317` in any sample app and
   confirm traces appear.
5. **MCP enable**: flip the `aspire-dashboard` entry in `claude/.mcp.json`
   to `"disabled": false`, restart Claude, and observe whether MCP connects
   or hits the documented bug. Either outcome is acceptable; the fallback
   in `local-setup.md` covers the broken case.
6. **Cross-skill routing**: ask "set up the OTel SDK for my Node app" in a
   harness-stowed session; expect routing to `otel_instrumentation`
   (unchanged behaviour). Ask "let's drive this feature with observability";
   expect routing to ODD.

## References

- Original ticket: `thoughts/shared/tickets/add-odd-skill.md`
- Sister plan (multi-tool fan-out pattern): `thoughts/shared/plans/add-mattpocock-skills.md`
- Adriel Perkins, "Observability 4.0 is Inferable": <https://adrielperkins.substack.com/p/observability-40-is-inferable>
- Adriel Perkins, "OTel Me More: ODD in the AI Era": <https://github.com/adrielp/otel-me-more-ai-talk>
- Aspire Dashboard configuration: <https://aspire.dev/dashboard/configuration/>
- Standalone Docker MCP bug: <https://github.com/microsoft/aspire/issues/14733>

---

## Notes for Implementation

- **Verbatim code blocks**: the agent example in `loop.md` and the docker
  command in `local-setup.md` should be preserved exactly as drafted here —
  these are the load-bearing references.
- **Port typo**: the talk's `slides/inner-loop.md` has
  `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4137` (note: `4137`, not
  `4317`). Use `4317` in `loop.md` / `local-setup.md`.
- **JSON has no comments**: the bug caveat for the Aspire MCP lives in
  `local-setup.md`, not in `.mcp.json` or `opencode.json`.
- **Gemini distinction**: Gemini does *not* get a `validate_telemetry` skill
  folder — its TOML command delegates straight to the ODD skill. This is the
  established pattern and matches the user's "command delegates to it" choice.
- **Auto-trigger description**: ODD's `description:` lists explicit phrases
  ("ODD", "drive with observability", "instrument first", "narrative-first",
  "telemetry-driven") to maximise match rate without polluting unrelated
  conversations.
- **Order of edits within Phase 5**: edit `otel_instrument` last in each tool
  pass — it references the new skill name, so the new skill must already exist
  on disk for the routing reference to be valid.
- **Stow safety**: every new file lives under an existing stow source
  directory. Run `./setup.sh all --restow --dry-run` once after Phase 2 and
  again after Phase 6 to catch any path mistakes early.
