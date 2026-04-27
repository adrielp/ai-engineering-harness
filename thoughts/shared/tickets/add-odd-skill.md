---
ticket: HARNESS-ODD-001
title: Add Observability Driven Development (ODD) skill + /validate_telemetry command
created: 2026-04-27
priority: Medium
estimated_effort: L
---

# HARNESS-ODD-001 Add Observability Driven Development (ODD) skill + /validate_telemetry command

## Problem Statement

The harness ships strong OpenTelemetry skills (`otel_instrument`, `otel_instrumentation`, `otel_collector`, `otel_semantic_conventions`, `otel_ottl`) for *configuring* observability, but nothing teaches AI agents how to *develop with observability as the driver*. Today the prescribed workflow is:

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```

This validates code correctness — not whether the resulting telemetry actually narrates the request lifecycle. As more AI-generated code lands in projects using this harness, we need a feedback loop where:

1. The trace shape is defined as a design artifact *before* feature logic.
2. Code runs against a local OTel stack so the agent can observe its own behavior in seconds.
3. A formal command verifies the observed telemetry matches the designed narrative.

The author has formalized this practice as **Observability Driven Development (ODD)** in:
- Blog: <https://adrielperkins.substack.com/p/observability-40-is-inferable>
- Talk: <https://github.com/adrielp/otel-me-more-ai-talk>

The harness should make ODD a first-class workflow alongside TDD.

## Desired Outcome

Two new harness primitives, available in all four supported tools (Claude Code, OpenCode, Gemini CLI, Pi):

1. **`observability-driven-development` skill** (auto-triggered) — teaches the ODD methodology, the inner loop, the narrative spec format, and how to run the local Aspire-based observability stack. Routes to the existing OTel skills for SDK/Collector/conventions/OTTL specifics.
2. **`/validate_telemetry` slash command** — delegates into the ODD skill's validation workflow. With a spec-file argument, diffs observed traces against the narrative; without an argument, runs a generic local-telemetry health check using the rules already encoded in `otel_instrumentation` and `otel_semantic_conventions`.

Both new primitives are wired into the existing workflow:

```
Ticket → /create_plan → [ODD: write narrative] → /implement_plan
       → /validate_plan (correctness) → /validate_telemetry (telemetry) → /commit
```

## Context & Background

### Current State

- Five OTel skills exist; `otel_instrument` is the orchestrator/router.
- `thoughts/shared/` contains `tickets/`, `plans/`, `research/` — no `telemetry/` directory yet.
- Slash commands are tool-specific:
  - Claude: `claude/skills/<name>/SKILL.md` with `disable-model-invocation: true`
  - OpenCode: `opencode/commands/<name>.md`
  - Gemini: `gemini/commands/<name>.toml` (delegates to a skill)
  - Pi: `pi/prompts/<name>.md`
- MCP servers are wired in `claude/.mcp.json` and `opencode/opencode.json` (Gemini and Pi handle MCP differently or not at all).

### Why This Matters

From the talk's call to action:

> 1. Prioritize trace definition before implementation — treat traces as a foundational design element
> 2. Establish a local observability stack using Kubernetes, Aspire dashboards, Aspire MCP, and OTel Collector
> 3. Enable instrumentation in agentic tools where available
> 4. Study and prepare to implement semantic conventions

The harness is the right surface to encode (1)–(3). (4) is already covered by `otel_semantic_conventions`.

The ODD inner loop, drawn from `slides/inner-loop.md`:

```
Write Code → Instrument (OTel spans) → Run Locally → OTel Collector → Aspire → Observe → [repeat]
```

> Every code change produces a trace. Every trace answers a question. No guessing.

## Requirements

### Functional Requirements

- [ ] `observability-driven-development` skill exists in all four tools with frontmatter adapted to tool conventions.
- [ ] Skill ships with three companion files: `narrative.md`, `loop.md`, `local-setup.md`.
- [ ] Skill cross-references the existing OTel skills (`otel_instrumentation` for SDK setup, `otel_semantic_conventions` for attribute naming, `otel_collector` for pipelines, `otel_ottl` for redaction).
- [ ] `narrative.md` defines the format for a telemetry narrative spec that lives at `thoughts/shared/telemetry/<feature>.md`.
- [ ] A narrative spec template exists at `thoughts/shared/telemetry/narrative-template.md`.
- [ ] `loop.md` walks through the five-step inner loop with a concrete example (likely the `gen_ai.*` agent example from the talk).
- [ ] `local-setup.md` documents the canonical Aspire-dashboard-via-Docker setup, the OTLP endpoint env vars, the MCP endpoint default, and the standalone-Docker MCP bug ([microsoft/aspire#14733](https://github.com/microsoft/aspire/issues/14733)) with a fallback path.
- [ ] `/validate_telemetry` slash command exists in all four tools and delegates into the ODD skill's Validation section.
- [ ] `/validate_telemetry <spec-path>` validates observed traces against the spec.
- [ ] `/validate_telemetry` with no argument runs a generic local-telemetry health check.
- [ ] `claude/.mcp.json` and `opencode/opencode.json` gain a disabled-by-default `aspire-dashboard` MCP entry.
- [ ] `otel_instrument` orchestrator routes "local instrumentation feedback loop" / "trace as design artifact" requests to ODD.
- [ ] `/create_plan` (all four tools) mentions ODD as a delegation target for telemetry-bearing features, parallel to its existing `interview` mention.
- [ ] `AGENTS.md`, `README.md`, and `CLAUDE.md` skill tables list the new skill and command.

### Out of Scope

- Building a telemetry-diff CLI tool; `/validate_telemetry` uses existing facilities (curl against the Aspire JSON/UI, OTLP HTTP intercept, or the Aspire MCP when available).
- Bundling a docker-compose file or Devcontainer template; the skill documents the canonical commands but doesn't ship a project template.
- Fixing or working around [microsoft/aspire#14733](https://github.com/microsoft/aspire/issues/14733) ourselves; we document its existence and provide a fallback.
- Adding ODD to non-Claude/OpenCode/Gemini/Pi tools.
- Modifying `setup.sh`, `install.ts`, or the GNU Stow wiring.
- Adding tests/CI for skill metadata validation (consistent with prior plan `add-mattpocock-skills.md`).

## Acceptance Criteria

### Automated Verification

- [ ] `ls {opencode,claude,gemini,pi}/skills/observability-driven-development/SKILL.md` returns 3 files (gemini path is `observability_driven_development`).
- [ ] Companion files: `find {opencode,claude,gemini,pi}/skills/observability*-development -name '*.md' -type f | wc -l` returns 16 (4 files × 4 tools).
- [ ] `/validate_telemetry` entrypoint exists in each tool: `claude/skills/validate_telemetry/SKILL.md`, `opencode/commands/validate_telemetry.md`, `gemini/commands/validate_telemetry.toml`, `pi/prompts/validate_telemetry.md`.
- [ ] `thoughts/shared/telemetry/narrative-template.md` exists.
- [ ] `grep aspire-dashboard claude/.mcp.json opencode/opencode.json` returns hits in both files.
- [ ] `grep -l observability-driven-development claude/skills/otel_instrument/SKILL.md opencode/skills/otel_instrument/SKILL.md gemini/skills/otel_instrument/SKILL.md pi/skills/otel_instrument/SKILL.md` returns all four files.
- [ ] `grep -l observability claude/skills/create_plan/SKILL.md opencode/commands/create_plan.md gemini/skills/create_plan/SKILL.md pi/prompts/create_plan.md` returns all four files.
- [ ] `./setup.sh all --restow --dry-run` reports no conflicts.
- [ ] `grep -E '(observability_driven_development|validate_telemetry)' AGENTS.md` returns hits.

### Manual Verification

- [ ] Auto-trigger: in a Claude session, the prompt "I want to drive this feature with observability — let's design the trace first" surfaces the ODD skill.
- [ ] Slash command: `/validate_telemetry` activates ODD's validation workflow.
- [ ] `/validate_telemetry thoughts/shared/telemetry/some-feature.md` is interpreted as spec-mode.
- [ ] `local-setup.md` instructions reproduce a working Aspire dashboard at `http://localhost:18888` with traces flowing.

