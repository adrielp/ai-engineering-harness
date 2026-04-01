# OpenTelemetry Skills Implementation Plan

## Overview

Create a comprehensive OpenTelemetry instrumentation skill set for the AI Engineering Harness, providing expert-level OTel guidance across Claude Code, OpenCode, and Gemini CLI. The skill set consists of four specialized sub-skills orchestrated by a top-level `otel-instrument` skill that routes to the correct sub-skill based on task context.

## Current State Analysis

- The harness has a mature skill framework across all three tools with established conventions
- No OpenTelemetry skills exist yet
- Claude Code: single-tier `skills/{name}/SKILL.md` with frontmatter
- OpenCode: two-tier `commands/{name}.md` + `skills/{name}/SKILL.md`
- Gemini CLI: two-tier `commands/{name}.toml` + `skills/{name}/SKILL.md`

## Desired End State

A user can invoke `/otel-instrument` (or have it auto-trigger) and receive expert, prescriptive OTel guidance that:
- Detects the task type (app instrumentation, collector config, OTTL transforms, or semantic convention questions)
- Routes to the appropriate sub-skill with full context
- Provides language-specific, opinionated guidance (not tutorials)
- Covers all three telemetry signals (traces, metrics, logs)
- Works identically across Claude Code, OpenCode, and Gemini CLI

## What We're NOT Doing

- Not building a vendor-specific skill (vendor-agnostic, no lock-in)
- Not duplicating OTel documentation — providing prescriptive decision guidance
- Not creating separate skills per programming language (language handled as rules within instrumentation skill)
- Not creating a deployment/infrastructure skill (out of scope for v1)

## Skill Architecture

```
otel_instrument (orchestrator)
├── otel_instrumentation     # App-side SDK setup + telemetry emission
├── otel_collector            # Collector configuration (receivers, processors, exporters, pipelines)
├── otel_semantic_conventions # Attribute naming, selection, and placement
└── otel_ottl                 # OTTL transformation language reference
```

### Routing Logic in `otel_instrument`

The orchestrator detects task type via keyword/intent matching:

| Intent Signal | Routes To |
|---|---|
| "add tracing/metrics/logging", "instrument this service", SDK setup | `otel_instrumentation` |
| "configure collector", "add receiver/processor/exporter", pipeline config | `otel_collector` |
| "what attribute should I use", "rename attribute", naming standards | `otel_semantic_conventions` |
| "write OTTL", "transform telemetry", "filter/redact in collector" | `otel_ottl` |
| Ambiguous — asks clarifying question | — |

## Phase 1: Core Skill Files

### 1.1 `otel_instrument` — Orchestrator

**Files per tool:**

| Tool | Files |
|---|---|
| Claude Code | `claude/skills/otel_instrument/SKILL.md` |
| OpenCode | `opencode/commands/otel_instrument.md` + `opencode/skills/otel_instrument/SKILL.md` |
| Gemini CLI | `gemini/commands/otel_instrument.toml` + `gemini/skills/otel_instrument/SKILL.md` |

**Behavior:**
- Auto-triggered (no `disable-model-invocation`) — activates when user mentions OpenTelemetry, observability, tracing, metrics, logging instrumentation
- Analyzes the user's request and current codebase context
- Routes to the appropriate sub-skill with a clear handoff
- If the task spans multiple sub-skills (e.g., "instrument my app and configure the collector"), sequences them

**SKILL.md structure:**
```yaml
---
name: otel_instrument
description: >
  Expert OpenTelemetry instrumentation orchestrator. Activates on requests
  involving observability, telemetry, tracing, metrics, logging, OpenTelemetry
  SDK setup, collector configuration, semantic conventions, or OTTL transforms.
  Routes to specialized sub-skills based on task context.
allowed-tools: Read, Bash, Grep, Glob
---
```

Body contains:
- "When to Use This Skill" trigger list
- Decision tree for routing to sub-skills
- Multi-skill sequencing logic
- Context-gathering steps (detect language, framework, existing OTel setup)

### 1.2 `otel_instrumentation` — Application-Side Telemetry

**Files per tool:**

| Tool | Skill File | Command File |
|---|---|---|
| Claude Code | `claude/skills/otel_instrumentation/SKILL.md` | N/A |
| OpenCode | `opencode/skills/otel_instrumentation/SKILL.md` | N/A |
| Gemini CLI | `gemini/skills/otel_instrumentation/SKILL.md` | N/A |

