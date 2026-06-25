---
name: init-harness
description: Initialize the AI Engineering Harness (AGENTS.md + thoughts/ structure). Use on /init_harness or when setting up the harness in a repo.
allowed-tools: Read, Bash, Grep, Glob, Write
---

# Initialize AI Engineering Harness

## When to Use This Skill

Activate when the user:
- Runs `/init_harness`
- Asks to "initialize the harness" / "set up the harness" / "set up context engineering"
- Wants to prepare a repository for AI-assisted development workflows

## What This Skill Does

1. Runs the built-in `/init` command to generate `AGENTS.md`
2. Creates the `thoughts/` directory structure for context engineering
3. Adds a ticket template for consistent ticket creation
4. Provides guidance on next steps

## Core Process

### Step 1: Check Current State

```bash
test -f AGENTS.md && echo "AGENTS.md exists" || echo "AGENTS.md not found"
test -d thoughts && echo "thoughts/ exists" || echo "thoughts/ not found"
test -d .git && echo "Git repo" || echo "Not a git repo"
```

### Step 2: Run /init Command

If `AGENTS.md` doesn't exist (or the user wants to regenerate), **invoke the built-in `/init` command**. It analyzes the codebase structure, identifies key components and patterns, and writes `AGENTS.md` with codebase context. Then confirm:

```bash
test -f AGENTS.md && echo "AGENTS.md created successfully"
```

### Step 3: Create Thoughts Directory Structure

```bash
mkdir -p thoughts/shared/{tickets,plans,research}
mkdir -p thoughts/global
```

Directory purposes:

```
thoughts/
├── shared/           # Team-shared documents
│   ├── tickets/      # Feature requests, bugs, task definitions
│   ├── plans/        # Implementation plans (via /create_plan)
│   └── research/     # Research documents and investigations
├── global/           # Cross-repository concerns and docs
└── {username}/       # Personal notes (optional, Step 6)
```

### Step 4: Add Ticket Template

Create `thoughts/shared/tickets/ticket-template.md` if it doesn't already exist:

```bash
test -f thoughts/shared/tickets/ticket-template.md || echo "Creating ticket template..."
```

Write the template using the structure in [the ticket template](references/ticket-template.md) — a markdown skeleton with Problem Statement, Desired Outcome, Context & Background, Requirements, Acceptance Criteria (automated + manual verification), Technical Notes, and a Meta block.

### Step 5: Add .gitkeep Files

Track empty directories in git:

```bash
touch thoughts/shared/plans/.gitkeep
touch thoughts/shared/research/.gitkeep
touch thoughts/global/.gitkeep
```

### Step 6: Create Personal Directory (Optional)

Ask whether the user wants a personal thoughts directory (`thoughts/[username]/` with `tickets/` and `plans/`). Show their git username (`git config user.name` or `whoami`). If yes:

```bash
USERNAME=$(git config user.name 2>/dev/null | tr ' ' '-' | tr '[:upper:]' '[:lower:]' || whoami)
mkdir -p "thoughts/$USERNAME"/{tickets,plans}
```

### Step 7: Summary and Next Steps

Confirm what was created, then point the user at the workflow.

**Created files**
- `AGENTS.md` — codebase overview, key components, tech stack, patterns/conventions (from `/init`)
- `thoughts/shared/tickets/ticket-template.md` — consistent ticket skeleton (problem, requirements, acceptance criteria, technical notes, metadata)

**Created directories** — the `thoughts/` tree shown in Step 3.

**Next steps** (the context engineering workflow):

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```

1. Copy `ticket-template.md` to a new ticket, e.g. `thoughts/shared/tickets/PROJ-001-my-feature.md`
2. `/create_plan thoughts/shared/tickets/PROJ-001-my-feature.md`
3. `/implement_plan thoughts/shared/plans/my-feature.md`
4. `/commit`

The harness is ready — start by creating a ticket for your next task.

## Handling Edge Cases

- **AGENTS.md already exists**: offer to keep it (recommended if customized) or regenerate with `/init` (overwrites).
- **thoughts/ already exists**: preserve existing content; create only missing subdirectories (`test -d <dir> || mkdir -p <dir>`).
- **Not a git repository**: note git is recommended (tracks tickets/plans, versions AGENTS.md, enables collaboration); offer to `git init` first or continue without.
- **No write permissions**: report the failure and suggest the user check write permissions / read-only filesystem, or create the structure manually with the Step 3 commands.

## Integration Notes

Run once per repository. Works with `/create_plan`, `/implement_plan`, `/validate_plan`, `/commit`, and the auto-triggered `git-commit-helper` and `pr-description-generator` skills. The `thoughts/` structure can be committed to share with your team (personal directories can be gitignored); regenerate `AGENTS.md` periodically as the codebase evolves.