## Technical Notes

### Affected Components

- `claude/skills/observability-driven-development/` (new)
- `opencode/skills/observability-driven-development/` (new)
- `gemini/skills/observability_driven_development/` (new — snake_case per Gemini convention)
- `pi/skills/observability-driven-development/` (new)
- `claude/skills/validate_telemetry/SKILL.md` (new)
- `opencode/commands/validate_telemetry.md` (new)
- `gemini/commands/validate_telemetry.toml` (new)
- `pi/prompts/validate_telemetry.md` (new)
- `claude/.mcp.json` (modified — add `aspire-dashboard` entry, disabled)
- `opencode/opencode.json` (modified — add `aspire-dashboard` entry, disabled)
- `claude/skills/otel_instrument/SKILL.md` (modified — add ODD routing row)
- `opencode/skills/otel_instrument/SKILL.md` (modified)
- `gemini/skills/otel_instrument/SKILL.md` (modified)
- `pi/skills/otel_instrument/SKILL.md` (modified)
- `claude/skills/create_plan/SKILL.md` (modified — add ODD delegation note)
- `opencode/commands/create_plan.md` (modified)
- `gemini/skills/create_plan/SKILL.md` (modified)
- `pi/prompts/create_plan.md` (modified)
- `thoughts/shared/telemetry/narrative-template.md` (new)
- `AGENTS.md` (modified)
- `README.md` (modified, if it lists skills)
- `CLAUDE.md` (modified — Key Skills table)

### Naming Map

| Concept | OpenCode | Claude | Gemini | Pi |
|---|---|---|---|---|
| Skill folder | `observability-driven-development` | `observability-driven-development` | `observability_driven_development` | `observability-driven-development` |
| Skill `name:` frontmatter | `observability-driven-development` | `observability-driven-development` | `observability_driven_development` | `observability-driven-development` |
| Slash command | `/validate_telemetry` | `/validate_telemetry` | `/validate_telemetry` | `/validate_telemetry` |

### Design Inputs

- Adriel Perkins, "Observability 4.0 is Inferable", <https://adrielperkins.substack.com/p/observability-40-is-inferable>
- Adriel Perkins, "OTel Me More: ODD in the AI Era", <https://github.com/adrielp/otel-me-more-ai-talk> (specifically `slides/inner-loop.md`)
- Aspire Dashboard configuration: <https://aspire.dev/dashboard/configuration/>
- Standalone Docker MCP issue: <https://github.com/microsoft/aspire/issues/14733>

---

## Meta

**Created**: 2026-04-27
**Priority**: Medium
**Estimated Effort**: L