**No standalone command** — only invoked via `otel_instrument` orchestrator or direct model triggering.

**SKILL.md structure:**
```yaml
---
name: otel_instrumentation
description: >
  Application-side OpenTelemetry SDK setup and telemetry emission.
  Covers traces, metrics, and structured logging across Node.js, Go, Python,
  Java, .NET, Ruby, and browser/Next.js. Prescriptive guidance for resource
  attributes, span design, metric instrument selection, sensitive data handling,
  and post-deployment validation.
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
---
```

**Body sections (embedded, no separate rule files for v1):**

1. **Entrypoint Decision Process**
   - Detect language/framework from project files (package.json → Node.js, go.mod → Go, etc.)
   - Check for existing OTel setup (grep for `@opentelemetry`, `go.opentelemetry.io`, etc.)
   - Determine scope: new setup vs. adding signals vs. fixing existing

2. **Resource Attributes** (CRITICAL)
   - Prescriptive lookup for `service.name`, `service.version`, `deployment.environment.name`, `service.instance.id`
   - Resolution strategies per language (package.json, go.mod, pom.xml, etc.)
   - `service.version` from git tags, never hardcoded
   - `service.instance.id` as UUID v4 at startup
   - Complete env var examples

3. **Traces / Spans**
   - Span naming: `{verb} {object}`, low-cardinality
   - Kind selection decision table (SERVER/CLIENT/PRODUCER/CONSUMER/INTERNAL)
   - Status code mapping (HTTP 4xx is NOT an error on server spans)
   - Exception recording via logs (not span events — span event API is deprecated)
   - Hygiene: no CLIENT root spans, no orphans, limit INTERNAL to 10, short-duration to 20
   - AlwaysOn sampler at SDK level (defer sampling to Collector)

