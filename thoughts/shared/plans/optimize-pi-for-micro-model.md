# Optimize Pi Harness for Micro Model Implementation Plan

## Overview

Slim the `pi/` harness (prompts, skills, agents) so it runs efficiently on a micro model (mlx Qwen3.5-9B-OptiQ-4bit) with a small context window. Three levers: (1) cut always-on eager context, (2) eliminate duplicated prose, (3) move monolithic reference material to on-demand `references/` files — while keeping every SKILL.md body self-sufficient, since micro models do not reliably auto-load referenced files.

## Current State Analysis

Total footprint: ~9,373 lines across `pi/prompts/`, `pi/skills/`, `pi/agents/`, `pi/extensions/`.

Confirmed Pi loading mechanics (Pi = badlogic/earendil-works pi coding agent, implements the Agent Skills standard):
- Only skill `name` + `description` frontmatter loads eagerly (~100 tokens/skill). This is the sole always-on cost.
- SKILL.md body loads on activation; reference files in `references/` load on demand via relative Markdown links opened with the `read` tool — but loading is BEST-EFFORT and unreliable on micro models unless invoked via `/skill:name`.
- Spec budget targets: SKILL.md body < 500 lines / < 5000 tokens; metadata ~100 tokens.
- Prompts (`pi/prompts/*.md`) do NOT support includes/references — they use `$1`/`$@` argument substitution only. Therefore prompts must be trimmed IN PLACE, never split.
- The `subagent` tool selects agents by `name` frontmatter from `~/.pi/agent/agents/`. The six shared helpers exist in BOTH `pi/agents/*.md` (subagent channel) and `pi/skills/*/SKILL.md` (inline channel) with byte-identical bodies.

Key diagnosed bloat (line counts):
- `pi/skills/init-harness/SKILL.md` (308) — dir tree printed 4-5x, two duplicate "what gets created" sections, 48-line inline ticket template.
- `pi/skills/git-commit-helper/SKILL.md` (200) — same commit examples shown 3x, attribution rule stated 4x; largely duplicative of `pi/prompts/commit.md` (43).
- `pi/skills/otel-instrumentation/SKILL.md` (568) — §6 language guides are 223 lines (40% of file): six redundant per-language walkthroughs.
- `pi/skills/otel-collector/SKILL.md` (399) — ~80% copy-paste YAML catalog.
- `pi/skills/otel-ottl/SKILL.md` (249) — §5 function reference is a 65-line lookup dictionary.
- `pi/skills/otel-semantic-conventions/SKILL.md` (185) — ~90% reference tables.
- `pi/agents/codebase-analyzer.md` (153) and others — redundant "Key Principles / Quality Standards / What NOT to Do" trailers that restate the body.
- Six byte-identical agent/skill twins: codebase-locator, codebase-analyzer, codebase-pattern-finder, thoughts-locator, thoughts-analyzer, web-search-researcher.

`manifest.json` drives installation via `setup.sh`. The six skill twins are registered as `skill/codebase-*`, `skill/thoughts-*`, `skill/web-search-researcher` blocks at approximately `manifest.json:646-733`. The six agent entries are at approximately `manifest.json:531-536` and MUST be kept.

## Desired End State

