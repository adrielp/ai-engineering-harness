# AI Engineering Harness

## Overview

This repository provides a configuration harness for AI coding agents. It contains reusable agents, commands, skills, and workflows that can be symlinked to your AI tool's configuration directory via GNU Stow. The harness implements a structured "context engineering" workflow for AI-assisted development.

**Primary Purpose**: Standardize AI agent tooling with battle-tested prompts, agents, and workflows across multiple projects.

## Supported Tools

This harness now supports multiple AI coding tools:

- **OpenCode** - Configuration in `opencode/` (symlinks to `~/.config/opencode/`)
- **Claude Code** - Configuration in `claude/` (symlinks to `~/.claude/`)

## Repository Structure

```
ai-engineering-harness/
├── opencode/                    # OpenCode configuration (symlinked to ~/.config/opencode/)
│   ├── agents/                  # Specialized sub-agents for Task tool
│   ├── commands/                # Custom slash commands
│   ├── skills/                  # Auto-triggered behaviors
│   └── opencode.json            # MCP server configuration
├── claude/                      # Claude Code configuration (symlinked to ~/.claude/)
│   ├── agents/                  # Specialized subagents
│   ├── skills/                  # Skills (includes converted commands)
│   └── settings.json            # MCP server and settings configuration
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

### OpenCode Configuration

#### Agents (`opencode/agents/`)

Specialized sub-agents invoked via the Task tool:

| Agent | Purpose |
|-------|---------|
| `codebase-analyzer` | Analyzes implementation details, traces data flow, explains how code works |
| `codebase-locator` | Finds files and directories relevant to features or tasks |
| `codebase-pattern-finder` | Discovers similar implementations and usage patterns |
| `thoughts-analyzer` | Extracts insights from research documents in thoughts/ |
| `thoughts-locator` | Discovers documents in thoughts/ directories |
| `web-search-researcher` | Researches information from web sources |

#### Commands (`opencode/commands/`)

Custom slash commands for workflows:

| Command | Purpose |
|---------|---------|
| `/create_plan` | Create detailed implementation plans from tickets |
| `/implement_plan` | Execute approved plans phase by phase |
| `/validate_plan` | Verify implementation against plan specifications |
| `/research_codebase` | Conduct comprehensive codebase research |
| `/commit` | Create well-structured git commits |
| `/debug` | Investigate issues during manual testing |

#### Skills (`opencode/skills/`)

Auto-triggered behaviors based on context:

| Skill | Trigger |
|-------|---------|
| `init-harness` | `/init-harness` command |
| `git-commit-helper` | User says "commit" or similar |
| `pr-description-generator` | Creating pull requests |
| `experimental-pr-workflow` | Formalizing experimental work |

### Claude Code Configuration

#### Subagents (`claude/agents/`)

Specialized subagents that Claude delegates to:

| Subagent | Purpose |
|----------|---------|
| `codebase-analyzer` | Analyzes implementation details, traces data flow, explains how code works |
| `codebase-locator` | Finds files and directories relevant to features or tasks |
| `codebase-pattern-finder` | Discovers similar implementations and usage patterns |
| `thoughts-analyzer` | Extracts insights from research documents in thoughts/ |
| `thoughts-locator` | Discovers documents in thoughts/ directories |
| `web-search-researcher` | Researches information from web sources |

#### Skills (`claude/skills/`)

Skills that extend Claude's capabilities (includes commands converted to skills):

| Skill | Type | Purpose |
|-------|------|---------|
| `commit` | Manual | Create well-structured git commits |
| `debug` | Manual | Investigate issues during manual testing |
| `create_plan` | Manual | Create detailed implementation plans from tickets |
| `implement_plan` | Manual | Execute approved plans phase by phase |
| `validate_plan` | Manual | Verify implementation against plan specifications |
| `research_codebase` | Manual | Conduct comprehensive codebase research |
| `init_harness` | Manual | Initialize harness in a repository |
| `git-commit-helper` | Auto | Triggers when user says "commit" or similar |
| `pr-description-generator` | Auto | Triggers when creating pull requests |
| `experimental-pr-workflow` | Auto | Formalizes experimental work |

**Note**: In Claude Code, commands are implemented as skills with `disable-model-invocation: true`, making them manual-only (invoked with `/skill-name`).

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

Uses GNU Stow for symlink management. Choose which tool(s) to install:

### Install for OpenCode

```bash
./setup.sh opencode           # Install OpenCode configuration
./setup.sh opencode --dry-run # Preview changes
./setup.sh opencode --restow  # Update after changes
./setup.sh opencode --delete  # Remove symlinks
```

### Install for Claude Code

```bash
./setup.sh claude           # Install Claude Code configuration
./setup.sh claude --dry-run # Preview changes
./setup.sh claude --restow  # Update after changes
./setup.sh claude --delete  # Remove symlinks
```

### Install for Both

```bash
./setup.sh all           # Install both configurations
./setup.sh all --dry-run # Preview changes
./setup.sh all --restow  # Update after changes
./setup.sh all --delete  # Remove symlinks
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

The codebase agents/subagents (`codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder`) are designed to be spawned from commands/skills like `/create_plan` for comprehensive research before planning.

## Tool-Specific Notes

### OpenCode

- Uses `AGENTS.md` for project memory (generated by `/init`)
- Commands are separate from skills
- Configuration in `~/.config/opencode/`

### Claude Code

- Uses `CLAUDE.md` for project memory (generated by `/init`)
- Commands are implemented as manual-only skills
- Configuration in `~/.claude/`
- Supports `.claude/rules/` for modular project instructions

## Open Tickets

Active development tracked in `thoughts/shared/tickets/`:
- HARNESS-001: Add Claude Code support (✓ Completed)
- HARNESS-002: Add Cursor support
- HARNESS-003: Expand MCP server configurations
- HARNESS-004: Create comprehensive documentation

## Configuration

### MCP Servers

Both tools support MCP (Model Context Protocol) servers:

**OpenCode** (`opencode/opencode.json`):
- `kubernetes` - Kubernetes MCP server (disabled by default)
- To enable, set `"enabled": true`

**Claude Code** (`claude/.mcp.json`):
- `kubernetes` - Kubernetes MCP server (disabled by default)
- To enable, set `"disabled": false` or remove the `"disabled"` field

Note: Claude Code uses `.mcp.json` for MCP server configuration, separate from `settings.json` which handles permissions and other settings.
