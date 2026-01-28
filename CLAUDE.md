# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Engineering Harness - a configuration repository that provides reusable agents, skills, and workflows for AI coding tools (OpenCode and Claude Code). Configurations are symlinked to tool-specific directories via GNU Stow.

## Setup Commands

```bash
# Install configurations (requires GNU Stow)
./setup.sh claude             # Install Claude Code config to ~/.claude/
./setup.sh opencode           # Install OpenCode config to ~/.config/opencode/
./setup.sh all                # Install both

# Useful flags
./setup.sh <tool> --dry-run   # Preview changes
./setup.sh <tool> --restow    # Update existing symlinks
./setup.sh <tool> --delete    # Remove symlinks
```

## Architecture

### Configuration Directories

- `claude/` → symlinks to `~/.claude/` (Claude Code)
- `opencode/` → symlinks to `~/.config/opencode/` (OpenCode)

Both contain parallel structures:
- `agents/` - Specialized subagents for research and analysis
- `skills/` - Manual commands (invoked with `/skill-name`) and auto-triggered behaviors

OpenCode additionally has `commands/` (separate from skills), while Claude Code implements commands as skills with `disable-model-invocation: true`.

### Thoughts Directory (Context Engineering)

```
thoughts/
├── shared/           # Team-wide documents
│   ├── tickets/      # Work items (use ticket-template.md)
│   ├── plans/        # Implementation plans
│   └── research/     # Research documents
├── global/           # Cross-repository concerns
└── {username}/       # Personal notes
```

### Context Engineering Workflow

The harness implements a structured development workflow:

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```

1. Create tickets in `thoughts/shared/tickets/` using the template
2. Generate plans with `/create_plan <ticket-path>`
3. Execute with `/implement_plan <plan-path>`
4. Verify with `/validate_plan`
5. Commit with `/commit`

## Key Skills (Claude Code)

| Skill | Invocation | Purpose |
|-------|------------|---------|
| `init_harness` | `/init_harness` | Initialize harness in a new repository |
| `create_plan` | `/create_plan` | Generate implementation plan from ticket |
| `implement_plan` | `/implement_plan` | Execute approved plan |
| `validate_plan` | `/validate_plan` | Verify implementation |
| `research_codebase` | `/research_codebase` | Comprehensive codebase research |
| `commit` | `/commit` | Create structured git commit |
| `debug` | `/debug` | Investigate issues |
| `debug-k8s` | `/debug-k8s` | Debug Kubernetes clusters (prefers K8s MCP) |

Auto-triggered: `git-commit-helper`, `pr-description-generator`, `experimental-pr-workflow`

## MCP Configuration

MCP servers are configured in `claude/.mcp.json`. To enable a server, set `"disabled": false` or remove the `"disabled"` field.
