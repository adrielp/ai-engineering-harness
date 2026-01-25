# AI Engineering Harness

## Overview

This repository provides a configuration harness for AI coding agents. It contains reusable agents, commands, skills, and workflows that are symlinked to `~/.config/opencode/` via GNU Stow. The harness implements a structured "context engineering" workflow for AI-assisted development.

**Primary Purpose**: Standardize AI agent tooling with battle-tested prompts, agents, and workflows across multiple projects.

## Repository Structure

```
ai-engineering-harness/
├── opencode/                    # OpenCode configuration (symlinked to ~/.config/opencode/)
│   ├── agents/                  # Specialized sub-agents for Task tool
│   │   ├── codebase-analyzer.md
│   │   ├── codebase-locator.md
│   │   ├── codebase-pattern-finder.md
│   │   ├── thoughts-analyzer.md
│   │   ├── thoughts-locator.md
│   │   └── web-search-researcher.md
│   ├── commands/                # Custom slash commands
│   │   ├── commit.md
│   │   ├── create_plan.md
│   │   ├── debug.md
│   │   ├── implement_plan.md
│   │   ├── research_codebase.md
│   │   └── validate_plan.md
│   ├── skills/                  # Auto-triggered behaviors
│   │   ├── experimental-pr-workflow/
│   │   ├── git-commit-helper/
│   │   ├── init-harness/
│   │   └── pr-description-generator/
│   └── opencode.json            # MCP server configuration
├── thoughts/                    # Context engineering artifacts
│   ├── shared/                  # Team-wide documents
│   │   ├── tickets/             # Feature requests, bug reports
│   │   ├── plans/               # Implementation plans
│   │   └── research/            # Research documents
│   └── global/                  # Cross-repository concerns
├── setup.sh                     # GNU Stow installation script
├── README.md                    # User documentation
└── LICENSE                      # Apache 2.0
```

## Key Components

### Agents (`opencode/agents/`)

Specialized sub-agents invoked via the Task tool:

| Agent | Purpose |
|-------|---------|
| `codebase-analyzer` | Analyzes implementation details, traces data flow, explains how code works |
| `codebase-locator` | Finds files and directories relevant to features or tasks |
| `codebase-pattern-finder` | Discovers similar implementations and usage patterns |
| `thoughts-analyzer` | Extracts insights from research documents in thoughts/ |
| `thoughts-locator` | Discovers documents in thoughts/ directories |
| `web-search-researcher` | Researches information from web sources |

### Commands (`opencode/commands/`)

Custom slash commands for workflows:

| Command | Purpose |
|---------|---------|
| `/create_plan` | Create detailed implementation plans from tickets |
| `/implement_plan` | Execute approved plans phase by phase |
| `/validate_plan` | Verify implementation against plan specifications |
| `/research_codebase` | Conduct comprehensive codebase research |
| `/commit` | Create well-structured git commits |
| `/debug` | Investigate issues during manual testing |

### Skills (`opencode/skills/`)

Auto-triggered behaviors based on context:

| Skill | Trigger |
|-------|---------|
| `init-harness` | `/init-harness` command |
| `git-commit-helper` | User says "commit" or similar |
| `pr-description-generator` | Creating pull requests |
| `experimental-pr-workflow` | Formalizing experimental work |

## Context Engineering Workflow

The harness implements a structured workflow:

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```

1. **Create a Ticket** in `thoughts/shared/tickets/` using the template
2. **Generate a Plan** with `/create_plan thoughts/shared/tickets/PROJ-001.md`
3. **Implement** with `/implement_plan thoughts/shared/plans/feature.md`
4. **Validate** with `/validate_plan`
5. **Commit** with `/commit`

## Installation

Uses GNU Stow for symlink management:

```bash
./setup.sh           # Install (symlink to ~/.config/opencode/)
./setup.sh --dry-run # Preview changes
./setup.sh --restow  # Update after changes
./setup.sh --delete  # Remove symlinks
```

## Key Patterns

### Ticket-Driven Development

All work starts with a ticket in `thoughts/shared/tickets/`. The ticket template at `thoughts/shared/tickets/ticket-template.md` provides structure for:
- Problem statement
- Requirements and acceptance criteria
- Technical notes and affected components

### Plan Files

Plans in `thoughts/shared/plans/` contain:
- Phased implementation steps
- Success criteria (automated and manual)
- Checkboxes that are updated during implementation

### Agent-Based Research

The codebase agents (`codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder`) are designed to be spawned from commands like `/create_plan` for comprehensive research before planning.

## Open Tickets

Active development tracked in `thoughts/shared/tickets/`:
- HARNESS-001: Add Claude Code support
- HARNESS-002: Add Cursor support
- HARNESS-003: Expand MCP server configurations
- HARNESS-004: Create comprehensive documentation

## Configuration

### MCP Servers (`opencode/opencode.json`)

Currently configured (disabled by default):
- `kubernetes` - Kubernetes MCP server for cluster management
