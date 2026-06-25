---
name: git-commit-helper
description: Create well-structured git commits from analyzed changes. Use when the user asks to commit, save work, or create a commit.
allowed-tools: Read, Bash, Grep, Glob
---

# Git Commit Helper

## Core Process

### Step 1: Analyze Current State

Run in parallel to understand the changes:

```bash
git status              # changed files
git diff                # unstaged modifications
git diff --staged       # staged changes
git log --oneline -n 5  # recent commit style
```

### Step 2: Plan the Commit(s)

- **What changed**: review conversation history to understand what was accomplished.
- **Grouping**: keep related changes together; each commit atomic and working. Tests go with the code they test. Refactoring stays separate from new features.
- **One vs. multiple**: one commit for a single logical unit; multiple for distinct, separable changes.
- **Messages**: imperative mood; focus on *why* over *what*.

### Step 3: Present the Plan

Show the user before executing, then wait for confirmation:

```
I plan to create [N] commit(s) with these changes:

Commit 1:
Files: [specific files]
Message: [proposed message in imperative mood]

[Commit 2, 3, ... if multiple]

Shall I proceed?
```

### Step 4: Execute Upon Confirmation

```bash
# Add files explicitly by path — NEVER use `git add -A`, `git add .`, or `git commit -a`
git add path/to/file1.ts path/to/file2.ts
git commit -m "Add social login support"
git log --oneline -n [number of commits created]
```

## Commit Message Guidelines

Format: `[Imperative verb] [what] [optional: why]` with an optional detailed body.

- **Good**: `Add user authentication to API endpoints`, `Fix race condition in event processing`
- **Bad**: `Updated stuff`, `Fixed bug`, `Changes`, `WIP`

Use imperative mood ("Add", not "Added"/"Adding"). When the "what" isn't obvious from the diff, explain the "why" — e.g. `Use Redis for rate limiting to support distributed deployment`.

Multi-change example:

```bash
git add src/feature.ts src/feature.test.ts docs/feature.md
git commit -m "Add user analytics feature

- Implement tracking service
- Add unit tests
- Update documentation"
```

## Attribution (critical)

NEVER add co-author info, `Co-Authored-By` lines, or "Generated with Claude"-style messages. Write commit messages as if the user wrote them — authored solely by the user with no AI attribution.

## Context Awareness

You have full context of this session — use it to write meaningful messages. The user asked you to commit, so trust your judgment and don't ask unnecessary questions.

## Edge Cases

- **No changes** (`git status` clean): tell the user there is nothing to commit.
- **Already staged**: review what's staged; ask whether to commit as-is or adjust staging.
- **Git errors**: show the exact error, explain it, suggest remediation — never force through.

## Notes

This skill does not push. It creates clean, atomic commits with the user's approval, and all git operations are shown transparently.
