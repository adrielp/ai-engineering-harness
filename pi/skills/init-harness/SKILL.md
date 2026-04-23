---
name: init-harness
description: Initializes the AI Engineering Harness in a repository by running /init to create AGENTS.md and setting up the thoughts/ directory structure for context engineering. Use when user runs /init_harness or asks to set up the harness in a new repo.
allowed-tools: Read, Bash, Grep, Glob, Write
---

# Initialize AI Engineering Harness

## When to Use This Skill

Activate this skill when the user:
- Runs `/init_harness` command
- Asks to "initialize the harness" or "set up the harness"
- Asks to "set up context engineering" in a repository
- Wants to prepare a repository for AI-assisted development workflows

## What This Skill Does

1. Runs the built-in `/init` command to generate `AGENTS.md`
2. Creates the `thoughts/` directory structure for context engineering
3. Adds a ticket template for consistent ticket creation
4. Provides guidance on next steps

## Core Process

### Step 1: Check Current State

First, check what already exists:

```bash
# Check if AGENTS.md exists
test -f AGENTS.md && echo "AGENTS.md exists" || echo "AGENTS.md not found"

# Check if thoughts/ structure exists
test -d thoughts && echo "thoughts/ exists" || echo "thoughts/ not found"

# Check if this is a git repository
test -d .git && echo "Git repo" || echo "Not a git repo"
```

### Step 2: Run /init Command

If `AGENTS.md` doesn't exist or user wants to regenerate:

```
I'll now run the /init command to analyze this codebase and generate AGENTS.md...
```

**Invoke the /init command** - This is OpenCode's built-in command that:
- Analyzes the codebase structure
- Identifies key components and patterns
- Generates an `AGENTS.md` file with codebase context

After /init completes, confirm the file was created:
```bash
test -f AGENTS.md && echo "AGENTS.md created successfully"
```

### Step 3: Create Thoughts Directory Structure

Create the context engineering directory structure:

```bash
# Create the main structure
mkdir -p thoughts/shared/{tickets,plans,research}
mkdir -p thoughts/global
```

**Directory purposes**:
- `thoughts/shared/tickets/` - Feature requests, bug reports, task definitions
- `thoughts/shared/plans/` - Implementation plans created via /create_plan
- `thoughts/shared/research/` - Research documents and investigations
- `thoughts/global/` - Cross-repository concerns and documentation

### Step 4: Add Ticket Template

Create a ticket template if one doesn't exist:

```bash
test -f thoughts/shared/tickets/ticket-template.md || echo "Creating ticket template..."
```

**Ticket Template Content**:

```markdown
# [PROJECT-XXXX] [Brief Title]

## Problem Statement

[Describe the current problem or need]

## Desired Outcome

[What should the end state look like?]

## Context & Background

### Current State
[How things work now]

### Why This Matters
[User/developer value]

## Requirements

### Functional Requirements
- [ ] [Required behavior]

### Out of Scope
- [What we're NOT doing]

## Acceptance Criteria

### Automated Verification
- [ ] Tests pass: `[test command]`
- [ ] Build completes: `[build command]`

### Manual Verification
- [ ] [Behavior to verify]

## Technical Notes

### Affected Components
- `path/to/component/` - [what changes]

---

## Meta

**Created**: [YYYY-MM-DD]
**Priority**: [High/Medium/Low]
**Estimated Effort**: [S/M/L/XL]
```

### Step 5: Add .gitkeep Files

Ensure empty directories are tracked by git:

```bash
touch thoughts/shared/plans/.gitkeep
touch thoughts/shared/research/.gitkeep
touch thoughts/global/.gitkeep
```

### Step 6: Create Personal Directory (Optional)

Ask the user if they want a personal thoughts directory:

```
Would you like me to create a personal thoughts directory for your notes?
This would be at thoughts/[username]/ with tickets/ and plans/ subdirectories.

Your git username is: [result of git config user.name or whoami]
```

