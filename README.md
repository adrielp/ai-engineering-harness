# AI Engineering Harness

A harness for AI coding agents that provides context engineering patterns, commands, and configurations. Install once and instantly configure Claude Code, OpenCode, and Gemini CLI with battle-tested prompts, agents, and workflows.

## Supported Tools

- **Claude Code** (code.claude.com) — Supported
- **OpenCode** (opencode.ai) — Supported
- **Gemini CLI** (ai.google.dev/gemini-cli) — Supported
- **Pi** (github.com/nicholasgasior/pi-coding-agent) — Supported

## Quick Start

### Prerequisites

- [Deno](https://deno.com/) (or `npx deno` as a zero-install fallback)

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# macOS (Homebrew)
brew install deno
```

### Install

Register the CLI (one-time):

```bash
deno install -Agf -n ai-harness \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/main/install.ts
```

Then install configs:

```bash
ai-harness --tool=claude          # Claude Code
ai-harness --tool=opencode        # OpenCode
ai-harness --tool=gemini          # Gemini CLI
ai-harness --tool=pi              # Pi
ai-harness --tool=all             # All four
```

More options:

```bash
ai-harness --tool=claude --dry-run        # Preview changes
ai-harness --tool=claude --interactive    # Pick components
ai-harness --tool=claude --skill=agents   # Specific component
ai-harness --help                         # Full usage
```

Files are copied as real files — nothing breaks if you discard the installer.
Re-running is safe: unchanged files are skipped, modified files show a diff and
prompt for confirmation.

### Private & Enterprise Repos

For private or enterprise GitHub repos, clone and run locally:

```bash
gh repo clone <org>/ai-engineering-harness /tmp/aih -- --depth=1 -q \
  && GITHUB_TOKEN=$(gh auth token) deno run -A /tmp/aih/install.ts --tool=claude \
  && rm -rf /tmp/aih
```

`gh` handles all git authentication automatically. `GITHUB_TOKEN` lets the
installer fetch manifest and file contents from the cloned repo's remote origin
if needed.

### Alternative: Direct Run

Skip the CLI registration and run directly:

```bash
deno run -A \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG>/install.ts \
  --tool=claude
```

Replace `<TAG>` with a git tag or commit SHA from the
[releases page](https://github.com/adrielp/ai-engineering-harness/releases).

### Alternative: Repo Mode (GNU Stow)

For users who want the repo on their system with symlinks (easier `git pull` updates):

```bash
# Prerequisites: GNU Stow (brew install stow / apt install stow)
git clone https://github.com/adrielp/ai-engineering-harness.git
cd ai-engineering-harness

./setup.sh claude             # Install Claude Code → ~/.claude/
./setup.sh opencode           # Install OpenCode → ~/.config/opencode/
./setup.sh gemini             # Install Gemini CLI → ~/.gemini/
./setup.sh pi                 # Install Pi → ~/.pi/agent/
./setup.sh all                # Install all four

# Useful flags
./setup.sh <tool> --dry-run   # Preview changes
./setup.sh <tool> --restow    # Update after git pull
./setup.sh <tool> --delete    # Remove symlinks
```

## What's Included

### Agents (All Tools)

Specialized sub-agents shared across Claude Code, OpenCode, and Gemini CLI:

| Agent | Purpose |
|-------|---------|
| `codebase_analyzer` | Analyzes implementation details and traces data flow |
| `codebase_locator` | Finds files and components by feature/topic |
| `codebase_pattern_finder` | Discovers similar implementations and patterns |
| `thoughts_analyzer` | Extracts insights from research documents |
| `thoughts_locator` | Discovers documents in the thoughts/ directory |
| `web_search_researcher` | Researches information from web sources |

### Commands & Skills

All commands work identically across tools. OpenCode uses `commands/` + `skills/`, Claude Code uses `skills/` (commands have `disable-model-invocation: true`), Gemini CLI uses TOML format, and Pi uses `prompts/` (prompt templates) + `skills/`.

| Command | Type | Purpose |
|---------|------|---------|
| `/init_harness` | manual | Initialize harness in a repository |
| `/create_plan` | manual | Create implementation plan from ticket |
| `/implement_plan` | manual | Execute approved plan |
| `/validate_plan` | manual | Verify implementation |
| `/commit` | manual | Create well-structured git commits |
| `/debug` | manual | Investigate issues during testing |
| `/debug-k8s` | manual | Debug Kubernetes clusters (prefers K8s MCP) |
| `/research_codebase` | manual | Comprehensive codebase research |
| `/validate_telemetry` | manual | Validate local telemetry against a narrative spec |
| `/worktree` | manual + auto | Manage git worktrees for parallel development |
| `git-commit-helper` | auto | Triggers on "commit these changes" |
| `pr-description-generator` | auto | Triggers when creating PRs |
| `experimental-pr-workflow` | auto | Formalizes experimental work into tickets/PRs |
| `interview` | auto | Stress-test plans via relentless user interview |
| `improve-codebase-architecture` | auto | Find architectural friction, propose deep-module refactors |
| `prd-to-issues` | auto | Break a PRD into vertical-slice issue files |
| `tdd` | auto | Red-green-refactor TDD discipline |
| `write-a-prd` | auto | Generate a PRD from a client brief |

### OpenTelemetry Skills (All Tools)

The `otel_instrument` orchestrator auto-activates on observability/telemetry requests and routes to specialized sub-skills:

| Skill | Scope |
|-------|-------|
| `observability_driven_development` | The ODD inner loop, narrative specs, local Aspire setup, `/validate_telemetry` |
| `otel_instrumentation` | SDK setup, traces, metrics, logs (Node.js, Go, Python, Java, .NET, Ruby) |
| `otel_collector` | Collector YAML — receivers, processors, exporters, pipelines, sampling |
| `otel_semantic_conventions` | Attribute naming, placement, legacy-to-current migration |
| `otel_ottl` | OTTL expressions for Collector transforms, redaction, filtering |

### Thoughts Directory Structure

The `thoughts/` directory implements the context engineering pattern:

```
thoughts/
├── shared/           # Team-wide documents
│   ├── tickets/      # Feature requests, bug reports, tasks
│   ├── plans/        # Implementation plans
│   └── research/     # Research documents and investigations
├── global/           # Cross-repository concerns
└── {username}/       # Personal notes (create your own)
    ├── tickets/
    └── plans/
```

## Context Engineering Workflow

The harness implements a structured development workflow:

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```

### Initialize a Repository

After installing the harness, initialize any project (commands are the same across all tools):

```bash
cd your-project
claude  # or: opencode, gemini, pi

/init_harness
```

This creates tool-specific config (`CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`), the `thoughts/` directory structure, and a ticket template.

### Development Workflow

```bash
# 1. Create a ticket in thoughts/shared/tickets/
# 2. Generate a plan
/create_plan thoughts/shared/tickets/PROJ-001-add-feature.md

# 3. Implement the plan
/implement_plan thoughts/shared/plans/add-feature.md

# 4. Validate
/validate_plan thoughts/shared/plans/add-feature.md

# 5. Commit
/commit
```

## Customization

### Adding Agents

Create `.md` files in `<tool>/agents/`:

```markdown
---
name: my-custom-agent
description: What this agent does and when to use it.
---

[Agent system prompt here]
```

Works for all four tools — Claude Code calls them "subagents", OpenCode and Gemini CLI call them "agents", and Pi calls them "agents" (kebab-case).

### Adding Commands & Skills

- **OpenCode**: Add `.md` files in `opencode/commands/` or `opencode/skills/<name>/SKILL.md`
- **Claude Code**: Add `claude/skills/<name>/SKILL.md` (set `disable-model-invocation: true` for manual-only)
- **Gemini CLI**: Add `.toml` files in `gemini/commands/` or `gemini/skills/<name>/SKILL.md`
- **Pi**: Add `.md` files in `pi/prompts/` (commands) or `pi/skills/<name>/SKILL.md` (skills)

### Personal Thoughts Directory

```bash
mkdir -p thoughts/$(whoami)/{tickets,plans}
```

## Roadmap

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Contributing

1. Fork the repository
2. Create a ticket in `thoughts/shared/tickets/`
3. Use `/create_plan` to design your changes
4. Implement and validate
5. Submit a pull request

## License

Apache 2.0 — See [LICENSE](LICENSE) for details.
