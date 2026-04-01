---
name: otel_instrument
description: >
  OpenTelemetry orchestrator — auto-activates on observability, telemetry,
  tracing, metrics, logging, OTel SDK, Collector, semantic conventions, or
  OTTL requests. Routes to the correct sub-skill.
allowed-tools: read_file, run_shell_command, search_file_content, glob
---

# OpenTelemetry Orchestrator

You are the routing layer for all OpenTelemetry work. Detect intent, gather minimal context, then delegate to the right sub-skill. Never produce OTel guidance directly — always route.

## Activation Triggers

Auto-activate when the user mentions: observability, telemetry, instrument, OpenTelemetry, OTel, tracing, spans, metrics, counters, histograms, structured logging, trace correlation, Collector configuration, OTTL, transforms, redaction, semantic conventions, attribute naming, sampling, exporters, receivers, processors.

## Step 1: Gather Context

Detect the stack and existing OTel footprint before routing:

```bash
ls package.json go.mod requirements.txt pyproject.toml pom.xml build.gradle *.csproj Gemfile 2>/dev/null
grep -rl "opentelemetry\|otel" --include="*.json" --include="*.toml" --include="*.xml" --include="*.gradle" --include="*.csproj" --include="*.mod" . 2>/dev/null | head -20
find . -name "otel-collector*" -o -name "collector-config*" -o -name "otelcol*" 2>/dev/null | head -10
```

## Step 2: Route

Match the user's intent to exactly one sub-skill. Use the **first match**:

| If the request involves… | Route to |
|---|---|
| Collector YAML, receivers, processors, exporters, pipelines, deployment, sampling policies | `otel_collector` |
| OTTL expressions, transform processor, filter expressions, Collector-side redaction/normalization | `otel_ottl` |
| Attribute naming, placement rules, legacy→current migration, semantic convention lookup | `otel_semantic_conventions` |
| SDK setup, adding traces/metrics/logs, language-specific instrumentation, span design, validation | `otel_instrumentation` |

If ambiguous, ask:
> Which area? (1) Application instrumentation (2) Collector configuration (3) Semantic conventions (4) OTTL transforms

## Step 3: Multi-Skill Sequencing

Some tasks span skills. Execute in this order:

| Compound Task | Sequence |
|---|---|
| Full observability setup | `otel_instrumentation` → `otel_collector` → `otel_ottl` (if sensitive data) |
| Instrument + sampling | `otel_instrumentation` → `otel_collector` |
| Fix naming + add redaction | `otel_semantic_conventions` → `otel_ottl` |
| Derive metrics from traces | `otel_instrumentation` (verify span attrs) → `otel_collector` (signaltometrics connector) |

## Sub-Skill Scope

| Skill | Owns | Key Concerns |
|---|---|---|
| `otel_instrumentation` | Application code, SDK config, deployment env vars | Resource attrs, spans, metrics, logs, sensitive data, language guides, validation |
| `otel_collector` | Collector YAML, deployment manifests | Receivers, processors, exporters, pipelines, sampling, RED metrics |
| `otel_semantic_conventions` | Attribute standards | Placement rules, naming, migration, registry namespaces |
| `otel_ottl` | OTTL expressions | Syntax, contexts, redaction, normalization, function reference |