4. **Metrics**
   - Instrument type selection (Counter / UpDownCounter / Histogram / Gauge)
   - Naming: semconv first, never include unit in name, UCUM units
   - Cardinality management (the #1 cost driver) with series count zones
   - RED metrics pattern (Rate, Errors, Duration)
   - In-memory metric testing code per language

5. **Structured Logging**
   - Never string interpolation — structured key-value pairs
   - Severity level mapping
   - Trace correlation (inject trace_id/span_id into every log)
   - Log events as stable-schema business milestones
   - Single-line JSON for exception stack traces
   - stdout-only delivery for containers

6. **Sensitive Data Prevention** (CRITICAL)
   - Never-instrument list: credentials, financial instruments, government IDs, health records, biometrics
   - URL sanitization (strip query params by default)
   - Database statement sanitization
   - SpanProcessor-based redaction patterns
   - Defence-in-depth: app-level first, Collector-side as safety net (reference `otel_ottl`)

7. **Language-Specific Setup Guides**
   - Node.js, Go, Python, Java, .NET, Ruby, Browser/Next.js
   - Each covers: installation, env vars, SDK activation, custom instrumentation, logging framework integration, graceful shutdown, troubleshooting
   - Written as prescriptive decision sequences, not tutorials

8. **Validation Checklist**
   - Pre-flight: env vars set, protocol match, collector reachable
   - Backend: service discovered, resource attributes correct, span names valid
   - Signal-specific checks for traces, metrics, logs

### 1.3 `otel_collector` — Collector Configuration

**Files per tool:**

| Tool | Skill File |
|---|---|
| Claude Code | `claude/skills/otel_collector/SKILL.md` |
| OpenCode | `opencode/skills/otel_collector/SKILL.md` |
| Gemini CLI | `gemini/skills/otel_collector/SKILL.md` |

**SKILL.md structure:**
```yaml
---
name: otel_collector
description: >
  OpenTelemetry Collector configuration — receivers, processors, exporters,
  pipelines, sampling, and deployment. Covers OTLP, Prometheus, filelog
  receivers; memory_limiter, k8sattributes, filter processors; pipeline
  design; head/tail sampling; and RED metric derivation.
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
---
```

**Body sections:**

1. **Receivers**
   - OTLP (gRPC + HTTP, bind address, TLS)
   - Prometheus (static + K8s service discovery)
   - Filelog (start_at:end, multiline, K8s log paths)
   - Hostmetrics (DaemonSet mode, selective scrapers)

2. **Processors** (CRITICAL)
   - `memory_limiter` — REQUIRED, always first
   - **No batch processor** — use exporter `sending_queue` with `file_storage` instead
   - `resourcedetection`, `k8sattributes` (pod association, passthrough, RBAC)
   - `resource` processor for static cluster attributes
   - `filter` processor for dropping outdated metrics
   - Prescriptive ordering: memory_limiter → resourcedetection/k8sattributes → resource → redaction → other transforms

3. **Exporters**
   - OTLP/gRPC as default
   - Configuration: endpoint, auth, gzip compression, retry, persistent sending_queue
   - OTLP/HTTP fallback
   - Debug exporter (dev only)

4. **Pipelines** (CRITICAL)
   - Service section structure
   - Separate pipelines per signal type
   - Named pipelines for multiple sources
   - `signaltometrics` connector for cross-signal derivation
   - Fan-out pattern
   - Internal telemetry (port 8888)

5. **Sampling**
   - Head sampling (probabilistic)
   - Tail sampling (two-tier: loadbalancingexporter + tailsamplingprocessor)
   - Policy design, buffer sizing, operational complexity warnings
   - RED metric materialization BEFORE sampling

6. **RED Metrics from Traces**
   - `signaltometricsconnector` (recommended) vs `spanmetricsconnector` (prototyping)
   - Four duration histograms for HTTP/RPC server/client spans

7. **Deployment Decision Tree**
   - OTel Operator > Helm Chart > Raw Manifests
   - Capability comparison matrix
   - Specific config for each deployment method

### 1.4 `otel_semantic_conventions` — Attribute Standards

**Files per tool:**

| Tool | Skill File |
|---|---|
| Claude Code | `claude/skills/otel_semantic_conventions/SKILL.md` |
| OpenCode | `opencode/skills/otel_semantic_conventions/SKILL.md` |
| Gemini CLI | `gemini/skills/otel_semantic_conventions/SKILL.md` |

**SKILL.md structure:**
```yaml
---
name: otel_semantic_conventions
description: >
  OpenTelemetry semantic convention guidance — standardized attribute naming,
  selection, placement across telemetry levels, stability/versioning rules,
  and migration from legacy to current conventions.
allowed-tools: Read, Bash, Grep, Glob
---
```

**Body sections:**

1. **Attribute Placement Rules**
   - Five principles: registry first, minimize custom, cardinality balance, correct placement, consistent placement
   - Six telemetry levels: Resource, Scope, Span, Span Event, Log Record, Metric Data Point
   - Placement decision table per level

2. **Common Span Attributes**
   - HTTP (request.method, response.status_code, url.path, server.address)
   - Database (db.system, db.operation.name, db.collection.name)
   - Messaging (messaging.system, messaging.operation.type, messaging.destination.name)
   - RPC (rpc.system, rpc.method, rpc.service)

3. **Versioning & Migration**
   - Stability levels: Stable / Experimental / Deprecated
   - Complete rename table (old → new): `http.method` → `http.request.method`, `net.peer.name` → `server.address`, etc.
   - `_OTHER` normalization pattern

4. **Attribute Registry Namespaces**
   - Full list of 80+ namespaces for reference

### 1.5 `otel_ottl` — Transformation Language Reference

**Files per tool:**

| Tool | Skill File |
|---|---|
| Claude Code | `claude/skills/otel_ottl/SKILL.md` |
| OpenCode | `opencode/skills/otel_ottl/SKILL.md` |
| Gemini CLI | `gemini/skills/otel_ottl/SKILL.md` |

**SKILL.md structure:**
```yaml
---
name: otel_ottl
description: >
  OpenTelemetry Transformation Language (OTTL) reference for writing
  expressions in Collector processors and connectors. Covers syntax,
  contexts, common patterns (redaction, normalization, enrichment),
  and complete function reference.
allowed-tools: Read, Bash, Grep, Glob, Edit, Write
---
```

**Body sections:**

1. **Components Using OTTL** — processors (transform, filter, routing, etc.), connectors, receivers
2. **Syntax** — path expressions, contexts (resource/scope/span/log/metric/datapoint), enumerations, operators
3. **Common Patterns** — set attributes, redact sensitive data (auth headers, credit cards, emails, private keys), drop telemetry, backfill timestamps, normalize high-cardinality paths (URL parameterization, IP masking), limit attribute count/value length
4. **Error Handling** — compilation vs runtime, `error_mode` (propagate/ignore/silent — use `ignore` in production)
5. **Function Reference** — editors (14), converters by category: type checking (8), conversion (4), string (17), hashing (7), encoding (2), parsing (11), time/date (20), collections (8), IDs (5), XML (5), misc (5)

## Phase 2: Tool-Specific Adaptations

### 2.1 Claude Code Specifics

- All 5 skills as `claude/skills/{name}/SKILL.md`
- `otel_instrument`: auto-triggered (no `disable-model-invocation`)
- Sub-skills: `disable-model-invocation: true` (only invoked via orchestrator or explicit `/name`)
- `allowed-tools` uses Claude Code names: `Read, Bash, Grep, Glob, Edit, Write`
- Agent references in body: `codebase-analyzer`, `codebase-locator`, `codebase-pattern-finder`

### 2.2 OpenCode Specifics

- Command file: `opencode/commands/otel_instrument.md` (thin wrapper delegating to skill)
- All 5 skills as `opencode/skills/{name}/SKILL.md`
- No separate command files for sub-skills (orchestrator handles routing)
- `allowed-tools` uses same Claude Code names (bridge plugin)
- Agent references: `codebase_analyzer`, `codebase_locator`, `codebase_pattern_finder`

### 2.3 Gemini CLI Specifics

- Command file: `gemini/commands/otel_instrument.toml` (TOML pointer to skill)
- All 5 skills as `gemini/skills/{name}/SKILL.md`
- No separate command files for sub-skills
- `allowed-tools` uses Gemini names: `read_file, run_shell_command, search_file_content, glob, replace, write_file`
- Agent references: `codebase_investigator`, `codebase_locator`, `codebase_pattern_finder`
- Attribution text uses "Gemini" not "Claude"

## File Manifest

### Claude Code (5 files)
```
claude/skills/otel_instrument/SKILL.md
claude/skills/otel_instrumentation/SKILL.md
claude/skills/otel_collector/SKILL.md
claude/skills/otel_semantic_conventions/SKILL.md
claude/skills/otel_ottl/SKILL.md
```

### OpenCode (6 files)
```
opencode/commands/otel_instrument.md
opencode/skills/otel_instrument/SKILL.md
opencode/skills/otel_instrumentation/SKILL.md
opencode/skills/otel_collector/SKILL.md
opencode/skills/otel_semantic_conventions/SKILL.md
opencode/skills/otel_ottl/SKILL.md
```

### Gemini CLI (6 files)
```
gemini/commands/otel_instrument.toml
gemini/skills/otel_instrument/SKILL.md
gemini/skills/otel_instrumentation/SKILL.md
gemini/skills/otel_collector/SKILL.md
gemini/skills/otel_semantic_conventions/SKILL.md
gemini/skills/otel_ottl/SKILL.md
```

**Total: 17 files**

## Implementation Order

1. Write `otel_instrumentation` (largest, most complex — app-side telemetry)
2. Write `otel_collector` (second largest — collector config)
3. Write `otel_semantic_conventions` (focused — attribute standards)
4. Write `otel_ottl` (self-contained — OTTL reference)
5. Write `otel_instrument` orchestrator (depends on knowing all sub-skill capabilities)
6. Create OpenCode command wrapper + adapt all skills for OpenCode
7. Create Gemini TOML command + adapt all skills for Gemini

## Writing Principles

All skill content must follow these rules:
- **Prescriptive, not descriptive** — "Use a Histogram for latency" not "Histograms capture distributions"
- **Decisions as enumerable processes** — numbered steps, lookup tables, explicit criteria
- **Code examples for every actionable rule** — correct AND `// BAD` patterns
- **No subjective conditions** — no "if the user wants" or "it is likely that"
- **Self-contained sections** — each major section must work independently
- **Language-specific code** in instrumentation skill covers: Node.js, Go, Python, Java, .NET, Ruby, Browser/Next.js

## Success Criteria

### Automated Verification
- [x] All 17 files exist at expected paths
- [x] All SKILL.md files have valid YAML frontmatter
- [x] `stow --dry-run` succeeds for all three tools
- [x] No broken cross-references between skills

### Manual Verification
- [ ] `/otel-instrument` in Claude Code correctly routes to sub-skills
- [ ] Language detection works for Node.js, Go, and Python projects
- [ ] Collector config guidance produces valid YAML
- [ ] Semantic convention lookups return correct current attribute names
- [ ] OTTL patterns are syntactically valid

## References
- OpenTelemetry specification: https://opentelemetry.io/docs/specs/otel/
- Semantic conventions: https://opentelemetry.io/docs/specs/semconv/
- Collector documentation: https://opentelemetry.io/docs/collector/
- OTTL reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl
