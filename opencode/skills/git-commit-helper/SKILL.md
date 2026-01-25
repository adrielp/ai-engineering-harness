---
name: git-commit-helper
description: Creates well-structured git commits by analyzing changes, drafting messages, and executing commits. Use when the user asks to commit changes, save work, create a commit, or mentions committing their code.
allowed-tools: Read, Bash, Grep, Glob
---

# Git Commit Helper

## When to Use This Skill

Activate this skill when the user:
- Explicitly asks to "commit" their changes
- Says "save my work" or "save these changes"
- Says "create a commit" or "make a commit"
- Asks you to commit after completing implementation work
- Mentions they want to save progress to git

## Core Process

### Step 1: Analyze Current State

Run these commands in parallel to understand the changes:

```bash
git status                    # See all changed files
git diff                      # View modifications
git diff --staged            # View staged changes
git log --oneline -n 5       # Check recent commit style
```

### Step 2: Plan Your Commits

Think about:
- **What changed**: Review the conversation history to understand what was accomplished
- **Logical grouping**: Which files belong together?
- **Clear messages**: Draft descriptive commit messages in imperative mood
- **Why over what**: Focus on the purpose of changes, not just the mechanics

Consider whether changes should be:
- **One commit**: If all changes are part of a single logical unit
- **Multiple commits**: If there are distinct, separable changes (e.g., refactoring + new feature)

### Step 3: Present Your Plan

Show the user a clear plan before executing:

```
I plan to create [N] commit(s) with these changes:

Commit 1:
Files: [list specific files]
Message: [proposed commit message in imperative mood]

[Commit 2, 3, etc. if multiple...]

Shall I proceed?
```

**Important**: 
- Be specific about which files go in each commit
- Show the complete commit message you'll use
- Wait for user confirmation

### Step 4: Execute Upon Confirmation

Once the user approves:

```bash
# Add specific files (NEVER use -A or .)
git add path/to/file1.js path/to/file2.ts

# Create commit with planned message
git commit -m "Your planned message here"

# Show the result
git log --oneline -n [number of commits you created]
```

**Never use**:
- `git add -A`
- `git add .`
- `git commit -a`

Always add files explicitly by path.

## Commit Message Guidelines

### Format
```
[Imperative verb] [what] [optional: why/context]

[Optional detailed explanation]
```

### Examples
**Good**:
- `Add user authentication to API endpoints`
- `Fix race condition in event processing`
- `Refactor database queries for better performance`
- `Update documentation for new workflow`

**Bad**:
- `Updated stuff` (too vague)
- `Fixed bug` (not specific)
- `Changes` (meaningless)
- `WIP` (not descriptive)

### Imperative Mood
Write as if commanding: "Add this", "Fix that", "Update those"
- "Add feature"
- "Added feature"
- "Adding feature"

### Focus on Why
When the "what" isn't obvious from the code, explain the "why":
- `Use Redis for rate limiting to support distributed deployment`
- `Add validation to prevent duplicate webhook processing`

## Critical Rules

### Attribution
- **NEVER add co-author information**
- **NEVER add "Generated with Claude" or similar messages**
- **NEVER add "Co-Authored-By" lines**
- **Write commit messages as if the user wrote them**

The commits should be authored solely by the user with no AI attribution.

### Grouping Strategy
- **Related changes together**: Files that implement the same feature or fix
- **Atomic commits**: Each commit should be a complete, working change
- **Separable concerns**: Refactoring separate from new features
- **Tests with implementation**: Include test changes in the same commit as the code they test

### Context Awareness
- You have the full context of what was done in this session
- Use conversation history to write meaningful commit messages
- The user trusts your judgment - they asked you to commit
- Don't ask unnecessary questions - use your understanding of the work

## Common Patterns

### Single Feature Implementation
If everything accomplished relates to one feature:
```bash
git add src/feature.ts src/feature.test.ts docs/feature.md
git commit -m "Add new feature for user analytics

- Implement tracking service
- Add unit tests
- Update documentation"
```

### Multiple Logical Changes
If there are distinct changes:
```bash
# Commit 1: Refactoring
git add src/old-code.ts
git commit -m "Refactor authentication logic for clarity"

# Commit 2: New feature
git add src/new-feature.ts src/new-feature.test.ts
git commit -m "Add social login support"
```

### Bug Fix
```bash
git add src/buggy-file.ts tests/regression.test.ts
git commit -m "Fix race condition in event handler

Adds synchronization lock to prevent concurrent access"
```

## Edge Cases

### No Changes to Commit
If `git status` shows no changes:
```
There are no changes to commit. The working directory is clean.
```

### Already Staged Changes
If changes are already staged (`git diff --staged` shows content):
- Review what's staged
- Ask if user wants to commit staged changes as-is or modify staging
- Proceed based on their preference

### Conflicts or Issues
If git operations fail:
- Show the exact error message
- Explain what went wrong
- Suggest remediation steps
- Don't try to force through errors

## Notes

- This skill respects the user's git workflow and doesn't push changes
- It focuses on creating clean, atomic commits with meaningful messages
- The user maintains full control and must approve before commits are created
- All git operations are transparent and shown to the user