If yes:
```bash
USERNAME=$(git config user.name 2>/dev/null | tr ' ' '-' | tr '[:upper:]' '[:lower:]' || whoami)
mkdir -p "thoughts/$USERNAME"/{tickets,plans}
```

### Step 7: Summary and Next Steps

Present a summary of what was created:

```markdown
## Harness Initialized Successfully

### Created Files
- `AGENTS.md` - Codebase context for AI agents
- `thoughts/shared/tickets/ticket-template.md` - Template for new tickets

### Created Directories
```
thoughts/
├── shared/
│   ├── tickets/      # Feature requests, bugs, tasks
│   ├── plans/        # Implementation plans
│   └── research/     # Research and investigations
├── global/           # Cross-repo documentation
└── [username]/       # Your personal notes (if created)
```

### Next Steps

1. **Create your first ticket**:
   ```
   Copy thoughts/shared/tickets/ticket-template.md to a new file like:
   thoughts/shared/tickets/PROJ-001-my-feature.md
   ```

2. **Generate an implementation plan**:
   ```
   /create_plan thoughts/shared/tickets/PROJ-001-my-feature.md
   ```

3. **Implement the plan**:
   ```
   /implement_plan thoughts/shared/plans/my-feature.md
   ```

4. **Commit your changes**:
   ```
   /commit
   ```

### Context Engineering Workflow

```
Ticket → /create_plan → /implement_plan → /validate_plan → /commit
```

The harness is ready! Start by creating a ticket for your next task.
```

## Handling Edge Cases

### AGENTS.md Already Exists

```
AGENTS.md already exists. Would you like me to:
1. Keep the existing file (recommended if it's been customized)
2. Regenerate it with /init (will overwrite current content)
```

### thoughts/ Directory Already Exists

```
The thoughts/ directory already exists. I'll preserve existing content and only create missing subdirectories.
```

Check and create only what's missing:
```bash
test -d thoughts/shared/tickets || mkdir -p thoughts/shared/tickets
test -d thoughts/shared/plans || mkdir -p thoughts/shared/plans
test -d thoughts/shared/research || mkdir -p thoughts/shared/research
test -d thoughts/global || mkdir -p thoughts/global
```

### Not a Git Repository

```
This directory is not a git repository. The harness works best with git for:
- Tracking changes to tickets and plans
- Versioning AGENTS.md as the codebase evolves
- Collaboration on shared thoughts

Would you like me to:
1. Initialize a git repository first (git init)
2. Continue without git (not recommended)
```

### No Write Permissions

If directory creation fails:
```
I couldn't create the thoughts/ directory. Please check:
- You have write permissions in this directory
- The directory isn't on a read-only filesystem

You can create the structure manually:
mkdir -p thoughts/shared/{tickets,plans,research} thoughts/global
```

## What Gets Created

### File: AGENTS.md
Generated by `/init` - Contains:
- Codebase overview and structure
- Key components and their purposes
- Technology stack information
- Important patterns and conventions

### File: thoughts/shared/tickets/ticket-template.md
Template for creating consistent tickets with:
- Problem statement
- Requirements and acceptance criteria
- Technical notes
- Metadata

### Directories
```
thoughts/
├── shared/           # Team-shared documents
│   ├── tickets/      # Task definitions
│   ├── plans/        # Implementation plans
│   └── research/     # Research docs
├── global/           # Cross-repo concerns
└── {username}/       # Personal notes (optional)
```

## Integration Notes

This skill works with:
- `/init` - OpenCode's built-in codebase analysis
- `/create_plan` - Creates plans from tickets
- `/implement_plan` - Executes implementation plans
- `/validate_plan` - Verifies implementations
- `/commit` - Creates well-structured commits
- `git-commit-helper` skill - Auto-triggered commits
- `pr-description-generator` skill - PR documentation

## Notes

- Run this once per repository to set up the harness
- The thoughts/ structure can be committed to share with your team
- AGENTS.md should be regenerated periodically as the codebase evolves
- Personal directories (thoughts/username/) can be gitignored if preferred