- Every skill `description` is a single tight line.
- No duplicated prose anywhere in `pi/` (the user's governing principle: hyper-cleanliness).
- The six helpers exist only as `pi/agents/*.md` (single source, subagent channel); the `pi/skills/` twins are deleted and de-registered from `manifest.json`.
- Large reference material lives in `references/` subfiles; each SKILL.md body stays self-sufficient for the common path and under 500 lines.
- `setup.sh` runs cleanly against the updated `manifest.json` (no dangling sources).
- `create_plan`, `research_codebase`, `implement_plan`, `validate_plan` prompts still reference the six helpers by name (these names resolve to the surviving `pi/agents/` agents).

## What We're NOT Doing

- Not touching `pi/extensions/` TypeScript code.
- Not changing other harnesses (`opencode/`, `claude/`, `gemini/`).
- Not changing Pi's loading behavior or skill trigger semantics (only compressing wording).
- Not splitting any `pi/prompts/*.md` file (prompts do not support includes — trim in place only).

## Implementation Approach

Six phases ordered by ROI and risk. Lowest-risk, highest-eager-value cuts first (P0). Each phase is independently shippable and independently verifiable with `wc -l` before/after.

## Phase 1: Eager-cost cuts — compress all skill descriptions

### Overview
Compress every `pi/skills/*/SKILL.md` frontmatter `description` to a single tight line. This is the only always-on context cost.

### Changes Required:
#### 1. All skill frontmatter
**Files**: every `pi/skills/*/SKILL.md` (~21 files, including the 5 otel skills)
**Changes**: Reduce multi-line prose `description` to one specific, trigger-preserving line. Do not weaken trigger keywords.

### Success Criteria:
#### Automated Verification:
- [ ] Every skill `description` is a single line: `for f in pi/skills/*/SKILL.md; do ...` (manual grep of frontmatter)
#### Manual Verification:
- [ ] Trigger keywords preserved; skills still activate on the same intents.

---

## Phase 2: Trailer stripping — remove duplicated closing sections

### Overview
Delete redundant "Key Principles / Quality Standards / What NOT to Do" trailers that restate the body, in prompts and agents.

### Changes Required:
#### 1. Prompts (trim in place)
**Files**: `pi/prompts/create_plan.md`, `pi/prompts/implement_plan.md`, `pi/prompts/validate_plan.md`
**Changes**: Remove trailing principle/guideline blocks that duplicate body prose. Remove large inline templates where a one-line description suffices (prompts cannot use references, so inline only what is essential).
#### 2. Agents
**Files**: `pi/agents/codebase-locator.md`, `pi/agents/codebase-analyzer.md` (and the other four agents if they carry the same trailers)
**Changes**: Remove duplicated "Quality Standards" / "What NOT to Do" trailers; collapse overlapping "Core Responsibilities" vs "Workflow" sections.

### Success Criteria:
#### Automated Verification:
- [ ] Line counts reduced: `wc -l pi/prompts/create_plan.md pi/prompts/implement_plan.md pi/prompts/validate_plan.md pi/agents/codebase-locator.md pi/agents/codebase-analyzer.md`
#### Manual Verification:
- [ ] No instruction lost; each file reads as a single non-repeating pass.

---

## Phase 3: Consolidate commit into one file

### Overview
Eliminate the duplication between `pi/prompts/commit.md` (43) and `pi/skills/git-commit-helper/SKILL.md` (200). Keep ONE file. Per user decision: consolidate into a single source of truth so there is no second file.

### Changes Required:
#### 1. Single commit source
**Files**: `pi/skills/git-commit-helper/SKILL.md` (keep, slim), `pi/prompts/commit.md` (delete)
**Changes**: Slim the skill (dedupe the 3x repeated examples and 4x attribution rule into one statement each). Delete `pi/prompts/commit.md`. Remove the `prompt`/commit.md entry from `manifest.json`.
#### 2. Manifest
**File**: `manifest.json`
**Changes**: Remove the manifest entry that installs `pi/prompts/commit.md`.

### Success Criteria:
#### Automated Verification:
- [ ] `pi/prompts/commit.md` no longer exists: `test ! -f pi/prompts/commit.md`
- [ ] No manifest entry references `pi/prompts/commit.md`: grep manifest
- [ ] `git-commit-helper/SKILL.md` reduced well under 200 lines: `wc -l`
#### Manual Verification:
- [ ] Commit workflow still fully described in the single surviving file.

---

## Phase 4: Slim init-harness

### Overview
Reduce `pi/skills/init-harness/SKILL.md` from 308 to ~120 lines.

### Changes Required:
#### 1. init-harness skill
**File**: `pi/skills/init-harness/SKILL.md`
**Changes**: Print the directory tree once. Keep one "what gets created" section. Move the 48-line ticket template to `pi/skills/init-harness/references/ticket-template.md` and link it.
#### 2. Manifest
**File**: `manifest.json`
**Changes**: Add the new `references/ticket-template.md` to the init-harness skill's manifest entry so it installs.

### Success Criteria:
#### Automated Verification:
- [ ] `wc -l pi/skills/init-harness/SKILL.md` is ~120 or fewer.
- [ ] `test -f pi/skills/init-harness/references/ticket-template.md`
- [ ] Manifest installs the new reference file: grep manifest.
#### Manual Verification:
- [ ] Skill still describes full init flow; template reachable via link.

---

## Phase 5: Compress otel skills + extract reference

### Overview
Compress all five otel skill bodies and move bulk reference material to `references/`, keeping each body self-sufficient for the common path.

### Changes Required:
#### 1. otel-instrumentation
**File**: `pi/skills/otel-instrumentation/SKILL.md` (568)
**Changes**: Split §6 language guides (223 lines) into `references/<lang>.md` (node, go, python, java, dotnet, ruby) linked after the language-detection table. Keep body self-sufficient for generic instrumentation.
#### 2. otel-collector
**File**: `pi/skills/otel-collector/SKILL.md` (399)
**Changes**: Move per-component YAML catalogs (receivers/processors/exporters/pipelines/sampling/deployment) into `references/` files; keep concise rules inline.
#### 3. otel-ottl
**File**: `pi/skills/otel-ottl/SKILL.md` (249)
**Changes**: Move §5 function reference (65-line dictionary) to `references/functions.md`.
#### 4. otel-semantic-conventions
**File**: `pi/skills/otel-semantic-conventions/SKILL.md` (185)
**Changes**: This is ~90% reference; keep the principles/placement rules inline, move the attribute/migration tables to `references/`.
#### 5. otel-instrument router
**File**: `pi/skills/otel-instrument/SKILL.md` (62)
**Changes**: Already a clean router; only compress its `description`. No content split.
#### 6. Manifest
**File**: `manifest.json`
**Changes**: Register every new `references/*.md` file under the corresponding otel skill entries.

### Success Criteria:
#### Automated Verification:
- [ ] Each otel SKILL.md body under 500 lines (target much lower): `wc -l pi/skills/otel-*/SKILL.md`
- [ ] All new `references/*.md` exist and are registered in `manifest.json`.
#### Manual Verification:
- [ ] Common-path guidance still present inline; deep reference reachable via links.

---

## Phase 6: Delete the six skill twins (single-source the helpers)

### Overview
Per user decision (B): the six shared helpers live only as `pi/agents/*.md`. Delete the inline `pi/skills/` twins and de-register them.

### Changes Required:
#### 1. Delete skill twin directories
**Files**: `pi/skills/codebase-locator/`, `pi/skills/codebase-analyzer/`, `pi/skills/codebase-pattern-finder/`, `pi/skills/thoughts-locator/`, `pi/skills/thoughts-analyzer/`, `pi/skills/web-search-researcher/`
**Changes**: Delete these six directories.
#### 2. Manifest
**File**: `manifest.json`
**Changes**: Remove the six `skill/codebase-*`, `skill/thoughts-*`, `skill/web-search-researcher` blocks (approx. lines 646-733). KEEP the six `agents/*.md` entries (approx. lines 531-536).

### Success Criteria:
#### Automated Verification:
- [ ] None of the six skill dirs exist: `test ! -d pi/skills/codebase-locator` (and the other five).
- [ ] `manifest.json` has no `skill/codebase-*`/`skill/thoughts-*`/`skill/web-search-researcher` entries.
- [ ] The six `pi/agents/*.md` files and their manifest entries still exist.
#### Manual Verification:
- [ ] `create_plan`/`research_codebase`/`implement_plan`/`validate_plan` prompts still name the six helpers (resolve to surviving agents).
- [ ] A `subagent { agent: "codebase-locator" }` style call still resolves.

---

## Testing Strategy

- Per phase: `wc -l` before/after to confirm reductions; `git diff --stat`.
- After Phases 3, 4, 5, 6: dry-run / re-run `setup.sh` (or validate `manifest.json` parses and all `src` paths exist) to confirm no dangling sources.
- Final: spot-check on the micro model that representative skills still trigger and that the orchestrator can still spawn the six subagents.
- Run `/validate_plan` against this plan.

## References
- Original ticket: `thoughts/shared/tickets/optimize-pi-for-micro-model.md`
- Research artifact: this plan's Current State Analysis (synthesized from footprint measurement, loading-model analysis, verbosity diagnosis, and web research on Pi/Agent Skills progressive disclosure).
