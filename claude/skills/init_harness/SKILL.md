---
name: init_harness
description: Initialize the AI Engineering Harness in a repository by creating CLAUDE.md and thoughts/ directory structure
disable-model-invocation: true
---

# Initialize Harness

Initialize the AI Engineering Harness in this repository.

## What This Command Does

1. Runs the built-in `/init` command to generate `CLAUDE.md`
2. Creates the `thoughts/` directory structure for context engineering
3. Adds a ticket template for consistent ticket creation
4. Provides guidance on next steps

## Instructions

Follow these steps to initialize the harness:

1. **Check the current state of the repository**
   - Verify if CLAUDE.md already exists
   - Check if thoughts/ directory exists

2. **Run /init to generate CLAUDE.md** (Claude Code's built-in command)
   - This analyzes the codebase and generates project memory

3. **Create the thoughts/ directory structure**:
   ```bash
   mkdir -p thoughts/shared/{tickets,plans,research}
   mkdir -p thoughts/global
   ```

4. **Add the ticket template** to `thoughts/shared/tickets/ticket-template.md`

5. **Optionally create a personal thoughts directory**:
   ```bash
   mkdir -p thoughts/$(whoami)/{tickets,plans}
   ```

6. **Present next steps to the user**

**Important**: The `/init` command is Claude Code's built-in command that analyzes the codebase and generates CLAUDE.md (Claude Code's project memory file). This `/init_harness` skill wraps that functionality and adds the context engineering setup.

**Note**: Claude Code uses `CLAUDE.md` for project memory, not `AGENTS.md`. The file naming is different from OpenCode, but the purpose is the same - storing project context and conventions.

## Quick Reference

After running this command, the repository will have:

```
CLAUDE.md                           # Codebase context (from /init)
thoughts/
├── shared/
│   ├── tickets/                    # Feature requests, bugs, tasks
│   │   └── ticket-template.md      # Template for new tickets
│   ├── plans/                      # Implementation plans
│   └── research/                   # Research documents
└── global/                         # Cross-repository concerns
```

## Workflow After Initialization

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```
