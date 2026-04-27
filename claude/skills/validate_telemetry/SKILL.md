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
