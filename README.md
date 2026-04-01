# AI Engineering Harness

A harness for AI coding agents that provides context engineering patterns, commands, and configurations. Clone this repo and instantly configure your AI agent tooling with battle-tested prompts, agents, and workflows.

## Supported Tools

- **OpenCode** (opencode.ai) - Supported ✓
- **Claude Code** (code.claude.com) - Supported ✓
- **Gemini CLI** (ai.google.dev/gemini-cli) - Supported ✓
- **Cursor** - Not planned yet
- **Windsurf** - Not planned yet
- **GitHub Copilot CLI** - Not planned yet

## Quick Start

### Prerequisites

- [Deno](https://deno.com/) — the only requirement for the default install path

```bash
# macOS / Linux
curl -fsSL https://deno.land/install.sh | sh

# macOS (Homebrew)
brew install deno

# No Deno? Use npx as a zero-install fallback (slower first run):
npx deno run ...
```

> **Private repo:** Authenticate with `gh auth login` before running the
> installer. Both SSH and HTTPS are supported; SAML SSO is handled automatically.

### Install

Replace `<TAG_OR_SHA>` with a git tag (e.g. `v1.0.0`) or commit SHA. Find the
latest on the [releases page](https://github.com/adrielp/ai-engineering-harness/releases).

```bash
# Install all Claude Code configs
deno run --allow-read --allow-write --allow-net --allow-env \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG_OR_SHA>/install.ts \
  --tool=claude

# Install all OpenCode configs
deno run --allow-read --allow-write --allow-net --allow-env \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG_OR_SHA>/install.ts \
  --tool=opencode

# Install all Gemini CLI configs
deno run --allow-read --allow-write --allow-net --allow-env \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG_OR_SHA>/install.ts \
  --tool=gemini

# Install all three tools at once
deno run --allow-read --allow-write --allow-net --allow-env \
  https://raw.githubusercontent.com/adrielp/ai-engineering-harness/<TAG_OR_SHA>/install.ts \
  --tool=all

# Preview without writing anything
deno run ... install.ts --tool=claude --dry-run

# Install a single skill
deno run ... install.ts --tool=claude --skill=skill/git-commit-helper

# Install multiple specific components
deno run ... install.ts --tool=claude --skill=agents,skill/git-commit-helper

# Interactive checkbox picker
deno run ... install.ts --tool=claude --interactive
```

Files are copied as real files — nothing breaks if you discard the installer.
Re-running is safe: unchanged files are skipped, modified files show a diff and
prompt for confirmation.

## Advanced: Repo / Power-User Mode (GNU Stow)

For users who want the repo to live permanently on their system with symlinks
(easier to update via `git pull`), use the stow-based setup.

### Prerequisites

- [GNU Stow](https://www.gnu.org/software/stow/) — symlink farm manager

```bash
# macOS
brew install stow

# Ubuntu/Debian
sudo apt install stow

# Fedora
sudo dnf install stow

# Arch
sudo pacman -S stow
```

### Installation

```bash
# Clone the repository
git clone https://github.com/adrielp/ai-engineering-harness.git
cd ai-engineering-harness

# Install for OpenCode
./setup.sh opencode           # Install OpenCode configuration
./setup.sh opencode --dry-run # Preview changes

# Install for Claude Code
./setup.sh claude             # Install Claude Code configuration
./setup.sh claude --dry-run   # Preview changes

# Install for Gemini CLI
./setup.sh gemini             # Install Gemini CLI configuration
./setup.sh gemini --dry-run   # Preview changes

# Install all three tools
./setup.sh all                # Install OpenCode, Claude Code, and Gemini CLI
./setup.sh all --dry-run      # Preview changes

# To update after pulling changes
./setup.sh opencode --restow  # Update OpenCode
./setup.sh claude --restow    # Update Claude Code
./setup.sh gemini --restow    # Update Gemini CLI
./setup.sh all --restow       # Update all three

# To remove symlinks
./setup.sh opencode --delete  # Remove OpenCode symlinks
./setup.sh claude --delete    # Remove Claude Code symlinks
./setup.sh gemini --delete    # Remove Gemini CLI symlinks
./setup.sh all --delete       # Remove all symlinks
```

This will symlink:
- `opencode/` → `~/.config/opencode/` (for OpenCode)
- `claude/` → `~/.claude/` (for Claude Code)
- `gemini/` → `~/.gemini/` (for Gemini CLI)

### Why Stow?

GNU Stow creates symlinks without modifying original files, is easy to
enable/disable, integrates cleanly with version control, and supports managing
multiple tool packages independently.

## What's Included

### For OpenCode

Located in `opencode/` (symlinked to `~/.config/opencode/`):

#### Agents
Specialized sub-agents for different tasks:
- `codebase_analyzer` - Analyzes implementation details and traces data flow
- `codebase_locator` - Finds files and components by feature/topic
- `codebase_pattern_finder` - Discovers similar implementations and patterns
- `thoughts_analyzer` - Extracts insights from research documents
- `thoughts_locator` - Discovers documents in the thoughts/ directory
- `web_search_researcher` - Researches information from web sources

#### Commands
Custom slash commands for workflows:
- `/create_plan` - Create detailed implementation plans interactively
- `/implement_plan` - Execute approved plans phase by phase
- `/validate_plan` - Verify implementation against plan specifications
- `/research_codebase` - Conduct comprehensive codebase research
- `/commit` - Create well-structured git commits
- `/debug` - Investigate issues during manual testing
- `/debug-k8s` - Debug Kubernetes clusters (prefers K8s MCP when available)
- `/init_harness` - Initialize harness in a repository (also available as skill)
- `/worktree` - Manage git worktrees for parallel development

#### Skills
Auto-triggered behaviors based on context:
- `init_harness` - Initializes the harness in any repository (`/init_harness`)
- `git-commit-helper` - Creates well-structured commits when you say "commit these changes"
- `pr-description-generator` - Generates comprehensive PR descriptions following templates
- `experimental-pr-workflow` - Formalizes experimental work into proper tickets and PRs

### For Claude Code

Located in `claude/` (symlinked to `~/.claude/`):

#### Subagents
Specialized subagents that Claude delegates to (same as OpenCode agents):
- `codebase_analyzer` - Analyzes implementation details and traces data flow
- `codebase_locator` - Finds files and components by feature/topic
- `codebase_pattern_finder` - Discovers similar implementations and patterns
- `thoughts_analyzer` - Extracts insights from research documents
- `thoughts_locator` - Discovers documents in the thoughts/ directory
- `web_search_researcher` - Researches information from web sources

#### Skills
Skills that extend Claude's capabilities (commands + auto-triggered skills):

**Manual Skills** (invoke with `/skill-name`):
- `/commit` - Create well-structured git commits
- `/debug` - Investigate issues during manual testing
- `/debug-k8s` - Debug Kubernetes clusters (prefers K8s MCP when available)
- `/create_plan` - Create detailed implementation plans from tickets
- `/implement_plan` - Execute approved plans phase by phase
- `/validate_plan` - Verify implementation against plan specifications
- `/research_codebase` - Conduct comprehensive codebase research
- `/init_harness` - Initialize harness in a repository

**Manual + Auto-Triggered Skills**:
- `/worktree` - Manage git worktrees for parallel development (also triggers on worktree-related intent)

**Auto-Triggered Skills**:
- `git-commit-helper` - Triggers when you say "commit" or similar
- `pr-description-generator` - Triggers when creating pull requests
- `experimental-pr-workflow` - Formalizes experimental work

### For Gemini CLI

Located in `gemini/` (symlinked to `~/.gemini/`):

#### Agents
Specialized agents for different tasks:
- `codebase_analyzer` - Analyzes implementation details and traces data flow
- `codebase_locator` - Finds files and components by feature/topic
- `codebase_pattern_finder` - Discovers similar implementations and patterns
- `thoughts_analyzer` - Extracts insights from research documents
- `thoughts_locator` - Discovers documents in the thoughts/ directory
- `web_search_researcher` - Researches information from web sources

#### Commands
Manual slash commands (TOML format):
- `/create_plan` - Create detailed implementation plans
- `/implement_plan` - Execute approved plans
- `/validate_plan` - Verify implementation
- `/research_codebase` - Comprehensive codebase research
- `/commit` - Create well-structured git commits
- `/debug` - Investigate issues
- `/debug_k8s` - Debug Kubernetes clusters
- `/init_harness` - Initialize harness
- `/worktree` - Manage git worktrees for parallel development

#### Skills
Auto-triggered skills:
- `git_commit_helper` - Triggers when committing changes
- `pr_description_generator` - Triggers when creating PRs
- `experimental_pr_workflow` - Formalizes experimental work

### Command Reference

Quick reference of all commands/skills across tools:

| Command | OpenCode | Claude Code | Gemini CLI | Purpose |
|---------|:--------:|:-----------:|:----------:|---------|
| `/init_harness` | ✓ | ✓ | ✓ | Initialize harness in repository |
| `/create_plan` | ✓ | ✓ | ✓ | Create implementation plan from ticket |
| `/implement_plan` | ✓ | ✓ | ✓ | Execute approved plan |
| `/validate_plan` | ✓ | ✓ | ✓ | Verify implementation |
| `/commit` | ✓ | ✓ | ✓ | Create well-structured commits |
| `/debug` | ✓ | ✓ | ✓ | Investigate issues |
| `/debug-k8s` | ✓ | ✓ | ✓ | Debug Kubernetes clusters |
| `/research_codebase` | ✓ | ✓ | ✓ | Comprehensive codebase research |
| `/worktree` | ✓ | ✓ | ✓ | Manage git worktrees for parallel development |

**Note**: All tools now use `/init_harness` (snake_case) for consistency.

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

The harness implements a structured workflow for AI-assisted development:

### Initialize a Repository

After installing the harness, initialize any repository with:

**For OpenCode:**
```bash
cd your-project
opencode

# Initialize the harness (creates AGENTS.md and thoughts/ structure)
/init_harness
```

**For Claude Code:**
```bash
cd your-project
claude

# Initialize the harness (creates CLAUDE.md and thoughts/ structure)
/init_harness
```

**For Gemini CLI:**
```bash
cd your-project
gemini

# Initialize the harness (creates GEMINI.md and thoughts/ structure)
/init_harness
```

This will:
1. Run `/init` to generate `AGENTS.md` (OpenCode), `CLAUDE.md` (Claude Code), or `GEMINI.md` (Gemini CLI) with codebase context
2. Create the `thoughts/` directory structure
3. Add a ticket template for consistent task definitions

### Development Workflow

1. **Create a Ticket** - Define what needs to be built in `thoughts/shared/tickets/`
2. **Create a Plan** - Use `/create_plan thoughts/shared/tickets/PROJ-001.md` to generate a detailed implementation plan
3. **Implement** - Use `/implement_plan thoughts/shared/plans/feature-name.md` to execute the plan
4. **Validate** - Use `/validate_plan` to verify the implementation
5. **Commit** - Use `/commit` to create well-structured commits

### Example Workflow

**For OpenCode:**
```bash
# Initialize the harness in a new repo
/init_harness

# Create an implementation plan from a ticket
/create_plan thoughts/shared/tickets/PROJ-001-add-feature.md

# After plan approval, implement it
/implement_plan thoughts/shared/plans/add-feature.md

# Validate the implementation
/validate_plan thoughts/shared/plans/add-feature.md

# Commit the changes
/commit
```

**For Claude Code:**
```bash
# Initialize the harness in a new repo
/init_harness

# The remaining commands are the same
/create_plan thoughts/shared/tickets/PROJ-001-add-feature.md
/implement_plan thoughts/shared/plans/add-feature.md
/validate_plan thoughts/shared/plans/add-feature.md
/commit
```

**For Gemini CLI:**
```bash
# Initialize the harness in a new repo
/init_harness

# The remaining commands are the same
/create_plan thoughts/shared/tickets/PROJ-001-add-feature.md
/implement_plan thoughts/shared/plans/add-feature.md
/validate_plan thoughts/shared/plans/add-feature.md
/commit
```

## Customization

### Adding Your Own Agents (OpenCode)

Create new `.md` files in `opencode/agents/` with:

```markdown
---
name: my-custom-agent
description: What this agent does and when to use it.
---

[Agent system prompt here]
```

### Adding Your Own Commands (OpenCode)

Create new `.md` files in `opencode/commands/` with the command prompt.

### Adding Your Own Subagents (Claude Code)

Create new `.md` files in `claude/agents/` with:

```markdown
---
name: my-custom-agent
description: What this subagent does and when to use it.
---

[Subagent system prompt here]
```

### Adding Your Own Skills (Claude Code)

Create a new directory in `claude/skills/` with a `SKILL.md` file:

```markdown
---
name: my-skill
description: What this skill does
disable-model-invocation: true  # For manual-only skills
---

[Skill instructions here]
```

### Personal Thoughts Directory

Create your own directory under `thoughts/`:

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

Apache 2.0 - See [LICENSE](LICENSE) for details.
